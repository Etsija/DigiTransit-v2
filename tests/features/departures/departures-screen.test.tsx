/// <reference types="jest" />

import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';

import { DeparturesScreen } from '@/features/departures/departures-screen';

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

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');

  return {
    Ionicons: (props: any) => <Text testID={props.testID}>{`ion:${props.name}`}</Text>,
    MaterialCommunityIcons: (props: any) => (
      <Text testID={props.testID}>{`mci:${props.name}`}</Text>
    ),
  };
});

jest.mock('@/features/departures/hooks/use-stop-departures', () => ({
  useStopDepartures: jest.fn(),
}));

describe('DeparturesScreen', () => {
  const onBack = jest.fn();
  const infoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
  const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  const { useStopDepartures } = jest.requireMock('@/features/departures/hooks/use-stop-departures') as {
    useStopDepartures: jest.Mock;
  };

  beforeEach(() => {
    useStopDepartures.mockReturnValue({
      data: {
        header: {
          name: 'Central station',
          code: '1001',
          zoneLabel: 'Zone A',
          transportMode: 'tram',
          directionLabel: 'Munkkiniemi',
          patternLabels: ['4 to Munkkiniemi', '7B'],
        },
        departures: [],
      },
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

  afterAll(() => {
    infoSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it('renders the stop header on a static backdrop and never mounts a live map surface', async () => {
    const screen = render(
      <DeparturesScreen
        onBack={onBack}
        stopId='HSL:1001'
        coordinates={{ latitude: 60.1699, longitude: 24.9384 }}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Central station')).toBeTruthy();
      expect(screen.getByText('-> Munkkiniemi')).toBeTruthy();
      expect(screen.getByText('Zone A')).toBeTruthy();
      expect(screen.getByText('Patterns via this stop:')).toBeTruthy();
      expect(screen.getByText('4 to Munkkiniemi')).toBeTruthy();
      expect(screen.getByText('7B')).toBeTruthy();
    });

    expect(screen.getByTestId('departures-static-backdrop')).toBeTruthy();
    expect(screen.getByTestId('departures-scroll-view')).toBeTruthy();
    expect(screen.queryByTestId('live-map-surface')).toBeNull();
    expect(screen.queryByText('Departures list arrives next')).toBeNull();
    expect(infoSpy).toHaveBeenCalledWith(expect.stringContaining('[departures] visible in'));
  });

  it('calls back navigation from the screen header affordance', async () => {
    const screen = render(
      <DeparturesScreen
        onBack={onBack}
        stopId='HSL:1001'
        coordinates={{ latitude: 60.1699, longitude: 24.9384 }}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Back' })).toBeTruthy();
    });

    fireEvent.press(screen.getByRole('button', { name: 'Back' }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('shows the shared API error banner when the initial stop fetch fails', async () => {
    useStopDepartures.mockReturnValue({
      data: null,
      error: { kind: 'network', message: 'DigiTransit API unavailable', retryable: true },
      isError: true,
      isFetching: false,
      isPending: false,
      status: 'error',
    });

    const screen = render(
      <DeparturesScreen
        onBack={onBack}
        stopId='HSL:1001'
        coordinates={{ latitude: 60.1699, longitude: 24.9384 }}
      />
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByText('DigiTransit API unavailable')).toBeTruthy();
  });
});
