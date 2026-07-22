// src/background/crypto-service.ts

import {
  AES_ALGORITHM,
  AES_KEY_LENGTH,
  ENCRYPTION_FORMAT_VERSION,
  IV_LENGTH_BYTES,
  PBKDF2_HASH,
  PBKDF2_ITERATIONS,
  SALT_LENGTH_BYTES,
} from '../shared/constants';
import type { EncryptedProfileBlob, KdfParams, Profile } from '../shared/types';
import { bytesToB64, b64ToBytes, sha256Hex } from '../shared/helpers';

const ENCODER = new TextEncoder();

export interface DekBundle {
  dek: CryptoKey;
  blob: EncryptedProfileBlob;
}

function asArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

async function deriveKek(pin: string, kdfParams: KdfParams): Promise<CryptoKey> {
  const salt = b64ToBytes(kdfParams.salt);
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    ENCODER.encode(pin),
    { name: 'PBKDF2' },
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: asArrayBuffer(salt),
      iterations: kdfParams.iterations,
      hash: PBKDF2_HASH,
    },
    keyMaterial,
    { name: AES_ALGORITHM, length: AES_KEY_LENGTH },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function createNewEncryptedProfile(pin: string): Promise<DekBundle> {
  const profile: Profile = {
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    entries: [],
  };

  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH_BYTES));
  const kdfParams: KdfParams = {
    salt: bytesToB64(salt),
    iterations: PBKDF2_ITERATIONS,
  };

  const kek = await deriveKek(pin, kdfParams);

  const dek = await crypto.subtle.generateKey(
    { name: AES_ALGORITHM, length: AES_KEY_LENGTH },
    true,
    ['encrypt', 'decrypt'],
  );

  const dekIv = crypto.getRandomValues(new Uint8Array(IV_LENGTH_BYTES));
  const exportedDek = await crypto.subtle.exportKey('raw', dek);
  const encryptedDek = await crypto.subtle.encrypt(
    { name: AES_ALGORITHM, iv: asArrayBuffer(dekIv) },
    kek,
    exportedDek,
  );

  const dataIv = crypto.getRandomValues(new Uint8Array(IV_LENGTH_BYTES));
  const ciphertext = await crypto.subtle.encrypt(
    { name: AES_ALGORITHM, iv: asArrayBuffer(dataIv) },
    dek,
    ENCODER.encode(JSON.stringify(profile)),
  );

  const blob: EncryptedProfileBlob = {
    version: ENCRYPTION_FORMAT_VERSION,
    kdf: 'pbkdf2-sha256',
    kdfParams,
    encryptedDek: bytesToB64(new Uint8Array(encryptedDek)),
    dekIv: bytesToB64(dekIv),
    iv: bytesToB64(dataIv),
    ciphertext: bytesToB64(new Uint8Array(ciphertext)),
    checksum: '',
  };

  blob.checksum = await computeChecksum(blob);

  return { dek, blob };
}

export async function reEncryptProfileWithDek(
  dek: CryptoKey,
  profile: Profile,
  oldBlob: EncryptedProfileBlob,
): Promise<EncryptedProfileBlob> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH_BYTES));
  const ciphertext = await crypto.subtle.encrypt(
    { name: AES_ALGORITHM, iv: asArrayBuffer(iv) },
    dek,
    ENCODER.encode(JSON.stringify(profile)),
  );
  const blob: EncryptedProfileBlob = {
    version: ENCRYPTION_FORMAT_VERSION,
    kdf: 'pbkdf2-sha256',
    kdfParams: oldBlob.kdfParams,
    encryptedDek: oldBlob.encryptedDek,
    dekIv: oldBlob.dekIv,
    iv: bytesToB64(iv),
    ciphertext: bytesToB64(new Uint8Array(ciphertext)),
    checksum: '',
  };
  blob.checksum = await computeChecksum(blob);
  return blob;
}

