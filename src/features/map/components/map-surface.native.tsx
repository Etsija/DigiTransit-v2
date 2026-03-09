import React, { useEffect, useRef } from 'react';
import MapView, { type Region } from 'react-native-maps';

import { MAP_REGION_DELTA } from '@/features/map/constants';

type MapSurfaceProps = {
  latitude: number;
  longitude: number;
  showUserLocation: boolean;
};

function buildRegion(latitude: number, longitude: number): Region {
  return {
    latitude,
    longitude,
    latitudeDelta: MAP_REGION_DELTA.latitudeDelta,
    longitudeDelta: MAP_REGION_DELTA.longitudeDelta,
  };
}

export function MapSurface({ latitude, longitude, showUserLocation }: MapSurfaceProps) {
  const mapRef = useRef<MapView | null>(null);
  const initialRegion = buildRegion(latitude, longitude);

  useEffect(() => {
    mapRef.current?.animateToRegion(buildRegion(latitude, longitude), 250);
  }, [latitude, longitude]);

  return (
    <MapView
      initialRegion={initialRegion}
      ref={mapRef}
      showsMyLocationButton={false}
      showsUserLocation={showUserLocation}
      style={{ flex: 1 }}
      testID='live-map-surface'
    />
  );
}
