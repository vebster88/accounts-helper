import { describe, it, expect, beforeAll } from 'vitest';
import { JSDOM } from 'jsdom';
import {
  collectElementInfo,
  detectFromElementInfo,
  detectFieldType,
} from '../../src/content/field-detector';

describe('field-detector', () => {
  let dom: JSDOM;

  beforeAll(() => {
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    (globalThis as { document?: Document }).document = dom.window.document;
    (globalThis as { HTMLElement?: typeof HTMLElement }).HTMLElement = dom.window.HTMLElement as unknown as typeof HTMLElement;
    (globalThis as { Element?: typeof Element }).Element = dom.window.Element as unknown as typeof Element;
  });

  it('detects email from type', () => {
    const input = document.createElement('input');
    input.type = 'email';
    const detected = detectFieldType(input);
    expect(detected.type).toBe('email');
    expect(detected.confidence).toBe('high');
  });

  it('detects wallet address as evm', () => {
    const input = document.createElement('input');
    input.name = 'wallet_address';
    input.placeholder = 'EVM address';
    const detected = detectFieldType(input);
    expect(detected.type).toBe('evm');
    expect(detected.confidence).toBe('high');
  });

  it('detects discord from label', () => {
    const form = document.createElement('form');
    const label = document.createElement('label');
    label.textContent = 'Discord username';
    const input = document.createElement('input');
    input.id = 'discord';
    label.htmlFor = 'discord';
    form.appendChild(label);
    form.appendChild(input);
    document.body.appendChild(form);
    const detected = detectFieldType(input);
    expect(detected.type).toBe('discord');
    expect(detected.confidence).toBe('high');
    document.body.removeChild(form);
  });

  it('returns none for unknown fields', () => {
    const input = document.createElement('input');
    input.name = 'customField';
    const detected = detectFieldType(input);
    expect(detected.confidence).toBe('none');
  });
});
