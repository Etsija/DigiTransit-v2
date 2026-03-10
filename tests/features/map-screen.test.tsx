/// <reference types="jest" />

import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Linking } from 'react-native';

import { MapScreen } from '@/features/map/map-screen';

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');
  const SafeAreaView = React.forwardRef((props: any, ref: any) => <View ref={ref} {...props} />);
  SafeAreaView.displayName = 'SafeAreaView';
  return {
    SafeAreaView,
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

jest.mock('expo-glass-effect', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    GlassView: (props: any) => <View {...props} />,
    isGlassEffectAPIAvailable: () => false,
  };
});

jest.mock('@/core/platform/maps/map-view', () => {
  const React = require('react');
  const { View } = require('react-native');

  const MockPlatformMapView = jest.fn((props: any) => (
    <View testID='live-map-surface' {...props} />
  ));

  return {
    PlatformMapView: MockPlatformMapView,
  };
});

jest.mock('@/features/map/hooks/use-device-location', () => ({
  useDeviceLocation: jest.fn(),
  requestDeviceLocationPermission: jest.fn(),
}));

jest.mock('@/features/stops/hooks/use-nearby-stops', () => ({
  useNearbyStops: jest.fn(),
}));

jest.mock('@/core/store/settings.store', () => ({
  useSettingsStore: jest.fn(),
}));

