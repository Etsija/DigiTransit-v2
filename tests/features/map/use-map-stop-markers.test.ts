/// <reference types="jest" />

import {
  createMapStopMarkers,
  getMarkerSizeForDistance,
} from '@/features/map/hooks/use-map-stop-markers';
import { theme } from '@/shared/theme/theme';

describe('use-map-stop-markers helpers', () => {
  it('clamps marker sizes between the base and near tokens', () => {
    expect(getMarkerSizeForDistance(0, 200)).toBe(theme.layout.markerSizeNear);
    expect(getMarkerSizeForDistance(200, 200)).toBe(theme.layout.markerSizeBase);
    expect(getMarkerSizeForDistance(400, 200)).toBe(theme.layout.markerSizeBase);
  });

  it('makes the nearest stop largest and preserves stop handoff metadata', () => {
    const onSelectStop = jest.fn();
    const markers = createMapStopMarkers(
      [
        {
          gtfsId: 'HSL:near',
          name: 'Near',
          code: null,
          zoneId: null,
          distanceMeters: 15,
          latitude: 60.17,
          longitude: 24.94,
          transportMode: 'tram',
          parentStationName: null,
        },
        {
          gtfsId: 'HSL:far',
          name: 'Far',
          code: null,
          zoneId: null,
          distanceMeters: 180,
          latitude: 60.18,
          longitude: 24.95,
          transportMode: null,
          parentStationName: null,
        },
      ],
      { maxDistanceMeters: 250, onSelectStop }
    );

    expect(markers[0]?.size).toBeGreaterThan(markers[1]?.size ?? 0);
    expect(markers[1]).toMatchObject({
      id: 'HSL:far',
      stopId: 'HSL:far',
      transportMode: 'bus',
    });

    markers[0]?.onPress?.();
    expect(onSelectStop).toHaveBeenCalledWith('HSL:near');
  });

  it('scales marker sizes against the configured search radius when provided', () => {
    const markers = createMapStopMarkers(
      [
        {
          gtfsId: 'HSL:near',
          name: 'Near',
          code: null,
          zoneId: null,
          distanceMeters: 15,
          latitude: 60.17,
          longitude: 24.94,
          transportMode: 'tram',
          parentStationName: null,
        },
        {
          gtfsId: 'HSL:mid',
          name: 'Mid',
          code: null,
          zoneId: null,
          distanceMeters: 40,
          latitude: 60.18,
          longitude: 24.95,
          transportMode: 'bus',
          parentStationName: null,
        },
      ],
      { maxDistanceMeters: 250 }
    );

    expect(markers[0]?.size).toBeLessThanOrEqual(theme.layout.markerSizeNear);
    expect(markers[0]?.size).toBeGreaterThan(markers[1]?.size ?? 0);
    expect(markers[1]?.size).toBeGreaterThan(theme.layout.markerSizeBase);
  });
});
