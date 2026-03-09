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

jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');

  const MockMapView = React.forwardRef((props: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({
      animateToRegion: jest.fn(),
    }));

    return <View ref={ref} {...props} />;
  });
  MockMapView.displayName = 'MapView';

  return {
    __esModule: true,
    default: MockMapView,
  };
});

jest.mock('@/features/map/hooks/use-device-location', () => ({
  useDeviceLocation: jest.fn(),
}));

jest.mock('@/core/store/settings.store', () => ({
  useSettingsStore: jest.fn(),
}));

describe('MapScreen', () => {
  const openSettingsSpy = jest.spyOn(Linking, 'openSettings').mockResolvedValue();
  const { useDeviceLocation } = jest.requireMock('@/features/map/hooks/use-device-location') as {
    useDeviceLocation: jest.Mock;
  };
  const { useSettingsStore } = jest.requireMock('@/core/store/settings.store') as {
    useSettingsStore: jest.Mock;
  };

  beforeEach(() => {
    useSettingsStore.mockImplementation(
      (selector: (state: { locationUpdateIntervalSeconds: number }) => number) =>
        selector({ locationUpdateIntervalSeconds: 20 })
    );
    useDeviceLocation.mockReturnValue({
      coordinates: { latitude: 60.1699, longitude: 24.9384 },
      permission: { status: 'granted', canAskAgain: true },
      isFixed: true,
      isLoading: false,
      error: null,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
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

    expect(getByTestId('live-map-surface').props.initialRegion).toMatchObject({
      latitude: 60.1699,
      longitude: 24.9384,
    });

    fireEvent.press(getByRole('button', { name: 'Open app settings' }));

    expect(openSettingsSpy).toHaveBeenCalledTimes(1);
  });
});
