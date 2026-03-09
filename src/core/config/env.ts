declare const process:
  | {
      env?: Record<string, string | undefined>;
    }
  | undefined;

export const DEFAULT_DIGITRANSIT_API_URL = 'https://api.digitransit.fi/routing/v2/varely/gtfs/v1';

export const DIGITRANSIT_API_URL =
  process?.env?.EXPO_PUBLIC_DIGITRANSIT_API_URL ?? DEFAULT_DIGITRANSIT_API_URL;

export const DIGITRANSIT_API_KEY = process?.env?.EXPO_PUBLIC_DIGITRANSIT_API_KEY ?? '';

export function getMapboxPublicToken() {
  return process?.env?.EXPO_PUBLIC_MAPBOX_PUBLIC_TOKEN ?? '';
}

export function getIosGoogleMapsApiKey() {
  return process?.env?.EXPO_PUBLIC_IOS_GOOGLE_MAPS_API_KEY ?? '';
}

export const MAPBOX_PUBLIC_TOKEN = getMapboxPublicToken();
export const IOS_GOOGLE_MAPS_API_KEY = getIosGoogleMapsApiKey();
