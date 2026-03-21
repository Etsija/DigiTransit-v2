import mapboxgl, { type MapOptions } from 'mapbox-gl';
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { getMapboxPublicToken } from '@/core/config/env';
import { MapMarker } from '@/shared/components/map-marker';
import { theme } from '@/shared/theme/theme';
import type {
  PlatformMapCoordinates,
  PlatformMapMarker,
  PlatformMapRadiusCircle,
  PlatformMapUserInteraction,
  PlatformMapViewProps,
} from './types';

export const MAPBOX_DARK_STYLE_URL = 'mapbox://styles/mapbox/dark-v11';

type BuildMapboxOptionsInput = {
  container: unknown;
  latitude: number;
  longitude: number;
};

type MarkerRoot = {
  render(children: React.ReactNode): void;
  unmount(): void;
};

export function buildMapboxOptions({
  container,
  latitude,
  longitude,
}: BuildMapboxOptionsInput): MapOptions {
  return {
    attributionControl: false,
    center: [longitude, latitude],
    container: container as MapOptions['container'],
    pitchWithRotate: false,
    style: MAPBOX_DARK_STYLE_URL,
    zoom: 14,
  };
}

export function initializeMapboxMap(input: BuildMapboxOptionsInput) {
  mapboxgl.accessToken = getMapboxPublicToken();
  return new mapboxgl.Map(buildMapboxOptions(input));
}

type ManagedMapboxMarker = {
  marker: mapboxgl.Marker;
  root: MarkerRoot;
};

const QUERY_RADIUS_SOURCE_ID = 'nearby-query-radius-source';
const QUERY_RADIUS_FILL_LAYER_ID = 'nearby-query-radius-fill';
const QUERY_RADIUS_STROKE_LAYER_ID = 'nearby-query-radius-stroke';

function createMarkerRoot(container: Element | DocumentFragment): MarkerRoot {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const reactDomClient = require('react-dom/client') as {
    createRoot: (rootContainer: Element | DocumentFragment) => MarkerRoot;
  };

  return reactDomClient.createRoot(container);
}

export function syncMapboxMarkers(map: mapboxgl.Map, markers: PlatformMapMarker[]) {
  const activeMarkers: ManagedMapboxMarker[] = [];

  for (const markerData of markers) {
    const element = document.createElement(markerData.onPress ? 'button' : 'div');
    element.setAttribute('aria-label', markerData.accessibilityLabel ?? markerData.id);
    element.style.background = 'transparent';
    element.style.border = '0';
    element.style.padding = '0';
    element.style.cursor = markerData.onPress ? 'pointer' : 'default';

    const root = createMarkerRoot(element);
    root.render(
      <MapMarker
        isHomeStop={markerData.isHomeStop}
        label={markerData.accessibilityLabel ?? markerData.id}
        onPress={markerData.onPress}
        size={markerData.size}
        transportMode={markerData.transportMode}
      />
    );

    const marker = new mapboxgl.Marker({ element })
      .setLngLat([markerData.longitude, markerData.latitude])
      .addTo(map);

    activeMarkers.push({ marker, root });
  }

  return () => {
    for (const activeMarker of activeMarkers) {
      activeMarker.marker.remove();
      activeMarker.root.unmount();
    }
  };
}

export function syncLiveLocationMarker(
  map: mapboxgl.Map,
  coordinates: PlatformMapCoordinates | null,
  showUserLocation: boolean
) {
  if (!showUserLocation || !coordinates || typeof document === 'undefined') {
    return undefined;
  }

  const element = document.createElement('div');
  element.setAttribute('aria-label', 'Current live location');
  element.style.width = '18px';
  element.style.height = '18px';
  element.style.borderRadius = '999px';
  element.style.background = 'rgba(74, 222, 128, 0.18)';
  element.style.border = '1px solid rgba(74, 222, 128, 0.45)';
  element.style.display = 'flex';
  element.style.alignItems = 'center';
  element.style.justifyContent = 'center';

  const core = document.createElement('div');
  core.style.width = '10px';
  core.style.height = '10px';
  core.style.borderRadius = '999px';
  core.style.background = theme.colors.status.realtime;
  element.appendChild(core);

  const marker = new mapboxgl.Marker({ element })
    .setLngLat([coordinates.longitude, coordinates.latitude])
    .addTo(map);

  return () => {
    marker.remove();
  };
}

