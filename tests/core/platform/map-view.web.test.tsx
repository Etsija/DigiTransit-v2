/// <reference types="jest" />

import { render } from '@testing-library/react-native';
import React from 'react';

import {
  bindMapboxUserCenterChanges,
  buildMapboxOptions,
  PlatformMapView,
  syncLiveLocationMarker,
  syncMapboxMarkers,
  syncQueryRadiusCircle,
} from '@/core/platform/maps/map-view.web';

const mockMapOn = jest.fn();
const mockMapOff = jest.fn();
const mockMapGetCenter = jest.fn(() => ({ lat: 60.175, lng: 24.945 }));
const mockGetLayer = jest.fn();
const mockGetSource = jest.fn();
const mockAddLayer = jest.fn();
const mockAddSource = jest.fn();
const mockRemoveLayer = jest.fn();
const mockRemoveSource = jest.fn();
const mockIsStyleLoaded = jest.fn(() => true);
const mockCreateMap = jest.fn((_options?: unknown) => ({
  addLayer: mockAddLayer,
  addSource: mockAddSource,
  getCenter: mockMapGetCenter,
  getLayer: mockGetLayer,
  getSource: mockGetSource,
  isStyleLoaded: mockIsStyleLoaded,
  off: mockMapOff,
  on: mockMapOn,
  once: jest.fn((_event: string, callback: () => void) => callback()),
  removeLayer: mockRemoveLayer,
  remove: jest.fn(),
  removeSource: mockRemoveSource,
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
    mockIsStyleLoaded.mockClear();
    mockMapOn.mockClear();
    mockMapOff.mockClear();
    mockMapGetCenter.mockClear();
    mockGetLayer.mockClear();
    mockGetSource.mockClear();
    mockAddLayer.mockClear();
    mockAddSource.mockClear();
    mockRemoveLayer.mockClear();
    mockRemoveSource.mockClear();
    delete process.env.EXPO_PUBLIC_MAPBOX_PUBLIC_TOKEN;
    global.document = {
      createElement: jest.fn(() => ({
        appendChild: jest.fn(),
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

  it('renders and cleans up a live location marker through the shared adapter contract', () => {
    const cleanup = syncLiveLocationMarker(
      {} as never,
      { latitude: 60.1699, longitude: 24.9384 },
      true
    );

    expect(mockSetLngLat).toHaveBeenCalledWith([24.9384, 60.1699]);
    expect(mockAddTo).toHaveBeenCalledTimes(1);

    cleanup?.();

    expect(mockRemoveMarker).toHaveBeenCalledTimes(1);
  });

  it('renders a detached center overlay', () => {
    process.env.EXPO_PUBLIC_MAPBOX_PUBLIC_TOKEN = 'pk.test-token';

    const { getByTestId } = render(
      <PlatformMapView latitude={60.1699} longitude={24.9384} mode='detached' showUserLocation />
    );

    expect(getByTestId('map-detached-center-marker')).toBeTruthy();
  });

  it('binds drag-driven center changes through the shared callback contract', () => {
    const interactionRef = { current: false };
    const onUserInteractionStart = jest.fn();
    const onUserCenterChange = jest.fn();

    const cleanup = bindMapboxUserCenterChanges(
      {
        getCenter: mockMapGetCenter,
        off: mockMapOff,
        on: mockMapOn,
      } as never,
      interactionRef as never,
      onUserInteractionStart,
      onUserCenterChange
    );

    expect(mockMapOn).toHaveBeenCalledWith('dragstart', expect.any(Function));
    expect(mockMapOn).toHaveBeenCalledWith('drag', expect.any(Function));
    expect(mockMapOn).toHaveBeenCalledWith('dragend', expect.any(Function));

    const startHandler = mockMapOn.mock.calls.find(([event]) => event === 'dragstart')?.[1];
    const dragHandler = mockMapOn.mock.calls.find(([event]) => event === 'drag')?.[1];
    const endHandler = mockMapOn.mock.calls.find(([event]) => event === 'dragend')?.[1];
    startHandler();
    dragHandler();
    endHandler();

    expect(interactionRef.current).toBe(false);
    expect(onUserInteractionStart).toHaveBeenCalledTimes(1);
    expect(onUserCenterChange).toHaveBeenCalledWith({
      latitude: 60.175,
      longitude: 24.945,
    });

    cleanup();

    expect(mockMapOff).toHaveBeenCalledWith('dragstart', startHandler);
    expect(mockMapOff).toHaveBeenCalledWith('drag', dragHandler);
    expect(mockMapOff).toHaveBeenCalledWith('dragend', endHandler);
  });

  it('syncs the query radius circle through a geojson source and cleanup layers', () => {
    mockGetSource.mockReturnValue(undefined);
    mockGetLayer.mockReturnValue(true);

    const cleanup = syncQueryRadiusCircle(
      {
        addLayer: mockAddLayer,
        addSource: mockAddSource,
        getLayer: mockGetLayer,
        getSource: mockGetSource,
        removeLayer: mockRemoveLayer,
        removeSource: mockRemoveSource,
      } as never,
      {
        center: { latitude: 60.1699, longitude: 24.9384 },
        radiusMeters: 250,
      }
    );

    expect(mockAddSource).toHaveBeenCalledWith(
      'nearby-query-radius-source',
      expect.objectContaining({
        type: 'geojson',
        data: expect.objectContaining({
          geometry: expect.objectContaining({
            type: 'Polygon',
          }),
        }),
      })
    );
    expect(mockAddLayer).toHaveBeenCalledTimes(2);

    cleanup?.();

    expect(mockRemoveLayer).toHaveBeenCalledWith('nearby-query-radius-stroke');
    expect(mockRemoveLayer).toHaveBeenCalledWith('nearby-query-radius-fill');
    expect(mockRemoveSource).toHaveBeenCalledWith('nearby-query-radius-source');
  });

  it('updates an existing query radius source without re-adding layers', () => {
    const setData = jest.fn();
    mockGetSource.mockReturnValue({ setData });

    syncQueryRadiusCircle(
      {
        addLayer: mockAddLayer,
        addSource: mockAddSource,
        getSource: mockGetSource,
      } as never,
      {
        center: { latitude: 60.1699, longitude: 24.9384 },
        radiusMeters: 250,
      }
    );

    expect(setData).toHaveBeenCalledTimes(1);
    expect(mockAddSource).not.toHaveBeenCalled();
    expect(mockAddLayer).not.toHaveBeenCalled();
  });
});
