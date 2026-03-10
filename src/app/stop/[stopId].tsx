import { useIsFocused } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { StopRouteParams } from '@/types/navigation';
import React from 'react';

import { useSettingsStore } from '@/core/store/settings.store';
import { DeparturesScreen } from '@/features/departures/departures-screen';
import { useDeviceLocation } from '@/features/map/hooks/use-device-location';

export default function StopDetailsScreen() {
  const isFocused = useIsFocused();
  const { stopId } = useLocalSearchParams<StopRouteParams>();
  const router = useRouter();
  const locationUpdateIntervalSeconds = useSettingsStore(
    (state) => state.locationUpdateIntervalSeconds
  );
  const location = useDeviceLocation({
    intervalSeconds: locationUpdateIntervalSeconds,
    isActive: isFocused,
  });

  return (
    <DeparturesScreen
      coordinates={location.coordinates}
      onBack={() => router.back()}
      stopId={stopId}
    />
  );
}
