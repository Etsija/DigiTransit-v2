import { useQuery } from '@tanstack/react-query';

import { requestGraphql } from '@/core/api/graphql-client';
import { queryKeys } from '@/core/api/query-keys';
import { useSettingsStore } from '@/core/store/settings.store';
import {
  mapGraphqlModeToTransportMode,
  mapGraphqlTransitModeToTransportMode,
} from '@/core/utils/transport-mode';
import {
  StopDeparturesQueryDocument,
  type StopDeparturesQueryQuery,
} from '@/generated/graphql';
import type { TransportMode } from '@/shared/theme/theme';

export type StopDepartureHeader = {
  name: string;
  code: string | null;
  zoneLabel: string | null;
  transportMode: TransportMode | null;
  directionLabel: string | null;
  patternLabels: string[];
};

export type StopDeparture = {
  scheduledDeparture: number;
  realtimeDeparture: number;
  realtime: boolean;
  realtimeState: string | null;
  serviceDay: number;
  headsign: string | null;
  routeShortName: string | null;
};

export type StopDeparturesModel = {
  header: StopDepartureHeader;
  departures: StopDeparture[];
};

export type UseStopDeparturesOptions = {
  stopId: string | null;
  enabled?: boolean;
};

type StopQueryStop = NonNullable<StopDeparturesQueryQuery['stop']>;
type StopQueryStoptimes = StopQueryStop['stoptimesWithoutPatterns'];
type StopQueryPatterns = StopQueryStop['patterns'];

function normalizePatternLabel(
  pattern: NonNullable<NonNullable<StopQueryPatterns>[number]>
): string | null {
  const explicitName = pattern.name?.trim();
  if (explicitName) {
    return explicitName;
  }

  const routeShortName = pattern.route.shortName?.trim();
  const headsign = pattern.headsign?.trim();
  const routeLongName = pattern.route.longName?.trim();

  if (routeShortName && headsign) {
    return `${routeShortName} to ${headsign}`;
  }

  return routeShortName || headsign || routeLongName || null;
}

function normalizePatternLabels(patterns: StopQueryPatterns): string[] {
  const labels = new Set<string>();

  for (const pattern of patterns ?? []) {
    const label = pattern ? normalizePatternLabel(pattern) : null;

    if (label) {
      labels.add(label);
    }
  }

  return Array.from(labels).sort((left, right) =>
    left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' })
  );
}

function normalizeDirectionLabel(
  direction: string | null | undefined,
  patterns: StopQueryPatterns
): string | null {
  const explicitDirection = direction?.trim();
  if (explicitDirection) {
    return explicitDirection;
  }

  for (const pattern of patterns ?? []) {
    const headsign = pattern?.headsign?.trim();

    if (headsign) {
      return headsign;
    }
  }

  return null;
}

function resolveHeaderTransportMode(stop: StopQueryStop): TransportMode | null {
  const directMode = mapGraphqlModeToTransportMode(stop.vehicleMode);

  if (directMode) {
    return directMode;
  }

  for (const pattern of stop.patterns ?? []) {
    const patternMode = mapGraphqlTransitModeToTransportMode(pattern?.route.mode);

    if (patternMode) {
      return patternMode;
    }
  }

  return null;
}

function normalizeDepartures(
  stoptimes: StopQueryStoptimes
): StopDeparture[] {
  const normalized: StopDeparture[] = [];

  for (const stoptime of stoptimes ?? []) {
    if (
      typeof stoptime?.scheduledDeparture !== 'number' ||
      typeof stoptime?.realtimeDeparture !== 'number' ||
      typeof stoptime?.serviceDay !== 'number'
    ) {
      continue;
    }

    normalized.push({
      scheduledDeparture: stoptime.scheduledDeparture,
      realtimeDeparture: stoptime.realtimeDeparture,
      realtime: Boolean(stoptime.realtime),
      realtimeState: stoptime.realtimeState ?? null,
      serviceDay: stoptime.serviceDay,
      headsign: stoptime.headsign?.trim() || null,
      routeShortName: stoptime.trip?.route.shortName?.trim() || null,
    });
  }

  return normalized;
}

export function normalizeStopDepartures(
  data: StopDeparturesQueryQuery | undefined
): StopDeparturesModel | null {
  const stop = data?.stop;
  if (!stop) {
    return null;
  }

  const name = stop?.name?.trim();
  const transportMode = resolveHeaderTransportMode(stop);

  if (!name) {
    return null;
  }

  return {
    header: {
      name,
      code: stop.code?.trim() || null,
      zoneLabel: stop.zoneId?.trim() ? `Zone ${stop.zoneId.trim()}` : null,
      transportMode,
      directionLabel: normalizeDirectionLabel(stop.direction, stop.patterns),
      patternLabels: normalizePatternLabels(stop.patterns),
    },
    departures: normalizeDepartures(stop.stoptimesWithoutPatterns),
  };
}

export function useStopDepartures({ stopId, enabled = true }: UseStopDeparturesOptions) {
  const departuresPollingIntervalSeconds = useSettingsStore(
    (state) => state.departuresPollingIntervalSeconds
  );
  const hasStopId = typeof stopId === 'string' && stopId.length > 0;

  return useQuery({
    queryKey: hasStopId ? queryKeys.departures.stop(stopId) : ['departures', 'stop', 'missing-id'],
    queryFn: () => requestGraphql(StopDeparturesQueryDocument, { id: stopId! }),
    enabled: enabled && hasStopId,
    refetchInterval: departuresPollingIntervalSeconds * 1000,
    select: normalizeStopDepartures,
  });
}
