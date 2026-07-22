// src/background/messaging-router.ts

import { ERROR_CODES } from '../shared/constants';
import type { EncryptedProfileBlob, Profile, ProfileEntry } from '../shared/types';
import { errorResponse, MESSAGE_TYPES, successResponse } from '../shared/messaging';
import {
  changePin,
  createNewEncryptedProfile,
  decryptProfile,
  encryptProfile,
  reEncryptProfileWithDek,
  validateBlob,
} from './crypto-service';
import {
  addOrUpdateEntry,
  clearProfile,
  deleteEntryById,
  emptyProfile,
  loadBlob,
  loadMeta,
  profileExists,
  saveBlob,
} from './profile-service';
import {
  checkLocked,
  ensureNotLocked,
  recordWrongAttempt,
  requireValidPin,
  resetAttempts,
  validatePinFormat,
} from './pin-service';
import { clearDek, clearSession, getDek, storeDek } from './session-key-store';
import { blobFromExport, exportToJson, parseExportJson } from './export-import-service';
import { buildContextMenu, getLastDetectedType, updateDetectedType } from './context-menu-service';
import { validateEntry } from '../shared/validation';
import { generateId, nowIso } from '../shared/helpers';

let cachedProfile: Profile | null = null;
let cachedBlob: EncryptedProfileBlob | null = null;

export function startMessagingRouter(): void {
  chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    handleMessage(request)
      .then(sendResponse)
      .catch((err) => sendResponse(errorResponse(err?.message || String(err))));
    return true;
  });
}

async function handleMessage(request: { type: string; payload?: unknown }): Promise<unknown> {
  switch (request.type) {
    case MESSAGE_TYPES.CHECK_PROFILE:
      return handleCheckProfile();
    case MESSAGE_TYPES.SETUP_PIN:
      return handleSetupPin(request.payload as { pin: string; pinConfirm: string });
    case MESSAGE_TYPES.UNLOCK:
      return handleUnlock(request.payload as { pin: string });
    case MESSAGE_TYPES.LOCK:
      return handleLock();
    case MESSAGE_TYPES.GET_PROFILE:
      return handleGetProfile();
    case MESSAGE_TYPES.SAVE_ENTRY:
      return handleSaveEntry(request.payload as { entry: Partial<ProfileEntry> });
    case MESSAGE_TYPES.DELETE_ENTRY:
      return handleDeleteEntry(request.payload as { id: string });
    case MESSAGE_TYPES.EXPORT_PROFILE:
      return handleExportProfile(request.payload as { pin?: string });
    case MESSAGE_TYPES.IMPORT_PROFILE:
      return handleImportProfile(request.payload as { json: string; pin: string });
    case MESSAGE_TYPES.CHANGE_PIN:
      return handleChangePin(request.payload as { oldPin: string; newPin: string });
    case MESSAGE_TYPES.CLEAR_ALL_DATA:
      return handleClearAllData();
    case MESSAGE_TYPES.REQUEST_FIELD_TYPE:
      return handleRequestFieldType(request.payload as { elementInfo: unknown });
    default:
      return errorResponse('Unknown message type');
  }
}

async function handleCheckProfile() {
  const exists = await profileExists();
  const locked = await checkLocked();
  return successResponse({ exists, locked });
}

async function handleSetupPin(payload: { pin: string; pinConfirm: string }) {
  const { pin, pinConfirm } = payload;
  if (!validatePinFormat(pin) || !validatePinFormat(pinConfirm)) {
    return errorResponse(ERROR_CODES.E_PIN_INVALID_FORMAT);
  }
  if (pin !== pinConfirm) {
    return errorResponse(ERROR_CODES.E_PIN_MISMATCH);
  }
  if (await profileExists()) {
    return errorResponse('Profile already exists');
  }
  const { dek, blob } = await createNewEncryptedProfile(pin);
  await saveBlob(blob);
  await storeDek(dek);
  await resetAttempts();
  cachedBlob = blob;
  cachedProfile = emptyProfile();
  return successResponse({ success: true });
}

async function handleUnlock(payload: { pin: string }) {
  const { pin } = payload;
  requireValidPin(pin);
  await ensureNotLocked();

  const blob = await loadBlob();
  if (!blob) {
    return errorResponse(ERROR_CODES.E_CRYPTO_DECRYPT);
  }
  try {
    const { profile, dek } = await decryptProfile(pin, blob);
    await storeDek(dek);
    await resetAttempts();
    cachedBlob = blob;
    cachedProfile = profile;
    return successResponse(profile);
  } catch (err) {
    const { locked, attemptsLeft } = await recordWrongAttempt();
    if (locked) {
      await clearDek();
      cachedProfile = null;
      cachedBlob = null;
      return errorResponse(ERROR_CODES.E_PIN_LOCKED, { attemptsLeft: 0 });
    }
    return errorResponse(ERROR_CODES.E_PIN_WRONG, { attemptsLeft });
  }
}

async function handleLock() {
  await clearSession();
  cachedProfile = null;
  cachedBlob = null;
  return successResponse({ success: true });
}

async function handleClearAllData() {
  await clearSession();
  cachedProfile = null;
  cachedBlob = null;
  await clearProfile();
  rebuildMenu();
  return successResponse({ success: true });
}

async function handleGetProfile(): Promise<unknown> {
  const dek = await getDek();
  if (!dek) {
    return errorResponse(ERROR_CODES.E_SESSION_EXPIRED);
  }
  if (cachedProfile) return successResponse(cachedProfile);
  const blob = cachedBlob || (await loadBlob());
  if (!blob) return errorResponse(ERROR_CODES.E_CRYPTO_DECRYPT);
  return errorResponse(ERROR_CODES.E_SESSION_EXPIRED);
}

