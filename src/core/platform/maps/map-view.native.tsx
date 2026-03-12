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
import { MapMarker } from '@/shared/components/map-marker';
import type { PlatformMapViewProps } from './types';

const DARK_MAP_STYLE: MapStyleElement[] = [
  { elementType: 'geometry', stylers: [{ color: '#0b1220' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8ea3b7' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0b1220' }] },
  {
    featureType: 'administrative',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#1f2937' }],
  },
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
  recenterRequestKey = 0,
  markers = [],
  onMapReady,
  showUserLocation,
}: PlatformMapViewProps) {
  const mapRef = useRef<MapView | null>(null);
  const tracksViewChangesTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [tracksViewChanges, setTracksViewChanges] = React.useState(markers.length > 0);
  const initialRegion = buildRegion(camera?.latitude ?? latitude, camera?.longitude ?? longitude);

  useEffect(() => {
    mapRef.current?.animateToRegion(
      buildRegion(camera?.latitude ?? latitude, camera?.longitude ?? longitude),
      250
    );
  }, [camera?.latitude, camera?.longitude, latitude, longitude, recenterRequestKey]);

  useEffect(() => {
    if (tracksViewChangesTimeoutRef.current) {
      clearTimeout(tracksViewChangesTimeoutRef.current);
      tracksViewChangesTimeoutRef.current = null;
    }

    if (markers.length === 0) {
      setTracksViewChanges(false);
      return;
    }

    setTracksViewChanges(true);
    tracksViewChangesTimeoutRef.current = setTimeout(() => {
      setTracksViewChanges(false);
      tracksViewChangesTimeoutRef.current = null;
    }, 250);

    return () => {
      if (tracksViewChangesTimeoutRef.current) {
        clearTimeout(tracksViewChangesTimeoutRef.current);
        tracksViewChangesTimeoutRef.current = null;
      }
    };
  }, [markers]);

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
          anchor={{ x: 0.5, y: 0.5 }}
          coordinate={{ latitude: marker.latitude, longitude: marker.longitude }}
          key={marker.id}
          onPress={marker.onPress}
          testID={`map-marker-${marker.id}`}
          tracksViewChanges={tracksViewChanges}
        >
          <MapMarker
            isHomeStop={marker.isHomeStop}
            label={marker.accessibilityLabel ?? marker.id}
            size={marker.size}
            transportMode={marker.transportMode}
          />
        </Marker>
      ))}
    </MapView>
  );
}

export { DARK_MAP_STYLE };
