/// <reference types="jest" />

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, waitFor } from '@testing-library/react-native';
import React from 'react';

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

  return {
    PlatformMapView: (props: any) => <View testID='live-map-surface' {...props} />,
  };
});

jest.mock('@/features/map/hooks/use-device-location', () => ({
  useDeviceLocation: jest.fn(() => ({
    coordinates: { latitude: 60.1699, longitude: 24.9384 },
    permission: { status: 'granted', canAskAgain: true },
    hasRequestedPermission: true,
    isFixed: true,
    isLoading: false,
    error: null,
  })),
  requestDeviceLocationPermission: jest.fn(),
}));

jest.mock('@/features/map/hooks/use-reverse-geocode', () => ({
  useReverseGeocode: jest.fn(() => ({ address: undefined })),
}));

jest.mock('@/features/stops/hooks/use-nearby-stops', () => ({
  useNearbyStops: jest.fn(() => ({
    data: [],
    error: null,
    isError: false,
    isFetching: false,
    isPending: false,
    status: 'success',
  })),
}));

jest.mock('@/core/store/settings.store', () => ({
  useSettingsStore: jest.fn(),
}));

jest.mock('@/core/platform/notifications', () => ({
  notificationPlatformAdapter: {
    getPermissionState: jest.fn(),
    requestPermission: jest.fn(),
    prepareRuntime: jest.fn(),
    sendImmediateNotification: jest.fn(),
  },
}));

jest.mock('@/features/departures/hooks/use-stop-departures', () => {
  const actual = jest.requireActual('@/features/departures/hooks/use-stop-departures');

  return {
    ...actual,
    fetchStopDeparturesModel: jest.fn(),
  };
});

function renderWithQueryClient(node: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        gcTime: Infinity,
        retry: false,
      },
    },
  });

  return render(<QueryClientProvider client={queryClient}>{node}</QueryClientProvider>);
}

describe('MapScreen launch notification integration', () => {
  const { useSettingsStore } = jest.requireMock('@/core/store/settings.store') as {
    useSettingsStore: jest.Mock;
  };
  const { notificationPlatformAdapter } = jest.requireMock('@/core/platform/notifications') as {
    notificationPlatformAdapter: {
      getPermissionState: jest.Mock;
      requestPermission: jest.Mock;
      prepareRuntime: jest.Mock;
      sendImmediateNotification: jest.Mock;
    };
  };
  const { fetchStopDeparturesModel } = jest.requireMock(
    '@/features/departures/hooks/use-stop-departures'
  ) as {
    fetchStopDeparturesModel: jest.Mock;
  };

  beforeEach(() => {
    jest.useFakeTimers();
    useSettingsStore.mockImplementation(
      (
        selector: (state: {
          locationUpdateIntervalSeconds: number;
          searchRadiusMeters: number;
          homeStop: { gtfsId: string; name: string } | null;
          pushNotificationsEnabled: boolean;
          homeStopLaunchNotificationEnabled: boolean;
          notificationLeadTimeMinutes: number;
        }) => unknown
      ) =>
        selector({
          locationUpdateIntervalSeconds: 20,
          searchRadiusMeters: 250,
          homeStop: {
            gtfsId: 'HSL:1001',
            name: 'Kamppi',
          },
          pushNotificationsEnabled: true,
          homeStopLaunchNotificationEnabled: true,
          notificationLeadTimeMinutes: 10,
        })
    );
    notificationPlatformAdapter.getPermissionState.mockResolvedValue({
      supported: true,
      granted: true,
      canPrompt: true,
    });
    notificationPlatformAdapter.sendImmediateNotification.mockResolvedValue(undefined);
    fetchStopDeparturesModel.mockResolvedValue({
      header: {
        name: 'Kamppi',
        code: '1001',
        zoneLabel: 'Zone A',
        transportMode: 'bus',
        directionLabel: null,
        patternLabels: [],
      },
      departures: [],
    });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('mounts with the real launch hook and keeps query failures out of the map error UI', async () => {
    fetchStopDeparturesModel.mockRejectedValueOnce(new Error('API unavailable'));

    const screen = renderWithQueryClient(<MapScreen />);
    act(() => {
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(fetchStopDeparturesModel).toHaveBeenCalledWith(expect.anything(), 'HSL:1001');
    });

    expect(screen.getByTestId('live-map-surface')).toBeTruthy();
    expect(screen.queryByText('API unavailable')).toBeNull();
    expect(screen.queryByText('DigiTransit API unavailable')).toBeNull();
  });
});