function createCircleFeature(
  center: PlatformMapCoordinates,
  radiusMeters: number,
  points: number = 48
) {
  const latitudeRadians = (center.latitude * Math.PI) / 180;
  const latDegreesPerMeter = 1 / 111_320;
  const lonDegreesPerMeter = 1 / (111_320 * Math.max(Math.cos(latitudeRadians), 0.000_001));
  const coordinates: [number, number][] = [];

  for (let index = 0; index <= points; index += 1) {
    const angle = (index / points) * Math.PI * 2;
    coordinates.push([
      center.longitude + Math.cos(angle) * radiusMeters * lonDegreesPerMeter,
      center.latitude + Math.sin(angle) * radiusMeters * latDegreesPerMeter,
    ]);
  }

  return {
    type: 'Feature' as const,
    properties: {},
    geometry: {
      type: 'Polygon' as const,
      coordinates: [coordinates],
    },
  };
}

export function syncQueryRadiusCircle(
  map: mapboxgl.Map,
  queryRadiusCircle: PlatformMapRadiusCircle | null
) {
  if (!queryRadiusCircle) {
    return undefined;
  }

  const data = createCircleFeature(queryRadiusCircle.center, queryRadiusCircle.radiusMeters);
  const existingSource = map.getSource(QUERY_RADIUS_SOURCE_ID) as
    | { setData: (nextData: typeof data) => void }
    | undefined;

  if (existingSource) {
    existingSource.setData(data);
    return undefined;
  }

  map.addSource(QUERY_RADIUS_SOURCE_ID, {
    type: 'geojson',
    data,
  });
  map.addLayer({
    id: QUERY_RADIUS_FILL_LAYER_ID,
    type: 'fill',
    source: QUERY_RADIUS_SOURCE_ID,
    paint: {
      'fill-color': theme.colors.link.primary,
      'fill-opacity': 0.08,
    },
  });
  map.addLayer({
    id: QUERY_RADIUS_STROKE_LAYER_ID,
    type: 'line',
    source: QUERY_RADIUS_SOURCE_ID,
    paint: {
      'line-color': theme.colors.link.primary,
      'line-opacity': 0.3,
      'line-width': 1,
    },
  });

  return () => {
    if (map.getLayer(QUERY_RADIUS_STROKE_LAYER_ID)) {
      map.removeLayer(QUERY_RADIUS_STROKE_LAYER_ID);
    }

    if (map.getLayer(QUERY_RADIUS_FILL_LAYER_ID)) {
      map.removeLayer(QUERY_RADIUS_FILL_LAYER_ID);
    }

    map.removeSource(QUERY_RADIUS_SOURCE_ID);
  };
}

export function bindMapboxUserCenterChanges(
  map: mapboxgl.Map,
  interactionRef: React.RefObject<boolean>,
  onUserInteractionStart?: (interaction: PlatformMapUserInteraction) => void,
  onUserCenterChange?: (coordinates: PlatformMapCoordinates) => void
) {
  const handleDragStart = () => {
    interactionRef.current = true;
    onUserInteractionStart?.({ kind: 'pan' });
  };

  const handleDrag = () => {
    const center = map.getCenter();
    onUserCenterChange?.({
      latitude: center.lat,
      longitude: center.lng,
    });
  };

  const handleDragEnd = () => {
    const center = map.getCenter();
    interactionRef.current = false;
    onUserCenterChange?.({
      latitude: center.lat,
      longitude: center.lng,
    });
  };

  map.on('dragstart', handleDragStart);
  map.on('drag', handleDrag);
  map.on('dragend', handleDragEnd);

  return () => {
    map.off('dragstart', handleDragStart);
    map.off('drag', handleDrag);
    map.off('dragend', handleDragEnd);
  };
}

