/// <reference types="jest" />

import type { StateStorage } from 'zustand/middleware';

import { createSettingsStore } from '@/core/store/settings.store';
import {
  HOME_STOP_STORAGE_KEY,
  SETTINGS_STORAGE_KEY,
  SETTINGS_STORAGE_VERSION,
} from '@/core/store/storage-keys';

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

async function hydrateStore(store: ReturnType<typeof createSettingsStore>) {
  await store.persist.rehydrate();
}

async function readStorageEntry(storage: StateStorage, key: string) {
  return await storage.getItem(key);
}

describe('settings store', () => {
  it('returns the default settings on first launch', async () => {
    const storage = createMemoryStorage();
    const store = createSettingsStore(storage);

    await hydrateStore(store);

    expect(store.getState()).toMatchObject({
      searchRadiusMeters: 250,
      locationUpdateIntervalSeconds: 20,
      stopsPollingIntervalSeconds: 20,
      departuresPollingIntervalSeconds: 10,
      homeStop: null,
      pushNotificationsEnabled: false,
      notificationLeadTimeMinutes: 10,
      settingsVersion: SETTINGS_STORAGE_VERSION,
      hasHydrated: true,
    });

    expect(storage.getItem).toHaveBeenCalledWith(SETTINGS_STORAGE_KEY);
  });

  it('rehydrates persisted settings from storage', async () => {
    const storage = createMemoryStorage({
      [SETTINGS_STORAGE_KEY]: JSON.stringify({
        state: {
          searchRadiusMeters: 500,
          locationUpdateIntervalSeconds: 30,
          stopsPollingIntervalSeconds: 45,
          departuresPollingIntervalSeconds: 15,
          homeStop: {
            gtfsId: 'HSL:1234',
            name: 'Kamppi',
            vehicleType: 0,
          },
          pushNotificationsEnabled: true,
          notificationLeadTimeMinutes: 5,
          settingsVersion: SETTINGS_STORAGE_VERSION,
        },
        version: SETTINGS_STORAGE_VERSION,
      }),
      [HOME_STOP_STORAGE_KEY]: JSON.stringify({
        gtfsId: 'HSL:1234',
        name: 'Kamppi',
        vehicleType: 0,
      }),
    });

    const store = createSettingsStore(storage);

    await hydrateStore(store);

    expect(store.getState()).toMatchObject({
      searchRadiusMeters: 500,
      locationUpdateIntervalSeconds: 30,
      stopsPollingIntervalSeconds: 45,
      departuresPollingIntervalSeconds: 15,
      homeStop: {
        gtfsId: 'HSL:1234',
        name: 'Kamppi',
        transportMode: 'tram',
      },
      pushNotificationsEnabled: true,
      notificationLeadTimeMinutes: 5,
      settingsVersion: SETTINGS_STORAGE_VERSION,
      hasHydrated: true,
    });
  });

  it('falls back to defaults when the persisted payload is corrupted', async () => {
    const storage = createMemoryStorage({
      [SETTINGS_STORAGE_KEY]: 'this is not json',
    });

    const store = createSettingsStore(storage);

    await hydrateStore(store);

    expect(store.getState()).toMatchObject({
      searchRadiusMeters: 250,
      locationUpdateIntervalSeconds: 20,
      stopsPollingIntervalSeconds: 20,
      departuresPollingIntervalSeconds: 10,
      homeStop: null,
      pushNotificationsEnabled: false,
      notificationLeadTimeMinutes: 10,
      settingsVersion: SETTINGS_STORAGE_VERSION,
      hasHydrated: true,
    });
  });

  it('migrates outdated persisted settings to the current version', async () => {
    const storage = createMemoryStorage({
      [SETTINGS_STORAGE_KEY]: JSON.stringify({
        state: {
          searchRadiusMeters: 750,
          locationUpdateIntervalSeconds: 25,
          stopsPollingIntervalSeconds: 30,
          departuresPollingIntervalSeconds: 12,
          homeStop: null,
          pushNotificationsEnabled: true,
          notificationLeadTimeMinutes: 7,
          settingsVersion: 0,
        },
        version: 0,
      }),
    });

    const store = createSettingsStore(storage);

    await hydrateStore(store);

    expect(store.getState()).toMatchObject({
      searchRadiusMeters: 750,
      locationUpdateIntervalSeconds: 25,
      stopsPollingIntervalSeconds: 30,
      departuresPollingIntervalSeconds: 12,
      homeStop: null,
      pushNotificationsEnabled: true,
      notificationLeadTimeMinutes: 7,
      settingsVersion: SETTINGS_STORAGE_VERSION,
      hasHydrated: true,
    });
  });

  it('uses the persisted settingsVersion field to migrate older state payloads', async () => {
    const storage = createMemoryStorage({
      [SETTINGS_STORAGE_KEY]: JSON.stringify({
        state: {
          searchRadiusMeters: 900,
          locationUpdateIntervalSeconds: 40,
          stopsPollingIntervalSeconds: 35,
          departuresPollingIntervalSeconds: 18,
          homeStop: null,
          pushNotificationsEnabled: true,
          notificationLeadTimeMinutes: 6,
          settingsVersion: 0,
        },
        version: SETTINGS_STORAGE_VERSION,
      }),
    });

    const store = createSettingsStore(storage);

    await hydrateStore(store);

    expect(store.getState()).toMatchObject({
      searchRadiusMeters: 900,
      locationUpdateIntervalSeconds: 40,
      stopsPollingIntervalSeconds: 35,
      departuresPollingIntervalSeconds: 18,
      homeStop: null,
      pushNotificationsEnabled: true,
      notificationLeadTimeMinutes: 6,
      settingsVersion: SETTINGS_STORAGE_VERSION,
      hasHydrated: true,
    });
  });

  it('resets to defaults when the persisted settingsVersion field is newer than supported', async () => {
    const storage = createMemoryStorage({
      [SETTINGS_STORAGE_KEY]: JSON.stringify({
        state: {
          searchRadiusMeters: 900,
          locationUpdateIntervalSeconds: 40,
          stopsPollingIntervalSeconds: 35,
          departuresPollingIntervalSeconds: 18,
          homeStop: null,
          pushNotificationsEnabled: true,
          notificationLeadTimeMinutes: 6,
          settingsVersion: SETTINGS_STORAGE_VERSION + 1,
        },
        version: SETTINGS_STORAGE_VERSION,
      }),
    });

    const store = createSettingsStore(storage);

    await hydrateStore(store);

    expect(store.getState()).toMatchObject({
      searchRadiusMeters: 250,
      locationUpdateIntervalSeconds: 20,
      stopsPollingIntervalSeconds: 20,
      departuresPollingIntervalSeconds: 10,
      homeStop: null,
      pushNotificationsEnabled: false,
      notificationLeadTimeMinutes: 10,
      settingsVersion: SETTINGS_STORAGE_VERSION,
      hasHydrated: true,
    });
  });

  it('falls back invalid persisted fields to defaults without crashing', async () => {
    const storage = createMemoryStorage({
      [SETTINGS_STORAGE_KEY]: JSON.stringify({
        state: {
          searchRadiusMeters: -50,
          locationUpdateIntervalSeconds: 30,
          stopsPollingIntervalSeconds: 'fast',
          departuresPollingIntervalSeconds: 15,
          homeStop: {
            gtfsId: '',
            name: 'Kamppi',
            vehicleType: 0,
          },
          pushNotificationsEnabled: 'yes',
          notificationLeadTimeMinutes: 8,
          settingsVersion: SETTINGS_STORAGE_VERSION,
        },
        version: SETTINGS_STORAGE_VERSION,
      }),
    });

    const store = createSettingsStore(storage);

    await hydrateStore(store);

    expect(store.getState()).toMatchObject({
      searchRadiusMeters: 250,
      locationUpdateIntervalSeconds: 30,
      stopsPollingIntervalSeconds: 20,
      departuresPollingIntervalSeconds: 15,
      homeStop: null,
      pushNotificationsEnabled: false,
      notificationLeadTimeMinutes: 8,
      settingsVersion: SETTINGS_STORAGE_VERSION,
      hasHydrated: true,
    });
  });

  it('does not persist transient location coordinates into the settings payload', async () => {
    const storage = createMemoryStorage();
    const store = createSettingsStore(storage);

    await hydrateStore(store);

    store.setState({
      latitude: 60.1699,
      longitude: 24.9384,
    } as never);

    store.getState().updateSettings({
      locationUpdateIntervalSeconds: 25,
    });

    await Promise.resolve();

    const persistedPayload = JSON.parse(
      (storage.setItem as jest.Mock).mock.calls.at(-1)?.[1] as string
    );

    expect(persistedPayload.state.locationUpdateIntervalSeconds).toBe(25);
    expect(persistedPayload.state.latitude).toBeUndefined();
    expect(persistedPayload.state.longitude).toBeUndefined();
  });

  it('writes the canonical home stop to HOME_STOP_STORAGE_KEY without duplicating it in settings', async () => {
    const storage = createMemoryStorage();
    const store = createSettingsStore(storage);

    await hydrateStore(store);

    store.getState().updateSettings({
      homeStop: {
        gtfsId: 'HSL:1002',
        name: 'Central station',
        transportMode: 'tram',
      },
    });

    await Promise.resolve();

    const persistedSettings = JSON.parse(
      (await readStorageEntry(storage, SETTINGS_STORAGE_KEY)) as string
    );
    const persistedHomeStop = JSON.parse(
      (await readStorageEntry(storage, HOME_STOP_STORAGE_KEY)) as string
    );

    expect(persistedSettings.state.homeStop).toBeUndefined();
    expect(persistedHomeStop).toEqual({
      gtfsId: 'HSL:1002',
      name: 'Central station',
      transportMode: 'tram',
    });
  });

  it('hydrates home stop from the canonical home-stop storage key', async () => {
    const storage = createMemoryStorage({
      [SETTINGS_STORAGE_KEY]: JSON.stringify({
        state: {
          searchRadiusMeters: 500,
          locationUpdateIntervalSeconds: 30,
          stopsPollingIntervalSeconds: 45,
          departuresPollingIntervalSeconds: 15,
          pushNotificationsEnabled: true,
          notificationLeadTimeMinutes: 5,
          settingsVersion: SETTINGS_STORAGE_VERSION,
        },
        version: SETTINGS_STORAGE_VERSION,
      }),
      [HOME_STOP_STORAGE_KEY]: JSON.stringify({
        gtfsId: 'HSL:4321',
        name: 'Pasila',
        transportMode: 'train',
      }),
    });

    const store = createSettingsStore(storage);

    await hydrateStore(store);

    expect(store.getState().homeStop).toEqual({
      gtfsId: 'HSL:4321',
      name: 'Pasila',
      transportMode: 'train',
    });
  });

  it('migrates legacy embedded homeStop data into the canonical storage key during hydration', async () => {
    const storage = createMemoryStorage({
      [SETTINGS_STORAGE_KEY]: JSON.stringify({
        state: {
          searchRadiusMeters: 250,
          locationUpdateIntervalSeconds: 20,
          stopsPollingIntervalSeconds: 20,
          departuresPollingIntervalSeconds: 10,
          homeStop: {
            gtfsId: 'HSL:5678',
            name: 'Hakaniemi',
            vehicleType: 0,
          },
          pushNotificationsEnabled: false,
          notificationLeadTimeMinutes: 10,
          settingsVersion: SETTINGS_STORAGE_VERSION,
        },
        version: SETTINGS_STORAGE_VERSION,
      }),
    });
    const store = createSettingsStore(storage);

    await hydrateStore(store);

    expect(store.getState().homeStop).toEqual({
      gtfsId: 'HSL:5678',
      name: 'Hakaniemi',
      transportMode: 'tram',
    });

    const persistedSettings = JSON.parse(
      (await readStorageEntry(storage, SETTINGS_STORAGE_KEY)) as string
    );
    const persistedHomeStop = JSON.parse(
      (await readStorageEntry(storage, HOME_STOP_STORAGE_KEY)) as string
    );

    expect(persistedSettings.state.homeStop).toBeUndefined();
    expect(persistedHomeStop).toEqual({
      gtfsId: 'HSL:5678',
      name: 'Hakaniemi',
      transportMode: 'tram',
    });
  });

  it('exposes the reserved storage keys', () => {
    expect(SETTINGS_STORAGE_KEY).toBe('app.settings.v1');
    expect(HOME_STOP_STORAGE_KEY).toBe('app.homeStop.v1');
  });

  it('keeps the current value when an update patch contains an invalid field', () => {
    const storage = createMemoryStorage();
    const store = createSettingsStore(storage);

    store.getState().updateSettings({
      notificationLeadTimeMinutes: 15,
    });
    store.getState().updateSettings({
      notificationLeadTimeMinutes: 999,
    });

    expect(store.getState().notificationLeadTimeMinutes).toBe(15);
  });

  it('resets settings back to defaults', () => {
    const storage = createMemoryStorage();
    const store = createSettingsStore(storage);

    store.getState().updateSettings({
      searchRadiusMeters: 400,
      pushNotificationsEnabled: true,
    });
    store.getState().resetSettings();

    expect(store.getState()).toMatchObject({
      searchRadiusMeters: 250,
      pushNotificationsEnabled: false,
      settingsVersion: SETTINGS_STORAGE_VERSION,
      hasHydrated: false,
    });
  });
});
