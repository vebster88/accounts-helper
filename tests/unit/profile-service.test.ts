import { describe, it, expect } from 'vitest';
import {
  addOrUpdateEntry,
  deleteEntryById,
  emptyProfile,
  getEntriesByType,
} from '../../src/background/profile-service';

describe('profile-service', () => {
  it('creates empty profile', () => {
    const profile = emptyProfile();
    expect(profile.entries).toEqual([]);
    expect(profile.version).toBe(1);
  });

  it('adds entry and resets other defaults of same type', () => {
    let profile = emptyProfile();
    const e1 = {
      id: 'a',
      type: 'email' as const,
      value: 'a@example.com',
      isDefault: true,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
    profile = addOrUpdateEntry(profile, e1);
    const e2 = {
      id: 'b',
      type: 'email' as const,
      value: 'b@example.com',
      isDefault: true,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
    profile = addOrUpdateEntry(profile, e2);
    const emails = getEntriesByType(profile, 'email');
    expect(emails).toHaveLength(2);
    expect(emails[0].id).toBe('b');
    expect(emails[0].isDefault).toBe(true);
    expect(emails[1].isDefault).toBe(false);
  });

  it('deletes entry by id', () => {
    let profile = emptyProfile();
    profile = addOrUpdateEntry(profile, {
      id: 'a',
      type: 'email',
      value: 'a@example.com',
      isDefault: false,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    });
    profile = deleteEntryById(profile, 'a');
    expect(profile.entries).toHaveLength(0);
  });
});
