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
}));

jest.mock('@/features/stops/hooks/use-nearby-stops', () => ({
  useNearbyStops: jest.fn(),
}));

jest.mock('@/core/store/settings.store', () => ({
  useSettingsStore: jest.fn(),
}));

describe('StopsScreen', () => {
  const onStopPress = jest.fn();
  const { useDeviceLocation } = jest.requireMock('@/features/map/hooks/use-device-location') as {
    useDeviceLocation: jest.Mock;
  };
  const { useNearbyStops } = jest.requireMock('@/features/stops/hooks/use-nearby-stops') as {
    useNearbyStops: jest.Mock;
  };
  const { useSettingsStore } = jest.requireMock('@/core/store/settings.store') as {
    useSettingsStore: jest.Mock;
  };

  beforeEach(() => {
    useSettingsStore.mockImplementation(
      (selector: (state: { locationUpdateIntervalSeconds: number }) => unknown) =>
        selector({ locationUpdateIntervalSeconds: 20 })
    );

    useDeviceLocation.mockReturnValue({
      coordinates: { latitude: 60.1699, longitude: 24.9384 },
      permission: { status: 'granted', canAskAgain: true },
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
      isFixed: false,
      isLoading: false,
      error: null,
    });

    const screen = render(<StopsScreen isActive onStopPress={onStopPress} />);

    await waitFor(() => {
      expect(screen.getAllByText('Location unavailable')).toHaveLength(2);
      expect(
        screen.getByText('Enable location access in your device settings to show nearby stops.')
      ).toBeTruthy();
    });
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
});
