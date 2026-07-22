// src/content/context-adapter.ts

import { MESSAGE_TYPES } from '../shared/messaging';
import { collectElementInfo, detectFromElementInfo } from './field-detector';
import { insertValueIntoActiveElement } from './field-inserter';
import type { DetectedFieldType, ElementInfo, MessageResponse } from '../shared/types';

let lastDetected: DetectedFieldType | null = null;
let lastElementInfo: ElementInfo | null = null;

export function startContextAdapter(): void {
  // Listen for right-click context menu open to report active element.
  document.addEventListener('contextmenu', (event) => {
    const target = event.target as Element | null;
    if (!target) return;
    if (!isEditable(target)) return;
    const info = collectElementInfo(target);
    lastElementInfo = info;
    const detected = detectFromElementInfo(info);
    lastDetected = detected;

    chrome.runtime.sendMessage(
      { type: MESSAGE_TYPES.REQUEST_FIELD_TYPE, payload: { elementInfo: info, detected } },
      () => {
        // No-op; ignore response errors.
      },
    );
  });

  // Listen for insert value requests from service worker.
  chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    if (request.type === MESSAGE_TYPES.INSERT_VALUE) {
      const value = request.payload?.value as string;
      const ok = insertValueIntoActiveElement(value);
      sendResponse({ success: ok, error: ok ? undefined : 'E_INSERT_FAILED' } as MessageResponse);
      return true;
    }
    return false;
  });
}

function isEditable(el: Element): boolean {
  const htmlEl = el as HTMLElement;
  if (htmlEl.isContentEditable || el.getAttribute('contenteditable') === 'true') return true;
  const tag = el.tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea') {
    const input = el as HTMLInputElement;
    const type = input.type?.toLowerCase() || 'text';
    return !['button', 'submit', 'reset', 'image', 'hidden', 'checkbox', 'radio', 'file'].includes(type);
  }
  return false;
}
