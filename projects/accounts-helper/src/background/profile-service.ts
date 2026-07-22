// src/background/profile-service.ts

import { STORAGE_KEYS } from '../shared/constants';
import type { EncryptedProfileBlob, Profile, ProfileEntry, ProfileMeta } from '../shared/types';
import { nowIso } from '../shared/helpers';

export async function loadBlob(): Promise<EncryptedProfileBlob | null> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.encryptedProfile);
  return (result[STORAGE_KEYS.encryptedProfile] as EncryptedProfileBlob) || null;
}

export async function saveBlob(blob: EncryptedProfileBlob): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.encryptedProfile]: blob });
  const meta: ProfileMeta = {
    version: blob.version,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    hasProfile: true,
  };
  await chrome.storage.local.set({ [STORAGE_KEYS.meta]: meta });
}

export async function loadMeta(): Promise<ProfileMeta | null> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.meta);
  return (result[STORAGE_KEYS.meta] as ProfileMeta) || null;
}

export async function profileExists(): Promise<boolean> {
  const meta = await loadMeta();
  return meta?.hasProfile === true;
}

export function emptyProfile(): Profile {
  return {
    version: 1,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    entries: [],
  };
}

export function addOrUpdateEntry(profile: Profile, entry: ProfileEntry): Profile {
  const index = profile.entries.findIndex((e) => e.id === entry.id);
  const normalized: ProfileEntry = {
    ...entry,
    updatedAt: nowIso(),
    createdAt: entry.createdAt || nowIso(),
  };

  let entries: ProfileEntry[];
  if (index >= 0) {
    entries = [...profile.entries];
    entries[index] = normalized;
  } else {
    entries = [...profile.entries, normalized];
  }

  // Ensure at most one default per type.
  if (normalized.isDefault) {
    entries = entries.map((e) => {
      if (e.id !== normalized.id && e.type === normalized.type) {
        return { ...e, isDefault: false, updatedAt: nowIso() };
      }
      return e;
    });
  }

  return {
    ...profile,
    updatedAt: nowIso(),
    entries,
  };
}

export function deleteEntryById(profile: Profile, id: string): Profile {
  return {
    ...profile,
    updatedAt: nowIso(),
    entries: profile.entries.filter((e) => e.id !== id),
  };
}

export function getEntriesByType(profile: Profile, type: string): ProfileEntry[] {
  return profile.entries
    .filter((e) => e.type === type)
    .sort((a, b) => {
      if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
}

export function getDefaultEntry(profile: Profile, type: string): ProfileEntry | undefined {
  return profile.entries.find((e) => e.type === type && e.isDefault);
}

export async function clearProfile(): Promise<void> {
  await chrome.storage.local.remove([STORAGE_KEYS.encryptedProfile, STORAGE_KEYS.meta]);
}
