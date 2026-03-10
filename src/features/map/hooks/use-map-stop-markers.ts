import type { PlatformMapMarker } from '@/core/platform/maps/types';
import type { NearbyStop } from '@/features/stops/hooks/use-nearby-stops';
import { theme } from '@/shared/theme/theme';

function clampMarkerSize(size: number) {
  return Math.min(
    theme.layout.markerSizeNear,
    Math.max(theme.layout.markerSizeBase, Math.round(size))
  );
}

export function getMarkerSizeForDistance(distanceMeters: number, maxDistanceMeters: number) {
  if (maxDistanceMeters <= 0) {
    return theme.layout.markerSizeNear;
  }

  const distanceRatio = Math.min(Math.max(distanceMeters / maxDistanceMeters, 0), 1);
  const sizeRange = theme.layout.markerSizeNear - theme.layout.markerSizeBase;

  return clampMarkerSize(theme.layout.markerSizeNear - distanceRatio * sizeRange);
}

export function createMapStopMarkers(
  nearbyStops: NearbyStop[],
  options?: {
    homeStopId?: string | null;
    maxDistanceMeters?: number;
    onSelectStop?: (stopId: string) => void;
  }
): PlatformMapMarker[] {
  const maxDistanceMeters =
    options?.maxDistanceMeters &&
    Number.isFinite(options.maxDistanceMeters) &&
    options.maxDistanceMeters > 0
      ? options.maxDistanceMeters
      : nearbyStops.reduce((maxDistance, stop) => Math.max(maxDistance, stop.distanceMeters), 0);

  return nearbyStops.map((stop) => ({
    id: stop.gtfsId,
    stopId: stop.gtfsId,
    latitude: stop.latitude,
    longitude: stop.longitude,
    transportMode: stop.transportMode ?? 'bus',
    size: getMarkerSizeForDistance(stop.distanceMeters, maxDistanceMeters),
    isHomeStop: options?.homeStopId === stop.gtfsId,
    accessibilityLabel: `${stop.name}, ${stop.distanceMeters} meters away${
      options?.homeStopId === stop.gtfsId ? ', home stop' : ''
    }`,
    onPress: options?.onSelectStop
      ? () => {
          options.onSelectStop?.(stop.gtfsId);
        }
      : undefined,
  }));
}
