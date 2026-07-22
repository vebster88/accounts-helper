// src/shared/types.ts

import type { FieldType } from './constants';

export interface ProfileEntry {
  id: string;
  type: FieldType;
  value: string;
  label?: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Profile {
  version: number;
  createdAt: string;
  updatedAt: string;
  entries: ProfileEntry[];
}

export interface KdfParams {
  salt: string; // base64
  iterations: number;
}

export interface EncryptedProfileBlob {
  version: number;
  kdf: 'pbkdf2-sha256';
  kdfParams: KdfParams;
  encryptedDek: string; // base64
  dekIv: string; // base64, IV for encryptedDek
  iv: string; // base64, IV for ciphertext
  ciphertext: string; // base64
  checksum: string; // hex SHA-256(blob)
}

export interface ProfileMeta {
  version: number;
  createdAt: string;
  updatedAt: string;
  hasProfile: boolean;
}

export interface AccountsHelperExport extends EncryptedProfileBlob {
  exportedAt: string;
}

export interface ElementInfo {
  tagName: string;
  type?: string;
  name?: string;
  id?: string;
  placeholder?: string;
  autocomplete?: string;
  ariaLabel?: string;
  inputmode?: string;
  labelText?: string;
  ancestorText?: string;
}

export interface DetectedFieldType {
  type: FieldType | null;
  confidence: 'high' | 'low' | 'none';
  score: number;
}

export interface MessageResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  attemptsLeft?: number;
  fieldErrors?: Record<string, string>;
}

export interface BaseMessage {
  type: string;
  payload?: unknown;
}

export type MenuItemId = string;

export interface MenuClickInfo {
  menuItemId: MenuItemId;
  parentMenuItemId?: MenuItemId;
  editable?: boolean;
  selectionText?: string;
  pageUrl?: string;
}