async function handleSaveEntry(payload: { entry: Partial<ProfileEntry> }) {
  const dek = await getDek();
  if (!dek) {
    return errorResponse(ERROR_CODES.E_SESSION_EXPIRED);
  }
  const blob = cachedBlob || (await loadBlob());
  if (!blob) {
    return errorResponse(ERROR_CODES.E_CRYPTO_DECRYPT);
  }

  let profile = cachedProfile;
  if (!profile) {
    return errorResponse(ERROR_CODES.E_SESSION_EXPIRED);
  }

  const entryInput = payload.entry;
  const type = entryInput.type!;
  const value = entryInput.value ?? '';
  const validation = validateEntry(type, value, entryInput.label);
  if (!validation.valid) {
    const fieldErrors = Object.fromEntries(validation.errors.map((e) => [e.field, e.message]));
    return errorResponse(ERROR_CODES.E_VALIDATION_FORMAT, { fieldErrors });
  }

  const entry: ProfileEntry = {
    id: entryInput.id || generateId(),
    type,
    value,
    label: entryInput.label,
    isDefault: !!entryInput.isDefault,
    createdAt: entryInput.createdAt || nowIso(),
    updatedAt: nowIso(),
  };

  const updatedProfile = addOrUpdateEntry(profile, entry);
  const newBlob = await reEncryptProfileWithDek(dek, updatedProfile, blob);
  await saveBlob(newBlob);
  cachedBlob = newBlob;
  cachedProfile = updatedProfile;
  await storeDek(dek);
  rebuildMenu();
  return successResponse(entry);
}

async function handleDeleteEntry(payload: { id: string }) {
  const dek = await getDek();
  if (!dek || !cachedProfile) {
    return errorResponse(ERROR_CODES.E_SESSION_EXPIRED);
  }
  const blob = cachedBlob || (await loadBlob());
  if (!blob) {
    return errorResponse(ERROR_CODES.E_CRYPTO_DECRYPT);
  }
  const updatedProfile = deleteEntryById(cachedProfile, payload.id);
  const newBlob = await reEncryptProfileWithDek(dek, updatedProfile, blob);
  await saveBlob(newBlob);
  cachedBlob = newBlob;
  cachedProfile = updatedProfile;
  await storeDek(dek);
  rebuildMenu();
  return successResponse({ success: true });
}

async function handleExportProfile(payload: { pin?: string }) {
  let dek = await getDek();
  let blob = cachedBlob || (await loadBlob());
  if (!blob) {
    return errorResponse(ERROR_CODES.E_CRYPTO_DECRYPT);
  }
  if (!dek) {
    const pin = payload.pin;
    if (!pin) {
      return errorResponse(ERROR_CODES.E_SESSION_EXPIRED);
    }
    requireValidPin(pin);
    await ensureNotLocked();
    try {
      const result = await decryptProfile(pin, blob);
      dek = result.dek;
      blob = cachedBlob || blob;
    } catch (err) {
      await recordWrongAttempt();
      return errorResponse(ERROR_CODES.E_PIN_WRONG);
    }
  }
  const json = exportToJson(blob);
  return successResponse({ json });
}

async function handleImportProfile(payload: { json: string; pin: string }) {
  const { json, pin } = payload;
  requireValidPin(pin);
  await ensureNotLocked();
  const exportData = parseExportJson(json);
  const blob = blobFromExport(exportData);
  try {
    await validateBlob(blob);
    await decryptProfile(pin, blob);
  } catch (err) {
    await recordWrongAttempt();
    return errorResponse((err as Error).message || ERROR_CODES.E_IMPORT_INVALID);
  }
  await saveBlob(blob);
  cachedBlob = blob;
  cachedProfile = null;
  await storeDek((await decryptProfile(pin, blob)).dek);
  await resetAttempts();
  rebuildMenu();
  return successResponse({ success: true });
}

async function handleChangePin(payload: { oldPin: string; newPin: string }) {
  const { oldPin, newPin } = payload;
  requireValidPin(oldPin);
  requireValidPin(newPin);
  await ensureNotLocked();
  const blob = await loadBlob();
  if (!blob) {
    return errorResponse(ERROR_CODES.E_CRYPTO_DECRYPT);
  }
  try {
    const newBlob = await changePin(oldPin, newPin, blob);
    await saveBlob(newBlob);
    cachedBlob = newBlob;
    cachedProfile = null;
    const { dek } = await decryptProfile(newPin, newBlob);
    await storeDek(dek);
    return successResponse({ success: true });
  } catch (err) {
    await recordWrongAttempt();
    return errorResponse(ERROR_CODES.E_PIN_WRONG);
  }
}

async function handleRequestFieldType(payload: { elementInfo: unknown }) {
  void payload;
  return successResponse({ menuUpdated: true });
}

// Internal helpers.

function rebuildMenu(): void {
  if (!cachedProfile) return;
  buildContextMenu(cachedProfile, getLastDetectedType() || { type: null, confidence: 'none', score: 0 });
}

// Export initializers.
export function setCachedProfile(profile: Profile): void {
  cachedProfile = profile;
}

export function setCachedBlob(blob: EncryptedProfileBlob): void {
  cachedBlob = blob;
}

export function getCachedProfile(): Profile | null {
  return cachedProfile;
}

export function getCachedBlob(): EncryptedProfileBlob | null {
  return cachedBlob;
}
