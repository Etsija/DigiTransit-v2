import AsyncStorage from '@react-native-async-storage/async-storage';
import { useStore } from 'zustand';
import type { StateStorage } from 'zustand/middleware';
import { createStore } from 'zustand/vanilla';

import { DEPARTURE_REMINDERS_STORAGE_KEY } from '@/core/store/storage-keys';
import { createJSONStorage, persist } from '@/core/store/zustand-middleware-shim';

export type DepartureReminderRecord = {
  notificationId: string;
  fireAtMs: number;
};

type DepartureReminderRegistryState = {
  remindersByKey: Record<string, DepartureReminderRecord>;
  hasHydrated: boolean;
  setReminder: (key: string, reminder: DepartureReminderRecord) => void;
  removeReminder: (key: string) => void;
  pruneExpiredReminders: (nowMs?: number) => void;
  reset: () => void;
  setHasHydrated: (value: boolean) => void;
};

const noopStorage: StateStorage = {
  getItem: async () => null,
  setItem: async () => {},
  removeItem: async () => {},
};

function getDefaultReminderStorage(): StateStorage {
  if (typeof window === 'undefined') {
    return noopStorage;
  }

  return AsyncStorage;
}

export function createDepartureReminderStore(storage: StateStorage = getDefaultReminderStorage()) {
  const store = createStore<DepartureReminderRegistryState>()(
    persist(
      (set) => ({
        remindersByKey: {},
        hasHydrated: false,
        setReminder: (key, reminder) =>
          set((state) => ({
            remindersByKey: {
              ...state.remindersByKey,
              [key]: reminder,
            },
          })),
        removeReminder: (key) =>
          set((state) => {
            if (!(key in state.remindersByKey)) {
              return state;
            }

            const remindersByKey = { ...state.remindersByKey };
            delete remindersByKey[key];

            return { remindersByKey };
          }),
        pruneExpiredReminders: (nowMs = Date.now()) =>
          set((state) => ({
            remindersByKey: Object.fromEntries(
              Object.entries(state.remindersByKey).filter(
                ([, reminder]) => reminder.fireAtMs > nowMs
              )
            ),
          })),
        reset: () => set({ remindersByKey: {} }),
        setHasHydrated: (value) => set({ hasHydrated: value }),
      }),
      {
        name: DEPARTURE_REMINDERS_STORAGE_KEY,
        storage: createJSONStorage(() => storage),
        partialize: (state) => ({
          remindersByKey: state.remindersByKey,
        }),
        onRehydrateStorage: () => () => {
          store.getState().setHasHydrated(true);
          store.getState().pruneExpiredReminders();
        },
      }
    )
  );

  return store;
}

export const departureReminderStore = createDepartureReminderStore();

export function useDepartureReminderStore<T>(
  selector: (state: DepartureReminderRegistryState) => T
) {
  return useStore(departureReminderStore, selector);
}
