// src/popup/unlock.ts

import { getAppEl, navigateTo, renderEmpty, setCurrentProfile } from './app';
import { sendMessage, MESSAGE_TYPES } from '../shared/messaging';
import { formatError } from '../shared/validation';
import type { Profile } from '../shared/types';

export function renderUnlock(attemptsLeft?: number): void {
  const app = getAppEl();
  app.innerHTML = `
    <div class="card">
      <h1>Разблокировать AccountsHelper</h1>
      <p>Введите PIN, чтобы продолжить.</p>
      <form id="unlock-form">
        <div class="form-group">
          <label for="unlock-pin">PIN</label>
          <input id="unlock-pin" name="pin" type="password" inputmode="numeric" maxlength="4" class="pin-input" autocomplete="current-password" />
        </div>
        <div class="error"></div>
        <div class="actions">
          <button type="submit" class="btn">Разблокировать</button>
        </div>
      </form>
    </div>
  `;

  const form = app.querySelector('#unlock-form') as HTMLFormElement;
  const pinInput = app.querySelector('#unlock-pin') as HTMLInputElement;
  const errorEl = app.querySelector('.error') as HTMLDivElement;

  if (attemptsLeft !== undefined && attemptsLeft < 5) {
    errorEl.textContent = `Осталось попыток: ${attemptsLeft}`;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.textContent = '';
    const pin = pinInput.value.trim();
    renderEmpty();
    const resp = await sendMessage<Profile>(MESSAGE_TYPES.UNLOCK, { pin });
    if (resp.success) {
      setCurrentProfile(resp.data!);
      navigateTo('profile');
    } else {
      renderUnlock(resp.attemptsLeft);
      const err = getAppEl().querySelector('.error') as HTMLDivElement;
      err.textContent = formatError(resp.error || '', resp.error || 'Ошибка разблокировки');
    }
  });
}
