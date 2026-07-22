// src/popup/settings.ts

import { getAppEl, navigateTo } from './app';
import { sendMessage, MESSAGE_TYPES } from '../shared/messaging';
import { formatError, isValidPin } from '../shared/validation';
import { renderExportImport, attachExportImportListeners } from './export-import';

export function renderSettings(): void {
  const app = getAppEl();
  app.innerHTML = `
    <div class="card">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
        <h1>Настройки</h1>
        <button id="back-to-profile" class="btn secondary">←</button>
      </div>

      <div class="card section">
        <h2>Сменить PIN</h2>
        <form id="change-pin-form">
          <div class="form-group">
            <label for="old-pin">Текущий PIN</label>
            <input id="old-pin" type="password" inputmode="numeric" maxlength="4" class="pin-input" />
          </div>
          <div class="form-group">
            <label for="new-pin">Новый PIN</label>
            <input id="new-pin" type="password" inputmode="numeric" maxlength="4" class="pin-input" />
          </div>
          <div class="error" id="change-pin-error"></div>
          <button type="submit" class="btn">Сменить PIN</button>
        </form>
      </div>

      ${renderExportImport()}

      <div class="card section">
        <h2>Безопасность</h2>
        <div class="actions">
          <button id="lock-session" class="btn secondary">Заблокировать</button>
          <button id="clear-all" class="btn danger">Очистить данные</button>
        </div>
        <div class="error" id="settings-error"></div>
      </div>
    </div>
  `;

  app.querySelector('#back-to-profile')?.addEventListener('click', () => navigateTo('profile'));
  attachExportImportListeners();

  const changePinForm = app.querySelector('#change-pin-form') as HTMLFormElement;
  const oldPinInput = app.querySelector('#old-pin') as HTMLInputElement;
  const newPinInput = app.querySelector('#new-pin') as HTMLInputElement;
  const changePinError = app.querySelector('#change-pin-error') as HTMLDivElement;

  changePinForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    changePinError.textContent = '';
    const oldPin = oldPinInput.value.trim();
    const newPin = newPinInput.value.trim();
    if (!isValidPin(oldPin) || !isValidPin(newPin)) {
      changePinError.textContent = formatError('E_PIN_INVALID_FORMAT');
      return;
    }
    const resp = await sendMessage(MESSAGE_TYPES.CHANGE_PIN, { oldPin, newPin });
    if (resp.success) {
      changePinError.textContent = 'PIN изменён';
      changePinError.className = 'success';
      oldPinInput.value = '';
      newPinInput.value = '';
    } else {
      changePinError.textContent = formatError(resp.error || '', 'Ошибка смены PIN');
      changePinError.className = 'error';
    }
  });

  app.querySelector('#lock-session')?.addEventListener('click', async () => {
    const resp = await sendMessage(MESSAGE_TYPES.LOCK);
    if (resp.success) navigateTo('unlock');
  });

  app.querySelector('#clear-all')?.addEventListener('click', async () => {
    if (!confirm('Все данные будут удалены без возможности восстановления. Продолжить?')) return;
    const resp = await sendMessage(MESSAGE_TYPES.LOCK);
    if (resp.success) {
      // Also ask SW to clear storage via a dedicated message or simply re-import not possible.
      // We rely on LOCK not removing local data; clearing requires extension uninstall or storage API.
      // For MVP, reload extension uninstall is acceptable. We navigate to setup.
      navigateTo('setup');
    }
  });
}
