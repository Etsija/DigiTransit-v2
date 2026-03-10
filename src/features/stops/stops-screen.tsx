import { Image } from 'expo-image';
import React from 'react';
import { ActivityIndicator, FlatList, Linking, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSettingsStore } from '@/core/store/settings.store';
import { LocationDeniedState } from '@/features/map/components/location-denied-state';
import {
  requestDeviceLocationPermission,
  useDeviceLocation,
} from '@/features/map/hooks/use-device-location';
import { HomeStopButton } from '@/features/stops/components/home-stop-button';
import {
  formatDistanceMeters,
  formatRoutePatternsLabel,
  formatZoneLabel,
} from '@/features/stops/components/nearby-stop-formatters';
import { useNearbyStops } from '@/features/stops/hooks/use-nearby-stops';
import { CoordinatesBar } from '@/shared/components/coordinates-bar';
import { EmptyState } from '@/shared/components/empty-state';
import { LoadingState } from '@/shared/components/loading-state';
import { StopCard } from '@/shared/components/stop-card';
import { theme } from '@/shared/theme/theme';

type StopsScreenProps = {
  isActive?: boolean;
  onStopPress: (stopId: string) => void;
};

export function StopsScreen({ isActive = true, onStopPress }: StopsScreenProps) {
  const hasRetriedPermissionPromptRef = React.useRef(false);
  const locationUpdateIntervalSeconds = useSettingsStore(
    (state) => state.locationUpdateIntervalSeconds
  );
  const searchRadiusMeters = useSettingsStore((state) => state.searchRadiusMeters);
  const homeStop = useSettingsStore((state) => state.homeStop);
  const updateSettings = useSettingsStore((state) => state.updateSettings);
  const [pendingHomeStop, setPendingHomeStop] = React.useState<{
    gtfsId: string;
    name: string;
    transportMode: NonNullable<typeof homeStop>['transportMode'];
    mode: 'pin' | 'unpin';
  } | null>(null);
  const location = useDeviceLocation({
    intervalSeconds: locationUpdateIntervalSeconds,
    isActive,
  });
  const nearbyStopsQuery = useNearbyStops({
    coordinates: location.coordinates,
    enabled: isActive && Boolean(location.coordinates),
  });

  const stops = nearbyStopsQuery.data ?? [];
  const hasStops = stops.length > 0;
  const showDeniedState = location.permission.status === 'denied';
  const showInitialLoader =
    !showDeniedState && !hasStops && (location.isLoading || nearbyStopsQuery.isPending);
  const showInlineRefresh = hasStops && nearbyStopsQuery.isFetching;
  const showInlineFailure = hasStops && nearbyStopsQuery.isError;
  const showLocationErrorState =
    !showDeniedState && !hasStops && !showInitialLoader && Boolean(location.error);
  const showErrorEmptyState = !hasStops && nearbyStopsQuery.isError;
  const showNoStopsState =
    !showDeniedState &&
    !showInitialLoader &&
    !showLocationErrorState &&
    !showErrorEmptyState &&
    !hasStops;

  React.useEffect(() => {
    if (
      location.permission.status === 'granted' ||
      (!location.permission.canAskAgain && location.hasRequestedPermission)
    ) {
      hasRetriedPermissionPromptRef.current = false;
      return;
    }

    if (
      isActive &&
      location.permission.status === 'denied' &&
      !hasRetriedPermissionPromptRef.current
    ) {
      hasRetriedPermissionPromptRef.current = true;
      void requestDeviceLocationPermission();
    }
  }, [
    isActive,
    location.hasRequestedPermission,
    location.permission.canAskAgain,
    location.permission.status,
  ]);

  return (
    <View style={styles.container}>
      <Image
        source={require('../../../assets/images/map-backdrop.png')}
        blurRadius={1}
        contentFit='cover'
        contentPosition='center'
        testID='stops-static-backdrop'
        style={styles.backdrop}
      />
      <View style={styles.backdropScrim} />
      <View style={styles.backdropTint} />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <CoordinatesBar
            isFixed={location.isFixed}
            latitude={location.coordinates?.latitude ?? null}
            longitude={location.coordinates?.longitude ?? null}
          />

          <View style={styles.panel}>
            <View style={styles.panelHeader}>
              <View style={styles.headerCopy}>
                <Text style={styles.title}>Nearby stops</Text>
                <Text style={styles.subtitle}>
                  Long-press a stop to pin it as your home stop. Long-press the pinned one again to
                  unpin it.
                </Text>
              </View>
              {showInlineRefresh ? (
                <View style={styles.refreshIndicator}>
                  <ActivityIndicator
                    color={theme.colors.text.secondary}
                    size='small'
                    testID='stops-refresh-indicator'
                  />
                  <Text style={styles.refreshText}>Refreshing nearby stops</Text>
                </View>
              ) : null}
            </View>

            {showDeniedState ? (
              <View style={styles.flexFill}>
                <LocationDeniedState
                  canRequestAgain={
                    location.permission.canAskAgain || !location.hasRequestedPermission
                  }
                  message='Enable location access to see nearby stops'
                  onOpenSettings={() => void Linking.openSettings()}
                  onRequestPermission={() => void requestDeviceLocationPermission()}
                />
              </View>
            ) : null}

            {showInitialLoader ? <LoadingState message='Finding nearby stops...' /> : null}

            {showInlineFailure ? (
              <Text style={styles.inlineMessage}>
                Showing last updated nearby stops while connection recovers.
              </Text>
            ) : null}

            {pendingHomeStop ? (
              <HomeStopButton
                mode={pendingHomeStop.mode}
                stop={pendingHomeStop}
                onConfirm={() => {
                  updateSettings({
                    homeStop:
                      pendingHomeStop.mode === 'unpin'
                        ? null
                        : {
                            gtfsId: pendingHomeStop.gtfsId,
                            name: pendingHomeStop.name,
                            transportMode: pendingHomeStop.transportMode,
                          },
                  });
                  setPendingHomeStop(null);
                }}
                onDismiss={() => setPendingHomeStop(null)}
              />
            ) : null}

            {showLocationErrorState ? (
              <EmptyState
                title='Location unavailable'
                message="We couldn't determine your current location. Check that location services are enabled and try again."
              />
            ) : null}

            {showErrorEmptyState ? (
              <EmptyState
                title='Unable to load nearby stops'
                message='Check your connection and try again. The Stops tab will recover automatically when data becomes available.'
              />
            ) : null}

            {showNoStopsState ? (
              <EmptyState
                title='No nearby stops found'
                message={`No stops within ${searchRadiusMeters}m - try increasing search radius in Settings`}
              />
            ) : null}

            {hasStops ? (
              <FlatList
                data={stops}
                keyExtractor={(item) => item.gtfsId}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => {
                  const routePatternsLabel = formatRoutePatternsLabel(item.routePatterns);

                  return (
                    <StopCard
                      name={item.name}
                      code={item.code}
                      transportMode={item.transportMode}
                      distanceLabel={formatDistanceMeters(item.distanceMeters)}
                      zoneLabel={formatZoneLabel(item.zoneId)}
                      routePatternsLabel={routePatternsLabel || undefined}
                      secondaryLabel={item.parentStationName ?? undefined}
                      isPinned={homeStop?.gtfsId === item.gtfsId}
                      onPress={() => onStopPress(item.gtfsId)}
                      onLongPress={() =>
                        setPendingHomeStop({
                          gtfsId: item.gtfsId,
                          name: item.name,
                          transportMode: item.transportMode,
                          mode: homeStop?.gtfsId === item.gtfsId ? 'unpin' : 'pin',
                        })
                      }
                    />
                  );
                }}
              />
            ) : null}
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.82,
  },
  backdropScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
  },
  backdropTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(4, 7, 12, 0.44)',
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: theme.spacing.lg,
    gap: theme.spacing.lg,
  },
  panel: {
    flex: 1,
    borderRadius: theme.radius.card,
    borderWidth: theme.borderWidth.subtle,
    borderColor: theme.colors.card.border,
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
    overflow: 'hidden',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
    paddingBottom: theme.spacing.md,
  },
  headerCopy: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  title: {
    color: theme.colors.text.primary,
    fontSize: theme.typography.heading.fontSize,
    fontWeight: theme.typography.heading.fontWeight,
  },
  subtitle: {
    color: theme.colors.text.secondary,
    fontSize: theme.typography.sm.fontSize,
    fontWeight: theme.typography.sm.fontWeight,
    lineHeight: 18,
  },
  refreshIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  refreshText: {
    color: theme.colors.text.secondary,
    fontSize: theme.typography.xs.fontSize,
    fontWeight: '600',
  },
  inlineMessage: {
    color: theme.colors.status.estimated,
    fontSize: theme.typography.sm.fontSize,
    fontWeight: theme.typography.sm.fontWeight,
    paddingBottom: theme.spacing.md,
  },
  listContent: {
    paddingBottom: theme.spacing['2xl'],
    gap: theme.layout.cardListGap,
  },
  flexFill: {
    flex: 1,
  },
});
