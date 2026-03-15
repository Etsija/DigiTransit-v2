import { useQuery } from '@tanstack/react-query';

import { requestGraphql } from '@/core/api/graphql-client';
import { queryKeys } from '@/core/api/query-keys';
import { useSettingsStore } from '@/core/store/settings.store';
import {
  DepartureProgressQueryDocument,
  VehicleStopStatus,
  type DepartureProgressQueryQuery,
} from '@/generated/graphql';

export type DepartureProgressState = 'upcoming' | 'arriving' | 'passed';

export type ExpandedDepartureStopRow = {
  stopGtfsId: string;
  stopCode: string;
  stopName: string;
  stopPositionInPattern: number;
  state: DepartureProgressState;
  stateSource: 'realtime' | 'scheduled';
};

export type DepartureProgressIdentity = {
  tripId: string;
  serviceDate: string;
  serviceDay: number;
  scheduledDeparture: number;
};

type UseDepartureProgressOptions = {
  stopId: string | null;
  departure: DepartureProgressIdentity | null;
  enabled?: boolean;
};

type DepartureProgressStoptime = {
  stopGtfsId: string;
  stopCode: string;
  stopName: string;
  stopPositionInPattern: number;
  timestampEpochSeconds: number;
  scheduledDepartureTimestampEpochSeconds: number;
};

type DepartureProgressTrip = NonNullable<DepartureProgressQueryQuery['trip']>;

function normalizeProgressStoptimes(
  stoptimes: DepartureProgressTrip['stoptimesForDate']
): DepartureProgressStoptime[] {
  const normalized: DepartureProgressStoptime[] = [];

  for (const stoptime of stoptimes ?? []) {
    const stopGtfsId = stoptime?.stop?.gtfsId?.trim();
    const stopCode = stoptime?.stop?.code?.trim();
    const stopName = stoptime?.stop?.name?.trim();
    const stopPositionInPattern = stoptime?.stopPositionInPattern;
    const serviceDay = stoptime?.serviceDay;
    const scheduledDepartureTime = stoptime?.scheduledDeparture;
    const baseTime =
      (stoptime?.realtime ? stoptime.realtimeArrival : null) ??
      stoptime?.scheduledArrival ??
      (stoptime?.realtime ? stoptime.realtimeDeparture : null) ??
      scheduledDepartureTime;

    if (
      !stopGtfsId ||
      !stopCode ||
      !stopName ||
      typeof serviceDay !== 'number' ||
      typeof stopPositionInPattern !== 'number' ||
      typeof baseTime !== 'number' ||
      typeof scheduledDepartureTime !== 'number'
    ) {
      continue;
    }

    normalized.push({
      stopGtfsId,
      stopCode,
      stopName,
      stopPositionInPattern,
      timestampEpochSeconds: serviceDay + baseTime,
      scheduledDepartureTimestampEpochSeconds: serviceDay + scheduledDepartureTime,
    });
  }

  return normalized.sort((left, right) => left.stopPositionInPattern - right.stopPositionInPattern);
}

function resolveRealtimeReferencePosition(
  data: DepartureProgressQueryQuery,
  stoptimes: DepartureProgressStoptime[]
): number | null {
  const tripSemanticHash = data.trip?.semanticHash?.trim();

  if (!tripSemanticHash) {
    return null;
  }

  for (const vehiclePosition of data.trip?.pattern?.vehiclePositions ?? []) {
    if (vehiclePosition?.trip.semanticHash !== tripSemanticHash) {
      continue;
    }

    const relationshipStopGtfsId = vehiclePosition.stopRelationship?.stop.gtfsId?.trim();
    const relationshipStatus = vehiclePosition.stopRelationship?.status;

    if (
      !relationshipStopGtfsId ||
      (relationshipStatus !== VehicleStopStatus.InTransitTo &&
        relationshipStatus !== VehicleStopStatus.IncomingAt &&
        relationshipStatus !== VehicleStopStatus.StoppedAt)
    ) {
      continue;
    }

    const matchedStop = [...stoptimes]
      .reverse()
      .find((stop) => stop.stopGtfsId === relationshipStopGtfsId);

    if (matchedStop) {
      return matchedStop.stopPositionInPattern;
    }
  }

  return null;
}

