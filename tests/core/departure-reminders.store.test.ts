/// <reference types="jest" />

import type { StateStorage } from 'zustand/middleware';

import { createDepartureReminderStore } from '@/core/store/departure-reminders.store';
import { DEPARTURE_REMINDERS_STORAGE_KEY } from '@/core/store/storage-keys';

function createMemoryStorage(initialState?: Record<string, string>): StateStorage {
  const storage = new Map(Object.entries(initialState ?? {}));

  return {
    getItem: jest.fn(async (name: string) => storage.get(name) ?? null),
    setItem: jest.fn(async (name: string, value: string) => {
      storage.set(name, value);
    }),
    removeItem: jest.fn(async (name: string) => {
      storage.delete(name);
    }),
  };
}

describe('departure reminders store', () => {
  it('rehydrates persisted reminder records from storage', async () => {
    const storage = createMemoryStorage({
      [DEPARTURE_REMINDERS_STORAGE_KEY]: JSON.stringify({
        state: {
          remindersByKey: {
            'HSL:1001::1700000000::120::4::Munkkiniemi': {
              notificationId: 'scheduled-id',
              fireAtMs: 4_102_444_800_000,
            },
          },
        },
        version: 0,
      }),
    });
    const store = createDepartureReminderStore(storage);

    await store.persist.rehydrate();

    expect(store.getState().hasHydrated).toBe(true);
    expect(store.getState().remindersByKey).toEqual({
      'HSL:1001::1700000000::120::4::Munkkiniemi': {
        notificationId: 'scheduled-id',
        fireAtMs: 4_102_444_800_000,
      },
    });
  });

  it('prunes expired persisted reminders during hydration', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2023-11-14T22:30:00.000Z'));

    const storage = createMemoryStorage({
      [DEPARTURE_REMINDERS_STORAGE_KEY]: JSON.stringify({
        state: {
          remindersByKey: {
            expired: {
              notificationId: 'expired-id',
              fireAtMs: Date.now() - 1_000,
            },
            active: {
              notificationId: 'active-id',
              fireAtMs: Date.now() + 60_000,
            },
          },
        },
        version: 0,
      }),
    });
    const store = createDepartureReminderStore(storage);

    await store.persist.rehydrate();

    expect(store.getState().remindersByKey).toEqual({
      active: {
        notificationId: 'active-id',
        fireAtMs: Date.now() + 60_000,
      },
    });

    jest.useRealTimers();
  });

  it('removes only the targeted reminder record', () => {
    const store = createDepartureReminderStore(createMemoryStorage());

    store.getState().setReminder('first', {
      notificationId: 'scheduled-id-1',
      fireAtMs: 4_102_444_800_000,
    });
    store.getState().setReminder('second', {
      notificationId: 'scheduled-id-2',
      fireAtMs: 4_102_444_860_000,
    });

    store.getState().removeReminder('first');

    expect(store.getState().remindersByKey).toEqual({
      second: {
        notificationId: 'scheduled-id-2',
        fireAtMs: 4_102_444_860_000,
      },
    });
  });
});
