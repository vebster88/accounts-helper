// src/background/export-import-service.ts

import type { AccountsHelperExport, EncryptedProfileBlob } from '../shared/types';
import { nowIso } from '../shared/helpers';

export function exportToJson(blob: EncryptedProfileBlob): string {
  const exportData: AccountsHelperExport = {
    ...blob,
    exportedAt: nowIso(),
  };
  return JSON.stringify(exportData, null, 2);
}

export function parseExportJson(json: string): AccountsHelperExport {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('E_IMPORT_INVALID');
  }
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('E_IMPORT_INVALID');
  }
  const data = parsed as Record<string, unknown>;
  const required = ['version', 'kdf', 'kdfParams', 'encryptedDek', 'dekIv', 'iv', 'ciphertext', 'checksum'];
  for (const key of required) {
    if (data[key] === undefined) {
      throw new Error('E_IMPORT_INVALID');
    }
  }
  if (data.kdf !== 'pbkdf2-sha256') {
    throw new Error('E_IMPORT_INVALID');
  }
  return data as unknown as AccountsHelperExport;
}

export function blobFromExport(exportData: AccountsHelperExport): EncryptedProfileBlob {
  const { exportedAt, ...blob } = exportData;
  void exportedAt;
  return blob;
}
