/// <reference types="jest" />

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Text } from 'react-native';

import { requestGraphql } from '@/core/api/graphql-client';
import { queryKeys } from '@/core/api/query-keys';
import { formatServiceDayDepartureTime } from '@/core/utils/date';
import {
  normalizeStopDepartures,
  useStopDepartures,
} from '@/features/departures/hooks/use-stop-departures';

jest.mock('@/core/api/graphql-client', () => ({
  requestGraphql: jest.fn(),
}));

jest.mock('@/core/store/settings.store', () => ({
  useSettingsStore: jest.fn(),
}));

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

function StopDeparturesHarness({ stopId }: { stopId: string | null }) {
  const query = useStopDepartures({ stopId });

  return (
    <Text>{JSON.stringify({ status: query.status, name: query.data?.header.name ?? null })}</Text>
  );
}

describe('useStopDepartures', () => {
  const mockRequestGraphql = jest.mocked(requestGraphql);
  const { useSettingsStore } = jest.requireMock('@/core/store/settings.store') as {
    useSettingsStore: jest.Mock;
  };

  beforeEach(() => {
    useSettingsStore.mockImplementation(
      (selector: (state: { departuresPollingIntervalSeconds: number }) => unknown) =>
        selector({
          departuresPollingIntervalSeconds: 10,
        })
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('normalizes stop header data and unique route labels from the GraphQL payload', () => {
    const realtimeTime = formatServiceDayDepartureTime(1_700_000_000, 125);
    const firstScheduledTime = formatServiceDayDepartureTime(1_700_000_000, 180);
    const secondScheduledTime = formatServiceDayDepartureTime(1_700_000_000, 240);

    expect(
      normalizeStopDepartures({
        stop: {
          name: 'Central station',
          code: '1001',
          zoneId: 'A',
          vehicleMode: 'TRAM',
          direction: 'Munkkiniemi',
          patterns: [
            {
              name: '4 to Munkkiniemi',
              headsign: 'Munkkiniemi',
              directionId: 0,
              route: {
                shortName: '4',
                longName: 'Munkkiniemi',
                mode: 'TRAM',
              },
            },
            {
              name: null,
              headsign: 'Pasila',
              directionId: 1,
              route: {
                shortName: '7B',
                longName: 'Pasila',
                mode: 'TRAM',
              },
            },
            {
              name: '4 to Munkkiniemi',
              headsign: 'Munkkiniemi',
              directionId: 0,
              route: {
                shortName: '4',
                longName: 'Munkkiniemi',
                mode: 'TRAM',
              },
            },
          ],
          stoptimesWithoutPatterns: [
            {
              scheduledDeparture: 120,
              realtimeDeparture: 125,
              realtime: true,
              realtimeState: 'UPDATED',
              serviceDay: 1_700_000_000,
              headsign: 'Munkkiniemi',
              trip: {
                route: {
                  shortName: '4',
                },
              },
            },
            {
              scheduledDeparture: 180,
              realtimeDeparture: 180,
              realtime: false,
              realtimeState: 'SCHEDULED',
              serviceDay: 1_700_000_000,
              headsign: 'Pasila',
              trip: {
                route: {
                  shortName: '7B',
                },
              },
            },
            {
              scheduledDeparture: 240,
              realtimeDeparture: 240,
              realtime: false,
              realtimeState: 'SCHEDULED',
              serviceDay: 1_700_000_000,
              headsign: 'Pasila',
              trip: {
                route: {
                  shortName: '4',
                },
              },
            },
          ],
        },
      } as never)
    ).toEqual({
      header: {
        name: 'Central station',
        code: '1001',
        zoneLabel: 'Zone A',
        transportMode: 'tram',
        directionLabel: 'Munkkiniemi',
        patternLabels: ['4 to Munkkiniemi', '7B to Pasila'],
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
          displayTime: realtimeTime,
          status: 'realtime',
          statusLabel: 'Live GPS',
          accessibilityLabel: `${realtimeTime}, route 4 to Munkkiniemi, Live GPS`,
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
          displayTime: firstScheduledTime,
          status: 'estimated',
          statusLabel: 'Scheduled',
          accessibilityLabel: `${firstScheduledTime}, route 7B to Pasila, Scheduled`,
        },
        {
          scheduledDeparture: 240,
          realtimeDeparture: 240,
          realtime: false,
          realtimeState: 'SCHEDULED',
          serviceDay: 1_700_000_000,
          headsign: 'Pasila',
          routeShortName: '4',
          displayDepartureEpochSeconds: 1_700_000_240,
          displayTime: secondScheduledTime,
          status: 'estimated',
          statusLabel: 'Scheduled',
          accessibilityLabel: `${secondScheduledTime}, route 4 to Pasila, Scheduled`,
        },
      ],
    });
  });

  it('uses realtime departure seconds for realtime rows and scheduled seconds for non-realtime rows', () => {
    const realtimeTime = formatServiceDayDepartureTime(1_700_000_000, 125);
    const scheduledTime = formatServiceDayDepartureTime(1_700_000_000, 180);

    const model = normalizeStopDepartures({
      stop: {
        name: 'Central station',
        code: '1001',
        zoneId: 'A',
        vehicleMode: 'TRAM',
        direction: 'Munkkiniemi',
        patterns: [],
        stoptimesWithoutPatterns: [
          {
            scheduledDeparture: 120,
            realtimeDeparture: 125,
            realtime: true,
            realtimeState: 'UPDATED',
            serviceDay: 1_700_000_000,
            headsign: 'Munkkiniemi',
            trip: {
              route: {
                shortName: '4',
              },
            },
          },
          {
            scheduledDeparture: 180,
            realtimeDeparture: 240,
            realtime: false,
            realtimeState: 'SCHEDULED',
            serviceDay: 1_700_000_000,
            headsign: 'Pasila',
            trip: {
              route: {
                shortName: '7B',
              },
            },
          },
        ],
      },
    } as never);

    expect(model?.departures.map((departure) => departure.displayTime)).toEqual([
      realtimeTime,
      scheduledTime,
    ]);
    expect(model?.departures.map((departure) => departure.status)).toEqual([
      'realtime',
      'estimated',
    ]);
  });

  it('skips malformed rows instead of returning incomplete departure cards', () => {
    const realtimeTime = formatServiceDayDepartureTime(1_700_000_000, 125);

    const model = normalizeStopDepartures({
      stop: {
        name: 'Central station',
        code: '1001',
        zoneId: 'A',
        vehicleMode: 'TRAM',
        direction: 'Munkkiniemi',
        patterns: [],
        stoptimesWithoutPatterns: [
          {
            scheduledDeparture: 120,
            realtimeDeparture: 125,
            realtime: true,
            realtimeState: 'UPDATED',
            serviceDay: 1_700_000_000,
            headsign: 'Munkkiniemi',
            trip: {
              route: {
                shortName: '4',
              },
            },
          },
          {
            scheduledDeparture: 180,
            realtimeDeparture: 180,
            realtime: false,
            realtimeState: 'SCHEDULED',
            serviceDay: 1_700_000_000,
            headsign: '   ',
            trip: {
              route: {
                shortName: '7B',
              },
            },
          },
          {
            scheduledDeparture: 240,
            realtimeDeparture: 240,
            realtime: false,
            realtimeState: 'SCHEDULED',
            serviceDay: 1_700_000_000,
            headsign: 'Pasila',
            trip: {
              route: {
                shortName: '   ',
              },
            },
          },
        ],
      },
    } as never);

    expect(model?.departures).toHaveLength(1);
    expect(model?.departures[0]?.accessibilityLabel).toBe(
      `${realtimeTime}, route 4 to Munkkiniemi, Live GPS`
    );
  });

  it('fails safely when required stop fields are missing', () => {
    expect(
      normalizeStopDepartures({
        stop: {
          name: '   ',
          code: null,
          zoneId: null,
          vehicleMode: null,
          direction: null,
          patterns: null,
          stoptimesWithoutPatterns: null,
        },
      } as never)
    ).toEqual(null);
  });

  it('does not run the stop departures query when stop id is unavailable', async () => {
    const screen = renderWithQueryClient(<StopDeparturesHarness stopId={null} />);

    await waitFor(() => {
      expect(screen.getByText(JSON.stringify({ status: 'pending', name: null }))).toBeTruthy();
    });

    expect(mockRequestGraphql).not.toHaveBeenCalled();
  });

  it('uses the departures query key and polling interval from settings', async () => {
    mockRequestGraphql.mockResolvedValueOnce({
      stop: {
        name: 'Central station',
        code: '1001',
        zoneId: 'A',
        vehicleMode: 'TRAM',
        direction: 'Munkkiniemi',
        patterns: [],
        stoptimesWithoutPatterns: [],
      },
    });

    const screen = renderWithQueryClient(<StopDeparturesHarness stopId='HSL:1001' />);

    await waitFor(() => {
      expect(
        screen.getByText(JSON.stringify({ status: 'success', name: 'Central station' }))
      ).toBeTruthy();
    });

    expect(mockRequestGraphql).toHaveBeenCalledWith(expect.anything(), { id: 'HSL:1001' });
    expect(queryKeys.departures.stop('HSL:1001')).toEqual(['departures', 'stop', 'HSL:1001']);
  });
});
