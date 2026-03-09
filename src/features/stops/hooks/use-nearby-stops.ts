import { useQuery } from '@tanstack/react-query';

import { requestGraphql } from '@/core/api/graphql-client';
import { queryKeys } from '@/core/api/query-keys';
import { useSettingsStore } from '@/core/store/settings.store';
import {
  mapGraphqlModeToTransportMode,
  mapGraphqlTransitModeToTransportMode,
} from '@/core/utils/transport-mode';
import { StopsNearbyQueryDocument, type StopsNearbyQueryQuery } from '@/generated/graphql';
import type { TransportMode } from '@/shared/theme/theme';

type NearbyStopsEdge = NonNullable<
  NonNullable<StopsNearbyQueryQuery['stopsByRadius']>['edges']
>[number];

export type NearbyStop = {
  gtfsId: string;
  name: string;
  code: string | null;
  zoneId: string | null;
  distanceMeters: number;
  latitude: number;
  longitude: number;
  transportMode: TransportMode | null;
  parentStationName: string | null;
  routePatterns: {
    label: string;
    mode: TransportMode | null;
  }[];
};

export type UseNearbyStopsOptions = {
  coordinates: {
    latitude: number;
    longitude: number;
  } | null;
  enabled?: boolean;
};

function resolveTransportMode(stop: NonNullable<NonNullable<NearbyStopsEdge>['node']>['stop']) {
  const directMode = mapGraphqlModeToTransportMode(stop?.vehicleMode);

  if (directMode) {
    return directMode;
  }

  for (const pattern of stop?.patterns ?? []) {
    const routeMode = mapGraphqlTransitModeToTransportMode(pattern?.route.mode);

    if (routeMode) {
      return routeMode;
    }
  }

  return null;
}

function normalizeRoutePatterns(
  stop: NonNullable<NonNullable<NearbyStopsEdge>['node']>['stop']
): NearbyStop['routePatterns'] {
  const seen = new Set<string>();
  const routePatterns: NearbyStop['routePatterns'] = [];

  for (const pattern of stop?.patterns ?? []) {
    const shortName = pattern?.route.shortName?.trim();
    const longName = pattern?.route.longName?.trim();
    const label = shortName || longName;

    if (!label) {
      continue;
    }

    const mode = mapGraphqlTransitModeToTransportMode(pattern?.route.mode);
    const key = `${label}:${mode ?? 'unknown'}`;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    routePatterns.push({ label, mode });
  }

  return routePatterns;
}

export function normalizeNearbyStops(data: StopsNearbyQueryQuery | undefined): NearbyStop[] {
  const normalizedStops: NearbyStop[] = [];

  for (const edge of data?.stopsByRadius?.edges ?? []) {
    const node = edge?.node;
    const stop = node?.stop;

    if (
      !stop?.gtfsId ||
      !stop.name.trim() ||
      typeof node?.distance !== 'number' ||
      typeof stop.lat !== 'number' ||
      typeof stop.lon !== 'number'
    ) {
      continue;
    }

    normalizedStops.push({
      gtfsId: stop.gtfsId,
      name: stop.name,
      code: stop.code ?? null,
      zoneId: stop.zoneId ?? null,
      distanceMeters: node.distance,
      latitude: stop.lat,
      longitude: stop.lon,
      transportMode: resolveTransportMode(stop),
      parentStationName: stop.parentStation?.name ?? null,
      routePatterns: normalizeRoutePatterns(stop),
    });
  }

  return normalizedStops.sort((left, right) => left.distanceMeters - right.distanceMeters);
}

export function useNearbyStops({ coordinates, enabled = true }: UseNearbyStopsOptions) {
  const searchRadiusMeters = useSettingsStore((state) => state.searchRadiusMeters);
  const stopsPollingIntervalSeconds = useSettingsStore(
    (state) => state.stopsPollingIntervalSeconds
  );
  const hasCoordinates =
    typeof coordinates?.latitude === 'number' && typeof coordinates?.longitude === 'number';

  return useQuery({
    queryKey: hasCoordinates
      ? queryKeys.stops.nearby({
          lat: coordinates.latitude,
          lon: coordinates.longitude,
          radius: searchRadiusMeters,
        })
      : ['stops', 'nearby', 'missing-coordinates'],
    queryFn: () =>
      requestGraphql(StopsNearbyQueryDocument, {
        lat: coordinates!.latitude,
        lon: coordinates!.longitude,
        radius: searchRadiusMeters,
      }),
    enabled: enabled && hasCoordinates,
    refetchInterval: stopsPollingIntervalSeconds * 1000,
    select: normalizeNearbyStops,
  });
}
