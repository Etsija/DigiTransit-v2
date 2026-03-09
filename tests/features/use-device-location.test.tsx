/// <reference types="jest" />

import { act, render, waitFor } from '@testing-library/react-native';
import {
  PermissionStatus,
  type LocationObject,
  type LocationPermissionResponse,
  type LocationSubscription,
} from 'expo-location';
import * as Location from 'expo-location';
import React from 'react';
import { Text } from 'react-native';

import { useDeviceLocation } from '@/features/map/hooks/use-device-location';
import { CoordinatesBar } from '@/shared/components/coordinates-bar';

jest.mock('expo-glass-effect', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    GlassView: (props: any) => <View {...props} />,
    isGlassEffectAPIAvailable: () => false,
  };
});

jest.mock('expo-location', () => ({
  getCurrentPositionAsync: jest.fn(),
  getForegroundPermissionsAsync: jest.fn(),
  getLastKnownPositionAsync: jest.fn(),
  requestForegroundPermissionsAsync: jest.fn(),
  watchPositionAsync: jest.fn(),
  Accuracy: {
    Balanced: 'balanced',
  },
  PermissionStatus: {
    UNDETERMINED: 'undetermined',
    GRANTED: 'granted',
    DENIED: 'denied',
  },
}));

type HarnessProps = {
  intervalSeconds?: number;
  isActive?: boolean;
};

function createPermissionResponse(
  status: PermissionStatus,
  canAskAgain = true
): LocationPermissionResponse {
  return {
    status,
    canAskAgain,
    expires: 'never',
    granted: status === PermissionStatus.GRANTED,
  };
}

function createLocation(latitude: number, longitude: number): LocationObject {
  return {
    coords: {
      accuracy: 5,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      latitude,
      longitude,
      speed: null,
    },
    mocked: false,
    timestamp: Date.now(),
  };
}

function Harness({ intervalSeconds = 20, isActive = true }: HarnessProps) {
  const state = useDeviceLocation({ isActive, intervalSeconds });

  return (
    <>
      <Text testID='state'>{JSON.stringify(state)}</Text>
      <CoordinatesBar
        isFixed={state.isFixed}
        latitude={state.coordinates?.latitude ?? null}
        longitude={state.coordinates?.longitude ?? null}
      />
    </>
  );
}

describe('useDeviceLocation', () => {
  const mockGetForegroundPermissionsAsync = jest.mocked(Location.getForegroundPermissionsAsync);
  const mockRequestForegroundPermissionsAsync = jest.mocked(
    Location.requestForegroundPermissionsAsync
  );
  const mockGetLastKnownPositionAsync = jest.mocked(Location.getLastKnownPositionAsync);
  const mockGetCurrentPositionAsync = jest.mocked(Location.getCurrentPositionAsync);
  const mockWatchPositionAsync = jest.mocked(Location.watchPositionAsync);

  let watchCallback: ((location: LocationObject) => void) | undefined;
  let subscription: LocationSubscription;

  beforeEach(() => {
    subscription = {
      remove: jest.fn(),
    };
    watchCallback = undefined;

    mockGetForegroundPermissionsAsync.mockResolvedValue(
      createPermissionResponse(PermissionStatus.UNDETERMINED)
    );
    mockRequestForegroundPermissionsAsync.mockResolvedValue(
      createPermissionResponse(PermissionStatus.GRANTED)
    );
    mockGetLastKnownPositionAsync.mockResolvedValue(null);
    mockGetCurrentPositionAsync.mockResolvedValue(createLocation(60.1699, 24.9384));
    mockWatchPositionAsync.mockImplementation(async (_options, callback) => {
      watchCallback = callback;
      return subscription;
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('requests permission, uses the last known location first, then tracks live updates in the coordinates bar', async () => {
    mockGetLastKnownPositionAsync.mockResolvedValue(createLocation(60.17, 24.94));

    const { getByTestId, getByText } = render(<Harness intervalSeconds={15} />);

    await waitFor(() => {
      const state = JSON.parse(getByTestId('state').props.children);
      expect(state.permission.status).toBe('granted');
      expect(state.coordinates).toEqual({ latitude: 60.1699, longitude: 24.9384 });
      expect(getByText('60.170°N, 24.938°E')).toBeTruthy();
    });

    expect(mockRequestForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(mockGetLastKnownPositionAsync).toHaveBeenCalledTimes(1);
    expect(mockGetCurrentPositionAsync).toHaveBeenCalledTimes(1);
    expect(mockWatchPositionAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 15000,
      }),
      expect.any(Function)
    );

    await act(async () => {
      watchCallback?.(createLocation(60.1711, 24.9412));
    });

    const state = JSON.parse(getByTestId('state').props.children);
    expect(state.coordinates).toEqual({ latitude: 60.1711, longitude: 24.9412 });
    expect(getByText('60.171°N, 24.941°E')).toBeTruthy();
  });

  it('reflects denied permission without prompting in a loop and skips location tracking', async () => {
    mockGetForegroundPermissionsAsync.mockResolvedValue(
      createPermissionResponse(PermissionStatus.DENIED, false)
    );

    const { getByTestId, rerender } = render(<Harness />);

    await waitFor(() => {
      const state = JSON.parse(getByTestId('state').props.children);
      expect(state.permission.status).toBe('denied');
      expect(state.permission.canAskAgain).toBe(false);
      expect(state.coordinates).toBeNull();
    });

    rerender(<Harness />);

    await waitFor(() => {
      expect(mockRequestForegroundPermissionsAsync).not.toHaveBeenCalled();
    });

    expect(mockWatchPositionAsync).not.toHaveBeenCalled();
    expect(mockGetCurrentPositionAsync).not.toHaveBeenCalled();
  });

  it('removes the watcher subscription when the hook unmounts', async () => {
    const { unmount } = render(<Harness />);

    await waitFor(() => {
      expect(mockWatchPositionAsync).toHaveBeenCalledTimes(1);
    });

    unmount();

    expect(subscription.remove).toHaveBeenCalledTimes(1);
  });

  it('reflects a revoked permission state when the map tab is reopened without re-prompting', async () => {
    mockGetForegroundPermissionsAsync
      .mockResolvedValueOnce(createPermissionResponse(PermissionStatus.UNDETERMINED))
      .mockResolvedValueOnce(createPermissionResponse(PermissionStatus.DENIED, false));

    const { getByTestId, rerender } = render(<Harness isActive />);

    await waitFor(() => {
      const state = JSON.parse(getByTestId('state').props.children);
      expect(state.permission.status).toBe('granted');
    });

    rerender(<Harness isActive={false} />);
    rerender(<Harness isActive />);

    await waitFor(() => {
      const state = JSON.parse(getByTestId('state').props.children);
      expect(state.permission.status).toBe('denied');
      expect(state.permission.canAskAgain).toBe(false);
      expect(state.coordinates).toBeNull();
    });

    expect(mockRequestForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
  });

  it('keeps the last successful coordinates if watcher startup fails after a fresh fix', async () => {
    mockWatchPositionAsync.mockRejectedValueOnce(new Error('watch unavailable'));

    const { getByTestId } = render(<Harness />);

    await waitFor(() => {
      const state = JSON.parse(getByTestId('state').props.children);
      expect(state.coordinates).toEqual({ latitude: 60.1699, longitude: 24.9384 });
      expect(state.error).toBe('watch unavailable');
    });
  });
});
