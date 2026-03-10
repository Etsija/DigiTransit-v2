/// <reference types="jest" />

import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';

import { StopsScreen } from '@/features/stops/stops-screen';

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');
  const SafeAreaView = React.forwardRef((props: any, ref: any) => <View ref={ref} {...props} />);
  SafeAreaView.displayName = 'SafeAreaView';
  return {
    SafeAreaView,
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

jest.mock('expo-image', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    Image: (props: any) => <View {...props} />,
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

describe('StopsScreen', () => {
  const onStopPress = jest.fn();
  let settingsState: {
    locationUpdateIntervalSeconds: number;
    homeStop: { gtfsId: string; name: string; transportMode: string | null } | null;
    updateSettings: jest.Mock;
  };
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

  beforeEach(() => {
    settingsState = {
      locationUpdateIntervalSeconds: 20,
      homeStop: null,
      updateSettings: jest.fn((patch: { homeStop?: typeof settingsState.homeStop }) => {
        settingsState = {
          ...settingsState,
          ...patch,
        };
      }),
    };
    useSettingsStore.mockImplementation(
      (
        selector: (state: {
          locationUpdateIntervalSeconds: number;
          homeStop: typeof settingsState.homeStop;
          updateSettings: typeof settingsState.updateSettings;
        }) => unknown
      ) => selector(settingsState)
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
          routePatterns: [
            { label: '4', mode: 'tram' },
            { label: '7B', mode: 'tram' },
          ],
        },
        {
          gtfsId: 'HSL:2001',
          name: 'Railway Square',
          code: '2001',
          zoneId: 'B',
          distanceMeters: 250,
          latitude: 60.171,
          longitude: 24.941,
          transportMode: 'bus',
          parentStationName: null,
          routePatterns: [{ label: '600', mode: 'bus' }],
        },
      ],
      error: null,
      isError: false,
      isFetching: false,
      isPending: false,
      status: 'success',
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders nearby stops sorted with a static backdrop and full metadata', async () => {
    const screen = render(<StopsScreen isActive onStopPress={onStopPress} />);

    await waitFor(() => {
      expect(screen.getByText('Central station')).toBeTruthy();
      expect(screen.getByText('Zone A • 120 m')).toBeTruthy();
      expect(screen.getByText('4, 7B')).toBeTruthy();
      expect(
        screen.getByText(
          'Long-press a stop to pin it as your home stop. Long-press the pinned one again to unpin it.'
        )
      ).toBeTruthy();
    });

    const stopButtons = screen.getAllByRole('button');
    expect(stopButtons[0]?.props.accessibilityLabel).toContain('Central station');
    expect(stopButtons[1]?.props.accessibilityLabel).toContain('Railway Square');

    expect(screen.getByTestId('stops-static-backdrop')).toBeTruthy();
    expect(screen.queryByTestId('live-map-surface')).toBeNull();
  });

  it('keeps prior data visible during background refresh and shows a subtle indicator', async () => {
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
      error: null,
      isError: false,
      isFetching: true,
      isPending: false,
      status: 'success',
    });

    const screen = render(<StopsScreen isActive onStopPress={onStopPress} />);

    await waitFor(() => {
      expect(screen.getByText('Central station')).toBeTruthy();
      expect(screen.getByText('Refreshing nearby stops')).toBeTruthy();
    });
  });

  it('shows a location-denied empty state with settings guidance', async () => {
    useDeviceLocation.mockReturnValue({
      coordinates: null,
      permission: { status: 'denied', canAskAgain: false },
      hasRequestedPermission: true,
      isFixed: false,
      isLoading: false,
      error: null,
    });

    const screen = render(<StopsScreen isActive onStopPress={onStopPress} />);

    await waitFor(() => {
      expect(screen.getAllByText('Location unavailable')).toHaveLength(2);
      expect(screen.getByText('Enable location in settings')).toBeTruthy();
      expect(
        screen.getByText('Enable location access in your device settings to show nearby stops.')
      ).toBeTruthy();
    });
  });

  it('retries location permission when the stops screen can still ask again', async () => {
    useDeviceLocation.mockReturnValue({
      coordinates: null,
      permission: { status: 'denied', canAskAgain: true },
      hasRequestedPermission: false,
      isFixed: false,
      isLoading: false,
      error: null,
    });

    const screen = render(<StopsScreen isActive onStopPress={onStopPress} />);

    await waitFor(() => {
      expect(screen.getByText('Allow location access')).toBeTruthy();
    });

    expect(requestDeviceLocationPermission).toHaveBeenCalledTimes(1);
  });

  it('shows a no-stops empty state when the radius returns no nearby results', async () => {
    useNearbyStops.mockReturnValue({
      data: [],
      error: null,
      isError: false,
      isFetching: false,
      isPending: false,
      status: 'success',
    });

    const screen = render(<StopsScreen isActive onStopPress={onStopPress} />);

    await waitFor(() => {
      expect(screen.getByText('No nearby stops found')).toBeTruthy();
      expect(
        screen.getByText('Try increasing the search radius in Settings and refresh your location.')
      ).toBeTruthy();
    });
  });

  it('shows a location-services error instead of a misleading no-stops state', async () => {
    useDeviceLocation.mockReturnValue({
      coordinates: null,
      permission: { status: 'granted', canAskAgain: true },
      hasRequestedPermission: true,
      isFixed: false,
      isLoading: false,
      error: 'Location services unavailable.',
    });
    useNearbyStops.mockReturnValue({
      data: [],
      error: null,
      isError: false,
      isFetching: false,
      isPending: false,
      status: 'pending',
    });

    const screen = render(<StopsScreen isActive onStopPress={onStopPress} />);

    await waitFor(() => {
      expect(screen.getAllByText('Location unavailable')).toHaveLength(2);
      expect(
        screen.getByText(
          "We couldn't determine your current location. Check that location services are enabled and try again."
        )
      ).toBeTruthy();
    });

    expect(screen.queryByText('No nearby stops found')).toBeNull();
  });

  it('preserves visible data when refresh fails and shows an inline failure message', async () => {
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
      error: new Error('Network error'),
      isError: true,
      isFetching: false,
      isPending: false,
      status: 'error',
    });

    const screen = render(<StopsScreen isActive onStopPress={onStopPress} />);

    await waitFor(() => {
      expect(screen.getByText('Central station')).toBeTruthy();
      expect(
        screen.getByText('Showing last updated nearby stops while connection recovers.')
      ).toBeTruthy();
    });
  });

  it('shows a non-crashing error state when loading fails without cached data', async () => {
    useNearbyStops.mockReturnValue({
      data: undefined,
      error: new Error('Network error'),
      isError: true,
      isFetching: false,
      isPending: false,
      status: 'error',
    });

    const screen = render(<StopsScreen isActive onStopPress={onStopPress} />);

    await waitFor(() => {
      expect(screen.getByText('Unable to load nearby stops')).toBeTruthy();
      expect(
        screen.getByText(
          'Check your connection and try again. The Stops tab will recover automatically when data becomes available.'
        )
      ).toBeTruthy();
    });
  });

  it('navigates through the provided stop press callback', async () => {
    const screen = render(<StopsScreen isActive onStopPress={onStopPress} />);

    await waitFor(() => {
      expect(
        screen.getByLabelText('Central station, tram, stop, 1002, 120 m, Zone A, routes 4, 7B')
      ).toBeTruthy();
    });

    fireEvent.press(
      screen.getByLabelText('Central station, tram, stop, 1002, 120 m, Zone A, routes 4, 7B')
    );

    expect(onStopPress).toHaveBeenCalledWith('HSL:1002');
  });

  it('opens a pin affordance on long press and confirms home stop selection', async () => {
    const screen = render(<StopsScreen isActive onStopPress={onStopPress} />);

    await waitFor(() => {
      expect(
        screen.getByLabelText('Central station, tram, stop, 1002, 120 m, Zone A, routes 4, 7B')
      ).toBeTruthy();
    });

    fireEvent(
      screen.getByLabelText('Central station, tram, stop, 1002, 120 m, Zone A, routes 4, 7B'),
      'longPress'
    );

    expect(screen.getByText('Pin as home stop')).toBeTruthy();

    fireEvent.press(screen.getByText('Pin as home stop'));
    screen.rerender(<StopsScreen isActive onStopPress={onStopPress} />);

    expect(settingsState.updateSettings).toHaveBeenCalledWith({
      homeStop: {
        gtfsId: 'HSL:1002',
        name: 'Central station',
        transportMode: 'tram',
      },
    });
    expect(screen.getByLabelText('Home stop pinned')).toBeTruthy();
  });

  it('does not navigate when a stop is long-pressed for home-stop actions', async () => {
    jest.useFakeTimers();
    const screen = render(<StopsScreen isActive onStopPress={onStopPress} />);

    await waitFor(() => {
      expect(
        screen.getByLabelText('Central station, tram, stop, 1002, 120 m, Zone A, routes 4, 7B')
      ).toBeTruthy();
    });

    const stopCard = screen.getByLabelText(
      'Central station, tram, stop, 1002, 120 m, Zone A, routes 4, 7B'
    );

    fireEvent(stopCard, 'longPress');
    fireEvent(stopCard, 'pressOut');
    fireEvent.press(stopCard);
    jest.runAllTimers();

    expect(screen.getByText('Pin as home stop')).toBeTruthy();
    expect(onStopPress).not.toHaveBeenCalled();
    jest.useRealTimers();
  });

  it('replaces the pinned badge immediately when a different stop is pinned', async () => {
    settingsState.homeStop = {
      gtfsId: 'HSL:1002',
      name: 'Central station',
      transportMode: 'tram',
    };

    const screen = render(<StopsScreen isActive onStopPress={onStopPress} />);

    await waitFor(() => {
      expect(screen.getByLabelText('Home stop pinned')).toBeTruthy();
    });

    fireEvent(
      screen.getByLabelText('Railway Square, bus, stop, 2001, 250 m, Zone B, routes 600'),
      'longPress'
    );
    fireEvent.press(screen.getByText('Pin as home stop'));
    screen.rerender(<StopsScreen isActive onStopPress={onStopPress} />);

    expect(settingsState.updateSettings).toHaveBeenCalledWith({
      homeStop: {
        gtfsId: 'HSL:2001',
        name: 'Railway Square',
        transportMode: 'bus',
      },
    });

    expect(screen.getAllByLabelText('Home stop pinned')).toHaveLength(1);
    expect(
      screen.getByLabelText(
        'Railway Square, bus, stop, 2001, 250 m, Zone B, routes 600, home pinned'
      )
    ).toBeTruthy();
  });

  it('offers unpinning when long-pressing the current home stop', async () => {
    settingsState.homeStop = {
      gtfsId: 'HSL:1002',
      name: 'Central station',
      transportMode: 'tram',
    };

    const screen = render(<StopsScreen isActive onStopPress={onStopPress} />);

    await waitFor(() => {
      expect(screen.getByLabelText('Home stop pinned')).toBeTruthy();
    });

    fireEvent(
      screen.getByLabelText(
        'Central station, tram, stop, 1002, 120 m, Zone A, routes 4, 7B, home pinned'
      ),
      'longPress'
    );

    expect(screen.getByText('Remove home stop')).toBeTruthy();
    expect(screen.getByText('Unpin home stop')).toBeTruthy();

    fireEvent.press(screen.getByText('Unpin home stop'));
    screen.rerender(<StopsScreen isActive onStopPress={onStopPress} />);

    expect(settingsState.updateSettings).toHaveBeenCalledWith({
      homeStop: null,
    });
    expect(screen.queryByLabelText('Home stop pinned')).toBeNull();
  });
});
