/// <reference types="jest" />

import { render } from '@testing-library/react-native';
import React from 'react';

import {
  buildMapboxOptions,
  PlatformMapView,
  syncMapboxMarkers,
} from '@/core/platform/maps/map-view.web';

const mockCreateMap = jest.fn((_options?: unknown) => ({
  once: jest.fn((_event: string, callback: () => void) => callback()),
  remove: jest.fn(),
  setCenter: jest.fn(),
}));
const mockAddTo = jest.fn(function addTo() {
  return this;
});
const mockSetLngLat = jest.fn(function setLngLat() {
  return this;
});
const mockRemoveMarker = jest.fn();
const mockCreateRoot = jest.fn((_container?: unknown) => ({
  render: jest.fn(),
  unmount: jest.fn(),
}));

jest.mock('mapbox-gl', () => ({
  __esModule: true,
  default: {
    Map: jest.fn((options: unknown) => mockCreateMap(options)),
    Marker: jest.fn(() => ({
      addTo: mockAddTo,
      remove: mockRemoveMarker,
      setLngLat: mockSetLngLat,
    })),
  },
}));

jest.mock('react-dom/client', () => ({
  createRoot: jest.fn((container: unknown) => mockCreateRoot(container)),
}));

describe('PlatformMapView web', () => {
  const originalToken = process.env.EXPO_PUBLIC_MAPBOX_PUBLIC_TOKEN;
  const originalDocument = global.document;

  beforeEach(() => {
    mockCreateMap.mockClear();
    mockAddTo.mockClear();
    mockSetLngLat.mockClear();
    mockRemoveMarker.mockClear();
    mockCreateRoot.mockClear();
    delete process.env.EXPO_PUBLIC_MAPBOX_PUBLIC_TOKEN;
    global.document = {
      createElement: jest.fn(() => ({
        setAttribute: jest.fn(),
        style: {},
      })),
    } as never;
  });

  afterAll(() => {
    process.env.EXPO_PUBLIC_MAPBOX_PUBLIC_TOKEN = originalToken;
    global.document = originalDocument;
  });

  it('renders a clear fallback surface when the Mapbox token is missing', () => {
    const { getByText, queryByTestId } = render(
      <PlatformMapView latitude={60.1699} longitude={24.9384} showUserLocation />
    );

    expect(getByText('Map preview unavailable')).toBeTruthy();
    expect(
      getByText('Add EXPO_PUBLIC_MAPBOX_PUBLIC_TOKEN to enable the live web map.')
    ).toBeTruthy();
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

  it('renders and cleans up mapbox markers through the shared marker contract', () => {
    const onPress = jest.fn();
    const cleanup = syncMapboxMarkers({} as never, [
      {
        id: 'stop-1',
        latitude: 60.17,
        longitude: 24.94,
        transportMode: 'bus',
        size: 44,
        accessibilityLabel: 'Central Railway stop',
        onPress,
      },
    ]);

    expect(mockCreateRoot).toHaveBeenCalledTimes(1);
    expect(mockSetLngLat).toHaveBeenCalledWith([24.94, 60.17]);
    expect(mockAddTo).toHaveBeenCalledTimes(1);
    expect(mockCreateRoot.mock.results[0]?.value.render).toHaveBeenCalledTimes(1);

    const renderedMarker = mockCreateRoot.mock.results[0]?.value.render.mock.calls[0]?.[0];

    renderedMarker.props.onPress();

    expect(onPress).toHaveBeenCalledTimes(1);

    cleanup();

    expect(mockRemoveMarker).toHaveBeenCalledTimes(1);
    expect(mockCreateRoot.mock.results[0]?.value.unmount).toHaveBeenCalledTimes(1);
  });
});
