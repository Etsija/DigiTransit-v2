import type { TransportMode } from '@/shared/theme/theme';

export type PlatformMapCoordinates = {
  latitude: number;
  longitude: number;
};

export type PlatformMapCamera = {
  latitude: number;
  longitude: number;
  latitudeDelta?: number;
  longitudeDelta?: number;
};

export type PlatformMapRadiusCircle = {
  center: PlatformMapCoordinates;
  radiusMeters: number;
};

export type PlatformMapUserInteraction = {
  kind: 'pan';
};

export type PlatformMapMarker = {
  id: string;
  stopId?: string;
  latitude: number;
  longitude: number;
  transportMode: TransportMode;
  size: number;
  isHomeStop?: boolean;
  accessibilityLabel?: string;
  onPress?: () => void;
};

export type PlatformMapViewProps = {
  latitude: number;
  longitude: number;
  showUserLocation: boolean;
  camera?: PlatformMapCamera;
  liveLocationCoordinates?: PlatformMapCoordinates | null;
  queryRadiusCircle?: PlatformMapRadiusCircle | null;
  mode?: 'live' | 'detached';
  recenterRequestKey?: number;
  markers?: PlatformMapMarker[];
  onMapReady?: () => void;
  onUserInteractionStart?: (interaction: PlatformMapUserInteraction) => void;
  onUserCenterChange?: (coordinates: PlatformMapCoordinates) => void;
};