export async function encryptProfile(pin: string, profile: Profile, oldBlob?: EncryptedProfileBlob): Promise<EncryptedProfileBlob> {
  let dek: CryptoKey;
  let kdfParams: KdfParams;
  let dekIv: Uint8Array;
  let encryptedDek: ArrayBuffer;

  if (oldBlob) {
    kdfParams = oldBlob.kdfParams;
    const kek = await deriveKek(pin, kdfParams);
    dek = await unwrapDek(kek, oldBlob);
    dekIv = b64ToBytes(oldBlob.dekIv);
    encryptedDek = asArrayBuffer(b64ToBytes(oldBlob.encryptedDek));
  } else {
    const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH_BYTES));
    kdfParams = { salt: bytesToB64(salt), iterations: PBKDF2_ITERATIONS };
    const kek = await deriveKek(pin, kdfParams);
    dek = await crypto.subtle.generateKey(
      { name: AES_ALGORITHM, length: AES_KEY_LENGTH },
      true,
      ['encrypt', 'decrypt'],
    );
    dekIv = crypto.getRandomValues(new Uint8Array(IV_LENGTH_BYTES));
    const exportedDek = await crypto.subtle.exportKey('raw', dek);
    encryptedDek = await crypto.subtle.encrypt(
      { name: AES_ALGORITHM, iv: asArrayBuffer(dekIv) },
      kek,
      exportedDek,
    );
  }

  const dataIv = crypto.getRandomValues(new Uint8Array(IV_LENGTH_BYTES));
  const ciphertext = await crypto.subtle.encrypt(
    { name: AES_ALGORITHM, iv: asArrayBuffer(dataIv) },
    dek,
    ENCODER.encode(JSON.stringify(profile)),
  );

  const blob: EncryptedProfileBlob = {
    version: ENCRYPTION_FORMAT_VERSION,
    kdf: 'pbkdf2-sha256',
    kdfParams,
    encryptedDek: bytesToB64(new Uint8Array(encryptedDek)),
    dekIv: bytesToB64(dekIv),
    iv: bytesToB64(dataIv),
    ciphertext: bytesToB64(new Uint8Array(ciphertext)),
    checksum: '',
  };

  blob.checksum = await computeChecksum(blob);
  return blob;
}

export async function decryptProfile(pin: string, blob: EncryptedProfileBlob): Promise<{ profile: Profile; dek: CryptoKey }> {
  await validateBlob(blob);
  const kek = await deriveKek(pin, blob.kdfParams);
  const dek = await unwrapDek(kek, blob);
  const dataIv = b64ToBytes(blob.iv);
  const ciphertext = b64ToBytes(blob.ciphertext);

  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: AES_ALGORITHM, iv: asArrayBuffer(dataIv) },
      dek,
      asArrayBuffer(ciphertext),
    );
    const json = new TextDecoder().decode(decrypted);
    const profile = JSON.parse(json) as Profile;
    return { profile, dek };
  } catch (err) {
    throw new Error('E_CRYPTO_DECRYPT');
  }
}

async function unwrapDek(kek: CryptoKey, blob: EncryptedProfileBlob): Promise<CryptoKey> {
  const dekIv = b64ToBytes(blob.dekIv);
  const encryptedDek = b64ToBytes(blob.encryptedDek);
  try {
    const decryptedDek = await crypto.subtle.decrypt(
      { name: AES_ALGORITHM, iv: asArrayBuffer(dekIv) },
      kek,
      asArrayBuffer(encryptedDek),
    );
    return crypto.subtle.importKey(
      'raw',
      decryptedDek,
      { name: AES_ALGORITHM, length: AES_KEY_LENGTH },
      false,
      ['encrypt', 'decrypt'],
    );
  } catch (err) {
    throw new Error('E_CRYPTO_DECRYPT');
  }
}

export async function validateBlob(blob: EncryptedProfileBlob): Promise<void> {
  if (!blob || typeof blob.version !== 'number') {
    throw new Error('E_IMPORT_INVALID');
  }
  if (blob.version !== ENCRYPTION_FORMAT_VERSION) {
    throw new Error('E_IMPORT_INVALID');
  }
  if (blob.kdf !== 'pbkdf2-sha256') {
    throw new Error('E_IMPORT_INVALID');
  }
  if (!blob.kdfParams || !blob.kdfParams.salt || typeof blob.kdfParams.iterations !== 'number') {
    throw new Error('E_IMPORT_INVALID');
  }
  if (!blob.encryptedDek || !blob.dekIv || !blob.iv || !blob.ciphertext || !blob.checksum) {
    throw new Error('E_IMPORT_INVALID');
  }
  const checksum = await computeChecksum(blob);
  if (checksum !== blob.checksum) {
    throw new Error('E_IMPORT_INVALID');
  }
}

export async function computeChecksum(blob: EncryptedProfileBlob): Promise<string> {
  const canonical = JSON.stringify({
    version: blob.version,
    kdf: blob.kdf,
    kdfParams: blob.kdfParams,
    encryptedDek: blob.encryptedDek,
    dekIv: blob.dekIv,
    iv: blob.iv,
    ciphertext: blob.ciphertext,
  });
  return sha256Hex(canonical);
}

export async function changePin(
  oldPin: string,
  newPin: string,
  blob: EncryptedProfileBlob,
): Promise<EncryptedProfileBlob> {
  const { profile } = await decryptProfile(oldPin, blob);
  profile.updatedAt = new Date().toISOString();
  return encryptProfile(newPin, profile);
}

