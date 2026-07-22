import { describe, it, expect } from 'vitest';
import {
  createNewEncryptedProfile,
  decryptProfile,
  changePin,
} from '../../src/background/crypto-service';

describe('crypto-service', () => {
  it('creates and decrypts profile', async () => {
    const { blob } = await createNewEncryptedProfile('1234');
    expect(blob.version).toBe(1);
    expect(blob.kdf).toBe('pbkdf2-sha256');
    expect(blob.kdfParams.iterations).toBe(600000);

    const { profile } = await decryptProfile('1234', blob);
    expect(profile.version).toBe(1);
    expect(profile.entries).toEqual([]);
  });

  it('fails to decrypt with wrong PIN', async () => {
    const { blob } = await createNewEncryptedProfile('1234');
    await expect(decryptProfile('9999', blob)).rejects.toThrow('E_CRYPTO_DECRYPT');
  });

  it('changes PIN and decrypts with new PIN', async () => {
    const { blob } = await createNewEncryptedProfile('1234');
    const newBlob = await changePin('1234', '5678', blob);
    const { profile } = await decryptProfile('5678', newBlob);
    expect(profile.entries).toEqual([]);
    await expect(decryptProfile('1234', newBlob)).rejects.toThrow('E_CRYPTO_DECRYPT');
  });
});
