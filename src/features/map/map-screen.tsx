import React, { useMemo, useRef } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { getAppErrorMessage } from '@/core/errors/app-error';
import { PlatformMapView } from '@/core/platform/maps/map-view';
import { useSettingsStore } from '@/core/store/settings.store';
import { LocationDeniedState } from '@/features/map/components/location-denied-state';
import { HELSINKI_FALLBACK_COORDINATES } from '@/features/map/constants';
import {
  requestDeviceLocationPermission,
  useDeviceLocation,
} from '@/features/map/hooks/use-device-location';
import { createMapStopMarkers } from '@/features/map/hooks/use-map-stop-markers';
import { useHomeStopLaunchNotification } from '@/features/notifications/hooks/use-home-stop-launch-notification';
import { useNearbyStops } from '@/features/stops/hooks/use-nearby-stops';
import { CoordinatesBar } from '@/shared/components/coordinates-bar';
import { ErrorBanner } from '@/shared/components/error-banner';
import { theme } from '@/shared/theme/theme';

type MapScreenProps = {
  isActive?: boolean;
  onSelectStop?: (stopId: string) => void;
};

const MAP_LOAD_BUDGET_MS = 3000;

function getNow() {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }

  return Date.now();
}

export function MapScreen({ isActive = true, onSelectStop }: MapScreenProps) {
  const mapLoadStartedAtRef = useRef(getNow());
  const hasReportedMapReadyRef = useRef(false);
  const hasRetriedPermissionPromptRef = useRef(false);
  const insets = useSafeAreaInsets();
  const locationUpdateIntervalSeconds = useSettingsStore(
    (state) => state.locationUpdateIntervalSeconds
  );
  const searchRadiusMeters = useSettingsStore((state) => state.searchRadiusMeters);
  const homeStopId = useSettingsStore((state) => state.homeStop?.gtfsId ?? null);
  useHomeStopLaunchNotification({ isActive });
  const location = useDeviceLocation({
    intervalSeconds: locationUpdateIntervalSeconds,
    isActive,
  });

  const center = location.coordinates ?? HELSINKI_FALLBACK_COORDINATES;
  const showDeniedState = location.permission.status === 'denied';
  const nearbyStopsQuery = useNearbyStops({
    coordinates: location.coordinates,
    enabled: isActive && Boolean(location.coordinates),
  });
  const markers = useMemo(
    () =>
      createMapStopMarkers(nearbyStopsQuery.data ?? [], {
        homeStopId,
        maxDistanceMeters: searchRadiusMeters,
        onSelectStop,
      }),
    [homeStopId, nearbyStopsQuery.data, onSelectStop, searchRadiusMeters]
  );
  const bottomOverlayInset =
    insets.bottom + theme.layout.tabBarHeight + theme.spacing.xl + theme.spacing.sm;
  const handleMapReady = () => {
    if (hasReportedMapReadyRef.current) {
      return;
    }

    hasReportedMapReadyRef.current = true;
    const durationMs = getNow() - mapLoadStartedAtRef.current;

    if (__DEV__) {
      console.info(`[map] visible in ${Math.round(durationMs)}ms`);

      if (durationMs > MAP_LOAD_BUDGET_MS) {
        console.warn(
          `[map] visibility budget exceeded: ${Math.round(durationMs)}ms > ${MAP_LOAD_BUDGET_MS}ms`
        );
      }
    }
  };

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
      <PlatformMapView
        latitude={center.latitude}
        longitude={center.longitude}
        markers={markers}
        onMapReady={handleMapReady}
        showUserLocation={location.permission.status === 'granted'}
      />

      <SafeAreaView pointerEvents='box-none' style={styles.safeArea}>
        <View style={[styles.overlay, { paddingBottom: bottomOverlayInset }]}>
          <CoordinatesBar
            isFixed={location.isFixed}
            latitude={location.coordinates?.latitude ?? null}
            longitude={location.coordinates?.longitude ?? null}
          />

          {nearbyStopsQuery.isError ? (
            <ErrorBanner message={getAppErrorMessage(nearbyStopsQuery.error)} />
          ) : null}

          {showDeniedState ? (
            <LocationDeniedState
              canRequestAgain={location.permission.canAskAgain || !location.hasRequestedPermission}
              onOpenSettings={() => void Linking.openSettings()}
              onRequestPermission={() => void requestDeviceLocationPermission()}
            />
          ) : null}
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
  safeArea: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
    padding: theme.spacing.lg,
    gap: theme.spacing.lg,
  },
});
