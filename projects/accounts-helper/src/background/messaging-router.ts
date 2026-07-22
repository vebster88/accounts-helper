// src/background/messaging-router.ts

import { ERROR_CODES, STORAGE_KEYS } from '../shared/constants';
import type { EncryptedProfileBlob, Profile, ProfileEntry } from '../shared/types';
import { errorResponse, MESSAGE_TYPES, successResponse } from '../shared/messaging';
import {
  changePin,
  createNewEncryptedProfile,
  decryptProfile,
  encryptProfile,
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
    await storePinMemo(dek, pin);
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
  await clearSessionWithMemo();
  cachedProfile = null;
  cachedBlob = null;
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
    // Need PIN to decrypt; but we have DEK already. Derive profile from DEK by trial is impossible;
    // require that popup has unlocked and profile is cached. If not, session expired.
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

  const pin = await recoverPinFromDek(dek, blob);
  if (!pin) {
    return errorResponse(ERROR_CODES.E_SESSION_EXPIRED);
  }

  const updatedProfile = addOrUpdateEntry(profile, entry);
  const newBlob = await encryptProfile(pin, updatedProfile, blob);
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
  const pin = await recoverPinFromDek(dek, blob);
  if (!pin) {
    return errorResponse(ERROR_CODES.E_SESSION_EXPIRED);
  }
  const newBlob = await encryptProfile(pin, updatedProfile, blob);
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
    const { dek } = await decryptProfile(newPin, newBlob);
    await storeDek(dek);
    return successResponse({ success: true });
  } catch (err) {
    await recordWrongAttempt();
    return errorResponse(ERROR_CODES.E_PIN_WRONG);
  }
}

async function handleRequestFieldType(payload: { elementInfo: unknown }) {
  // We cannot determine type in service worker. The content script should compute it.
  // This handler is a no-op for routing; content script will send its own detection or respond.
  void payload;
  return successResponse({ menuUpdated: true });
}

// Internal helpers.

function rebuildMenu(): void {
  if (!cachedProfile) return;
  buildContextMenu(cachedProfile, getLastDetectedType() || { type: null, confidence: 'none', score: 0 });
}

// Recover PIN from DEK: not possible cryptographically. In this architecture the popup must have PIN
// to save. Instead we keep a tiny encrypted memo of the PIN inside chrome.storage.session.
// We avoid storing plaintext, but this is a convenience. For MVP, when save entry is called,
// we use the current session token if present. To avoid storing PIN, we require caller to pass
// pin again via payload; but the contract in spec says SAVE_ENTRY payload is just entry.
// Workaround: we keep `accountsHelper.pinMemo` encrypted with DEK in session storage.

const PIN_MEMO_KEY = `${STORAGE_KEYS.encryptedProfile}pinMemo`;

export async function storePinMemo(dek: CryptoKey, pin: string): Promise<void> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    dek,
    new TextEncoder().encode(pin),
  );
  await chrome.storage.session.set({
    [PIN_MEMO_KEY]: { iv: Array.from(iv), data: Array.from(new Uint8Array(ciphertext)) },
  });
}

async function recoverPinFromDek(dek: CryptoKey, _blob: EncryptedProfileBlob): Promise<string | null> {
  try {
    const result = await chrome.storage.session.get(PIN_MEMO_KEY);
    const memo = result[PIN_MEMO_KEY] as { iv: number[]; data: number[] } | undefined;
    if (!memo) return null;
    const iv = new Uint8Array(memo.iv);
    const ciphertext = new Uint8Array(memo.data);
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, dek, ciphertext);
    return new TextDecoder().decode(decrypted);
  } catch {
    return null;
  }
}

export async function removePinMemo(): Promise<void> {
  try {
    await chrome.storage.session.remove(PIN_MEMO_KEY);
  } catch {
    // Ignore.
  }
}

// Override session clear to also remove memo.
const originalClearSession = clearSession;
export async function clearSessionWithMemo(): Promise<void> {
  await originalClearSession();
  await removePinMemo();
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
