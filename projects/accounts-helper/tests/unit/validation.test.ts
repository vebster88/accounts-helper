import { describe, it, expect, beforeEach } from 'vitest';
import {
  isValidPin,
  isValidEmail,
  isValidEvmAddress,
  isValidBtcAddress,
  normalizeHandle,
  validateEntry,
  normalizeEntryValue,
} from '../../src/shared/validation';

describe('validation', () => {
  it('validates 4-digit PIN', () => {
    expect(isValidPin('1234')).toBe(true);
    expect(isValidPin('12345')).toBe(false);
    expect(isValidPin('12a4')).toBe(false);
    expect(isValidPin('abc')).toBe(false);
  });

  it('validates email', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
    expect(isValidEmail('user@')).toBe(false);
    expect(isValidEmail('@example.com')).toBe(false);
  });

  it('validates EVM address with EIP-55 checksum', () => {
    expect(isValidEvmAddress('0x71C7656EC7ab88b098defB751B7401B5f6d8976F')).toBe(true);
    expect(isValidEvmAddress('0x71c7656ec7ab88b098defb751b7401b5f6d8976f')).toBe(false);
    expect(isValidEvmAddress('0x123')).toBe(false);
    expect(isValidEvmAddress('0xG1234567890abcdef1234567890abcdef12345678')).toBe(false);
  });

  it('validates BTC address formats', () => {
    expect(isValidBtcAddress('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa')).toBe(true);
    expect(isValidBtcAddress('3J98t1WpEZ73CNmYviecrnyiWrnqRhWNLy')).toBe(true);
    expect(isValidBtcAddress('bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh')).toBe(true);
    expect(isValidBtcAddress('0x123')).toBe(false);
  });

  it('normalizes handles', () => {
    expect(normalizeHandle('username')).toBe('@username');
    expect(normalizeHandle('@username')).toBe('@username');
    expect(normalizeHandle('  user  ')).toBe('@user');
  });

  it('normalizes entry values', () => {
    expect(normalizeEntryValue('telegram', 'user')).toBe('@user');
    expect(normalizeEntryValue('email', '  user@example.com  ')).toBe('user@example.com');
  });

  it('validates entries', () => {
    const r1 = validateEntry('email', 'user@example.com', 'main');
    expect(r1.valid).toBe(true);

    const r2 = validateEntry('evm', '0x71c7656ec7ab88b098defb751b7401b5f6d8976f');
    expect(r2.valid).toBe(false);

    const r3 = validateEntry('telegram', 'user');
    expect(r3.valid).toBe(true);
    expect(normalizeEntryValue('telegram', 'user')).toBe('@user');

    const r4 = validateEntry('discord', '', '');
    expect(r4.valid).toBe(false);

    const r5 = validateEntry('email', 'user@example.com', 'a'.repeat(51));
    expect(r5.valid).toBe(false);
  });
});
