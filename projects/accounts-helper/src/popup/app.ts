// src/popup/app.ts

import { FIELD_TYPES, type FieldType } from '../shared/constants';
import type { Profile, ProfileEntry } from '../shared/types';
import { sendMessage, MESSAGE_TYPES } from '../shared/messaging';
import { formatError } from '../shared/validation';
import { renderPinSetup } from './pin-setup';
import { renderUnlock } from './unlock';
import { renderProfileEditor } from './profile-editor';
import { renderSettings } from './settings';

export type Screen = 'pinSetup' | 'setup' | 'unlock' | 'profile' | 'settings';

const appEl = document.getElementById('app') as HTMLDivElement;

let currentProfile: Profile | null = null;
let currentScreen: Screen = 'unlock';

export function getAppEl(): HTMLDivElement {
  return appEl;
}

export function getCurrentProfile(): Profile | null {
  return currentProfile;
}

export function setCurrentProfile(profile: Profile | null): void {
  currentProfile = profile;
}

export function setScreen(screen: Screen): void {
  currentScreen = screen;
}

export function showError(parent: HTMLElement, message: string): void {
  const el = parent.querySelector('.error') as HTMLElement | null;
  if (el) el.textContent = message;
}

export function clearError(parent: HTMLElement): void {
  const el = parent.querySelector('.error') as HTMLElement | null;
  if (el) el.textContent = '';
}

export function initApp(): void {
  checkProfile();
}

async function checkProfile(): Promise<void> {
  const resp = await sendMessage<{ exists: boolean; locked: boolean }>(MESSAGE_TYPES.CHECK_PROFILE);
  if (!resp.success) {
    renderUnlock();
    return;
  }
  const { exists } = resp.data!;
  if (!exists) {
    renderPinSetup();
  } else {
    const profileResp = await sendMessage<Profile>(MESSAGE_TYPES.GET_PROFILE);
    if (profileResp.success) {
      currentProfile = profileResp.data!;
      renderProfileEditor(currentProfile);
    } else {
      renderUnlock();
    }
  }
}

export function renderEmpty(): void {
  appEl.innerHTML = '<div class="card"><p>Загрузка...</p></div>';
}

export function navigateTo(screen: Screen): void {
  currentScreen = screen;
  if (screen === 'setup' || screen === 'pinSetup') renderPinSetup();
  else if (screen === 'unlock') renderUnlock();
  else if (screen === 'profile') {
    if (currentProfile) renderProfileEditor(currentProfile);
    else checkProfile();
  } else if (screen === 'settings') renderSettings();
}

export async function refreshAndRenderProfile(): Promise<void> {
  const profileResp = await sendMessage<Profile>(MESSAGE_TYPES.GET_PROFILE);
  if (profileResp.success) {
    currentProfile = profileResp.data!;
    renderProfileEditor(currentProfile);
  } else {
    renderUnlock();
  }
}
