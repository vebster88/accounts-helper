import { initializeExtension } from './lifecycle';

initializeExtension();

// Also hook context menu clicks here because background service worker should handle them.
import { ERROR_CODES, type FieldType, FIELD_TYPES, MENU_ID_LOCK } from '../shared/constants';
import type { ProfileEntry } from '../shared/types';
import { getCachedProfile } from './messaging-router';
import { isLockMenuItem, parseMenuItemId } from './context-menu-service';
import { clearSessionWithMemo } from './messaging-router';

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const parsed = parseMenuItemId(String(info.menuItemId));
  if (!parsed && !isLockMenuItem(String(info.menuItemId))) return;

  if (isLockMenuItem(String(info.menuItemId))) {
    await clearSessionWithMemo();
    return;
  }

  if (!parsed) return;

  const profile = getCachedProfile();
  if (!profile) {
    // No active session: cannot insert. We could notify user but context menu can't show toasts.
    return;
  }
  const entry = profile.entries.find((e) => e.id === parsed.entryId);
  if (!entry || entry.type !== parsed.type) return;

  if (!tab?.id) return;
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: insertValueIntoActiveElement,
    args: [entry.value],
  });
});

function insertValueIntoActiveElement(value: string): void {
  const el = document.activeElement as HTMLElement | null;
  if (!el) return;

  if (el.isContentEditable || (el as HTMLElement).getAttribute('contenteditable') === 'true') {
    const range = window.getSelection()?.getRangeAt(0);
    if (range) {
      range.deleteContents();
      range.insertNode(document.createTextNode(value));
      range.collapse(false);
    }
    dispatchInputEvents(el);
    highlightElement(el);
    return;
  }

  const input = el as HTMLInputElement | HTMLTextAreaElement | null;
  if (!input) return;

  const descriptor = Object.getOwnPropertyDescriptor(
    (input as HTMLInputElement).constructor.prototype,
    'value',
  );
  const nativeSetter = descriptor?.set;

  input.focus();
  if (nativeSetter) {
    nativeSetter.call(input, value);
  } else {
    input.value = value;
  }
  dispatchInputEvents(input);
  highlightElement(input);
}

function dispatchInputEvents(el: EventTarget): void {
  el.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
  el.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
}

function highlightElement(el: HTMLElement): void {
  const originalTransition = el.style.transition;
  const originalBoxShadow = el.style.boxShadow;
  el.style.transition = 'box-shadow 0.2s ease';
  el.style.boxShadow = '0 0 0 3px rgba(66, 133, 244, 0.6)';
  setTimeout(() => {
    el.style.boxShadow = originalBoxShadow;
    el.style.transition = originalTransition;
  }, 1000);
}
