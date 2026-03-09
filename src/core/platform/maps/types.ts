import type { TransportMode } from '@/shared/theme/theme';

export type PlatformMapCamera = {
  latitude: number;
  longitude: number;
  latitudeDelta?: number;
  longitudeDelta?: number;
};

export type PlatformMapMarker = {
  id: string;
  stopId?: string;
  latitude: number;
  longitude: number;
  transportMode: TransportMode;
  size: number;
  accessibilityLabel?: string;
  onPress?: () => void;
};

export type PlatformMapViewProps = {
  latitude: number;
  longitude: number;
  showUserLocation: boolean;
  camera?: PlatformMapCamera;
  markers?: PlatformMapMarker[];
  onMapReady?: () => void;
};
