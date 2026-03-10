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

jest.mock('expo-linear-gradient', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    LinearGradient: (props: any) => <View {...props} />,
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
  const { useStopDepartures } = jest.requireMock(
    '@/features/departures/hooks/use-stop-departures'
  ) as {
    useStopDepartures: jest.Mock;
  };
  const departureData = {
    header: {
      name: 'Central station',
      code: '1001',
      zoneLabel: 'Zone A',
      transportMode: 'tram',
      directionLabel: 'Munkkiniemi',
      patternLabels: ['4 to Munkkiniemi', '7B'],
    },
    departures: [
      {
        scheduledDeparture: 120,
        realtimeDeparture: 125,
        realtime: true,
        realtimeState: 'UPDATED',
        serviceDay: 1_700_000_000,
        headsign: 'Munkkiniemi',
        routeShortName: '4',
        displayDepartureEpochSeconds: 1_700_000_125,
        displayTime: '22:15',
        status: 'realtime',
        statusLabel: 'Live GPS',
        accessibilityLabel: '22:15, route 4 to Munkkiniemi, Live GPS',
      },
      {
        scheduledDeparture: 180,
        realtimeDeparture: 180,
        realtime: false,
        realtimeState: 'SCHEDULED',
        serviceDay: 1_700_000_000,
        headsign: 'Pasila',
        routeShortName: '7B',
        displayDepartureEpochSeconds: 1_700_000_180,
        displayTime: '22:16',
        status: 'estimated',
        statusLabel: 'Scheduled',
        accessibilityLabel: '22:16, route 7B to Pasila, Scheduled',
      },
    ],
  };

  function createDepartureQueryState(
    overrides: Partial<ReturnType<typeof useStopDepartures>> = {}
  ) {
    return {
      data: departureData,
      error: null,
      isError: false,
      isFetching: false,
      isPending: false,
      status: 'success',
      ...overrides,
    };
  }

  beforeEach(() => {
    useStopDepartures.mockReturnValue(createDepartureQueryState());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    infoSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it('renders the stop header and departure cards on a static backdrop without mounting a live map surface', async () => {
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
      expect(screen.getByRole('button', { name: 'Patterns via this stop (2)' })).toBeTruthy();
      expect(screen.getByText('22:15')).toBeTruthy();
      expect(screen.getByText('22:16')).toBeTruthy();
      expect(screen.getByLabelText('22:15, route 4 to Munkkiniemi, Live GPS')).toBeTruthy();
      expect(screen.getByLabelText('22:16, route 7B to Pasila, Scheduled')).toBeTruthy();
    });

    expect(screen.queryByText('4 to Munkkiniemi')).toBeNull();
    expect(screen.getByTestId('departures-static-backdrop')).toBeTruthy();
    expect(screen.getByTestId('departures-scroll-view')).toBeTruthy();
    expect(screen.queryByTestId('live-map-surface')).toBeNull();
    expect(screen.queryByText('Departures list arrives next')).toBeNull();
    expect(infoSpy).toHaveBeenCalledWith(expect.stringContaining('[departures] visible in'));
  });

  it('reveals the full stop pattern list only after the disclosure row is pressed', async () => {
    const screen = render(
      <DeparturesScreen
        onBack={onBack}
        stopId='HSL:1001'
        coordinates={{ latitude: 60.1699, longitude: 24.9384 }}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Patterns via this stop (2)' })).toBeTruthy();
    });

    fireEvent.press(screen.getByRole('button', { name: 'Patterns via this stop (2)' }));

    expect(screen.getByText('4 to Munkkiniemi')).toBeTruthy();
    expect(screen.getAllByText('7B')).toHaveLength(2);
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
    useStopDepartures.mockReturnValue(
      createDepartureQueryState({
        data: null,
        error: { kind: 'network', message: 'DigiTransit API unavailable', retryable: true },
        isError: true,
        isFetching: false,
        isPending: false,
        status: 'error',
      })
    );

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
    expect(screen.queryByText('22:15')).toBeNull();
  });

  it('renders a departures skeleton during the initial pending state and swaps to cards when data arrives', async () => {
    useStopDepartures.mockReturnValue(
      createDepartureQueryState({ data: null, isPending: true, isFetching: true })
    );

    const screen = render(
      <DeparturesScreen
        onBack={onBack}
        stopId='HSL:1001'
        coordinates={{ latitude: 60.1699, longitude: 24.9384 }}
      />
    );

    expect(screen.getByTestId('departures-skeleton')).toBeTruthy();
    expect(screen.getByTestId('departures-skeleton-card-0')).toBeTruthy();
    expect(screen.queryByText('Loading stop departures...')).toBeNull();

    useStopDepartures.mockReturnValue(createDepartureQueryState());
    screen.rerender(
      <DeparturesScreen
        onBack={onBack}
        stopId='HSL:1001'
        coordinates={{ latitude: 60.1699, longitude: 24.9384 }}
      />
    );

    await waitFor(() => {
      expect(screen.queryByTestId('departures-skeleton')).toBeNull();
      expect(screen.getByText('22:15')).toBeTruthy();
      expect(screen.getByText('22:16')).toBeTruthy();
    });
  });

  it('shows a subtle refresh indicator only during background refreshes', () => {
    useStopDepartures.mockReturnValue(
      createDepartureQueryState({ isFetching: true, isPending: false })
    );

    const screen = render(
      <DeparturesScreen
        onBack={onBack}
        stopId='HSL:1001'
        coordinates={{ latitude: 60.1699, longitude: 24.9384 }}
      />
    );

    expect(screen.getByTestId('departures-refresh-indicator')).toBeTruthy();
    expect(screen.queryByText('Loading stop departures...')).toBeNull();
    expect(screen.getByTestId('departures-refresh-indicator-slot').props.style).toEqual(
      expect.objectContaining({
        minHeight: 28,
      })
    );
  });

  it('hides the refresh indicator when no background fetch is in progress', () => {
    const screen = render(
      <DeparturesScreen
        onBack={onBack}
        stopId='HSL:1001'
        coordinates={{ latitude: 60.1699, longitude: 24.9384 }}
      />
    );

    expect(screen.queryByTestId('departures-refresh-indicator')).toBeNull();
  });

  it('keeps cached departure cards visible and shows the error banner when a background refresh fails', async () => {
    useStopDepartures.mockReturnValue(
      createDepartureQueryState({
        isError: true,
        error: { kind: 'network', message: 'DigiTransit API unavailable', retryable: true },
        status: 'error',
      })
    );

    const screen = render(
      <DeparturesScreen
        onBack={onBack}
        stopId='HSL:1001'
        coordinates={{ latitude: 60.1699, longitude: 24.9384 }}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('DigiTransit API unavailable')).toBeTruthy();
      expect(screen.getByText('22:15')).toBeTruthy();
      expect(screen.getByText('22:16')).toBeTruthy();
    });
  });

  it('hides the error banner automatically when a later refresh succeeds', async () => {
    useStopDepartures.mockReturnValue(
      createDepartureQueryState({
        isError: true,
        error: { kind: 'network', message: 'DigiTransit API unavailable', retryable: true },
        status: 'error',
      })
    );

    const screen = render(
      <DeparturesScreen
        onBack={onBack}
        stopId='HSL:1001'
        coordinates={{ latitude: 60.1699, longitude: 24.9384 }}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('DigiTransit API unavailable')).toBeTruthy();
    });

    useStopDepartures.mockReturnValue(createDepartureQueryState({ isFetching: true }));
    screen.rerender(
      <DeparturesScreen
        onBack={onBack}
        stopId='HSL:1001'
        coordinates={{ latitude: 60.1699, longitude: 24.9384 }}
      />
    );

    await waitFor(() => {
      expect(screen.queryByText('DigiTransit API unavailable')).toBeNull();
      expect(screen.getByText('22:15')).toBeTruthy();
    });
  });
});
