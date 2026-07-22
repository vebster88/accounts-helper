// src/shared/validation.ts

import { keccak_256 } from '@noble/hashes/sha3';
import { bytesToHex as nobleBytesToHex } from '@noble/hashes/utils';
import {
  ERROR_CODES,
  type FieldType,
  FIELD_TYPES,
  HIGH_CONFIDENCE_THRESHOLD,
  LOW_CONFIDENCE_THRESHOLD,
} from './constants';

const PIN_REGEX = /^\d{4}$/;

export function isValidPin(pin: string): boolean {
  return typeof pin === 'string' && PIN_REGEX.test(pin);
}

export function isValidEmail(value: string): boolean {
  if (!value || value.length > 254) return false;
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(value);
}

export function isValidEvmAddress(value: string): boolean {
  if (!/^0x[a-fA-F0-9]{40}$/.test(value)) return false;
  return value === toEip55Checksum(value);
}

function toEip55Checksum(address: string): string {
  const hex = address.slice(2).toLowerCase();
  const hash = nobleBytesToHex(keccak_256(hex));
  let result = '0x';
  for (let i = 0; i < hex.length; i++) {
    const char = hex[i];
    const nibble = parseInt(hash[i], 16);
    result += nibble > 7 ? char.toUpperCase() : char;
  }
  return result;
}

export function isValidBtcAddress(value: string): boolean {
  if (!value) return false;
  if (/^1[a-zA-Z0-9]{25,34}$/.test(value)) return true;
  if (/^3[a-zA-Z0-9]{25,34}$/.test(value)) return true;
  if (/^bc1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{11,87}$/.test(value)) return true;
  return false;
}

export function normalizeHandle(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  return trimmed.startsWith('@') ? trimmed : `@${trimmed}`;
}

export function isValidPhone(value: string): boolean {
  if (!value) return false;
  return /^[\d+\-()\s]{3,50}$/.test(value);
}

export function isValidName(value: string): boolean {
  if (!value) return false;
  return value.length <= 100;
}

export function isValidNickname(value: string): boolean {
  if (!value) return false;
  return value.length <= 100;
}

export function isValidLabel(value?: string): boolean {
  if (value === undefined || value === null) return true;
  return value.length <= 50;
}

export type FieldError = { field: string; message: string };

export function validateEntry(
  type: FieldType,
  value: string,
  label?: string,
): { valid: boolean; errors: FieldError[] } {
  const errors: FieldError[] = [];

  if (!FIELD_TYPES.includes(type)) {
    errors.push({ field: 'type', message: 'Unsupported type' });
    return { valid: false, errors };
  }

  if (!isValidLabel(label)) {
    errors.push({ field: 'label', message: 'Label must be 50 characters or less' });
  }

  switch (type) {
    case 'email':
      if (!isValidEmail(value)) {
        errors.push({ field: 'value', message: 'Invalid email address' });
      }
      break;
    case 'evm':
      if (!isValidEvmAddress(value)) {
        errors.push({ field: 'value', message: 'Invalid EVM address (must be EIP-55 checksum)' });
      }
      break;
    case 'btc':
      if (!isValidBtcAddress(value)) {
        errors.push({ field: 'value', message: 'Invalid Bitcoin address' });
      }
      break;
    case 'discord':
    case 'telegram':
    case 'x': {
      const normalized = normalizeHandle(value);
      if (!normalized || normalized.length < 2) {
        errors.push({ field: 'value', message: 'Handle cannot be empty' });
      }
      break;
    }
    case 'phone':
      if (!isValidPhone(value)) {
        errors.push({ field: 'value', message: 'Invalid phone number' });
      }
      break;
    case 'firstName':
    case 'lastName':
      if (!isValidName(value)) {
        errors.push({ field: 'value', message: 'Name must be 1-100 characters' });
      }
      break;
    case 'nickname':
      if (!isValidNickname(value)) {
        errors.push({ field: 'value', message: 'Nickname must be 1-100 characters' });
      }
      break;
  }

  return { valid: errors.length === 0, errors };
}

export function normalizeEntryValue(type: FieldType, value: string): string {
  if (type === 'discord' || type === 'telegram' || type === 'x') {
    return normalizeHandle(value);
  }
  return value.trim();
}

export function isHighConfidence(score: number): boolean {
  return score >= HIGH_CONFIDENCE_THRESHOLD;
}

export function isLowConfidence(score: number): boolean {
  return score >= LOW_CONFIDENCE_THRESHOLD && score < HIGH_CONFIDENCE_THRESHOLD;
}

export function formatError(code: string, fallback = 'Unknown error'): string {
  const messages: Record<string, string> = {
    [ERROR_CODES.E_PIN_MISMATCH]: 'PIN не совпадает',
    [ERROR_CODES.E_PIN_INVALID_FORMAT]: 'PIN должен состоять ровно из 4 цифр',
    [ERROR_CODES.E_PIN_WRONG]: 'Неверный PIN',
    [ERROR_CODES.E_PIN_LOCKED]: 'Профиль заблокирован. Перезапустите браузер.',
    [ERROR_CODES.E_CRYPTO_DECRYPT]: 'Ошибка расшифровки профиля',
    [ERROR_CODES.E_CRYPTO_ENCRYPT]: 'Ошибка шифрования профиля',
    [ERROR_CODES.E_VALIDATION_FORMAT]: 'Некорректный формат значения',
    [ERROR_CODES.E_VALIDATION_DUPLICATE]: 'Только одна запись типа может быть по умолчанию',
    [ERROR_CODES.E_MENU_EMPTY]: 'Нет сохранённых данных. Добавьте записи в popup.',
    [ERROR_CODES.E_INSERT_FAILED]: 'Не удалось вставить значение',
    [ERROR_CODES.E_IMPORT_INVALID]: 'Некорректный файл экспорта',
    [ERROR_CODES.E_SESSION_EXPIRED]: 'Сессия истекла. Введите PIN повторно.',
  };
  return messages[code] || fallback;
}
