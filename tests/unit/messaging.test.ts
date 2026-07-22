import { describe, it, expect, vi } from 'vitest';
import { sendMessage, MESSAGE_TYPES } from '../../src/shared/messaging';

const mockSendMessage = vi.fn();

describe('messaging helpers', () => {
  it('sendMessage returns runtime error when chrome unavailable', async () => {
    const result = await sendMessage('TEST');
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('sendMessage resolves success response', async () => {
    const originalChrome = (globalThis as unknown as { chrome?: { runtime: { sendMessage: typeof mockSendMessage } } }).chrome;
    (globalThis as unknown as { chrome?: { runtime: { sendMessage: typeof mockSendMessage } } }).chrome = {
      runtime: {
        sendMessage: mockSendMessage.mockImplementation((_message, callback: (response: unknown) => void) => {
          callback({ success: true, data: 'ok' });
        }),
      },
    };
    const result = await sendMessage(MESSAGE_TYPES.CHECK_PROFILE);
    expect(result.success).toBe(true);
    expect(result.data).toBe('ok');
    (globalThis as unknown as { chrome?: unknown }).chrome = originalChrome;
  });
});
