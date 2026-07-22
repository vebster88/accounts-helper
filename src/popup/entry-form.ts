// src/popup/entry-form.ts

import { FIELD_TYPE_LABELS, FIELD_TYPES, type FieldType } from '../shared/constants';
import type { Profile, ProfileEntry } from '../shared/types';
import { getAppEl, navigateTo, setCurrentProfile } from './app';
import { sendMessage, MESSAGE_TYPES } from '../shared/messaging';
import { formatError, normalizeEntryValue, validateEntry } from '../shared/validation';

export function renderEntryForm(entry?: ProfileEntry): void {
  const app = getAppEl();
  const isEdit = !!entry;
  const typeOptions = FIELD_TYPES.map(
    (t) => `<option value="${t}"${entry?.type === t ? ' selected' : ''}>${FIELD_TYPE_LABELS[t]}</option>`,
  ).join('');

  app.innerHTML = `
    <div class="card">
      <h2>${isEdit ? 'Редактировать запись' : 'Новая запись'}</h2>
      <form id="entry-form">
        <input type="hidden" id="entry-id" value="${entry?.id || ''}" />
        <div class="form-group">
          <label for="entry-type">Тип</label>
          <select id="entry-type" required>${typeOptions}</select>
        </div>
        <div class="form-group">
          <label for="entry-value">Значение</label>
          <input id="entry-value" type="text" value="${escapeHtml(entry?.value || '')}" required />
        </div>
        <div class="form-group">
          <label for="entry-label">Псевдоним (необязательно)</label>
          <input id="entry-label" type="text" maxlength="50" value="${escapeHtml(entry?.label || '')}" />
        </div>
        <div class="checkbox-row">
          <input id="entry-default" type="checkbox"${entry?.isDefault ? ' checked' : ''} />
          <label for="entry-default">По умолчанию для этого типа</label>
        </div>
        <div class="error"></div>
        <div class="actions">
          <button type="button" id="cancel-entry" class="btn secondary">Отмена</button>
          <button type="submit" class="btn">Сохранить</button>
        </div>
      </form>
    </div>
  `;

  const form = app.querySelector('#entry-form') as HTMLFormElement;
  const typeEl = app.querySelector('#entry-type') as HTMLSelectElement;
  const valueEl = app.querySelector('#entry-value') as HTMLInputElement;
  const labelEl = app.querySelector('#entry-label') as HTMLInputElement;
  const defaultEl = app.querySelector('#entry-default') as HTMLInputElement;
  const errorEl = app.querySelector('.error') as HTMLDivElement;

  app.querySelector('#cancel-entry')?.addEventListener('click', () => navigateTo('profile'));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.textContent = '';
    const type = typeEl.value as FieldType;
    const value = normalizeEntryValue(type, valueEl.value);
    const label = labelEl.value.trim();
    const isDefault = defaultEl.checked;

    const validation = validateEntry(type, value, label);
    if (!validation.valid) {
      errorEl.textContent = validation.errors.map((e) => e.message).join('; ');
      return;
    }

    const entryPayload: Partial<ProfileEntry> = {
      id: entry?.id,
      type,
      value,
      label,
      isDefault,
      createdAt: entry?.createdAt,
    };

    const resp = await sendMessage<ProfileEntry>(MESSAGE_TYPES.SAVE_ENTRY, { entry: entryPayload });
    if (resp.success) {
      const saved = resp.data!;
      const current = window.__accountsHelperProfile as Profile | undefined;
      if (current) {
        const others = current.entries.filter((e) => e.id !== saved.id);
        if (saved.isDefault) {
          others.forEach((e) => {
            if (e.type === saved.type) e.isDefault = false;
          });
        }
        const updated: Profile = {
          ...current,
          updatedAt: new Date().toISOString(),
          entries: [...others, saved].sort((a, b) => {
            const typeOrder = Object.keys(FIELD_TYPE_LABELS);
            return typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type);
          }),
        };
        setCurrentProfile(updated);
        window.__accountsHelperProfile = updated;
        navigateTo('profile');
      } else {
        navigateTo('profile');
      }
    } else {
      errorEl.textContent = formatError(resp.error || '', resp.error || 'Ошибка сохранения');
      if (resp.fieldErrors) {
        errorEl.textContent += ' ' + Object.values(resp.fieldErrors).join('; ');
      }
    }
  });
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

declare global {
  interface Window {
    __accountsHelperProfile?: Profile;
  }
}
