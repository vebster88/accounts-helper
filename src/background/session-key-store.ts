// src/background/session-key-store.ts

import { SESSION_KEYS } from '../shared/constants';

let inMemoryDek: CryptoKey | null = null;

export async function storeDek(dek: CryptoKey): Promise<void> {
  inMemoryDek = dek;
  try {
    await chrome.storage.session.set({ [SESSION_KEYS.dekHandle]: dek });
  } catch {
    // Ignore if storage.session is unavailable.
  }
}

export async function getDek(): Promise<CryptoKey | null> {
  if (inMemoryDek) return inMemoryDek;
  try {
    const result = await chrome.storage.session.get(SESSION_KEYS.dekHandle);
    const dek = result[SESSION_KEYS.dekHandle] as CryptoKey | undefined;
    if (dek) {
      inMemoryDek = dek;
    }
    return dek || null;
  } catch {
    return null;
  }
}

export async function clearDek(): Promise<void> {
  inMemoryDek = null;
  try {
    await chrome.storage.session.remove(SESSION_KEYS.dekHandle);
  } catch {
    // Ignore.
  }
}

export async function getPinAttempts(): Promise<number> {
  try {
    const result = await chrome.storage.session.get(SESSION_KEYS.pinAttempts);
    return (result[SESSION_KEYS.pinAttempts] as number) || 0;
  } catch {
    return 0;
  }
}

export async function incrementPinAttempts(): Promise<number> {
  const attempts = await getPinAttempts();
  const next = attempts + 1;
  try {
    await chrome.storage.session.set({ [SESSION_KEYS.pinAttempts]: next });
  } catch {
    // Ignore.
  }
  return next;
}

export async function resetPinAttempts(): Promise<void> {
  try {
    await chrome.storage.session.set({ [SESSION_KEYS.pinAttempts]: 0 });
  } catch {
    // Ignore.
  }
}

export async function isLocked(): Promise<boolean> {
  try {
    const result = await chrome.storage.session.get(SESSION_KEYS.locked);
    return !!result[SESSION_KEYS.locked];
  } catch {
    return false;
  }
}

export async function setLocked(value: boolean): Promise<void> {
  try {
    await chrome.storage.session.set({ [SESSION_KEYS.locked]: value });
  } catch {
    // Ignore.
  }
}

export async function clearSession(): Promise<void> {
  inMemoryDek = null;
  try {
    await chrome.storage.session.remove([
      SESSION_KEYS.dekHandle,
      SESSION_KEYS.pinAttempts,
      SESSION_KEYS.locked,
    ]);
  } catch {
    // Ignore.
  }
}
