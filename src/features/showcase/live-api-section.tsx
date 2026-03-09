import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { DIGITRANSIT_API_KEY, DIGITRANSIT_API_URL } from '@/core/config/env';
import { formatServiceDayDepartureTime } from '@/core/utils/date';
import { GlassCard } from '@/shared/components/glass-card';
import { theme } from '@/shared/theme/theme';
import type { LiveApiValidationState } from './use-live-api-validation';
import {
  getResolvedStopModes,
  getResolvedTransportModes,
  useLiveApiValidation,
} from './use-live-api-validation';

type LiveApiSectionProps = {
  enabled?: boolean;
  hasApiKey?: boolean;
};

function renderErrorMessage(error: {
  kind?: 'network' | 'graphql' | 'permission' | 'empty' | 'unknown';
  message?: string;
}): { title: string; body: string } {
  if (error.kind === 'permission') {
    return {
      title: 'Authentication failed for the live DigiTransit query.',
      body: 'Check EXPO_PUBLIC_DIGITRANSIT_API_KEY and the digitransit-subscription-key header.',
    };
  }

  if (error.kind === 'graphql') {
    return {
      title: 'Schema validation failed for the live DigiTransit query.',
      body: error.message ?? 'The GraphQL response shape did not match expectations.',
    };
  }

  if (error.kind === 'network') {
    return {
      title: 'Network validation failed for the live DigiTransit query.',
      body: error.message ?? 'The request did not reach DigiTransit successfully.',
    };
  }

  return {
    title: 'Live API validation failed.',
    body: error.message ?? 'An unknown error interrupted the dev-only validation flow.',
  };
}

export function LiveApiSection({
  enabled = __DEV__,
  hasApiKey = Boolean(DIGITRANSIT_API_KEY),
}: LiveApiSectionProps) {
  const { coords, departuresQuery, firstValidDeparture, nearbyQuery, nearbyStop } =
    useLiveApiValidation({
      enabled,
      hasApiKey,
    });

  if (!enabled) {
    return null;
  }

  if (!hasApiKey) {
    return (
      <GlassCard style={styles.card}>
        <Text style={styles.errorTitle}>Authentication failed for the live DigiTransit query.</Text>
        <Text style={styles.errorBody}>
          Set EXPO_PUBLIC_DIGITRANSIT_API_KEY before using the Live API validator.
        </Text>
        <Diagnostics coords={coords} />
      </GlassCard>
    );
  }

  if (nearbyQuery.isLoading || departuresQuery.isLoading) {
    return (
      <GlassCard style={styles.card}>
        <Text style={styles.loadingText}>Running live DigiTransit queries...</Text>
        <Diagnostics coords={coords} />
      </GlassCard>
    );
  }

  if (nearbyQuery.isError) {
    const message = renderErrorMessage(nearbyQuery.error as { kind?: any; message?: string });

    return (
      <GlassCard style={styles.card}>
        <Text style={styles.errorTitle}>{message.title}</Text>
        <Text style={styles.errorBody}>{message.body}</Text>
        <Diagnostics coords={coords} />
      </GlassCard>
    );
  }

  if (!nearbyStop) {
    return (
      <GlassCard style={styles.card}>
        <Text style={styles.errorTitle}>Nearby stop validation failed.</Text>
        <Text style={styles.errorBody}>
          The query did not return a stop with a name, gtfsId, and numeric distance for the Hyvinkaa
          dev coordinates.
        </Text>
        <Diagnostics coords={coords} />
      </GlassCard>
    );
  }

  if (departuresQuery.isError) {
    const message = renderErrorMessage(departuresQuery.error as { kind?: any; message?: string });

    return (
      <GlassCard style={styles.card}>
        <Text style={styles.errorTitle}>{message.title}</Text>
        <Text style={styles.errorBody}>{message.body}</Text>
        <Diagnostics coords={coords} />
        <NearbyStopSummary nearbyStop={nearbyStop} />
      </GlassCard>
    );
  }

  const departureSummary = firstValidDeparture
    ? `Departure 1: ${formatServiceDayDepartureTime(
        firstValidDeparture.serviceDay,
        firstValidDeparture.scheduledDeparture
      )} · ${firstValidDeparture.trip?.route.shortName} · ${
        firstValidDeparture.headsign
      } · ${firstValidDeparture.realtimeState}`
    : null;

  if (!firstValidDeparture) {
    return (
      <GlassCard style={styles.card}>
        <Text style={styles.errorTitle}>Departure validation failed.</Text>
        <Text style={styles.errorBody}>
          The stop query did not return a departure with scheduledDeparture, serviceDay,
          realtimeState, trip.route.shortName, and headsign.
        </Text>
        <Diagnostics coords={coords} />
        <NearbyStopSummary nearbyStop={nearbyStop} />
      </GlassCard>
    );
  }

  return (
    <GlassCard style={styles.card}>
      <Text style={styles.successTitle}>Live DigiTransit validation passed.</Text>
      <Diagnostics coords={coords} />
      <NearbyStopSummary nearbyStop={nearbyStop} />
      <Text style={styles.detailText}>
        Stop name: {departuresQuery.data?.stop?.name ?? nearbyStop.stop.name}
      </Text>
      {departureSummary ? <Text style={styles.detailText}>{departureSummary}</Text> : null}
      <Text style={styles.warningText}>
        Schema watch: using `vehicleMode` with `route.mode` fallback for Epic 2 readiness.
      </Text>
    </GlassCard>
  );
}

