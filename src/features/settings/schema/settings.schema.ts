import { z } from 'zod';

import { SETTINGS_STORAGE_VERSION } from '@/core/store/storage-keys';
import { mapLegacyVehicleTypeToTransportMode } from '@/core/utils/transport-mode';
import type { TransportMode } from '@/shared/theme/theme';

const transportModeSchema = z.enum(['bus', 'tram', 'train', 'metro', 'ferry']);

const currentHomeStopSchema = z
  .object({
    gtfsId: z.string().min(1),
    name: z.string().min(1),
    transportMode: transportModeSchema.nullable().default(null),
  })
  .strict();

const legacyHomeStopSchema = z
  .object({
    gtfsId: z.string().min(1),
    name: z.string().min(1),
    vehicleType: z.number().int().nonnegative(),
  })
  .transform((value) => ({
    gtfsId: value.gtfsId,
    name: value.name,
    transportMode: mapLegacyVehicleTypeToTransportMode(value.vehicleType),
  }));

export const homeStopSchema = z.union([currentHomeStopSchema, legacyHomeStopSchema]);

const settingsFieldSchemas = {
  searchRadiusMeters: z.number().int().min(50).max(5000).default(250),
  locationUpdateIntervalSeconds: z.number().int().min(5).max(300).default(20),
  stopsPollingIntervalSeconds: z.number().int().min(5).max(300).default(20),
  departuresPollingIntervalSeconds: z.number().int().min(5).max(300).default(10),
  homeStop: homeStopSchema.nullable().default(null),
  pushNotificationsEnabled: z.boolean().default(false),
  notificationLeadTimeMinutes: z.number().int().min(1).max(120).default(10),
} as const;

export const settingsSchema = z.object(settingsFieldSchemas);

export const persistedSettingsSchema = settingsSchema.extend({
  settingsVersion: z.number().int().nonnegative().default(SETTINGS_STORAGE_VERSION),
});

export type HomeStop = z.infer<typeof homeStopSchema>;
export type Settings = z.infer<typeof settingsSchema>;
export type PersistedSettings = z.infer<typeof persistedSettingsSchema>;
export type PersistedTransportMode = TransportMode | null;

export const defaultSettings = settingsSchema.parse({});

export const defaultPersistedSettings = persistedSettingsSchema.parse({
  settingsVersion: SETTINGS_STORAGE_VERSION,
});

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function parseField<K extends keyof Settings>(
  key: K,
  value: unknown,
  fallback: Settings[K]
): Settings[K] {
  const result = settingsFieldSchemas[key].safeParse(value);

  return result.success ? (result.data as Settings[K]) : fallback;
}

export function sanitizeSettings(input: unknown): Settings {
  const record = asRecord(input);

  return {
    searchRadiusMeters: parseField(
      'searchRadiusMeters',
      record.searchRadiusMeters,
      defaultSettings.searchRadiusMeters
    ),
    locationUpdateIntervalSeconds: parseField(
      'locationUpdateIntervalSeconds',
      record.locationUpdateIntervalSeconds,
      defaultSettings.locationUpdateIntervalSeconds
    ),
    stopsPollingIntervalSeconds: parseField(
      'stopsPollingIntervalSeconds',
      record.stopsPollingIntervalSeconds,
      defaultSettings.stopsPollingIntervalSeconds
    ),
    departuresPollingIntervalSeconds: parseField(
      'departuresPollingIntervalSeconds',
      record.departuresPollingIntervalSeconds,
      defaultSettings.departuresPollingIntervalSeconds
    ),
    homeStop: parseField('homeStop', record.homeStop, defaultSettings.homeStop),
    pushNotificationsEnabled: parseField(
      'pushNotificationsEnabled',
      record.pushNotificationsEnabled,
      defaultSettings.pushNotificationsEnabled
    ),
    notificationLeadTimeMinutes: parseField(
      'notificationLeadTimeMinutes',
      record.notificationLeadTimeMinutes,
      defaultSettings.notificationLeadTimeMinutes
    ),
  };
}

export function sanitizeSettingsPatch(
  input: Partial<Record<keyof Settings, unknown>>,
  fallbackState: Settings = defaultSettings
): Partial<Settings> {
  const record = asRecord(input);
  const nextState: Partial<Settings> = {};
  const nextStateRecord = nextState as Record<keyof Settings, Settings[keyof Settings]>;

  for (const key of Object.keys(settingsFieldSchemas) as (keyof Settings)[]) {
    if (!(key in record)) {
      continue;
    }

    nextStateRecord[key] = parseField(key, record[key], fallbackState[key]);
  }

  return nextState;
}

export function sanitizePersistedSettings(input: unknown): PersistedSettings {
  const record = asRecord(input);
  const settingsVersionResult = z.number().int().nonnegative().safeParse(record.settingsVersion);

  return {
    ...sanitizeSettings(record),
    settingsVersion: settingsVersionResult.success
      ? settingsVersionResult.data
      : SETTINGS_STORAGE_VERSION,
  };
}
