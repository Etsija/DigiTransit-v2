import mapboxgl, { type MapboxOptions } from 'mapbox-gl';
import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { getMapboxPublicToken } from '@/core/config/env';
import { theme } from '@/shared/theme/theme';

import type { PlatformMapViewProps } from './types';

export const MAPBOX_DARK_STYLE_URL = 'mapbox://styles/mapbox/dark-v11';

type BuildMapboxOptionsInput = {
  container: unknown;
  latitude: number;
  longitude: number;
};

export function buildMapboxOptions({
  container,
  latitude,
  longitude,
}: BuildMapboxOptionsInput): MapboxOptions {
  return {
    attributionControl: false,
    center: [longitude, latitude],
    container: container as MapboxOptions['container'],
    pitchWithRotate: false,
    style: MAPBOX_DARK_STYLE_URL,
    zoom: 14,
  };
}

export function initializeMapboxMap(input: BuildMapboxOptionsInput) {
  mapboxgl.accessToken = getMapboxPublicToken();
  return new mapboxgl.Map(buildMapboxOptions(input));
}

export function PlatformMapView({
  latitude,
  longitude,
  onMapReady,
}: PlatformMapViewProps) {
  const mapContainerRef = useRef<unknown>(null);
  const mapInstanceRef = useRef<mapboxgl.Map | null>(null);
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

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [latitude, longitude, mapboxToken, onMapReady]);

  useEffect(() => {
    mapInstanceRef.current?.setCenter([longitude, latitude]);
  }, [latitude, longitude]);

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

  return <View ref={mapContainerRef as never} style={styles.map} testID='live-map-surface' />;
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
    backgroundColor: '#08121D',
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
