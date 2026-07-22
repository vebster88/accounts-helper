// src/content/field-detector.ts

import {
  HIGH_CONFIDENCE_THRESHOLD,
  LOW_CONFIDENCE_THRESHOLD,
  type FieldType,
  FIELD_TYPES,
} from '../shared/constants';
import type { DetectedFieldType, ElementInfo } from '../shared/types';

const PATTERNS: Record<FieldType, string[]> = {
  email: ['email', 'e-mail', 'mail', 'почта', 'электронная'],
  evm: [
    'wallet',
    'address',
    'evm',
    'eth',
    'ethereum',
    'bsc',
    'polygon',
    'arb',
    'arbitrum',
    'op',
    'optimism',
    'metamask',
    '0x',
  ],
  btc: ['bitcoin', 'btc', 'bc1'],
  discord: ['discord', 'discordid', 'discordusername', 'discordname'],
  telegram: ['telegram', 'tg', 'telegramusername', 'telegramid'],
  x: ['twitter', 'x', 'xhandle', 'twitterhandle'],
  phone: ['phone', 'tel', 'mobile', 'номер', 'телефон'],
  firstName: ['first name', 'firstname', 'fname', 'имя'],
  lastName: ['last name', 'lastname', 'lname', 'фамилия'],
  nickname: ['nickname', 'nick', 'username', 'псевдоним', 'ник'],
};

const BASE_WEIGHTS: Record<FieldType, number> = {
  email: 10,
  evm: 10,
  btc: 10,
  discord: 10,
  telegram: 10,
  x: 10,
  phone: 8,
  firstName: 8,
  lastName: 8,
  nickname: 8,
};

export function detectFieldType(element: Element): DetectedFieldType {
  const info = collectElementInfo(element);
  return detectFromElementInfo(info);
}

export function collectElementInfo(element: Element): ElementInfo {
  const el = element as HTMLElement;
  const input = element as HTMLInputElement;
  const labelText = getLabelText(element);
  const ancestorText = getAncestorText(element);
  return {
    tagName: element.tagName,
    type: input.type,
    name: input.name,
    id: element.id,
    placeholder: input.placeholder,
    autocomplete: input.autocomplete,
    ariaLabel: el.getAttribute('aria-label') || undefined,
    inputmode: el.getAttribute('inputmode') || undefined,
    labelText,
    ancestorText,
  };
}

function cssEscape(value: string): string {
  return value.replace(/([!"#$%&'()*+,./:;<=>?@[\\\]^`{|}~])/g, '\\$1');
}

function getLabelText(element: Element): string {
  if (element.id) {
    const label = document.querySelector(`label[for="${cssEscape(element.id)}"]`);
    if (label) return label.textContent || '';
  }
  const closestLabel = element.closest('label');
  if (closestLabel) {
    const clone = closestLabel.cloneNode(true) as HTMLElement;
    const childInputs = clone.querySelectorAll('input, textarea, select');
    childInputs.forEach((child) => child.remove());
    return clone.textContent || '';
  }
  return '';
}

function getAncestorText(element: Element, depth = 3): string {
  if (depth <= 0) return '';
  const parent = element.parentElement;
  if (!parent) return '';
  const text = parent.textContent || '';
  return text.slice(0, 200);
}

export function detectFromElementInfo(info: ElementInfo): DetectedFieldType {
  const scores: Record<FieldType, number> = {
    email: 0,
    evm: 0,
    btc: 0,
    discord: 0,
    telegram: 0,
    x: 0,
    phone: 0,
    firstName: 0,
    lastName: 0,
    nickname: 0,
  };

  const signals: { text: string; weightFactor: number }[] = [
    { text: info.name || '', weightFactor: 1 },
    { text: info.id || '', weightFactor: 1 },
    { text: info.autocomplete || '', weightFactor: 1 },
    { text: info.labelText || '', weightFactor: 1 },
    { text: info.placeholder || '', weightFactor: 0.5 },
    { text: info.ariaLabel || '', weightFactor: 0.5 },
    { text: info.ancestorText || '', weightFactor: 0.5 },
  ];

  if (info.type) {
    const t = info.type.toLowerCase();
    if (t === 'email') scores.email += BASE_WEIGHTS.email * 2;
    if (t === 'tel') scores.phone += BASE_WEIGHTS.phone * 2;
  }

  if (info.inputmode) {
    const m = info.inputmode.toLowerCase();
    if (m === 'email') scores.email += BASE_WEIGHTS.email * 2;
    if (m === 'tel') scores.phone += BASE_WEIGHTS.phone * 2;
  }

  // Special substrings for EVM/BTC.
  const allText = [info.name, info.id, info.placeholder, info.ariaLabel, info.labelText, info.ancestorText]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  if (allText.includes('0x')) scores.evm += 5;
  if (allText.includes('bc1')) scores.btc += 5;

  for (const signal of signals) {
    const normalized = normalizeText(signal.text);
    for (const type of FIELD_TYPES) {
      const base = BASE_WEIGHTS[type];
      for (const pattern of PATTERNS[type]) {
        if (normalized.includes(pattern.toLowerCase())) {
          scores[type] += base * signal.weightFactor;
        }
      }
    }
  }

  let bestType: FieldType | null = null;
  let bestScore = 0;
  for (const type of FIELD_TYPES) {
    if (scores[type] > bestScore) {
      bestScore = scores[type];
      bestType = type;
    }
  }

  let confidence: 'high' | 'low' | 'none';
  if (bestScore >= HIGH_CONFIDENCE_THRESHOLD) confidence = 'high';
  else if (bestScore >= LOW_CONFIDENCE_THRESHOLD) confidence = 'low';
  else confidence = 'none';

  return { type: bestType, confidence, score: bestScore };
}

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-zа-яё0-9\s@0x]/gi, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
