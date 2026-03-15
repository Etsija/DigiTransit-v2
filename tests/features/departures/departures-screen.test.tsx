/// <reference types="jest" />

import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Platform } from 'react-native';

import { departureReminderStore } from '@/core/store/departure-reminders.store';
import { getSettingsStore } from '@/core/store/settings.store';
import { DeparturesScreen } from '@/features/departures/departures-screen';
import { theme } from '@/shared/theme/theme';

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');
  const SafeAreaView = React.forwardRef((props: any, ref: any) => <View ref={ref} {...props} />);
  SafeAreaView.displayName = 'SafeAreaView';
  return {
    SafeAreaView,
    useSafeAreaInsets: () => ({
      top: 0,
      right: 0,
      bottom: 12,
      left: 0,
    }),
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

jest.mock('@/features/departures/hooks/use-departure-progress', () => ({
  useDepartureProgress: jest.fn(),
}));

jest.mock('@/core/platform/notifications', () => ({
  notificationPlatformAdapter: {
    getPermissionState: jest.fn(),
    prepareRuntime: jest.fn(),
    requestPermission: jest.fn(),
    sendImmediateNotification: jest.fn(),
    scheduleNotification: jest.fn(),
    cancelScheduledNotification: jest.fn(),
  },
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
  const { useDepartureProgress } = jest.requireMock(
    '@/features/departures/hooks/use-departure-progress'
  ) as {
    useDepartureProgress: jest.Mock;
  };
  const { notificationPlatformAdapter } = jest.requireMock('@/core/platform/notifications') as {
    notificationPlatformAdapter: {
      getPermissionState: jest.Mock;
      prepareRuntime: jest.Mock;
      scheduleNotification: jest.Mock;
      cancelScheduledNotification: jest.Mock;
    };
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
        tripId: 'HSL:trip-4',
        scheduledDeparture: 120,
        realtimeDeparture: 125,
        realtime: true,
        realtimeState: 'UPDATED',
        serviceDay: 1_700_000_000,
        serviceDate: '20231115',
        headsign: 'Munkkiniemi',
        routeShortName: '4',
        displayDepartureEpochSeconds: 1_700_000_125,
        displayTime: '22:15',
        status: 'realtime',
        statusLabel: 'Live GPS',
        accessibilityLabel: '22:15, route 4 to Munkkiniemi, Live GPS',
      },
      {
        tripId: 'HSL:trip-7B',
        scheduledDeparture: 180,
        realtimeDeparture: 180,
        realtime: false,
        realtimeState: 'SCHEDULED',
        serviceDay: 1_700_000_000,
        serviceDate: '20231115',
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

  function createDepartureProgressQueryState(overrides: Record<string, unknown> = {}) {
    return {
      data: [],
      error: null,
      isError: false,
      isFetching: false,
      isPending: false,
      status: 'success',
      ...overrides,
    };
  }

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2023-11-14T22:10:00.000Z'));
    useStopDepartures.mockReturnValue(createDepartureQueryState());
    useDepartureProgress.mockReturnValue(createDepartureProgressQueryState());
    notificationPlatformAdapter.getPermissionState.mockResolvedValue({
      supported: true,
      granted: true,
      canPrompt: false,
    });
    notificationPlatformAdapter.prepareRuntime.mockResolvedValue(undefined);
    notificationPlatformAdapter.scheduleNotification.mockResolvedValue('scheduled-id');
    notificationPlatformAdapter.cancelScheduledNotification.mockResolvedValue(undefined);
    departureReminderStore.getState().reset();
    getSettingsStore().getState().updateSettings({ notificationLeadTimeMinutes: 10 });
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  afterAll(() => {
    infoSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it('opens the reminder dialog on native long press and schedules a badge-marked reminder on confirm', async () => {
    const screen = render(
      <DeparturesScreen
        onBack={onBack}
        stopId='HSL:1001'
        coordinates={{ latitude: 60.1699, longitude: 24.9384 }}
      />
    );

    await waitFor(() => {
      expect(screen.getByLabelText('22:15, route 4 to Munkkiniemi, Live GPS')).toBeTruthy();
    });

    fireEvent(screen.getByLabelText('22:15, route 4 to Munkkiniemi, Live GPS'), 'longPress');

    expect(screen.getByText('Notify Me')).toBeTruthy();
    expect(screen.getByText('Default alert: 10 min before departure')).toBeTruthy();

    fireEvent.press(screen.getByRole('radio', { name: '5 minutes' }));
    fireEvent.press(screen.getByRole('button', { name: 'Notify Me' }));

    await waitFor(() => {
      expect(notificationPlatformAdapter.scheduleNotification).toHaveBeenCalledWith({
        title: 'Departure reminder',
        body: '4 to Munkkiniemi departs in 5 min from Central station',
        fireAt: new Date((1_700_000_000 + 120 - 5 * 60) * 1000),
      });
      expect(screen.getByLabelText('Notification scheduled')).toBeTruthy();
      expect(screen.queryByText('Notify Me')).toBeNull();
    });
  });

  it('falls back to the largest still-valid lead time when the default would schedule in the past', async () => {
    jest.setSystemTime(new Date('2023-11-14T22:20:00.000Z'));
    getSettingsStore().getState().updateSettings({ notificationLeadTimeMinutes: 15 });
    useStopDepartures.mockReturnValue(
      createDepartureQueryState({
        data: {
          ...departureData,
          departures: [
            {
              ...departureData.departures[1],
              scheduledDeparture: 20 * 60,
              realtimeDeparture: 20 * 60,
              displayDepartureEpochSeconds: 1_700_000_000 + 20 * 60,
              displayTime: '22:33',
              accessibilityLabel: '22:33, route 7B to Pasila, Scheduled',
            },
          ],
        },
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
      expect(screen.getByLabelText('22:33, route 7B to Pasila, Scheduled')).toBeTruthy();
    });

    fireEvent(screen.getByLabelText('22:33, route 7B to Pasila, Scheduled'), 'longPress');

    expect(
      screen.getByRole('radio', { name: '15 minutes' }).props.accessibilityState.disabled
    ).toBe(true);
    expect(
      screen.getByRole('radio', { name: '15 minutes' }).props.accessibilityState.disabled
    ).toBe(true);
    expect(
      screen.getByRole('radio', { name: '10 minutes' }).props.accessibilityState.selected
    ).toBe(true);
    expect(screen.getByRole('radio', { name: '5 minutes' }).props.accessibilityState.selected).toBe(
      false
    );
  });

  it('keeps the stored default lead time selected when it is still schedulable', async () => {
    jest.setSystemTime(new Date('2023-11-14T22:00:00.000Z'));

    const screen = render(
      <DeparturesScreen
        onBack={onBack}
        stopId='HSL:1001'
        coordinates={{ latitude: 60.1699, longitude: 24.9384 }}
      />
    );

    await waitFor(() => {
      expect(screen.getByLabelText('22:16, route 7B to Pasila, Scheduled')).toBeTruthy();
    });

    fireEvent(screen.getByLabelText('22:16, route 7B to Pasila, Scheduled'), 'longPress');

    expect(
      screen.getByRole('radio', { name: '10 minutes' }).props.accessibilityState.selected
    ).toBe(true);
    expect(screen.getByRole('radio', { name: '5 minutes' }).props.accessibilityState.selected).toBe(
      false
    );
  });

  it('keeps reminder state unchanged when the dialog is dismissed', async () => {
    const screen = render(
      <DeparturesScreen
        onBack={onBack}
        stopId='HSL:1001'
        coordinates={{ latitude: 60.1699, longitude: 24.9384 }}
      />
    );

    await waitFor(() => {
      expect(screen.getByLabelText('22:15, route 4 to Munkkiniemi, Live GPS')).toBeTruthy();
    });

    fireEvent(screen.getByLabelText('22:15, route 4 to Munkkiniemi, Live GPS'), 'longPress');
    fireEvent.press(screen.getByText('Dismiss'));

    expect(notificationPlatformAdapter.scheduleNotification).not.toHaveBeenCalled();
    expect(screen.queryByLabelText('Notification scheduled')).toBeNull();
    expect(screen.queryByText('Notify Me')).toBeNull();
  });

  it('opens cancel mode for a scheduled departure and removes the badge only after cancellation succeeds', async () => {
    departureReminderStore.getState().setReminder('HSL:1001::1700000000::120::4::Munkkiniemi', {
      notificationId: 'scheduled-id',
      fireAtMs: Date.now() + 60_000,
    });

    const screen = render(
      <DeparturesScreen
        onBack={onBack}
        stopId='HSL:1001'
        coordinates={{ latitude: 60.1699, longitude: 24.9384 }}
      />
    );

    await waitFor(() => {
      expect(screen.getByLabelText('Notification scheduled')).toBeTruthy();
    });

    fireEvent(screen.getByLabelText('22:15, route 4 to Munkkiniemi, Live GPS'), 'longPress');

    expect(screen.getByText('Cancel notification for this departure?')).toBeTruthy();
    expect(screen.queryByText('Notify Me')).toBeNull();

    fireEvent.press(screen.getByRole('button', { name: 'Cancel notification for this departure' }));

    await waitFor(() => {
      expect(notificationPlatformAdapter.cancelScheduledNotification).toHaveBeenCalledWith(
        'scheduled-id'
      );
      expect(screen.queryByLabelText('Notification scheduled')).toBeNull();
      expect(screen.queryByText('Cancel notification for this departure?')).toBeNull();
    });
  });

  it('preserves the badge when cancel mode is dismissed', async () => {
    departureReminderStore.getState().setReminder('HSL:1001::1700000000::120::4::Munkkiniemi', {
      notificationId: 'scheduled-id',
      fireAtMs: Date.now() + 60_000,
    });

    const screen = render(
      <DeparturesScreen
        onBack={onBack}
        stopId='HSL:1001'
        coordinates={{ latitude: 60.1699, longitude: 24.9384 }}
      />
    );

    await waitFor(() => {
      expect(screen.getByLabelText('Notification scheduled')).toBeTruthy();
    });

    fireEvent(screen.getByLabelText('22:15, route 4 to Munkkiniemi, Live GPS'), 'longPress');
    fireEvent.press(screen.getByRole('button', { name: 'Dismiss' }));

    expect(notificationPlatformAdapter.cancelScheduledNotification).not.toHaveBeenCalled();
    expect(departureReminderStore.getState().remindersByKey).toHaveProperty(
      'HSL:1001::1700000000::120::4::Munkkiniemi'
    );
    expect(screen.getByLabelText('Notification scheduled')).toBeTruthy();
  });

  it('preserves the badge when scheduled notification cancellation fails', async () => {
    notificationPlatformAdapter.cancelScheduledNotification.mockRejectedValue(new Error('boom'));
    departureReminderStore.getState().setReminder('HSL:1001::1700000000::120::4::Munkkiniemi', {
      notificationId: 'scheduled-id',
      fireAtMs: Date.now() + 60_000,
    });

    const screen = render(
      <DeparturesScreen
        onBack={onBack}
        stopId='HSL:1001'
        coordinates={{ latitude: 60.1699, longitude: 24.9384 }}
      />
    );

    await waitFor(() => {
      expect(screen.getByLabelText('Notification scheduled')).toBeTruthy();
    });

    fireEvent(screen.getByLabelText('22:15, route 4 to Munkkiniemi, Live GPS'), 'longPress');
    fireEvent.press(screen.getByRole('button', { name: 'Cancel notification for this departure' }));

    await waitFor(() => {
      expect(notificationPlatformAdapter.cancelScheduledNotification).toHaveBeenCalledWith(
        'scheduled-id'
      );
      expect(screen.getByLabelText('Notification scheduled')).toBeTruthy();
    });
  });

  it('keeps the dialog in cancel mode after the store entry is pruned while the sheet is open', async () => {
    departureReminderStore.getState().setReminder('HSL:1001::1700000000::120::4::Munkkiniemi', {
      notificationId: 'scheduled-id',
      fireAtMs: Date.now() + 60_000,
    });

    const screen = render(
      <DeparturesScreen
        onBack={onBack}
        stopId='HSL:1001'
        coordinates={{ latitude: 60.1699, longitude: 24.9384 }}
      />
    );

    await waitFor(() => {
      expect(screen.getByLabelText('Notification scheduled')).toBeTruthy();
    });

    fireEvent(screen.getByLabelText('22:15, route 4 to Munkkiniemi, Live GPS'), 'longPress');

    act(() => {
      departureReminderStore.getState().removeReminder('HSL:1001::1700000000::120::4::Munkkiniemi');
    });

    expect(screen.getByText('Cancel notification for this departure?')).toBeTruthy();
    expect(screen.queryByText('Notify Me')).toBeNull();
  });

  it('prevents duplicate cancellation while a reminder cancellation is already in flight', async () => {
    let resolveCancellation: (() => void) | undefined;
    notificationPlatformAdapter.cancelScheduledNotification.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveCancellation = resolve;
        })
    );
    departureReminderStore.getState().setReminder('HSL:1001::1700000000::120::4::Munkkiniemi', {
      notificationId: 'scheduled-id',
      fireAtMs: Date.now() + 60_000,
    });

    const screen = render(
      <DeparturesScreen
        onBack={onBack}
        stopId='HSL:1001'
        coordinates={{ latitude: 60.1699, longitude: 24.9384 }}
      />
    );

    await waitFor(() => {
      expect(screen.getByLabelText('Notification scheduled')).toBeTruthy();
    });

    fireEvent(screen.getByLabelText('22:15, route 4 to Munkkiniemi, Live GPS'), 'longPress');
    fireEvent.press(screen.getByRole('button', { name: 'Cancel notification for this departure' }));

    await waitFor(() => {
      expect(notificationPlatformAdapter.cancelScheduledNotification).toHaveBeenCalledTimes(1);
      expect(screen.getByText('Cancelling...')).toBeTruthy();
    });

    fireEvent.press(screen.getByRole('button', { name: 'Cancel notification for this departure' }));

    expect(notificationPlatformAdapter.cancelScheduledNotification).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveCancellation?.();
      await Promise.resolve();
    });
  });

  it('restores a scheduled badge after navigating away and back until the reminder is canceled', async () => {
    departureReminderStore.getState().setReminder('HSL:1001::1700000000::120::4::Munkkiniemi', {
      notificationId: 'scheduled-id',
      fireAtMs: Date.now() + 60_000,
    });

    const screen = render(
      <DeparturesScreen
        onBack={onBack}
        stopId='HSL:1001'
        coordinates={{ latitude: 60.1699, longitude: 24.9384 }}
      />
    );

    await waitFor(() => {
      expect(screen.getByLabelText('Notification scheduled')).toBeTruthy();
    });

    screen.unmount();

    const rerendered = render(
      <DeparturesScreen
        onBack={onBack}
        stopId='HSL:1001'
        coordinates={{ latitude: 60.1699, longitude: 24.9384 }}
      />
    );

    await waitFor(() => {
      expect(rerendered.getByLabelText('Notification scheduled')).toBeTruthy();
    });
  });

  it('prevents duplicate scheduling while a reminder request is already in flight', async () => {
    let resolveSchedule: ((value: string) => void) | undefined;
    notificationPlatformAdapter.scheduleNotification.mockImplementation(
      () =>
        new Promise<string>((resolve) => {
          resolveSchedule = resolve;
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
      expect(screen.getByLabelText('22:16, route 7B to Pasila, Scheduled')).toBeTruthy();
    });

    fireEvent(screen.getByLabelText('22:16, route 7B to Pasila, Scheduled'), 'longPress');
    fireEvent.press(screen.getByRole('radio', { name: '5 minutes' }));
    fireEvent.press(screen.getByRole('button', { name: 'Notify Me' }));

    await waitFor(() => {
      expect(notificationPlatformAdapter.scheduleNotification).toHaveBeenCalledTimes(1);
      expect(screen.getByRole('button', { name: 'Scheduling...' })).toBeTruthy();
    });

    fireEvent.press(screen.getByRole('button', { name: 'Scheduling...' }));

    expect(notificationPlatformAdapter.scheduleNotification).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveSchedule?.('scheduled-id');
      await Promise.resolve();
    });
  });

  it('expands a tapped departure card inline, collapses on second tap, and renders stop-progress rows', async () => {
    useDepartureProgress.mockReturnValue(
      createDepartureProgressQueryState({
        data: [
          {
            stopGtfsId: 'HSL:1000',
            stopCode: '1000',
            stopName: 'Lasipalatsi',
            stopPositionInPattern: 0,
            state: 'passed',
            stateSource: 'realtime',
          },
          {
            stopGtfsId: 'HSL:1001',
            stopCode: '1001',
            stopName: 'Central station',
            stopPositionInPattern: 1,
            state: 'arriving',
            stateSource: 'realtime',
          },
        ],
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
      expect(screen.getByLabelText('22:15, route 4 to Munkkiniemi, Live GPS')).toBeTruthy();
    });

    fireEvent.press(screen.getByLabelText('22:15, route 4 to Munkkiniemi, Live GPS'));

    expect(screen.getByTestId('departure-progress-panel')).toBeTruthy();
    expect(screen.getByLabelText('1000 Lasipalatsi, passed')).toBeTruthy();
    expect(screen.getByLabelText('1001 Central station, arriving')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('22:15, route 4 to Munkkiniemi, Live GPS'));

    expect(screen.queryByTestId('departure-progress-panel')).toBeNull();
  });

  it('keeps only one departure card expanded at a time', async () => {
    useDepartureProgress.mockReturnValue(
      createDepartureProgressQueryState({
        data: [
          {
            stopGtfsId: 'HSL:1001',
            stopCode: '1001',
            stopName: 'Central station',
            stopPositionInPattern: 1,
            state: 'arriving',
            stateSource: 'realtime',
          },
        ],
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
      expect(screen.getByLabelText('22:15, route 4 to Munkkiniemi, Live GPS')).toBeTruthy();
      expect(screen.getByLabelText('22:16, route 7B to Pasila, Scheduled')).toBeTruthy();
    });

    fireEvent.press(screen.getByLabelText('22:15, route 4 to Munkkiniemi, Live GPS'));
    expect(screen.getAllByTestId('departure-progress-panel')).toHaveLength(1);

    fireEvent.press(screen.getByLabelText('22:16, route 7B to Pasila, Scheduled'));
    expect(screen.getAllByTestId('departure-progress-panel')).toHaveLength(1);
  });

  it('keeps expanded content visible during a background refresh while cached departures remain available', async () => {
    useDepartureProgress.mockReturnValue(
      createDepartureProgressQueryState({
        data: [
          {
            stopGtfsId: 'HSL:1001',
            stopCode: '1001',
            stopName: 'Central station',
            stopPositionInPattern: 1,
            state: 'arriving',
            stateSource: 'realtime',
          },
        ],
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
      expect(screen.getByLabelText('22:15, route 4 to Munkkiniemi, Live GPS')).toBeTruthy();
    });

    fireEvent.press(screen.getByLabelText('22:15, route 4 to Munkkiniemi, Live GPS'));
    expect(screen.getByTestId('departure-progress-panel')).toBeTruthy();

    useStopDepartures.mockReturnValue(
      createDepartureQueryState({ isFetching: true, isPending: false, isError: false })
    );
    screen.rerender(
      <DeparturesScreen
        onBack={onBack}
        stopId='HSL:1001'
        coordinates={{ latitude: 60.1699, longitude: 24.9384 }}
      />
    );

    expect(screen.getByTestId('departure-progress-panel')).toBeTruthy();
    expect(screen.getByTestId('departures-refresh-indicator')).toBeTruthy();
  });

  it('resets expanded departure state when the parent stop changes', async () => {
    useDepartureProgress.mockReturnValue(
      createDepartureProgressQueryState({
        data: [
          {
            stopGtfsId: 'HSL:1001',
            stopCode: '1001',
            stopName: 'Central station',
            stopPositionInPattern: 1,
            state: 'arriving',
            stateSource: 'realtime',
          },
        ],
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
      expect(screen.getByLabelText('22:15, route 4 to Munkkiniemi, Live GPS')).toBeTruthy();
    });

    fireEvent.press(screen.getByLabelText('22:15, route 4 to Munkkiniemi, Live GPS'));
    expect(screen.getByTestId('departure-progress-panel')).toBeTruthy();

    screen.rerender(
      <DeparturesScreen
        onBack={onBack}
        stopId='HSL:2002'
        coordinates={{ latitude: 60.1699, longitude: 24.9384 }}
      />
    );

    expect(screen.queryByTestId('departure-progress-panel')).toBeNull();
  });

  it('prunes expired reminders during the active session so stale badges disappear', async () => {
    departureReminderStore.getState().setReminder('HSL:1001::1700000000::180::7B::Pasila', {
      notificationId: 'scheduled-id',
      fireAtMs: Date.now() + 5_000,
    });

    const screen = render(
      <DeparturesScreen
        onBack={onBack}
        stopId='HSL:1001'
        coordinates={{ latitude: 60.1699, longitude: 24.9384 }}
      />
    );

    await waitFor(() => {
      expect(screen.getByLabelText('Notification scheduled')).toBeTruthy();
    });

    act(() => {
      jest.advanceTimersByTime(31_000);
    });

    await waitFor(() => {
      expect(screen.queryByLabelText('Notification scheduled')).toBeNull();
    });
  });

  it('keeps tap-to-expand available on web while reminder long-press remains unsupported', async () => {
    const originalPlatform = Platform.OS;
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' });
    useDepartureProgress.mockReturnValue(
      createDepartureProgressQueryState({
        data: [
          {
            stopGtfsId: 'HSL:1001',
            stopCode: '1001',
            stopName: 'Central station',
            stopPositionInPattern: 1,
            state: 'arriving',
            stateSource: 'realtime',
          },
        ],
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
      expect(
        screen.getByRole('button', { name: '22:15, route 4 to Munkkiniemi, Live GPS' })
      ).toBeTruthy();
    });

    fireEvent.press(
      screen.getByRole('button', { name: '22:15, route 4 to Munkkiniemi, Live GPS' })
    );

    expect(screen.getByTestId('departure-progress-panel')).toBeTruthy();
    fireEvent(
      screen.getByRole('button', { name: '22:15, route 4 to Munkkiniemi, Live GPS' }),
      'longPress'
    );
    expect(screen.queryByText('Notify Me')).toBeNull();

    Object.defineProperty(Platform, 'OS', { configurable: true, value: originalPlatform });
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
    expect(screen.getByTestId('departures-static-backdrop').props.blurRadius).toBe(
      theme.glass.screenBackdropBlurRadius
    );
    expect(screen.getByTestId('departures-static-backdrop').props.style.opacity).toBe(
      theme.glass.screenBackdropOpacity
    );
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
