/// <reference types="jest" />

import { render } from '@testing-library/react-native';
import React from 'react';

import { PlatformMapView, buildMapboxOptions } from '@/core/platform/maps/map-view.web';

const mockCreateMap = jest.fn((_options?: unknown) => ({
  once: jest.fn((_event: string, callback: () => void) => callback()),
  remove: jest.fn(),
  setCenter: jest.fn(),
}));

jest.mock('mapbox-gl', () => ({
  __esModule: true,
  default: {
    Map: jest.fn((options: unknown) => mockCreateMap(options)),
  },
}));

describe('PlatformMapView web', () => {
  const originalToken = process.env.EXPO_PUBLIC_MAPBOX_PUBLIC_TOKEN;

  beforeEach(() => {
    mockCreateMap.mockClear();
    delete process.env.EXPO_PUBLIC_MAPBOX_PUBLIC_TOKEN;
  });

  afterAll(() => {
    process.env.EXPO_PUBLIC_MAPBOX_PUBLIC_TOKEN = originalToken;
  });

  it('renders a clear fallback surface when the Mapbox token is missing', () => {
    const { getByText, queryByTestId } = render(
      <PlatformMapView latitude={60.1699} longitude={24.9384} showUserLocation />
    );

    expect(getByText('Map preview unavailable')).toBeTruthy();
    expect(getByText('Add EXPO_PUBLIC_MAPBOX_PUBLIC_TOKEN to enable the live web map.')).toBeTruthy();
    expect(queryByTestId('live-map-surface')).toBeNull();
    expect(mockCreateMap).not.toHaveBeenCalled();
  });

  it('builds Mapbox options with the dark style when a public token is configured', () => {
    process.env.EXPO_PUBLIC_MAPBOX_PUBLIC_TOKEN = 'pk.test-token';

    const options = buildMapboxOptions({
      container: { nodeType: 1 },
      latitude: 60.1699,
      longitude: 24.9384,
    });

    expect(options).toEqual(
      expect.objectContaining({
        center: [24.9384, 60.1699],
        style: 'mapbox://styles/mapbox/dark-v11',
      })
    );
  });

  it('invokes onMapReady immediately for the fallback surface', () => {
    const onMapReady = jest.fn();

    render(
      <PlatformMapView
        latitude={60.1699}
        longitude={24.9384}
        onMapReady={onMapReady}
        showUserLocation
      />
    );

    expect(onMapReady).toHaveBeenCalledTimes(1);
  });
});