export function PlatformMapView({
  latitude,
  liveLocationCoordinates = null,
  longitude,
  markers = [],
  mode = 'live',
  onMapReady,
  onUserInteractionStart,
  onUserCenterChange,
  queryRadiusCircle = null,
  showUserLocation,
}: PlatformMapViewProps) {
  const mapContainerRef = useRef<unknown>(null);
  const mapInstanceRef = useRef<mapboxgl.Map | null>(null);
  const isUserInteractingRef = useRef(false);
  const [mapInstance, setMapInstance] = useState<mapboxgl.Map | null>(null);
  const mapboxToken = getMapboxPublicToken();

  useEffect(() => {
    if (!mapboxToken) {
      onMapReady?.();
    }
  }, [mapboxToken, onMapReady]);

  useEffect(() => {
    const hasToken = mapboxToken.length > 0;
    const container = mapContainerRef.current;

    if (
      !hasToken ||
      mapInstanceRef.current ||
      typeof HTMLElement === 'undefined' ||
      !(container instanceof HTMLElement)
    ) {
      return;
    }

    const map = initializeMapboxMap({ container, latitude, longitude });
    map.once('load', () => {
      onMapReady?.();
    });
    mapInstanceRef.current = map;
    setMapInstance(map);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      setMapInstance(null);
    };
  }, [latitude, longitude, mapboxToken, onMapReady]);

  useEffect(() => {
    if (isUserInteractingRef.current) {
      return;
    }

    mapInstanceRef.current?.setCenter([longitude, latitude]);
  }, [latitude, longitude]);

  useEffect(() => {
    if (!mapInstance || typeof document === 'undefined') {
      return;
    }

    return syncMapboxMarkers(mapInstance, markers);
  }, [mapInstance, markers]);

  useEffect(() => {
    if (!mapInstance) {
      return;
    }

    return bindMapboxUserCenterChanges(
      mapInstance,
      isUserInteractingRef,
      onUserInteractionStart,
      onUserCenterChange
    );
  }, [mapInstance, onUserCenterChange, onUserInteractionStart]);

  useEffect(() => {
    if (!mapInstance) {
      return;
    }

    return syncLiveLocationMarker(mapInstance, liveLocationCoordinates, showUserLocation);
  }, [liveLocationCoordinates, mapInstance, showUserLocation]);

  useEffect(() => {
    if (!mapInstance) {
      return;
    }

    // Do not return the cleanup from syncQueryRadiusCircle here: the source and
    // layers must persist across queryRadiusCircle updates so that subsequent
    // calls hit the setData fast-update path rather than tearing down and
    // recreating the source on every pan frame. The source is removed when the
    // map instance is destroyed via map.remove() in the init effect cleanup.
    const applyCircle = () => {
      syncQueryRadiusCircle(mapInstance, queryRadiusCircle);
    };

    if (mapInstance.isStyleLoaded()) {
      applyCircle();
    } else {
      mapInstance.once('load', applyCircle);
    }

    return () => {
      mapInstance.off('load', applyCircle);
    };
  }, [mapInstance, queryRadiusCircle]);

  if (!mapboxToken) {
    return (
      <View accessibilityLabel='Map fallback surface' style={styles.fallback}>
        <Text style={styles.title}>Map preview unavailable</Text>
        <Text style={styles.body}>
          Add EXPO_PUBLIC_MAPBOX_PUBLIC_TOKEN to enable the live web map.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View ref={mapContainerRef as never} style={styles.map} testID='live-map-surface' />
      {mode === 'detached' ? (
        <View pointerEvents='none' style={styles.centerTarget} testID='map-detached-center-marker'>
          <View style={styles.centerTargetOuter}>
            <View style={styles.centerTargetInner} />
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
    backgroundColor: '#08121D',
  },
  centerTarget: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerTargetOuter: {
    width: 26,
    height: 26,
    borderRadius: theme.radius.pill,
    borderWidth: 2,
    borderColor: theme.colors.link.primary,
    backgroundColor: '#00000033',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerTargetInner: {
    width: 10,
    height: 10,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.link.primary,
  },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#08121D',
    padding: theme.spacing.xl,
    gap: theme.spacing.sm,
  },
  title: {
    color: theme.colors.text.primary,
    fontSize: theme.typography.lg.fontSize,
    fontWeight: '600',
    textAlign: 'center',
  },
  body: {
    color: theme.colors.text.secondary,
    fontSize: theme.typography.sm.fontSize,
    lineHeight: 20,
    maxWidth: 320,
    textAlign: 'center',
  },
});
