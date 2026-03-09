import React from 'react';
import { View } from 'react-native';

type MapSurfaceProps = {
  latitude: number;
  longitude: number;
  showUserLocation: boolean;
};

export function MapSurface(_props: MapSurfaceProps) {
  return (
    <View
      accessibilityLabel='Map fallback surface'
      style={{ flex: 1, backgroundColor: '#08121D' }}
      testID='live-map-surface'
    />
  );
}
