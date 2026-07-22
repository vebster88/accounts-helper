// src/background/pin-service.ts

import { ERROR_CODES, PIN_ATTEMPTS_LIMIT } from '../shared/constants';
import {
  getPinAttempts,
  incrementPinAttempts,
  isLocked,
  resetPinAttempts,
  setLocked,
} from './session-key-store';
import { isValidPin } from '../shared/validation';

export function validatePinFormat(pin: string): boolean {
  return isValidPin(pin);
}

export async function checkLocked(): Promise<boolean> {
  return isLocked();
}

export async function recordWrongAttempt(): Promise<{ locked: boolean; attemptsLeft: number }> {
  const attempts = await incrementPinAttempts();
  const locked = attempts >= PIN_ATTEMPTS_LIMIT;
  if (locked) {
    await setLocked(true);
  }
  return { locked, attemptsLeft: Math.max(0, PIN_ATTEMPTS_LIMIT - attempts) };
}

export async function resetAttempts(): Promise<void> {
  await resetPinAttempts();
}

export async function ensureNotLocked(): Promise<void> {
  if (await isLocked()) {
    throw new Error(ERROR_CODES.E_PIN_LOCKED);
  }
}

export function requireValidPin(pin: string): void {
  if (!validatePinFormat(pin)) {
    throw new Error(ERROR_CODES.E_PIN_INVALID_FORMAT);
  }
}
