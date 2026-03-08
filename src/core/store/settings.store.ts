import AsyncStorage from '@react-native-async-storage/async-storage';
import { useStore } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import { createStore } from 'zustand/vanilla';

import { migrateSettingsState, resolvePersistedSettingsState } from '@/core/store/migrations';
import { SETTINGS_STORAGE_KEY, SETTINGS_STORAGE_VERSION } from '@/core/store/storage-keys';
import {
  defaultPersistedSettings,
  sanitizeSettingsPatch,
  type PersistedSettings,
  type Settings,
} from '@/features/settings/schema/settings.schema';

export type SettingsStore = Settings &
  PersistedSettings & {
    hasHydrated: boolean;
    updateSettings: (patch: Partial<Settings>) => void;
    resetSettings: () => void;
    setHasHydrated: (value: boolean) => void;
  };

const initialPersistedState: PersistedSettings = {
  ...defaultPersistedSettings,
  settingsVersion: SETTINGS_STORAGE_VERSION,
};

function partializeSettingsState(state: SettingsStore): PersistedSettings {
  return {
    searchRadiusMeters: state.searchRadiusMeters,
    locationUpdateIntervalSeconds: state.locationUpdateIntervalSeconds,
    stopsPollingIntervalSeconds: state.stopsPollingIntervalSeconds,
    departuresPollingIntervalSeconds: state.departuresPollingIntervalSeconds,
    homeStop: state.homeStop,
    pushNotificationsEnabled: state.pushNotificationsEnabled,
    notificationLeadTimeMinutes: state.notificationLeadTimeMinutes,
    settingsVersion: SETTINGS_STORAGE_VERSION,
  };
}

export function createSettingsStore(storage: StateStorage = AsyncStorage) {
  const store = createStore<SettingsStore>()(
    persist(
      (set) => ({
        ...initialPersistedState,
        hasHydrated: false,
        updateSettings: (patch) =>
          set((state) => ({
            ...state,
            ...sanitizeSettingsPatch(patch, state),
            settingsVersion: SETTINGS_STORAGE_VERSION,
          })),
        resetSettings: () =>
          set((state) => ({
            ...state,
            ...initialPersistedState,
          })),
        setHasHydrated: (value) => set({ hasHydrated: value }),
      }),
      {
        name: SETTINGS_STORAGE_KEY,
        version: SETTINGS_STORAGE_VERSION,
        storage: createJSONStorage(() => storage),
        partialize: partializeSettingsState,
        migrate: migrateSettingsState,
        merge: (persistedState, currentState) => ({
          ...currentState,
          ...resolvePersistedSettingsState(persistedState),
        }),
        onRehydrateStorage: () => () => {
          store.setState({ hasHydrated: true });
        },
      }
    )
  );

  return store;
}

let settingsStoreInstance: ReturnType<typeof createSettingsStore> | undefined;

export function getSettingsStore() {
  if (!settingsStoreInstance) {
    settingsStoreInstance = createSettingsStore();
  }

  return settingsStoreInstance;
}

export function useSettingsStore<T>(selector: (state: SettingsStore) => T): T {
  return useStore(getSettingsStore(), selector);
}
