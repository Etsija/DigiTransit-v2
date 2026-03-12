import { GlassView } from 'expo-glass-effect';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
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
import { useReverseGeocode } from '@/features/map/hooks/use-reverse-geocode';
import { useHomeStopLaunchNotification } from '@/features/notifications/hooks/use-home-stop-launch-notification';
import { useNearbyStops } from '@/features/stops/hooks/use-nearby-stops';
import { CoordinatesBar } from '@/shared/components/coordinates-bar';
import { ErrorBanner } from '@/shared/components/error-banner';
import { AppIcon } from '@/shared/icons';
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

  const { address: resolvedAddress } = useReverseGeocode(location.coordinates);
  const [recenterToken, setRecenterToken] = useState(0);
  const currentCoordinates = location.coordinates;
  const center = location.coordinates ?? HELSINKI_FALLBACK_COORDINATES;
  const showDeniedState = location.permission.status === 'denied';
  const showRecenterButton =
    location.permission.status === 'granted' && Boolean(currentCoordinates);
  const cameraOverride =
    recenterToken > 0 && currentCoordinates
      ? { latitude: currentCoordinates.latitude, longitude: currentCoordinates.longitude }
      : undefined;
  const handleRecenter = useCallback(() => {
    setRecenterToken((t) => t + 1);
  }, []);
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
  const bottomOverlayInset = insets.bottom + theme.layout.tabBarHeight;
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
        camera={cameraOverride}
        latitude={center.latitude}
        longitude={center.longitude}
        markers={markers}
        onMapReady={handleMapReady}
        recenterRequestKey={recenterToken}
        showUserLocation={location.permission.status === 'granted'}
      />

      <SafeAreaView pointerEvents='box-none' style={styles.safeArea}>
        <View style={[styles.overlay, { paddingBottom: bottomOverlayInset }]}>
          <CoordinatesBar
            isFixed={location.isFixed}
            latitude={location.coordinates?.latitude ?? null}
            longitude={location.coordinates?.longitude ?? null}
            resolvedAddress={resolvedAddress}
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

          {showRecenterButton ? (
            <View pointerEvents='box-none' style={styles.recenterRow}>
              <Pressable
                accessibilityLabel='Recenter map on current location'
                accessibilityRole='button'
                onPress={handleRecenter}
                style={({ pressed }) => [
                  styles.recenterButton,
                  pressed && styles.recenterButtonPressed,
                ]}
                testID='map-recenter-button'
              >
                <GlassView glassEffectStyle={theme.glass.glassStyle} style={styles.recenterGlass}>
                  <View style={styles.recenterOverlay} />
                  <AppIcon name='locate-outline' size={22} color={theme.colors.text.primary} />
                </GlassView>
              </Pressable>
            </View>
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
  recenterRow: {
    alignItems: 'flex-start',
  },
  recenterButton: {
    width: 48,
    height: 48,
    borderRadius: theme.radius.card,
    overflow: 'hidden',
  },
  recenterButtonPressed: {
    opacity: 0.72,
  },
  recenterGlass: {
    width: 48,
    height: 48,
    borderRadius: theme.radius.card,
    borderWidth: theme.borderWidth.subtle,
    borderColor: theme.colors.card.border,
    backgroundColor: theme.colors.card.bg,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recenterOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.card.bg,
  },
});
