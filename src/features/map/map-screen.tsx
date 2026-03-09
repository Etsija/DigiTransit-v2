import React from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSettingsStore } from '@/core/store/settings.store';
import { LocationDeniedState } from '@/features/map/components/location-denied-state';
import { MapSurface } from '@/features/map/components/map-surface';
import { HELSINKI_FALLBACK_COORDINATES } from '@/features/map/constants';
import { useDeviceLocation } from '@/features/map/hooks/use-device-location';
import { CoordinatesBar } from '@/shared/components/coordinates-bar';
import { theme } from '@/shared/theme/theme';

type MapScreenProps = {
  isActive?: boolean;
};

export function MapScreen({ isActive = true }: MapScreenProps) {
  const locationUpdateIntervalSeconds = useSettingsStore(
    (state) => state.locationUpdateIntervalSeconds
  );
  const location = useDeviceLocation({
    intervalSeconds: locationUpdateIntervalSeconds,
    isActive,
  });

  const center = location.coordinates ?? HELSINKI_FALLBACK_COORDINATES;
  const showDeniedState = location.permission.status === 'denied';

  return (
    <View style={styles.container}>
      <MapSurface
        latitude={center.latitude}
        longitude={center.longitude}
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