describe('MapScreen', () => {
  const openSettingsSpy = jest.spyOn(Linking, 'openSettings').mockResolvedValue();
  const consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
  const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  const { useDeviceLocation } = jest.requireMock('@/features/map/hooks/use-device-location') as {
    useDeviceLocation: jest.Mock;
  };
  const { requestDeviceLocationPermission } = jest.requireMock(
    '@/features/map/hooks/use-device-location'
  ) as {
    requestDeviceLocationPermission: jest.Mock;
  };
  const { useNearbyStops } = jest.requireMock('@/features/stops/hooks/use-nearby-stops') as {
    useNearbyStops: jest.Mock;
  };
  const { useSettingsStore } = jest.requireMock('@/core/store/settings.store') as {
    useSettingsStore: jest.Mock;
  };
  const { PlatformMapView } = jest.requireMock('@/core/platform/maps/map-view') as {
    PlatformMapView: jest.Mock;
  };

  beforeEach(() => {
    useSettingsStore.mockImplementation(
      (
        selector: (state: {
          locationUpdateIntervalSeconds: number;
          searchRadiusMeters: number;
          homeStop: { gtfsId: string } | null;
        }) => number
      ) =>
        selector({
          locationUpdateIntervalSeconds: 20,
          searchRadiusMeters: 250,
          homeStop: null,
        })
    );
    useDeviceLocation.mockReturnValue({
      coordinates: { latitude: 60.1699, longitude: 24.9384 },
      permission: { status: 'granted', canAskAgain: true },
      hasRequestedPermission: true,
      isFixed: true,
      isLoading: false,
      error: null,
    });
    useNearbyStops.mockReturnValue({
      data: [],
      isFetching: false,
      status: 'success',
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    consoleInfoSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  it('renders live coordinates from the device location state', async () => {
    const { getByText } = render(<MapScreen />);

    await waitFor(() => {
      expect(getByText('Current location')).toBeTruthy();
      expect(getByText('60.170°N, 24.938°E')).toBeTruthy();
    });
  });

  it('updates the rendered coordinates bar when the location changes', async () => {
    const { getByText, rerender } = render(<MapScreen />);

    await waitFor(() => {
      expect(getByText('60.170°N, 24.938°E')).toBeTruthy();
    });

    useDeviceLocation.mockReturnValue({
      coordinates: { latitude: 60.1711, longitude: 24.9412 },
      permission: { status: 'granted', canAskAgain: true },
      hasRequestedPermission: true,
      isFixed: true,
      isLoading: false,
      error: null,
    });

    rerender(<MapScreen />);

    await waitFor(() => {
      expect(getByText('60.171°N, 24.941°E')).toBeTruthy();
    });
  });

  it('uses the fallback Helsinki region and opens app settings when permission is blocked', async () => {
    useDeviceLocation.mockReturnValue({
      coordinates: null,
      permission: { status: 'denied', canAskAgain: false },
      hasRequestedPermission: true,
      isFixed: false,
      isLoading: false,
      error: null,
    });

    const { getByRole, getByTestId, getByText } = render(<MapScreen />);

    await waitFor(() => {
      expect(getByText('Enable location in settings')).toBeTruthy();
      expect(
        getByText(
          'Enable location access in your device settings to center the map on where you are.'
        )
      ).toBeTruthy();
      expect(getByText('Enable location in settings')).toBeTruthy();
    });

    expect(getByTestId('live-map-surface').props.latitude).toBe(60.1699);
    expect(getByTestId('live-map-surface').props.longitude).toBe(24.9384);
    expect(getByTestId('live-map-surface').props.showUserLocation).toBe(false);

    fireEvent.press(getByRole('button', { name: 'Open app settings' }));

    expect(openSettingsSpy).toHaveBeenCalledTimes(1);
  });

  it('retries the permission request instead of opening settings when the app can still ask again', async () => {
    useDeviceLocation.mockReturnValue({
      coordinates: null,
      permission: { status: 'denied', canAskAgain: true },
      hasRequestedPermission: false,
      isFixed: false,
      isLoading: false,
      error: null,
    });

    const { getByRole, getByText } = render(<MapScreen />);

    await waitFor(() => {
      expect(getByText('Allow location access')).toBeTruthy();
    });

    expect(requestDeviceLocationPermission).toHaveBeenCalledTimes(1);

    fireEvent.press(getByRole('button', { name: 'Request location permission' }));

    expect(requestDeviceLocationPermission).toHaveBeenCalledTimes(2);
    expect(openSettingsSpy).not.toHaveBeenCalled();
  });

  it('renders through the shared platform adapter boundary', () => {
    const { getByTestId } = render(<MapScreen onSelectStop={jest.fn()} />);

    expect(PlatformMapView).toHaveBeenCalled();
    expect(getByTestId('live-map-surface').props.latitude).toBe(60.1699);
    expect(getByTestId('live-map-surface').props.longitude).toBe(24.9384);
    expect(getByTestId('live-map-surface').props.showUserLocation).toBe(true);
    expect(getByTestId('live-map-surface').props.markers).toEqual([]);
  });

  it('shows an API outage banner while keeping the live map mounted', async () => {
    useNearbyStops.mockReturnValue({
      data: undefined,
      error: new Error('Network error'),
      isError: true,
      isFetching: false,
      isPending: false,
      status: 'error',
    });

    const { getByTestId, getByText, queryByText } = render(<MapScreen />);

    await waitFor(() => {
      expect(getByTestId('live-map-surface')).toBeTruthy();
      expect(getByText('Network error')).toBeTruthy();
    });

    expect(queryByText('No nearby stops found')).toBeNull();
  });

  it('removes the API outage banner automatically when nearby stops recover', async () => {
    useNearbyStops.mockReturnValue({
      data: undefined,
      error: new Error('Network error'),
      isError: true,
      isFetching: false,
      isPending: false,
      status: 'error',
    });

    const screen = render(<MapScreen />);

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeTruthy();
    });

    useNearbyStops.mockReturnValue({
      data: [],
      error: null,
      isError: false,
      isFetching: false,
      isPending: false,
      status: 'success',
    });

    screen.rerender(<MapScreen />);

    await waitFor(() => {
      expect(screen.queryByText('DigiTransit API unavailable')).toBeNull();
    });
  });

  it('marks the pinned home stop distinctly in the map marker payload', () => {
    useSettingsStore.mockImplementation(
      (
        selector: (state: {
          locationUpdateIntervalSeconds: number;
          searchRadiusMeters: number;
          homeStop: { gtfsId: string } | null;
        }) => unknown
      ) =>
        selector({
          locationUpdateIntervalSeconds: 20,
          searchRadiusMeters: 250,
          homeStop: { gtfsId: 'HSL:1002' },
        })
    );
    useNearbyStops.mockReturnValue({
      data: [
        {
          gtfsId: 'HSL:1002',
          name: 'Central station',
          code: '1002',
          zoneId: 'A',
          distanceMeters: 120,
          latitude: 60.17,
          longitude: 24.94,
          transportMode: 'tram',
          parentStationName: 'Central',
          routePatterns: [{ label: '4', mode: 'tram' }],
        },
      ],
      isFetching: false,
      status: 'success',
    });

    const { getByTestId } = render(<MapScreen onSelectStop={jest.fn()} />);

    expect(getByTestId('live-map-surface').props.markers).toEqual([
      expect.objectContaining({
        id: 'HSL:1002',
        isHomeStop: true,
        accessibilityLabel: 'Central station, 120 meters away, home stop',
      }),
    ]);
  });

  it('wires marker presses into stable marker callbacks', () => {
    const onSelectStop = jest.fn();
    useNearbyStops.mockReturnValue({
      data: [
        {
          gtfsId: 'HSL:1001',
          name: 'Central station',
          code: '1001',
          zoneId: 'A',
          distanceMeters: 20,
          latitude: 60.17,
          longitude: 24.94,
          transportMode: 'bus',
          parentStationName: null,
        },
      ],
      error: null,
      isError: false,
      isFetching: false,
      isPending: false,
      status: 'success',
    });

    const screen = render(<MapScreen onSelectStop={onSelectStop} />);
    const marker = screen.getByTestId('live-map-surface').props.markers[0];

    expect(marker).toEqual(
      expect.objectContaining({
        id: 'HSL:1001',
        onPress: expect.any(Function),
      })
    );

    marker.onPress();

    expect(onSelectStop).toHaveBeenCalledWith('HSL:1001');

    screen.rerender(<MapScreen onSelectStop={onSelectStop} />);

    const nextMarker = screen.getByTestId('live-map-surface').props.markers[0];

    expect(nextMarker.onPress).toBe(marker.onPress);
  });

  it('measures when the map becomes visible', () => {
    render(<MapScreen />);

    const firstCall = PlatformMapView.mock.calls[0]?.[0];
    expect(firstCall.onMapReady).toEqual(expect.any(Function));

    firstCall.onMapReady();

    expect(consoleInfoSpy).toHaveBeenCalledWith(
      expect.stringMatching(/^\[map\] visible in \d+ms$/)
    );
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  it('passes the Helsinki fallback coordinates to the shared adapter when device coordinates are missing', async () => {
    useDeviceLocation.mockReturnValue({
      coordinates: null,
      permission: { status: 'denied', canAskAgain: false },
      hasRequestedPermission: true,
      isFixed: false,
      isLoading: false,
      error: null,
    });

    const { getByRole, getByTestId, getByText } = render(<MapScreen />);

    await waitFor(() => {
      expect(getByText('Enable location in settings')).toBeTruthy();
    });

    expect(getByTestId('live-map-surface').props.latitude).toBe(60.1699);
    expect(getByTestId('live-map-surface').props.longitude).toBe(24.9384);
    expect(getByTestId('live-map-surface').props.showUserLocation).toBe(false);

    fireEvent.press(getByRole('button', { name: 'Open app settings' }));

    expect(openSettingsSpy).toHaveBeenCalledTimes(1);
  });

  it('does not run nearby stops against fallback-only denied coordinates', async () => {
    useDeviceLocation.mockReturnValue({
      coordinates: null,
      permission: { status: 'denied', canAskAgain: false },
      hasRequestedPermission: true,
      isFixed: false,
      isLoading: false,
      error: null,
    });

    render(<MapScreen />);

    await waitFor(() => {
      expect(useNearbyStops).toHaveBeenCalledWith({
        coordinates: null,
        enabled: false,
      });
    });
  });

  it('passes marker props through without affecting map-ready instrumentation', () => {
    useNearbyStops.mockReturnValue({
      data: [
        {
          gtfsId: 'HSL:1001',
          name: 'Central station',
          code: '1001',
          zoneId: 'A',
          distanceMeters: 20,
          latitude: 60.17,
          longitude: 24.94,
          transportMode: 'bus',
          parentStationName: null,
        },
      ],
      isFetching: true,
      status: 'success',
    });

    render(<MapScreen />);

    const firstCall = PlatformMapView.mock.calls[0]?.[0];
    expect(firstCall.markers).toEqual([
      expect.objectContaining({
        id: 'HSL:1001',
        latitude: 60.17,
        longitude: 24.94,
        transportMode: 'bus',
      }),
    ]);

    firstCall.onMapReady();
    firstCall.onMapReady();

    expect(consoleInfoSpy).toHaveBeenCalledTimes(1);
  });
});