function normalizeScheduledRows(
  stoptimes: DepartureProgressStoptime[],
  targetStopPosition: number
): ExpandedDepartureStopRow[] {
  const visibleStops = stoptimes.filter((stop) => stop.stopPositionInPattern < targetStopPosition);
  const nowEpochSeconds = Math.floor(Date.now() / 1000);
  const firstUpcomingIndex = visibleStops.findIndex(
    (stop) => stop.timestampEpochSeconds >= nowEpochSeconds
  );

  const rows: ExpandedDepartureStopRow[] = visibleStops.map((stop, index) => ({
    stopGtfsId: stop.stopGtfsId,
    stopCode: stop.stopCode,
    stopName: stop.stopName,
    stopPositionInPattern: stop.stopPositionInPattern,
    state:
      firstUpcomingIndex === -1
        ? 'passed'
        : index < firstUpcomingIndex
          ? 'passed'
          : index === firstUpcomingIndex
            ? 'arriving'
            : 'upcoming',
    stateSource: 'scheduled',
  }));

  return finalizeVisibleRows(rows);
}

function normalizeRealtimeRows(
  stoptimes: DepartureProgressStoptime[],
  targetStopPosition: number,
  referenceStopPosition: number
): ExpandedDepartureStopRow[] {
  const rows: ExpandedDepartureStopRow[] = stoptimes
    .filter((stop) => stop.stopPositionInPattern < targetStopPosition)
    .map((stop) => ({
      stopGtfsId: stop.stopGtfsId,
      stopCode: stop.stopCode,
      stopName: stop.stopName,
      stopPositionInPattern: stop.stopPositionInPattern,
      state:
        stop.stopPositionInPattern < referenceStopPosition
          ? 'passed'
          : stop.stopPositionInPattern === referenceStopPosition
            ? 'arriving'
            : 'upcoming',
      stateSource: 'realtime',
    }));

  return finalizeVisibleRows(rows);
}

function finalizeVisibleRows(rows: ExpandedDepartureStopRow[]): ExpandedDepartureStopRow[] {
  const latestPassedRow = [...rows]
    .filter((row) => row.state === 'passed')
    .sort((left, right) => right.stopPositionInPattern - left.stopPositionInPattern)[0];
  const nonPassedRows = rows.filter((row) => row.state !== 'passed');
  const nextRows = latestPassedRow ? [latestPassedRow, ...nonPassedRows] : nonPassedRows;

  return nextRows.sort((left, right) => right.stopPositionInPattern - left.stopPositionInPattern);
}

export function normalizeDepartureProgress(
  data: DepartureProgressQueryQuery | undefined,
  stopId: string,
  departure: Pick<DepartureProgressIdentity, 'scheduledDeparture' | 'serviceDay'>
): ExpandedDepartureStopRow[] {
  if (!data?.trip) {
    return [];
  }

  const normalizedStoptimes = normalizeProgressStoptimes(data.trip.stoptimesForDate);
  const targetStopTimestampEpochSeconds = departure.serviceDay + departure.scheduledDeparture;
  const targetStop = normalizedStoptimes.find(
    (stop) =>
      stop.stopGtfsId === stopId &&
      stop.scheduledDepartureTimestampEpochSeconds === targetStopTimestampEpochSeconds
  );

  if (!targetStop) {
    return [];
  }

  const realtimeReferencePosition = resolveRealtimeReferencePosition(data, normalizedStoptimes);

  if (typeof realtimeReferencePosition === 'number') {
    return normalizeRealtimeRows(
      normalizedStoptimes,
      targetStop.stopPositionInPattern,
      realtimeReferencePosition
    );
  }

  return normalizeScheduledRows(normalizedStoptimes, targetStop.stopPositionInPattern);
}

export function fetchDepartureProgress(tripId: string, serviceDate: string) {
  return requestGraphql(DepartureProgressQueryDocument, { tripId, serviceDate });
}

export function useDepartureProgress({
  stopId,
  departure,
  enabled = true,
}: UseDepartureProgressOptions) {
  const departuresPollingIntervalSeconds = useSettingsStore(
    (state) => state.departuresPollingIntervalSeconds
  );
  const hasRequiredInputs =
    typeof stopId === 'string' &&
    stopId.length > 0 &&
    departure !== null &&
    departure.tripId.length > 0 &&
    departure.serviceDate.length > 0;

  return useQuery({
    queryKey:
      hasRequiredInputs && departure
        ? queryKeys.departures.progress(stopId, {
            tripId: departure.tripId,
            serviceDay: departure.serviceDay,
            scheduledDeparture: departure.scheduledDeparture,
          })
        : ['departures', 'progress', 'missing-params'],
    queryFn: () => fetchDepartureProgress(departure!.tripId, departure!.serviceDate),
    enabled: enabled && hasRequiredInputs,
    refetchInterval: departuresPollingIntervalSeconds * 1000,
    select: (data) => normalizeDepartureProgress(data, stopId!, departure!),
  });
}
