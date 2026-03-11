import Constants from 'expo-constants';

declare const process:
  | {
      env?: Record<string, string | undefined>;
    }
  | undefined;

type RuntimeExtra = {
  publicRuntimeConfig?: {
    digitransitApiKey?: string;
    digitransitApiUrl?: string;
    iosGoogleMapsApiKey?: string;
    mapboxPublicToken?: string;
  };
};

export const DEFAULT_DIGITRANSIT_API_URL = 'https://api.digitransit.fi/routing/v2/varely/gtfs/v1';

function getRuntimeConfig() {
  return (Constants.expoConfig?.extra as RuntimeExtra | undefined)?.publicRuntimeConfig ?? {};
}

function getPublicEnv(name: string) {
  const runtimeConfig = getRuntimeConfig();

  switch (name) {
    case 'EXPO_PUBLIC_DIGITRANSIT_API_KEY':
      return runtimeConfig.digitransitApiKey ?? process?.env?.EXPO_PUBLIC_DIGITRANSIT_API_KEY;
    case 'EXPO_PUBLIC_DIGITRANSIT_API_URL':
      return runtimeConfig.digitransitApiUrl ?? process?.env?.EXPO_PUBLIC_DIGITRANSIT_API_URL;
    case 'EXPO_PUBLIC_MAPBOX_PUBLIC_TOKEN':
      return runtimeConfig.mapboxPublicToken ?? process?.env?.EXPO_PUBLIC_MAPBOX_PUBLIC_TOKEN;
    case 'EXPO_PUBLIC_IOS_GOOGLE_MAPS_API_KEY':
      return runtimeConfig.iosGoogleMapsApiKey ?? process?.env?.EXPO_PUBLIC_IOS_GOOGLE_MAPS_API_KEY;
    default:
      return process?.env?.[name];
  }
}

export const DIGITRANSIT_API_URL =
  getPublicEnv('EXPO_PUBLIC_DIGITRANSIT_API_URL') ?? DEFAULT_DIGITRANSIT_API_URL;

export const DIGITRANSIT_API_KEY = getPublicEnv('EXPO_PUBLIC_DIGITRANSIT_API_KEY') ?? '';

export function getMapboxPublicToken() {
  return getPublicEnv('EXPO_PUBLIC_MAPBOX_PUBLIC_TOKEN') ?? '';
}

export function getIosGoogleMapsApiKey() {
  return getPublicEnv('EXPO_PUBLIC_IOS_GOOGLE_MAPS_API_KEY') ?? '';
}

export const MAPBOX_PUBLIC_TOKEN = getMapboxPublicToken();
export const IOS_GOOGLE_MAPS_API_KEY = getIosGoogleMapsApiKey();
