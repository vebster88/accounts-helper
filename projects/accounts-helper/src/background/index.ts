import { initializeExtension } from './lifecycle';

initializeExtension();

// Also hook context menu clicks here because background service worker should handle them.
import { type FieldType, FIELD_TYPES, MENU_ID_LOCK } from '../shared/constants';
import type { ProfileEntry } from '../shared/types';
import { getCachedProfile } from './messaging-router';
import { isLockMenuItem, parseMenuItemId } from './context-menu-service';
import { clearSession } from './session-key-store';

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const parsed = parseMenuItemId(String(info.menuItemId));
  if (!parsed && !isLockMenuItem(String(info.menuItemId))) return;

  if (isLockMenuItem(String(info.menuItemId))) {
    await clearSession();
    return;
  }

  if (!parsed) return;

  const profile = getCachedProfile();
  if (!profile) {
    if (tab?.id) {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: showPageNotification,
        args: ['Сначала разблокируйте профиль в окне расширения'],
      });
    }
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

function showPageNotification(message: string): void {
  const div = document.createElement('div');
  div.textContent = message;
  div.style.position = 'fixed';
  div.style.top = '16px';
  div.style.left = '50%';
  div.style.transform = 'translateX(-50%)';
  div.style.zIndex = '2147483647';
  div.style.background = '#323232';
  div.style.color = '#fff';
  div.style.padding = '12px 20px';
  div.style.borderRadius = '8px';
  div.style.fontFamily = 'sans-serif';
  div.style.fontSize = '14px';
  div.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 3000);
}

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
