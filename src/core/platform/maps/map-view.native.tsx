import React, { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import MapView, {
  Marker,
  PROVIDER_GOOGLE,
  type MapStyleElement,
  type Region,
} from 'react-native-maps';

import { getIosGoogleMapsApiKey } from '@/core/config/env';
import { MAP_REGION_DELTA } from '@/features/map/constants';

import type { PlatformMapViewProps } from './types';

const DARK_MAP_STYLE: MapStyleElement[] = [
  { elementType: 'geometry', stylers: [{ color: '#0b1220' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8ea3b7' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0b1220' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#1f2937' }] },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#0f172a' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#111827' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#0a1a17' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#172033' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#111827' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#1d4d5b' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#143844' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#162132' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#07111f' }] },
];

function buildRegion(latitude: number, longitude: number): Region {
  return {
    latitude,
    longitude,
    latitudeDelta: MAP_REGION_DELTA.latitudeDelta,
    longitudeDelta: MAP_REGION_DELTA.longitudeDelta,
  };
}

function shouldUseGoogleProvider() {
  return Platform.OS === 'android' || getIosGoogleMapsApiKey().length > 0;
}

export function PlatformMapView({
  latitude,
  longitude,
  camera,
  markers = [],
  onMapReady,
  showUserLocation,
}: PlatformMapViewProps) {
  const mapRef = useRef<MapView | null>(null);
  const initialRegion = buildRegion(
    camera?.latitude ?? latitude,
    camera?.longitude ?? longitude
  );

  useEffect(() => {
    mapRef.current?.animateToRegion(
      buildRegion(camera?.latitude ?? latitude, camera?.longitude ?? longitude),
      250
    );
  }, [camera?.latitude, camera?.longitude, latitude, longitude]);

  return (
    <MapView
      customMapStyle={DARK_MAP_STYLE}
      initialRegion={initialRegion}
      onMapReady={onMapReady}
      provider={shouldUseGoogleProvider() ? PROVIDER_GOOGLE : undefined}
      ref={mapRef}
      showsCompass={false}
      showsMyLocationButton={false}
      showsUserLocation={showUserLocation}
      style={{ flex: 1 }}
      testID='live-map-surface'
    >
      {markers.map((marker) => (
        <Marker
          accessibilityLabel={marker.accessibilityLabel}
          coordinate={{ latitude: marker.latitude, longitude: marker.longitude }}
          description={marker.description}
          key={marker.id}
          pinColor={marker.color}
          title={marker.title}
        />
      ))}
    </MapView>
  );
}

export { DARK_MAP_STYLE };
