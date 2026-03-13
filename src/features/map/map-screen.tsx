import { GlassView } from 'expo-glass-effect';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { getAppErrorMessage } from '@/core/errors/app-error';
import { PlatformMapView } from '@/core/platform/maps/map-view';
import type { PlatformMapCoordinates } from '@/core/platform/maps/types';
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
import { useNearbyStopsSourceStore } from '@/features/stops/store/nearby-stops-source.store';
import { CoordinatesBar } from '@/shared/components/coordinates-bar';
import { ErrorBanner } from '@/shared/components/error-banner';
import { AppIcon } from '@/shared/icons';
import { theme } from '@/shared/theme/theme';

type MapScreenProps = {
  isActive?: boolean;
  onSelectStop?: (stopId: string) => void;
};

const MAP_LOAD_BUDGET_MS = 3000;
const DETACHED_MODE_DISTANCE_METERS = 40;

function getNow() {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }

  return Date.now();
}

function haversineDistanceMeters(a: PlatformMapCoordinates, b: PlatformMapCoordinates) {
  const earthRadius = 6_371_000;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const h =
    sinLat * sinLat +
    Math.cos((a.latitude * Math.PI) / 180) *
      Math.cos((b.latitude * Math.PI) / 180) *
      sinLon *
      sinLon;

  return earthRadius * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
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

  const [recenterToken, setRecenterToken] = useState(0);
  const [activeCameraRequestKey, setActiveCameraRequestKey] = useState<number | null>(null);
  const [cameraOverrideCoordinates, setCameraOverrideCoordinates] =
    useState<PlatformMapCoordinates | null>(null);
  const isDetached = useNearbyStopsSourceStore((state) => state.mode === 'detached');
  const detachedCenter = useNearbyStopsSourceStore((state) => state.detachedCenter);
  const detachedQueryCoordinates = useNearbyStopsSourceStore(
    (state) => state.detachedQueryCoordinates
  );
  const startDetached = useNearbyStopsSourceStore((state) => state.startDetached);
  const setDetachedCenter = useNearbyStopsSourceStore((state) => state.setDetachedCenter);
  const confirmDetachedQuery = useNearbyStopsSourceStore((state) => state.confirmDetachedQuery);
  const returnToLive = useNearbyStopsSourceStore((state) => state.returnToLive);
  const liveCoordinates = location.coordinates;
  const activeCenterCoordinates =
    isDetached && detachedCenter ? detachedCenter : (liveCoordinates ?? null);
  const { address: resolvedAddress } = useReverseGeocode(activeCenterCoordinates);
  const center =
    isDetached && detachedCenter
      ? detachedCenter
      : (liveCoordinates ?? HELSINKI_FALLBACK_COORDINATES);
  const showDeniedState = location.permission.status === 'denied';
  const showRecenterButton = location.permission.status === 'granted' && Boolean(liveCoordinates);
  const showDetachedQueryButton = isDetached && Boolean(detachedCenter);
  const cameraOverride =
    activeCameraRequestKey === recenterToken && cameraOverrideCoordinates
      ? {
          latitude: cameraOverrideCoordinates.latitude,
          longitude: cameraOverrideCoordinates.longitude,
          latitudeDelta: 0.025,
          longitudeDelta: 0.025,
        }
      : undefined;
  const handleRecenter = useCallback(() => {
    if (!liveCoordinates) {
      return;
    }

    returnToLive();
    setCameraOverrideCoordinates(liveCoordinates);
    setRecenterToken((token) => {
      const nextToken = token + 1;
      setActiveCameraRequestKey(nextToken);
      return nextToken;
    });
  }, [liveCoordinates, returnToLive]);
  const handleUserInteractionStart = useCallback(() => {
    if (isDetached || !liveCoordinates) {
      return;
    }

    startDetached(liveCoordinates);
  }, [isDetached, liveCoordinates, startDetached]);
  const handleUserCenterChange = useCallback(
    (nextCenter: PlatformMapCoordinates) => {
      if (!liveCoordinates) {
        return;
      }

      const distanceFromLive = haversineDistanceMeters(liveCoordinates, nextCenter);

      if (distanceFromLive < DETACHED_MODE_DISTANCE_METERS) {
        if (isDetached) {
          setDetachedCenter(nextCenter);
        }
        return;
      }

      setDetachedCenter(nextCenter);
    },
    [isDetached, liveCoordinates, setDetachedCenter]
  );
  const handleDetachedQuery = useCallback(() => {
    confirmDetachedQuery();
  }, [confirmDetachedQuery]);
  const nearbyStopsQuery = useNearbyStops({
    coordinates: isDetached ? detachedQueryCoordinates : liveCoordinates,
    enabled:
      isActive && (isDetached ? Boolean(detachedQueryCoordinates) : Boolean(liveCoordinates)),
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
    if (activeCameraRequestKey !== null) {
      setActiveCameraRequestKey(null);
      setCameraOverrideCoordinates(null);
    }
  }, [activeCameraRequestKey]);

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
        liveLocationCoordinates={liveCoordinates}
        longitude={center.longitude}
        markers={markers}
        mode={isDetached ? 'detached' : 'live'}
        onMapReady={handleMapReady}
        onUserInteractionStart={handleUserInteractionStart}
        onUserCenterChange={handleUserCenterChange}
        recenterRequestKey={recenterToken}
        showUserLocation={location.permission.status === 'granted'}
      />

      <SafeAreaView pointerEvents='box-none' style={styles.safeArea}>
        <View style={[styles.overlay, { paddingBottom: bottomOverlayInset }]}>
          <CoordinatesBar
            isFixed={isDetached ? false : location.isFixed}
            latitude={activeCenterCoordinates?.latitude ?? null}
            longitude={activeCenterCoordinates?.longitude ?? null}
            resolvedAddress={resolvedAddress ?? (isDetached ? 'Map center' : undefined)}
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
              {showDetachedQueryButton ? (
                <Pressable
                  accessibilityLabel='Query nearby stops at map center'
                  accessibilityRole='button'
                  onPress={handleDetachedQuery}
                  style={({ pressed }) => [
                    styles.queryButton,
                    pressed && styles.recenterButtonPressed,
                  ]}
                  testID='map-query-here-button'
                >
                  <GlassView glassEffectStyle={theme.glass.glassStyle} style={styles.queryGlass}>
                    <View style={styles.recenterOverlay} />
                    <Text style={styles.queryButtonText}>Query here</Text>
                  </GlassView>
                </Pressable>
              ) : null}
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
    flexDirection: 'row',
    gap: theme.spacing.sm,
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
  queryButton: {
    height: 48,
    minWidth: theme.layout.minTouchTarget * 2,
    borderRadius: theme.radius.card,
    overflow: 'hidden',
  },
  queryGlass: {
    minWidth: theme.layout.minTouchTarget * 2,
    height: 48,
    borderRadius: theme.radius.card,
    borderWidth: theme.borderWidth.subtle,
    borderColor: `${theme.colors.status.realtime}55`,
    backgroundColor: theme.colors.card.bg,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  queryButtonText: {
    color: theme.colors.text.primary,
    fontSize: theme.typography.sm.fontSize,
    fontWeight: '600',
  },
});
