// src/popup/pin-setup.ts

import { getAppEl, navigateTo, renderEmpty } from './app';
import { sendMessage, MESSAGE_TYPES } from '../shared/messaging';
import { formatError } from '../shared/validation';

export function renderPinSetup(): void {
  const app = getAppEl();
  app.innerHTML = `
    <div class="card">
      <h1>Установите PIN</h1>
      <p>PIN из 4 цифр будет использоваться для защиты профиля.</p>
      <form id="pin-setup-form">
        <div class="form-group">
          <label for="pin">PIN (4 цифры)</label>
          <input id="pin" name="pin" type="password" inputmode="numeric" maxlength="4" class="pin-input" autocomplete="new-password" />
        </div>
        <div class="form-group">
          <label for="pin-confirm">Повторите PIN</label>
          <input id="pin-confirm" name="pinConfirm" type="password" inputmode="numeric" maxlength="4" class="pin-input" autocomplete="new-password" />
        </div>
        <div class="error"></div>
        <div class="actions">
          <button type="submit" class="btn">Сохранить</button>
        </div>
      </form>
    </div>
  `;

  const form = app.querySelector('#pin-setup-form') as HTMLFormElement;
  const pinInput = app.querySelector('#pin') as HTMLInputElement;
  const confirmInput = app.querySelector('#pin-confirm') as HTMLInputElement;
  const errorEl = app.querySelector('.error') as HTMLDivElement;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.textContent = '';
    const pin = pinInput.value.trim();
    const pinConfirm = confirmInput.value.trim();
    renderEmpty();
    const resp = await sendMessage(MESSAGE_TYPES.SETUP_PIN, { pin, pinConfirm });
    if (resp.success) {
      navigateTo('profile');
    } else {
      renderPinSetup();
      (getAppEl().querySelector('.error') as HTMLDivElement).textContent =
        formatError(resp.error || '', resp.error || 'Ошибка установки PIN');
    }
  });
}
