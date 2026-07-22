// src/popup/export-import.ts

import { getAppEl } from './app';
import { sendMessage, MESSAGE_TYPES } from '../shared/messaging';
import { formatError } from '../shared/validation';

export function renderExportImport(): string {
  return `
    <div class="card section">
      <h2>Экспорт / Импорт</h2>
      <div class="form-group">
        <button id="export-profile" class="btn">Экспортировать профиль</button>
        <div class="error" id="export-error"></div>
      </div>
      <div class="form-group">
        <label for="import-file">Импорт профиля (JSON)</label>
        <input id="import-file" type="file" accept=".json,application/json" class="file-input" />
        <div id="import-status" class="success"></div>
        <div id="import-error" class="error"></div>
      </div>
    </div>
  `;
}

export function attachExportImportListeners(): void {
  const app = getAppEl();
  app.querySelector('#export-profile')?.addEventListener('click', async () => {
    const errEl = app.querySelector('#export-error') as HTMLDivElement;
    errEl.textContent = '';
    const resp = await sendMessage<{ json: string }>(MESSAGE_TYPES.EXPORT_PROFILE, {});
    if (resp.success) {
      const blob = new Blob([resp.data!.json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `accounts-helper-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      errEl.textContent = formatError(resp.error || '', 'Ошибка экспорта');
    }
  });

  app.querySelector('#import-file')?.addEventListener('change', async (event) => {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    const statusEl = app.querySelector('#import-status') as HTMLDivElement;
    const errEl = app.querySelector('#import-error') as HTMLDivElement;
    statusEl.textContent = '';
    errEl.textContent = '';
    if (!file) return;

    const pin = prompt('Введите PIN для импорта профиля:');
    if (!pin) return;

    try {
      const text = await file.text();
      const resp = await sendMessage(MESSAGE_TYPES.IMPORT_PROFILE, { json: text, pin });
      if (resp.success) {
        statusEl.textContent = 'Профиль импортирован. Перезапустите popup.';
        input.value = '';
      } else {
        errEl.textContent = formatError(resp.error || '', 'Ошибка импорта');
      }
    } catch (e) {
      errEl.textContent = 'Не удалось прочитать файл';
    }
  });
}
