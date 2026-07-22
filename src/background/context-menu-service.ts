// src/background/context-menu-service.ts

import {
  ERROR_CODES,
  FIELD_TYPE_LABELS,
  HIGH_CONFIDENCE_THRESHOLD,
  LOW_CONFIDENCE_THRESHOLD,
  MENU_ID_ALL,
  MENU_ID_EMPTY,
  MENU_ID_FALLBACK_PREFIX,
  MENU_ID_LOCK,
  MENU_ID_PREFIX,
  MENU_ID_ROOT,
  type FieldType,
  FIELD_TYPES,
} from '../shared/constants';
import type { DetectedFieldType, MenuClickInfo, Profile, ProfileEntry } from '../shared/types';
import { shortPreview } from '../shared/helpers';
import { getEntriesByType } from './profile-service';

let lastDetectedType: DetectedFieldType | null = null;

export function updateDetectedType(detected: DetectedFieldType): void {
  lastDetectedType = detected;
}

export function getLastDetectedType(): DetectedFieldType | null {
  return lastDetectedType;
}

export function buildContextMenu(profile: Profile, detected: DetectedFieldType): void {
  // Remove old menu and recreate root.
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: MENU_ID_ROOT,
      title: 'AccountsHelper',
      contexts: ['editable'],
    });

    const hasEntries = profile.entries.length > 0;

    if (!hasEntries) {
      chrome.contextMenus.create({
        id: MENU_ID_EMPTY,
        parentId: MENU_ID_ROOT,
        title: 'Нет сохранённых данных',
        contexts: ['editable'],
        enabled: false,
      });
      return;
    }

    const { type, confidence } = detected;

    // Direct type entries for high confidence.
    if (type && (confidence === 'high' || confidence === 'low')) {
      createEntriesMenu(profile, type, MENU_ID_ROOT);
    }

    // All data fallback.
    chrome.contextMenus.create({
      id: MENU_ID_ALL,
      parentId: MENU_ID_ROOT,
      title: 'Все данные',
      contexts: ['editable'],
    });

    for (const ft of FIELD_TYPES) {
      const entries = getEntriesByType(profile, ft);
      if (entries.length === 0) continue;
      const categoryId = `${MENU_ID_FALLBACK_PREFIX}${ft}`;
      chrome.contextMenus.create({
        id: categoryId,
        parentId: MENU_ID_ALL,
        title: FIELD_TYPE_LABELS[ft],
        contexts: ['editable'],
      });
      for (const entry of entries) {
        chrome.contextMenus.create({
          id: `${MENU_ID_PREFIX}${ft}::${entry.id}`,
          parentId: categoryId,
          title: menuEntryTitle(entry),
          contexts: ['editable'],
        });
      }
    }

    // Lock action.
    chrome.contextMenus.create({
      id: MENU_ID_LOCK,
      parentId: MENU_ID_ROOT,
      title: 'Заблокировать',
      contexts: ['editable'],
    });
  });
}

function createEntriesMenu(profile: Profile, type: FieldType, parentId: string): void {
  const entries = getEntriesByType(profile, type);
  if (entries.length === 0) return;
  for (const entry of entries) {
    chrome.contextMenus.create({
      id: `${MENU_ID_PREFIX}${type}::${entry.id}`,
      parentId,
      title: menuEntryTitle(entry),
      contexts: ['editable'],
    });
  }
}

export function menuEntryTitle(entry: ProfileEntry): string {
  const label = entry.label?.trim();
  if (label) return `${entry.isDefault ? '★ ' : ''}${label}`;
  const preview = shortPreview(entry.value, 20);
  return `${entry.isDefault ? '★ ' : ''}${preview}`;
}

export function parseMenuItemId(menuItemId: string): { type: FieldType; entryId: string } | null {
  const prefix = MENU_ID_PREFIX;
  if (!menuItemId.startsWith(prefix)) return null;
  const rest = menuItemId.slice(prefix.length);
  const parts = rest.split('::');
  if (parts.length !== 2) return null;
  const [type, entryId] = parts;
  if (!FIELD_TYPES.includes(type as FieldType)) return null;
  return { type: type as FieldType, entryId };
}

export function isLockMenuItem(menuItemId: string): boolean {
  return menuItemId === MENU_ID_LOCK;
}

export function isAllDataMenuItem(menuItemId: string): boolean {
  return menuItemId === MENU_ID_ALL || menuItemId.startsWith(MENU_ID_FALLBACK_PREFIX);
}

export function isHighConfidence(score: number): boolean {
  return score >= HIGH_CONFIDENCE_THRESHOLD;
}

export function isLowConfidence(score: number): boolean {
  return score >= LOW_CONFIDENCE_THRESHOLD && score < HIGH_CONFIDENCE_THRESHOLD;
}
