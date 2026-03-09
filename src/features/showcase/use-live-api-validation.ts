import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/core/api/query-keys';
import { requestGraphql } from '@/core/api/graphql-client';
import {
  mapGraphqlModeToTransportMode,
  mapGraphqlTransitModeToTransportMode,
} from '@/core/utils/transport-mode';
import {
  StopDeparturesQueryDocument,
  type StopDeparturesQueryQuery,
  StopsNearbyQueryDocument,
  type StopsNearbyQueryQuery,
} from '@/generated/graphql';

export const DEV_COORDS = {
  lat: 60.631,
  lon: 24.861,
  radius: 500,
} as const;

type AppErrorLike = {
  kind: 'network' | 'graphql' | 'permission' | 'empty' | 'unknown';
  message: string;
  retryable: boolean;
};

type NearbyEdge = NonNullable<NonNullable<StopsNearbyQueryQuery['stopsByRadius']>['edges']>[number];
type NearbyNode = NonNullable<NearbyEdge>['node'];
type NearbyStop = NonNullable<NonNullable<NearbyNode>['stop']>;

type ValidNearbyStop = {
  distance: number;
  stop: NearbyStop;
};

type ValidDeparture = NonNullable<
  NonNullable<NonNullable<StopDeparturesQueryQuery['stop']>['stoptimesWithoutPatterns']>[number]
>;

function getFirstValidStop(data: StopsNearbyQueryQuery | undefined): ValidNearbyStop | null {
  const edges = data?.stopsByRadius?.edges ?? [];

  for (const edge of edges) {
    const node = edge?.node;
    const stop = node?.stop;

    if (
      stop?.gtfsId &&
      stop.name.trim().length > 0 &&
      typeof node?.distance === 'number'
    ) {
      return {
        distance: node.distance,
        stop: stop as NearbyStop,
      };
    }
  }

  return null;
}

function isDepartureValid(departure: ValidDeparture | null | undefined): departure is ValidDeparture {
  return Boolean(
    departure &&
      typeof departure.scheduledDeparture === 'number' &&
      departure.serviceDay != null &&
      departure.realtimeState != null &&
      departure.headsign?.trim() &&
      departure.trip?.route.shortName?.trim()
  );
}

export function getResolvedStopModes(stop: Pick<NearbyStop, 'vehicleMode' | 'patterns'>): string[] {
  const resolvedModes = new Set<string>();

  if (stop.vehicleMode) {
    resolvedModes.add(stop.vehicleMode);
  }

  for (const pattern of stop.patterns ?? []) {
    if (pattern?.route.mode) {
      resolvedModes.add(pattern.route.mode);
    }
  }

  return Array.from(resolvedModes);
}

export function getResolvedTransportModes(stop: Pick<NearbyStop, 'vehicleMode' | 'patterns'>): string[] {
  const resolvedModes = new Set<string>();
  const stopMode = mapGraphqlModeToTransportMode(stop.vehicleMode);

  if (stopMode) {
    resolvedModes.add(stopMode);
  }

  for (const pattern of stop.patterns ?? []) {
    const routeMode = mapGraphqlTransitModeToTransportMode(pattern?.route.mode);

    if (routeMode) {
      resolvedModes.add(routeMode);
    }
  }

  return Array.from(resolvedModes);
}

export function useLiveApiValidation(options?: { enabled?: boolean; hasApiKey?: boolean }) {
  const enabled = options?.enabled ?? __DEV__;
  const hasApiKey = options?.hasApiKey ?? true;

  const nearbyQuery = useQuery({
    queryKey: queryKeys.stops.nearby({ ...DEV_COORDS }),
    queryFn: () => requestGraphql(StopsNearbyQueryDocument, { ...DEV_COORDS }),
    enabled: enabled && hasApiKey,
    staleTime: 0,
  });

  const nearbyStop = getFirstValidStop(nearbyQuery.data);
  const nearbyStopId = nearbyStop?.stop.gtfsId;

  const departuresQuery = useQuery({
    queryKey: nearbyStopId
      ? queryKeys.departures.stop(nearbyStopId)
      : ['departures', 'stop', 'live-api-missing-stop'],
    queryFn: () => requestGraphql(StopDeparturesQueryDocument, { id: nearbyStopId! }),
    enabled: enabled && hasApiKey && Boolean(nearbyStopId),
    staleTime: 0,
  });

  const firstValidDeparture =
    departuresQuery.data?.stop?.stoptimesWithoutPatterns?.find(isDepartureValid) ?? null;

  return {
    coords: DEV_COORDS,
    departuresQuery,
    enabled,
    firstValidDeparture,
    hasApiKey,
    nearbyQuery,
    nearbyStop,
  };
}

export type LiveApiValidationState = ReturnType<typeof useLiveApiValidation>;
export type LiveApiValidationError = AppErrorLike;
