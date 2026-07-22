// src/background/lifecycle.ts

import { buildContextMenu } from './context-menu-service';
import { startMessagingRouter } from './messaging-router';

export function initializeExtension(): void {
  chrome.runtime.onInstalled.addListener(() => {
    buildContextMenu(
      { version: 1, createdAt: '', updatedAt: '', entries: [] },
      { type: null, confidence: 'none', score: 0 },
    );
  });
  startMessagingRouter();
}
