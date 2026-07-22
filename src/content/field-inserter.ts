// src/content/field-inserter.ts

export function insertValueIntoActiveElement(value: string): boolean {
  const el = document.activeElement as HTMLElement | null;
  if (!el) return false;

  if (el.isContentEditable || el.getAttribute('contenteditable') === 'true') {
    const selection = window.getSelection();
    const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
    if (range) {
      range.deleteContents();
      range.insertNode(document.createTextNode(value));
      range.collapse(false);
    } else {
      el.textContent = value;
    }
    dispatchInputEvents(el);
    highlightElement(el);
    return true;
  }

  const input = el as HTMLInputElement | HTMLTextAreaElement;
  if (!input) return false;

  setNativeValue(input, value);
  dispatchInputEvents(input);
  highlightElement(input);
  return true;
}

function setNativeValue(input: HTMLInputElement | HTMLTextAreaElement, value: string): void {
  const descriptor = Object.getOwnPropertyDescriptor(
    Object.getPrototypeOf(input),
    'value',
  );
  const nativeSetter = descriptor?.set;

  input.focus();
  if (nativeSetter) {
    nativeSetter.call(input, value);
  } else {
    input.value = value;
  }
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
