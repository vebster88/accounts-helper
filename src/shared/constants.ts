// src/shared/constants.ts

export const STORAGE_PREFIX = 'accountsHelper.';

export const STORAGE_KEYS = {
  encryptedProfile: `${STORAGE_PREFIX}encryptedProfile`,
  meta: `${STORAGE_PREFIX}meta`,
} as const;

export const SESSION_KEYS = {
  dekHandle: `${STORAGE_PREFIX}dekHandle`,
  pinAttempts: `${STORAGE_PREFIX}pinAttempts`,
  locked: `${STORAGE_PREFIX}locked`,
} as const;

export const ENCRYPTION_FORMAT_VERSION = 1;
export const PROFILE_SCHEMA_VERSION = 1;

export const PBKDF2_ITERATIONS = 600_000;
export const PBKDF2_HASH = 'SHA-256';
export const AES_KEY_LENGTH = 256;
export const AES_ALGORITHM = 'AES-GCM';
export const SALT_LENGTH_BYTES = 16;
export const IV_LENGTH_BYTES = 12;

export const PIN_ATTEMPTS_LIMIT = 5;

export const FIELD_TYPES = [
  'email',
  'evm',
  'btc',
  'discord',
  'telegram',
  'x',
  'phone',
  'firstName',
  'lastName',
  'nickname',
] as const;

export type FieldType = (typeof FIELD_TYPES)[number];

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  email: 'Email',
  evm: 'EVM адреса',
  btc: 'BTC адреса',
  discord: 'Discord',
  telegram: 'Telegram',
  x: 'X / Twitter',
  phone: 'Телефон',
  firstName: 'Имя',
  lastName: 'Фамилия',
  nickname: 'Никнейм',
};

export const HIGH_CONFIDENCE_THRESHOLD = 10;
export const LOW_CONFIDENCE_THRESHOLD = 4;

export const MENU_ID_ROOT = 'accountshelper::root';
export const MENU_ID_ALL = 'accountshelper::fallback::all';
export const MENU_ID_LOCK = 'accountshelper::action::lock';
export const MENU_ID_EMPTY = 'accountshelper::empty';

export const MENU_ID_PREFIX = 'accountshelper::insert::';
export const MENU_ID_FALLBACK_PREFIX = 'accountshelper::fallback::';

export const ERROR_CODES = {
  E_PIN_MISMATCH: 'E_PIN_MISMATCH',
  E_PIN_INVALID_FORMAT: 'E_PIN_INVALID_FORMAT',
  E_PIN_WRONG: 'E_PIN_WRONG',
  E_PIN_LOCKED: 'E_PIN_LOCKED',
  E_CRYPTO_DECRYPT: 'E_CRYPTO_DECRYPT',
  E_CRYPTO_ENCRYPT: 'E_CRYPTO_ENCRYPT',
  E_VALIDATION_FORMAT: 'E_VALIDATION_FORMAT',
  E_VALIDATION_DUPLICATE: 'E_VALIDATION_DUPLICATE',
  E_MENU_EMPTY: 'E_MENU_EMPTY',
  E_INSERT_FAILED: 'E_INSERT_FAILED',
  E_IMPORT_INVALID: 'E_IMPORT_INVALID',
  E_SESSION_EXPIRED: 'E_SESSION_EXPIRED',
} as const;
