import type { StateStorage } from 'zustand/middleware';

import {
  HOME_STOP_STORAGE_KEY,
  SETTINGS_STORAGE_KEY,
  SETTINGS_STORAGE_VERSION,
} from '@/core/store/storage-keys';
import { homeStopSchema, type HomeStop } from '@/features/settings/schema/settings.schema';

type PersistedEnvelope = {
  state?: Record<string, unknown>;
  version?: number;
};

function safeParseJson(value: string | null): unknown {
  if (value === null) {
    return null;
  }

  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}

function asEnvelope(value: unknown): PersistedEnvelope | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as PersistedEnvelope;
}

function sanitizeHomeStop(value: unknown): HomeStop | null {
  const result = homeStopSchema.nullable().safeParse(value);

  return result.success ? result.data : null;
}

function stripHomeStopFromEnvelope(value: string): {
  settingsPayload: string;
  homeStop: HomeStop | null;
} {
  const parsed = safeParseJson(value);
  const envelope = asEnvelope(parsed);

  if (!envelope) {
    return {
      settingsPayload: value,
      homeStop: null,
    };
  }

  const state =
    envelope.state && typeof envelope.state === 'object' && !Array.isArray(envelope.state)
      ? { ...envelope.state }
      : {};
  const homeStop = sanitizeHomeStop(state.homeStop);

  delete state.homeStop;

  return {
    settingsPayload: JSON.stringify({
      ...envelope,
      state,
    }),
    homeStop,
  };
}

function mergeCanonicalHomeStop(
  settingsValue: string | null,
  homeStopValue: string | null
): {
  didStripLegacyHomeStop: boolean;
  homeStop: HomeStop | null;
  settingsPayload: string | null;
} {
  const canonicalHomeStop = sanitizeHomeStop(safeParseJson(homeStopValue));
  const parsedSettings = safeParseJson(settingsValue);
  const envelope = asEnvelope(parsedSettings);

  if (!envelope) {
    if (!canonicalHomeStop) {
      return {
        didStripLegacyHomeStop: false,
        homeStop: null,
        settingsPayload: settingsValue,
      };
    }

    return {
      didStripLegacyHomeStop: false,
      homeStop: canonicalHomeStop,
      settingsPayload: JSON.stringify({
        state: {
          homeStop: canonicalHomeStop,
        },
        version: SETTINGS_STORAGE_VERSION,
      }),
    };
  }

  const state =
    envelope.state && typeof envelope.state === 'object' && !Array.isArray(envelope.state)
      ? { ...envelope.state }
      : {};
  const legacyHomeStop = sanitizeHomeStop(state.homeStop);
  const resolvedHomeStop = canonicalHomeStop ?? legacyHomeStop;
  const didStripLegacyHomeStop = 'homeStop' in state;

  if (resolvedHomeStop) {
    state.homeStop = resolvedHomeStop;
  } else {
    delete state.homeStop;
  }

  return {
    didStripLegacyHomeStop,
    homeStop: resolvedHomeStop,
    settingsPayload: JSON.stringify({
      ...envelope,
      state,
    }),
  };
}

export function createSettingsPersistStorage(storage: StateStorage): StateStorage {
  return {
    getItem: async (name) => {
      if (name !== SETTINGS_STORAGE_KEY) {
        return storage.getItem(name);
      }

      const [settingsValue, homeStopValue] = await Promise.all([
        storage.getItem(SETTINGS_STORAGE_KEY),
        storage.getItem(HOME_STOP_STORAGE_KEY),
      ]);

      const mergedState = mergeCanonicalHomeStop(settingsValue, homeStopValue);

      if (mergedState.didStripLegacyHomeStop && mergedState.settingsPayload !== null) {
        await storage.setItem(
          SETTINGS_STORAGE_KEY,
          stripHomeStopFromEnvelope(mergedState.settingsPayload).settingsPayload
        );
      }

      if (!homeStopValue && mergedState.homeStop) {
        await storage.setItem(HOME_STOP_STORAGE_KEY, JSON.stringify(mergedState.homeStop));
      }

      return mergedState.settingsPayload;
    },
    setItem: async (name, value) => {
      if (name !== SETTINGS_STORAGE_KEY) {
        await storage.setItem(name, value);
        return;
      }

      const { settingsPayload, homeStop } = stripHomeStopFromEnvelope(value);

      await storage.setItem(SETTINGS_STORAGE_KEY, settingsPayload);

      if (homeStop) {
        await storage.setItem(HOME_STOP_STORAGE_KEY, JSON.stringify(homeStop));
        return;
      }

      await storage.removeItem(HOME_STOP_STORAGE_KEY);
    },
    removeItem: async (name) => {
      await storage.removeItem(name);

      if (name === SETTINGS_STORAGE_KEY) {
        await storage.removeItem(HOME_STOP_STORAGE_KEY);
      }
    },
  };
}
