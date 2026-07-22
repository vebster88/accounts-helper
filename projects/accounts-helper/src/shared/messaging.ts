// src/shared/messaging.ts

import type { MessageResponse } from './types';

export const MESSAGE_TYPES = {
  CHECK_PROFILE: 'CHECK_PROFILE',
  SETUP_PIN: 'SETUP_PIN',
  UNLOCK: 'UNLOCK',
  LOCK: 'LOCK',
  CLEAR_ALL_DATA: 'CLEAR_ALL_DATA',
  GET_PROFILE: 'GET_PROFILE',
  SAVE_ENTRY: 'SAVE_ENTRY',
  DELETE_ENTRY: 'DELETE_ENTRY',
  EXPORT_PROFILE: 'EXPORT_PROFILE',
  IMPORT_PROFILE: 'IMPORT_PROFILE',
  CHANGE_PIN: 'CHANGE_PIN',
  REQUEST_FIELD_TYPE: 'REQUEST_FIELD_TYPE',
  GET_MENU_FOR_FIELD: 'GET_MENU_FOR_FIELD',
  INSERT_VALUE: 'INSERT_VALUE',
} as const;

export function successResponse<T>(data?: T): MessageResponse<T> {
  return { success: true, data };
}

export function errorResponse(error: string, extra?: Record<string, unknown>): MessageResponse {
  return { success: false, error, ...extra };
}

export async function sendMessage<T>(type: string, payload?: unknown): Promise<MessageResponse<T>> {
  if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
    return { success: false, error: 'Chrome runtime unavailable' };
  }
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type, payload }, (response?: MessageResponse<T>) => {
      if (chrome.runtime.lastError) {
        resolve({ success: false, error: chrome.runtime.lastError.message || 'Runtime error' });
      } else {
        resolve(response || { success: false, error: 'No response' });
      }
    });
  });
}
