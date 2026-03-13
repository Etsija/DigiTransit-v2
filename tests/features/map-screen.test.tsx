/// <reference types="jest" />

import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Linking } from 'react-native';

import { MapScreen } from '@/features/map/map-screen';
import { __resetNearbyStopsSourceTestState } from '@/features/stops/store/nearby-stops-source.store';

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

jest.mock('@/features/notifications/hooks/use-home-stop-launch-notification', () => ({
  useHomeStopLaunchNotification: jest.fn(),
}));

jest.mock('@/features/map/hooks/use-reverse-geocode', () => ({
  useReverseGeocode: jest.fn(() => ({ address: undefined })),
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
  const { useHomeStopLaunchNotification } = jest.requireMock(
    '@/features/notifications/hooks/use-home-stop-launch-notification'
  ) as {
    useHomeStopLaunchNotification: jest.Mock;
  };
  const { useReverseGeocode } = jest.requireMock('@/features/map/hooks/use-reverse-geocode') as {
    useReverseGeocode: jest.Mock;
  };

  beforeEach(() => {
    act(() => {
      __resetNearbyStopsSourceTestState();
    });
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
      error: null,
      isError: false,
      isFetching: false,
      isPending: false,
      status: 'success',
    });
    useReverseGeocode.mockReturnValue({ address: undefined });
  });

  afterEach(() => {
    jest.clearAllMocks();
    act(() => {
      __resetNearbyStopsSourceTestState();
    });
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

  it('passes the configured location update interval to the device location hook', () => {
    useSettingsStore.mockImplementation(
      (
        selector: (state: {
          locationUpdateIntervalSeconds: number;
          searchRadiusMeters: number;
          homeStop: { gtfsId: string } | null;
        }) => unknown
      ) =>
        selector({
          locationUpdateIntervalSeconds: 45,
          searchRadiusMeters: 250,
          homeStop: null,
        })
    );

    render(<MapScreen />);

    expect(useDeviceLocation).toHaveBeenCalledWith({
      intervalSeconds: 45,
      isActive: true,
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
    expect(getByTestId('live-map-surface').props.liveLocationCoordinates).toEqual({
      latitude: 60.1699,
      longitude: 24.9384,
    });
    expect(getByTestId('live-map-surface').props.mode).toBe('live');
    expect(getByTestId('live-map-surface').props.onUserInteractionStart).toEqual(
      expect.any(Function)
    );
    expect(getByTestId('live-map-surface').props.onUserCenterChange).toEqual(expect.any(Function));
    expect(getByTestId('live-map-surface').props.recenterRequestKey).toBe(0);
    expect(getByTestId('live-map-surface').props.showUserLocation).toBe(true);
    expect(getByTestId('live-map-surface').props.markers).toEqual([]);
  });

  it('increments the recenter request key when the recenter button is pressed', () => {
    const screen = render(<MapScreen />);

    expect(screen.getByTestId('live-map-surface').props.recenterRequestKey).toBe(0);

    fireEvent.press(screen.getByTestId('map-recenter-button'));

    expect(screen.getByTestId('live-map-surface').props.recenterRequestKey).toBe(1);
  });

  it('hides the recenter button until live coordinates are available', () => {
    useDeviceLocation.mockReturnValue({
      coordinates: null,
      permission: { status: 'granted', canAskAgain: true },
      hasRequestedPermission: true,
      isFixed: false,
      isLoading: true,
      error: null,
    });

    const screen = render(<MapScreen />);

    expect(screen.queryByTestId('map-recenter-button')).toBeNull();
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

  it('enters detached mode after the user pans away and reveals manual query controls', async () => {
    const screen = render(<MapScreen />);

    fireEvent(screen.getByTestId('live-map-surface'), 'onUserInteractionStart');
    fireEvent(screen.getByTestId('live-map-surface'), 'onUserCenterChange', {
      latitude: 60.175,
      longitude: 24.945,
    });

    await waitFor(() => {
      expect(screen.getByTestId('map-query-here-button')).toBeTruthy();
      expect(screen.getByText('Map center')).toBeTruthy();
      expect(screen.getByText('60.175°N, 24.945°E')).toBeTruthy();
      expect(screen.getByTestId('live-map-surface').props.mode).toBe('detached');
      expect(useReverseGeocode).toHaveBeenLastCalledWith({
        latitude: 60.175,
        longitude: 24.945,
      });
      expect(useNearbyStops).toHaveBeenLastCalledWith({
        coordinates: null,
        enabled: false,
      });
    });
  });

  it('queries detached nearby stops only after the query button is pressed', async () => {
    const screen = render(<MapScreen />);

    fireEvent(screen.getByTestId('live-map-surface'), 'onUserInteractionStart');
    fireEvent(screen.getByTestId('live-map-surface'), 'onUserCenterChange', {
      latitude: 60.176,
      longitude: 24.946,
    });

    await waitFor(() => {
      expect(screen.getByTestId('map-query-here-button')).toBeTruthy();
    });

    expect(useNearbyStops).toHaveBeenLastCalledWith({
      coordinates: null,
      enabled: false,
    });

    fireEvent.press(screen.getByTestId('map-query-here-button'));

    await waitFor(() => {
      expect(useNearbyStops).toHaveBeenLastCalledWith({
        coordinates: { latitude: 60.176, longitude: 24.946 },
        enabled: true,
      });
    });
  });

  it('keeps detached results pinned to the last confirmed target while the user keeps panning', async () => {
    const screen = render(<MapScreen />);

    fireEvent(screen.getByTestId('live-map-surface'), 'onUserInteractionStart');
    fireEvent(screen.getByTestId('live-map-surface'), 'onUserCenterChange', {
      latitude: 60.176,
      longitude: 24.946,
    });
    fireEvent.press(screen.getByTestId('map-query-here-button'));

    await waitFor(() => {
      expect(useNearbyStops).toHaveBeenLastCalledWith({
        coordinates: { latitude: 60.176, longitude: 24.946 },
        enabled: true,
      });
    });

    fireEvent(screen.getByTestId('live-map-surface'), 'onUserCenterChange', {
      latitude: 60.178,
      longitude: 24.948,
    });

    await waitFor(() => {
      expect(screen.getByText('60.178°N, 24.948°E')).toBeTruthy();
      expect(useNearbyStops).toHaveBeenLastCalledWith({
        coordinates: { latitude: 60.176, longitude: 24.946 },
        enabled: true,
      });
    });
  });

  it('recenter exits detached mode and returns nearby stops to live tracking', async () => {
    const screen = render(<MapScreen />);

    fireEvent(screen.getByTestId('live-map-surface'), 'onUserInteractionStart');
    fireEvent(screen.getByTestId('live-map-surface'), 'onUserCenterChange', {
      latitude: 60.176,
      longitude: 24.946,
    });

    await waitFor(() => {
      expect(screen.getByTestId('map-query-here-button')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('map-recenter-button'));

    await waitFor(() => {
      expect(screen.queryByTestId('map-query-here-button')).toBeNull();
      expect(screen.getByText('60.170°N, 24.938°E')).toBeTruthy();
      expect(screen.getByTestId('live-map-surface').props.mode).toBe('live');
      expect(useReverseGeocode).toHaveBeenLastCalledWith({
        latitude: 60.1699,
        longitude: 24.9384,
      });
      expect(useNearbyStops).toHaveBeenLastCalledWith({
        coordinates: { latitude: 60.1699, longitude: 24.9384 },
        enabled: true,
      });
    });
  });

  it('uses the live camera override only for the recenter action, then clears it before the next drag', async () => {
    const screen = render(<MapScreen />);

    fireEvent(screen.getByTestId('live-map-surface'), 'onUserInteractionStart');
    fireEvent(screen.getByTestId('live-map-surface'), 'onUserCenterChange', {
      latitude: 60.176,
      longitude: 24.946,
    });

    await waitFor(() => {
      expect(screen.getByTestId('live-map-surface').props.mode).toBe('detached');
    });

    fireEvent.press(screen.getByTestId('map-recenter-button'));

    await waitFor(() => {
      expect(screen.getByTestId('live-map-surface').props.recenterRequestKey).toBe(1);
    });

    expect(
      PlatformMapView.mock.calls.some(
        ([props]) =>
          props.recenterRequestKey === 1 &&
          props.camera?.latitude === 60.1699 &&
          props.camera?.longitude === 24.9384
      )
    ).toBe(true);

    screen.rerender(<MapScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('live-map-surface').props.mode).toBe('live');
    });

    expect(PlatformMapView.mock.calls.at(-1)?.[0].camera).toBeUndefined();

    fireEvent(screen.getByTestId('live-map-surface'), 'onUserInteractionStart');

    await waitFor(() => {
      expect(screen.getByTestId('live-map-surface').props.mode).toBe('detached');
    });

    expect(PlatformMapView.mock.calls.at(-1)?.[0].camera).toBeUndefined();
  });

  it('locks into detached mode as soon as the user starts dragging so live updates do not snap the map back', async () => {
    const screen = render(<MapScreen />);

    fireEvent(screen.getByTestId('live-map-surface'), 'onUserInteractionStart');

    await waitFor(() => {
      expect(screen.getByTestId('live-map-surface').props.mode).toBe('detached');
      expect(screen.getByTestId('map-query-here-button')).toBeTruthy();
      expect(useNearbyStops).toHaveBeenLastCalledWith({
        coordinates: null,
        enabled: false,
      });
    });

    useDeviceLocation.mockReturnValue({
      coordinates: { latitude: 60.1715, longitude: 24.9422 },
      permission: { status: 'granted', canAskAgain: true },
      hasRequestedPermission: true,
      isFixed: true,
      isLoading: false,
      error: null,
    });

    screen.rerender(<MapScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('live-map-surface').props.mode).toBe('detached');
      expect(screen.getByTestId('live-map-surface').props.latitude).toBe(60.1699);
      expect(screen.getByTestId('live-map-surface').props.longitude).toBe(24.9384);
    });
  });

  it('keeps detached mode after remounting until recenter is pressed', async () => {
    const screen = render(<MapScreen />);

    fireEvent(screen.getByTestId('live-map-surface'), 'onUserInteractionStart');
    fireEvent(screen.getByTestId('live-map-surface'), 'onUserCenterChange', {
      latitude: 60.176,
      longitude: 24.946,
    });
    fireEvent.press(screen.getByTestId('map-query-here-button'));

    await waitFor(() => {
      expect(screen.getByTestId('live-map-surface').props.mode).toBe('detached');
      expect(useNearbyStops).toHaveBeenLastCalledWith({
        coordinates: { latitude: 60.176, longitude: 24.946 },
        enabled: true,
      });
    });

    screen.unmount();

    const remounted = render(<MapScreen />);

    await waitFor(() => {
      expect(remounted.getByTestId('live-map-surface').props.mode).toBe('detached');
      expect(remounted.getByTestId('live-map-surface').props.latitude).toBe(60.176);
      expect(remounted.getByTestId('live-map-surface').props.longitude).toBe(24.946);
      expect(useNearbyStops).toHaveBeenLastCalledWith({
        coordinates: { latitude: 60.176, longitude: 24.946 },
        enabled: true,
      });
    });
  });

  it('mounts the launch notification hook without changing the map-screen error surface', () => {
    const { queryByText } = render(<MapScreen isActive={false} />);

    expect(useHomeStopLaunchNotification).toHaveBeenCalledWith({
      isActive: false,
    });
    expect(queryByText('DigiTransit API unavailable')).toBeNull();
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
