export type PlatformMapCamera = {
  latitude: number;
  longitude: number;
  latitudeDelta?: number;
  longitudeDelta?: number;
};

export type PlatformMapMarker = {
  id: string;
  latitude: number;
  longitude: number;
  color?: string;
  title?: string;
  description?: string;
  accessibilityLabel?: string;
};

export type PlatformMapViewProps = {
  latitude: number;
  longitude: number;
  showUserLocation: boolean;
  camera?: PlatformMapCamera;
  markers?: PlatformMapMarker[];
  onMapReady?: () => void;
};
