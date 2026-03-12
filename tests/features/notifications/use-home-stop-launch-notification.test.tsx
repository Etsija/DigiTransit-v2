/// <reference types="jest" />

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Text } from 'react-native';

import { type StopDeparturesModel } from '@/features/departures/hooks/use-stop-departures';
import { useHomeStopLaunchNotification } from '@/features/notifications/hooks/use-home-stop-launch-notification';

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

function HookHarness({ isActive = true }: { isActive?: boolean }) {
  useHomeStopLaunchNotification({ isActive });
  return <Text>launch-hook-mounted</Text>;
}

function renderHarness(node: React.ReactElement) {
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

describe('useHomeStopLaunchNotification', () => {
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
          homeStop: { gtfsId: string; name: string } | null;
          pushNotificationsEnabled: boolean;
          notificationLeadTimeMinutes: number;
        }) => unknown
      ) =>
        selector({
          homeStop: {
            gtfsId: 'HSL:1001',
            name: 'Kamppi',
          },
          pushNotificationsEnabled: true,
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
      departures: [
        {
          scheduledDeparture: 120,
          realtimeDeparture: 180,
          realtime: true,
          realtimeState: 'UPDATED',
          serviceDay: Math.floor(new Date('2026-03-12T10:00:00Z').getTime() / 1000),
          headsign: 'Itakeskus',
          routeShortName: '550',
          displayDepartureEpochSeconds:
            Math.floor(new Date('2026-03-12T10:00:00Z').getTime() / 1000) + 180,
          displayTime: '12:03',
          status: 'realtime',
          statusLabel: 'Live GPS',
          accessibilityLabel: '12:03, route 550 to Itakeskus, Live GPS',
        },
      ],
    } satisfies StopDeparturesModel);
    jest.setSystemTime(new Date('2026-03-12T10:00:00Z'));
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('fetches the next home-stop departure and sends a native notification when launch prerequisites pass', async () => {
    renderHarness(<HookHarness isActive />);
    act(() => {
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(fetchStopDeparturesModel).toHaveBeenCalledWith(expect.anything(), 'HSL:1001');
    });

    await waitFor(() => {
      expect(notificationPlatformAdapter.sendImmediateNotification).toHaveBeenCalledWith({
        title: 'Next 550 from Kamppi at 12:03',
        body: 'in 3 min',
      });
    });
  });

  it('skips the launch request entirely when notifications are disabled', async () => {
    useSettingsStore.mockImplementation(
      (
        selector: (state: {
          homeStop: { gtfsId: string; name: string } | null;
          pushNotificationsEnabled: boolean;
          notificationLeadTimeMinutes: number;
        }) => unknown
      ) =>
        selector({
          homeStop: {
            gtfsId: 'HSL:1001',
            name: 'Kamppi',
          },
          pushNotificationsEnabled: false,
          notificationLeadTimeMinutes: 10,
        })
    );

    renderHarness(<HookHarness isActive />);
    act(() => {
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(notificationPlatformAdapter.sendImmediateNotification).not.toHaveBeenCalled();
    });
    expect(fetchStopDeparturesModel).not.toHaveBeenCalled();
  });

  it('skips the launch request entirely when no home stop is configured', async () => {
    useSettingsStore.mockImplementation(
      (
        selector: (state: {
          homeStop: { gtfsId: string; name: string } | null;
          pushNotificationsEnabled: boolean;
          notificationLeadTimeMinutes: number;
        }) => unknown
      ) =>
        selector({
          homeStop: null,
          pushNotificationsEnabled: true,
          notificationLeadTimeMinutes: 10,
        })
    );

    renderHarness(<HookHarness isActive />);
    act(() => {
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(notificationPlatformAdapter.sendImmediateNotification).not.toHaveBeenCalled();
    });
    expect(fetchStopDeparturesModel).not.toHaveBeenCalled();
  });

  it('is a no-op on web and does not fetch departures there', async () => {
    notificationPlatformAdapter.getPermissionState.mockResolvedValue({
      supported: false,
      granted: false,
      canPrompt: false,
    });

    renderHarness(<HookHarness isActive />);
    act(() => {
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(notificationPlatformAdapter.sendImmediateNotification).not.toHaveBeenCalled();
    });
    expect(fetchStopDeparturesModel).not.toHaveBeenCalled();
  });

  it('fails silently when the home-stop query errors', async () => {
    fetchStopDeparturesModel.mockRejectedValueOnce(new Error('API unavailable'));

    renderHarness(<HookHarness isActive />);
    act(() => {
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(fetchStopDeparturesModel).toHaveBeenCalled();
    });

    expect(notificationPlatformAdapter.sendImmediateNotification).not.toHaveBeenCalled();
  });

  it('skips notification delivery when the departure list is empty', async () => {
    fetchStopDeparturesModel.mockResolvedValueOnce({
      header: {
        name: 'Kamppi',
        code: '1001',
        zoneLabel: 'Zone A',
        transportMode: 'bus',
        directionLabel: null,
        patternLabels: [],
      },
      departures: [],
    } satisfies StopDeparturesModel);

    renderHarness(<HookHarness isActive />);
    act(() => {
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(fetchStopDeparturesModel).toHaveBeenCalled();
    });

    expect(notificationPlatformAdapter.sendImmediateNotification).not.toHaveBeenCalled();
  });

  it('uses the first upcoming departure instead of a stale first row', async () => {
    const serviceDay = Math.floor(new Date('2026-03-12T10:00:00Z').getTime() / 1000);
    fetchStopDeparturesModel.mockResolvedValueOnce({
      header: {
        name: 'Kamppi',
        code: '1001',
        zoneLabel: 'Zone A',
        transportMode: 'bus',
        directionLabel: null,
        patternLabels: [],
      },
      departures: [
        {
          scheduledDeparture: -120,
          realtimeDeparture: -120,
          realtime: false,
          realtimeState: 'SCHEDULED',
          serviceDay,
          headsign: 'Ruoholahti',
          routeShortName: '21',
          displayDepartureEpochSeconds: serviceDay - 120,
          displayTime: '11:58',
          status: 'estimated',
          statusLabel: 'Scheduled',
          accessibilityLabel: '11:58, route 21 to Ruoholahti, Scheduled',
        },
        {
          scheduledDeparture: 300,
          realtimeDeparture: 300,
          realtime: false,
          realtimeState: 'SCHEDULED',
          serviceDay,
          headsign: 'Munkkivuori',
          routeShortName: '14',
          displayDepartureEpochSeconds: serviceDay + 300,
          displayTime: '12:05',
          status: 'estimated',
          statusLabel: 'Scheduled',
          accessibilityLabel: '12:05, route 14 to Munkkivuori, Scheduled',
        },
      ],
    } satisfies StopDeparturesModel);

    renderHarness(<HookHarness isActive />);
    act(() => {
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(notificationPlatformAdapter.sendImmediateNotification).toHaveBeenCalledWith({
        title: 'Next 14 from Kamppi at 12:05',
        body: 'in 5 min',
      });
    });
  });

  it('dedupes duplicate launch renders so a single app-open only sends one notification', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          gcTime: Infinity,
          retry: false,
        },
      },
    });

    function Wrapper({ isActive }: { isActive: boolean }) {
      return (
        <QueryClientProvider client={queryClient}>
          <HookHarness isActive={isActive} />
        </QueryClientProvider>
      );
    }

    const screen = render(<Wrapper isActive />);
    act(() => {
      jest.runAllTimers();
    });
    screen.rerender(<Wrapper isActive />);
    act(() => {
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(notificationPlatformAdapter.sendImmediateNotification).toHaveBeenCalledTimes(1);
    });
  });
});
