import { SETTINGS_STORAGE_VERSION } from '@/core/store/storage-keys';
import {
  defaultPersistedSettings,
  sanitizePersistedSettings,
  type PersistedSettings,
} from '@/features/settings/schema/settings.schema';

export function migrateSettingsState(
  persistedState: unknown,
  persistedVersion: number
): PersistedSettings {
  if (!Number.isInteger(persistedVersion) || persistedVersion > SETTINGS_STORAGE_VERSION) {
    return defaultPersistedSettings;
  }

  return {
    ...defaultPersistedSettings,
    ...sanitizePersistedSettings(persistedState),
    settingsVersion: SETTINGS_STORAGE_VERSION,
  };
}

export function resolvePersistedSettingsState(persistedState: unknown): PersistedSettings {
  const sanitizedState = sanitizePersistedSettings(persistedState);

  if (sanitizedState.settingsVersion > SETTINGS_STORAGE_VERSION) {
    return defaultPersistedSettings;
  }

  if (sanitizedState.settingsVersion < SETTINGS_STORAGE_VERSION) {
    return migrateSettingsState(sanitizedState, sanitizedState.settingsVersion);
  }

  return {
    ...defaultPersistedSettings,
    ...sanitizedState,
    settingsVersion: SETTINGS_STORAGE_VERSION,
  };
}
