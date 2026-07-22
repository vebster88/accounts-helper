// src/popup/profile-editor.ts

import { FIELD_TYPE_LABELS, type FieldType } from '../shared/constants';
import type { Profile, ProfileEntry } from '../shared/types';
import { getAppEl, navigateTo, setCurrentProfile } from './app';
import { renderEntryForm } from './entry-form';

export function renderProfileEditor(profile: Profile): void {
  setCurrentProfile(profile);
  const app = getAppEl();
  app.innerHTML = `
    <div class="card">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
        <h1>Мой профиль</h1>
        <button id="to-settings" class="btn secondary">⚙️</button>
      </div>
      <button id="add-entry" class="btn">+ Добавить запись</button>
      <ul id="entry-list" class="entry-list"></ul>
    </div>
  `;

  const listEl = app.querySelector('#entry-list') as HTMLUListElement;
  if (profile.entries.length === 0) {
    listEl.innerHTML = '<li class="empty-state">Нет сохранённых записей</li>';
  } else {
    for (const entry of sortedEntries(profile.entries)) {
      const li = document.createElement('li');
      li.innerHTML = `
        <div class="entry-meta">
          <span class="entry-type">${FIELD_TYPE_LABELS[entry.type]}${entry.isDefault ? ' ★' : ''}</span>
          <span class="entry-value">${escapeHtml(entry.label || entry.value)}</span>
        </div>
        <div class="actions" style="margin-top:0;">
          <button class="btn secondary edit-btn" data-id="${entry.id}">✎</button>
          <button class="btn danger delete-btn" data-id="${entry.id}">🗑</button>
        </div>
      `;
      listEl.appendChild(li);
    }
  }

  app.querySelector('#add-entry')?.addEventListener('click', () => renderEntryForm());
  app.querySelector('#to-settings')?.addEventListener('click', () => navigateTo('settings'));

  app.querySelectorAll('.edit-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = (btn as HTMLElement).dataset.id!;
      const entry = profile.entries.find((e) => e.id === id);
      if (entry) renderEntryForm(entry);
    });
  });

  app.querySelectorAll('.delete-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = (btn as HTMLElement).dataset.id!;
      if (!confirm('Удалить запись?')) return;
      const { sendMessage } = await import('../shared/messaging');
      const { MESSAGE_TYPES } = await import('../shared/messaging');
      const resp = await sendMessage(MESSAGE_TYPES.DELETE_ENTRY, { id });
      if (resp.success) {
        const updatedProfile: Profile = { ...profile, entries: profile.entries.filter((e) => e.id !== id) };
        setCurrentProfile(updatedProfile);
        renderProfileEditor(updatedProfile);
      }
    });
  });
}

function sortedEntries(entries: ProfileEntry[]): ProfileEntry[] {
  return [...entries].sort((a, b) => {
    const typeOrder = Object.keys(FIELD_TYPE_LABELS);
    const ai = typeOrder.indexOf(a.type);
    const bi = typeOrder.indexOf(b.type);
    if (ai !== bi) return ai - bi;
    if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
