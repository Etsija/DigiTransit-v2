import React, { useRef } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSettingsStore } from '@/core/store/settings.store';
import { PlatformMapView } from '@/core/platform/maps/map-view';
import { LocationDeniedState } from '@/features/map/components/location-denied-state';
import { HELSINKI_FALLBACK_COORDINATES } from '@/features/map/constants';
import { useDeviceLocation } from '@/features/map/hooks/use-device-location';
import { CoordinatesBar } from '@/shared/components/coordinates-bar';
import { theme } from '@/shared/theme/theme';

type MapScreenProps = {
  isActive?: boolean;
};

const MAP_LOAD_BUDGET_MS = 3000;

function getNow() {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }

  return Date.now();
}

export function MapScreen({ isActive = true }: MapScreenProps) {
  const mapLoadStartedAtRef = useRef(getNow());
  const hasReportedMapReadyRef = useRef(false);
  const locationUpdateIntervalSeconds = useSettingsStore(
    (state) => state.locationUpdateIntervalSeconds
  );
  const location = useDeviceLocation({
    intervalSeconds: locationUpdateIntervalSeconds,
    isActive,
  });

  const center = location.coordinates ?? HELSINKI_FALLBACK_COORDINATES;
  const showDeniedState = location.permission.status === 'denied';
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

  return (
    <View style={styles.container}>
      <PlatformMapView
        latitude={center.latitude}
        longitude={center.longitude}
        onMapReady={handleMapReady}
        showUserLocation={location.permission.status === 'granted'}
      />

      <SafeAreaView pointerEvents='box-none' style={styles.safeArea}>
        <View style={styles.overlay}>
          <CoordinatesBar
            isFixed={location.isFixed}
            latitude={location.coordinates?.latitude ?? null}
            longitude={location.coordinates?.longitude ?? null}
          />

          {showDeniedState ? (
            <LocationDeniedState onOpenSettings={() => void Linking.openSettings()} />
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