function Diagnostics({ coords }: { coords: { lat: number; lon: number; radius: number } }) {
  return (
    <View style={styles.metaGroup}>
      <Text style={styles.metaText}>API URL: {DIGITRANSIT_API_URL}</Text>
      <Text style={styles.metaText}>
        Coordinates: {coords.lat}, {coords.lon}, radius {coords.radius} m
      </Text>
    </View>
  );
}

function NearbyStopSummary({
  nearbyStop,
}: {
  nearbyStop: NonNullable<LiveApiValidationState['nearbyStop']>;
}) {
  const routeSummary = nearbyStop.stop.patterns
    ?.map((pattern) => pattern?.route.shortName)
    .filter(Boolean)
    .slice(0, 3)
    .join(', ');
  const resolvedModes = getResolvedStopModes(nearbyStop.stop);
  const resolvedTransportModes = getResolvedTransportModes(nearbyStop.stop);
  const resolvedVehicleModeSummary =
    resolvedModes.length > 0
      ? `Stop vehicleMode: ${resolvedModes.join(', ')}`
      : 'Stop vehicleMode: unavailable from vehicleMode and route patterns';
  const resolvedTransportModeSummary =
    resolvedTransportModes.length > 0
      ? `Resolved UI transport mode: ${resolvedTransportModes.join(', ')}`
      : 'Resolved UI transport mode: unavailable from vehicleMode and route patterns';

  return (
    <View style={styles.summaryGroup}>
      <Text style={styles.detailText}>{nearbyStop.stop.name}</Text>
      <Text style={styles.detailText}>GTFS ID: {nearbyStop.stop.gtfsId}</Text>
      <Text style={styles.detailText}>{resolvedVehicleModeSummary}</Text>
      <Text style={styles.detailText}>{resolvedTransportModeSummary}</Text>
      <Text style={styles.detailText}>Distance: {nearbyStop.distance ?? 'Unknown'} m</Text>
      {routeSummary ? <Text style={styles.detailText}>Patterns: {routeSummary}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  detailText: {
    color: theme.colors.text.primary,
    fontSize: theme.typography.sm.fontSize,
  },
  errorBody: {
    color: theme.colors.text.secondary,
    fontSize: theme.typography.sm.fontSize,
  },
  errorTitle: {
    color: theme.colors.status.error,
    fontSize: theme.typography.lg.fontSize,
    fontWeight: '700',
  },
  loadingText: {
    color: theme.colors.text.primary,
    fontSize: theme.typography.lg.fontSize,
    fontWeight: '600',
  },
  metaGroup: {
    gap: theme.spacing.xs,
  },
  metaText: {
    color: theme.colors.text.muted,
    fontSize: theme.typography.xs.fontSize,
  },
  successTitle: {
    color: theme.colors.status.realtime,
    fontSize: theme.typography.lg.fontSize,
    fontWeight: '700',
  },
  summaryGroup: {
    gap: theme.spacing.xs,
  },
  warningText: {
    color: theme.colors.status.estimated,
    fontSize: theme.typography.sm.fontSize,
  },
});
