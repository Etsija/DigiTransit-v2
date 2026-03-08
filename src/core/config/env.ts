declare const process:
  | {
      env?: Record<string, string | undefined>;
    }
  | undefined;

export const DEFAULT_DIGITRANSIT_API_URL = 'https://api.digitransit.fi/routing/v2/varely/gtfs/v1';

export const DIGITRANSIT_API_URL =
  process?.env?.EXPO_PUBLIC_DIGITRANSIT_API_URL ?? DEFAULT_DIGITRANSIT_API_URL;

export const DIGITRANSIT_API_KEY = process?.env?.EXPO_PUBLIC_DIGITRANSIT_API_KEY ?? '';
