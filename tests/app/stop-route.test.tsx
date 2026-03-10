/// <reference types="jest" />

import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';

import StopRoute from '@/app/stop/[stopId]';

jest.mock('@react-navigation/native', () => ({
  useIsFocused: jest.fn(() => true),
}));

jest.mock('expo-router', () => ({
  useLocalSearchParams: jest.fn(),
  useRouter: jest.fn(),
}));

jest.mock('@/features/map/hooks/use-device-location', () => ({
  useDeviceLocation: jest.fn(() => ({
    coordinates: { latitude: 60.1699, longitude: 24.9384 },
    permission: { status: 'granted', canAskAgain: true },
    hasRequestedPermission: true,
    isFixed: true,
    isLoading: false,
    error: null,
  })),
}));

jest.mock('@/core/store/settings.store', () => ({
  useSettingsStore: jest.fn(
    (selector: (state: { locationUpdateIntervalSeconds: number }) => unknown) =>
      selector({
        locationUpdateIntervalSeconds: 20,
      })
  ),
}));

jest.mock('@/features/departures/departures-screen', () => ({
  DeparturesScreen: (props: any) => {
    const React = require('react');
    const { Pressable, Text, View } = require('react-native');

    return (
      <View>
        <Text>{`Departures screen route ${props.stopId}`}</Text>
        <Text>{`Lat ${props.coordinates?.latitude ?? 'none'}`}</Text>
        <Pressable accessibilityRole='button' accessibilityLabel='Back' onPress={props.onBack}>
          <Text>Back</Text>
        </Pressable>
      </View>
    );
  },
}));

describe('stop route', () => {
  const mockUseLocalSearchParams = jest.mocked(useLocalSearchParams);
  const mockUseRouter = jest.mocked(useRouter);

  beforeEach(() => {
    mockUseLocalSearchParams.mockReturnValue({ stopId: 'HSL:1001' });
    mockUseRouter.mockReturnValue({
      back: jest.fn(),
    } as unknown as ReturnType<typeof useRouter>);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the departures screen instead of the stub text', async () => {
    const screen = render(<StopRoute />);

    await waitFor(() => {
      expect(screen.getByText('Departures screen route HSL:1001')).toBeTruthy();
    });

    expect(screen.queryByText('Departures screen stub')).toBeNull();
  });

  it('wires the route back action to router.back', async () => {
    const back = jest.fn();

    mockUseRouter.mockReturnValue({
      back,
    } as unknown as ReturnType<typeof useRouter>);

    const screen = render(<StopRoute />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Back' })).toBeTruthy();
    });

    fireEvent.press(screen.getByRole('button', { name: 'Back' }));

    expect(back).toHaveBeenCalledTimes(1);
  });
});
