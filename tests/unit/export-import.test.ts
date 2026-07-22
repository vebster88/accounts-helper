import { describe, it, expect } from 'vitest';
import {
  exportToJson,
  parseExportJson,
  blobFromExport,
} from '../../src/background/export-import-service';
import type { EncryptedProfileBlob } from '../../src/shared/types';

const sampleBlob: EncryptedProfileBlob = {
  version: 1,
  kdf: 'pbkdf2-sha256',
  kdfParams: { salt: 'c2FsdA==', iterations: 600000 },
  encryptedDek: 'ZW5j',
  dekIv: 'ZGVrSXY=',
  iv: 'aXY=',
  ciphertext: 'Y2lwaGVy',
  checksum: 'Y2hlY2s=',
};

describe('export-import-service', () => {
  it('exports to valid JSON with exportedAt', () => {
    const json = exportToJson(sampleBlob);
    const parsed = JSON.parse(json);
    expect(parsed.version).toBe(1);
    expect(parsed.kdf).toBe('pbkdf2-sha256');
    expect(parsed.exportedAt).toBeDefined();
  });

  it('parses valid export JSON', () => {
    const json = exportToJson(sampleBlob);
    const parsed = parseExportJson(json);
    expect(parsed.version).toBe(1);
  });

  it('rejects invalid JSON', () => {
    expect(() => parseExportJson('not json')).toThrow('E_IMPORT_INVALID');
    expect(() => parseExportJson('{}')).toThrow('E_IMPORT_INVALID');
    expect(() => parseExportJson('{"version":2,"kdf":"scrypt"}')).toThrow('E_IMPORT_INVALID');
  });

  it('converts export to blob', () => {
    const json = exportToJson(sampleBlob);
    const parsed = parseExportJson(json);
    const blob = blobFromExport(parsed);
    expect('exportedAt' in blob).toBe(false);
    expect(blob.version).toBe(1);
  });
});
