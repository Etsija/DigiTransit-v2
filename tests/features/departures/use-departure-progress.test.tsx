/// <reference types="jest" />

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Text } from 'react-native';

import { requestGraphql } from '@/core/api/graphql-client';
import { queryKeys } from '@/core/api/query-keys';
import {
  normalizeDepartureProgress,
  useDepartureProgress,
} from '@/features/departures/hooks/use-departure-progress';
import { VehicleStopStatus } from '@/generated/graphql';

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

function DepartureProgressHarness() {
  const query = useDepartureProgress({
    stopId: 'HSL:1001',
    departure: {
      tripId: 'HSL:trip-4',
      serviceDate: '20231114',
      serviceDay: 1_700_000_000,
      scheduledDeparture: 120,
    },
  });

  return <Text>{JSON.stringify({ status: query.status, rows: query.data?.length ?? 0 })}</Text>;
}

function DepartureProgressRerenderHarness({
  departure,
}: {
  departure: {
    tripId: string;
    serviceDate: string;
    serviceDay: number;
    scheduledDeparture: number;
  };
}) {
  const query = useDepartureProgress({
    stopId: 'HSL:1001',
    departure,
  });

  return (
    <Text>
      {JSON.stringify({
        status: query.status,
        rows: query.data?.map((row) => row.stopGtfsId) ?? [],
      })}
    </Text>
  );
}

describe('useDepartureProgress', () => {
  const mockRequestGraphql = jest.mocked(requestGraphql);
  const { useSettingsStore } = jest.requireMock('@/core/store/settings.store') as {
    useSettingsStore: jest.Mock;
  };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2023-11-14T22:10:00.000Z'));
    useSettingsStore.mockImplementation(
      (selector: (state: { departuresPollingIntervalSeconds: number }) => unknown) =>
        selector({
          departuresPollingIntervalSeconds: 10,
        })
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('maps realtime stop-relationship progress into passed, arriving, and upcoming rows', () => {
    expect(
      normalizeDepartureProgress(
        {
          trip: {
            id: 'HSL:trip-4',
            semanticHash: 'trip-4-hash',
            pattern: {
              vehiclePositions: [
                {
                  stopRelationship: {
                    status: VehicleStopStatus.IncomingAt,
                    stop: {
                      gtfsId: 'HSL:1001',
                    },
                  },
                  trip: {
                    semanticHash: 'trip-4-hash',
                  },
                },
              ],
            },
            stoptimesForDate: [
              {
                serviceDay: 1_700_000_000,
                scheduledArrival: 60,
                realtimeArrival: 60,
                scheduledDeparture: 65,
                realtimeDeparture: 65,
                realtime: true,
                stopPositionInPattern: 0,
                stop: {
                  gtfsId: 'HSL:1000',
                  code: '1000',
                  name: 'Lasipalatsi',
                },
              },
              {
                serviceDay: 1_700_000_000,
                scheduledArrival: 120,
                realtimeArrival: 120,
                scheduledDeparture: 125,
                realtimeDeparture: 125,
                realtime: true,
                stopPositionInPattern: 1,
                stop: {
                  gtfsId: 'HSL:1001',
                  code: '1001',
                  name: 'Central station',
                },
              },
              {
                serviceDay: 1_700_000_000,
                scheduledArrival: 180,
                realtimeArrival: 180,
                scheduledDeparture: 185,
                realtimeDeparture: 185,
                realtime: true,
                stopPositionInPattern: 2,
                stop: {
                  gtfsId: 'HSL:1002',
                  code: '1002',
                  name: 'Hakaniemi',
                },
              },
            ],
          },
        } as never,
        'HSL:1002',
        {
          serviceDay: 1_700_000_000,
          scheduledDeparture: 185,
        }
      )
    ).toEqual([
      {
        stopGtfsId: 'HSL:1001',
        stopCode: '1001',
        stopName: 'Central station',
        stopPositionInPattern: 1,
        state: 'arriving',
        stateSource: 'realtime',
      },
      {
        stopGtfsId: 'HSL:1000',
        stopCode: '1000',
        stopName: 'Lasipalatsi',
        stopPositionInPattern: 0,
        state: 'passed',
        stateSource: 'realtime',
      },
    ]);
  });

  it('matches the selected stop instance by scheduled departure even when realtime shifts the stop time', () => {
    expect(
      normalizeDepartureProgress(
        {
          trip: {
            id: 'HSL:trip-live-target',
            semanticHash: 'trip-live-target-hash',
            pattern: {
              vehiclePositions: [
                {
                  stopRelationship: {
                    status: VehicleStopStatus.IncomingAt,
                    stop: {
                      gtfsId: 'HSL:1001',
                    },
                  },
                  trip: {
                    semanticHash: 'trip-live-target-hash',
                  },
                },
              ],
            },
            stoptimesForDate: [
              {
                serviceDay: 1_700_000_000,
                scheduledArrival: 60,
                realtimeArrival: 60,
                scheduledDeparture: 65,
                realtimeDeparture: 65,
                realtime: true,
                stopPositionInPattern: 0,
                stop: {
                  gtfsId: 'HSL:1000',
                  code: '1000',
                  name: 'Lasipalatsi',
                },
              },
              {
                serviceDay: 1_700_000_000,
                scheduledArrival: 120,
                realtimeArrival: 180,
                scheduledDeparture: 125,
                realtimeDeparture: 185,
                realtime: true,
                stopPositionInPattern: 1,
                stop: {
                  gtfsId: 'HSL:1001',
                  code: '1001',
                  name: 'Central station',
                },
              },
              {
                serviceDay: 1_700_000_000,
                scheduledArrival: 240,
                realtimeArrival: 240,
                scheduledDeparture: 245,
                realtimeDeparture: 245,
                realtime: true,
                stopPositionInPattern: 2,
                stop: {
                  gtfsId: 'HSL:1002',
                  code: '1002',
                  name: 'Hakaniemi',
                },
              },
            ],
          },
        } as never,
        'HSL:1001',
        {
          serviceDay: 1_700_000_000,
          scheduledDeparture: 125,
        }
      ).map((row) => row.stopGtfsId)
    ).toEqual(['HSL:1000']);
  });

  it('falls back to scheduled progression when realtime relationship data is unavailable', () => {
    expect(
      normalizeDepartureProgress(
        {
          trip: {
            id: 'HSL:trip-4',
            semanticHash: 'trip-4-hash',
            pattern: {
              vehiclePositions: [],
            },
            stoptimesForDate: [
              {
                serviceDay: 1_700_000_000,
                scheduledArrival: 60,
                realtimeArrival: null,
                scheduledDeparture: 65,
                realtimeDeparture: null,
                realtime: false,
                stopPositionInPattern: 0,
                stop: {
                  gtfsId: 'HSL:1000',
                  code: '1000',
                  name: 'Lasipalatsi',
                },
              },
              {
                serviceDay: 1_700_000_000,
                scheduledArrival: 120,
                realtimeArrival: null,
                scheduledDeparture: 125,
                realtimeDeparture: null,
                realtime: false,
                stopPositionInPattern: 1,
                stop: {
                  gtfsId: 'HSL:1001',
                  code: '1001',
                  name: 'Central station',
                },
              },
              {
                serviceDay: 1_700_000_000,
                scheduledArrival: 240,
                realtimeArrival: null,
                scheduledDeparture: 245,
                realtimeDeparture: null,
                realtime: false,
                stopPositionInPattern: 2,
                stop: {
                  gtfsId: 'HSL:1002',
                  code: '1002',
                  name: 'Hakaniemi',
                },
              },
            ],
          },
        } as never,
        'HSL:1002',
        {
          serviceDay: 1_700_000_000,
          scheduledDeparture: 245,
        }
      ).map((row) => row.state)
    ).toEqual(['upcoming', 'arriving']);
  });

  it('skips malformed stop rows instead of returning partial broken progress items', () => {
    expect(
      normalizeDepartureProgress(
        {
          trip: {
            id: 'HSL:trip-4',
            semanticHash: 'trip-4-hash',
            pattern: {
              vehiclePositions: [],
            },
            stoptimesForDate: [
              {
                serviceDay: 1_700_000_000,
                scheduledArrival: 60,
                realtimeArrival: null,
                scheduledDeparture: 65,
                realtimeDeparture: null,
                realtime: false,
                stopPositionInPattern: 0,
                stop: {
                  gtfsId: 'HSL:1000',
                  code: '1000',
                  name: 'Lasipalatsi',
                },
              },
              {
                serviceDay: 1_700_000_000,
                scheduledArrival: 120,
                realtimeArrival: null,
                scheduledDeparture: 125,
                realtimeDeparture: null,
                realtime: false,
                stopPositionInPattern: 1,
                stop: {
                  gtfsId: 'HSL:1001',
                  code: '   ',
                  name: 'Central station',
                },
              },
            ],
          },
        } as never,
        'HSL:1000',
        {
          serviceDay: 1_700_000_000,
          scheduledDeparture: 65,
        }
      )
    ).toEqual([]);
  });

  it('keeps only the latest passed stop while showing the remaining active progress rows', () => {
    expect(
      normalizeDepartureProgress(
        {
          trip: {
            id: 'HSL:trip-4',
            semanticHash: 'trip-4-hash',
            pattern: {
              vehiclePositions: [
                {
                  stopRelationship: {
                    status: VehicleStopStatus.InTransitTo,
                    stop: {
                      gtfsId: 'HSL:1002',
                    },
                  },
                  trip: {
                    semanticHash: 'trip-4-hash',
                  },
                },
              ],
            },
            stoptimesForDate: [
              {
                serviceDay: 1_700_000_000,
                scheduledArrival: 60,
                realtimeArrival: 60,
                scheduledDeparture: 65,
                realtimeDeparture: 65,
                realtime: true,
                stopPositionInPattern: 0,
                stop: {
                  gtfsId: 'HSL:1000',
                  code: '1000',
                  name: 'Lasipalatsi',
                },
              },
              {
                serviceDay: 1_700_000_000,
                scheduledArrival: 120,
                realtimeArrival: 120,
                scheduledDeparture: 125,
                realtimeDeparture: 125,
                realtime: true,
                stopPositionInPattern: 1,
                stop: {
                  gtfsId: 'HSL:1001',
                  code: '1001',
                  name: 'Central station',
                },
              },
              {
                serviceDay: 1_700_000_000,
                scheduledArrival: 180,
                realtimeArrival: 180,
                scheduledDeparture: 185,
                realtimeDeparture: 185,
                realtime: true,
                stopPositionInPattern: 2,
                stop: {
                  gtfsId: 'HSL:1002',
                  code: '1002',
                  name: 'Hakaniemi',
                },
              },
              {
                serviceDay: 1_700_000_000,
                scheduledArrival: 240,
                realtimeArrival: 240,
                scheduledDeparture: 245,
                realtimeDeparture: 245,
                realtime: true,
                stopPositionInPattern: 3,
                stop: {
                  gtfsId: 'HSL:1003',
                  code: '1003',
                  name: 'Sornainen',
                },
              },
            ],
          },
        } as never,
        'HSL:1003',
        {
          serviceDay: 1_700_000_000,
          scheduledDeparture: 245,
        }
      ).map((row) => ({
        stopGtfsId: row.stopGtfsId,
        state: row.state,
      }))
    ).toEqual([
      {
        stopGtfsId: 'HSL:1002',
        state: 'arriving',
      },
      {
        stopGtfsId: 'HSL:1001',
        state: 'passed',
      },
    ]);
  });

  it('resolves repeated stop ids against the selected departure instance instead of the first match', () => {
    expect(
      normalizeDepartureProgress(
        {
          trip: {
            id: 'HSL:trip-loop',
            semanticHash: 'trip-loop-hash',
            pattern: {
              vehiclePositions: [
                {
                  stopRelationship: {
                    status: VehicleStopStatus.StoppedAt,
                    stop: {
                      gtfsId: 'HSL:1001',
                    },
                  },
                  trip: {
                    semanticHash: 'trip-loop-hash',
                  },
                },
              ],
            },
            stoptimesForDate: [
              {
                serviceDay: 1_700_000_000,
                scheduledArrival: 60,
                realtimeArrival: 60,
                scheduledDeparture: 65,
                realtimeDeparture: 65,
                realtime: true,
                stopPositionInPattern: 0,
                stop: {
                  gtfsId: 'HSL:1001',
                  code: '1001',
                  name: 'Central station',
                },
              },
              {
                serviceDay: 1_700_000_000,
                scheduledArrival: 120,
                realtimeArrival: 120,
                scheduledDeparture: 125,
                realtimeDeparture: 125,
                realtime: true,
                stopPositionInPattern: 1,
                stop: {
                  gtfsId: 'HSL:1002',
                  code: '1002',
                  name: 'Hakaniemi',
                },
              },
              {
                serviceDay: 1_700_000_000,
                scheduledArrival: 180,
                realtimeArrival: 180,
                scheduledDeparture: 185,
                realtimeDeparture: 185,
                realtime: true,
                stopPositionInPattern: 2,
                stop: {
                  gtfsId: 'HSL:1001',
                  code: '1001',
                  name: 'Central station',
                },
              },
              {
                serviceDay: 1_700_000_000,
                scheduledArrival: 240,
                realtimeArrival: 240,
                scheduledDeparture: 245,
                realtimeDeparture: 245,
                realtime: true,
                stopPositionInPattern: 3,
                stop: {
                  gtfsId: 'HSL:1003',
                  code: '1003',
                  name: 'Sornainen',
                },
              },
            ],
          },
        } as never,
        'HSL:1001',
        {
          serviceDay: 1_700_000_000,
          scheduledDeparture: 185,
        }
      ).map((row) => ({
        stopGtfsId: row.stopGtfsId,
        state: row.state,
      }))
    ).toEqual([
      {
        stopGtfsId: 'HSL:1002',
        state: 'passed',
      },
    ]);
  });

  it('uses the shared departure-progress query key for a specific departure instance', async () => {
    mockRequestGraphql.mockResolvedValueOnce({
      trip: {
        id: 'HSL:trip-4',
        semanticHash: 'trip-4-hash',
        pattern: {
          vehiclePositions: [],
        },
        stoptimesForDate: [
          {
            serviceDay: 1_700_000_000,
            scheduledArrival: 120,
            realtimeArrival: null,
            scheduledDeparture: 125,
            realtimeDeparture: null,
            realtime: false,
            stopPositionInPattern: 0,
            stop: {
              gtfsId: 'HSL:1001',
              code: '1001',
              name: 'Central station',
            },
          },
        ],
      },
    });

    const screen = renderWithQueryClient(<DepartureProgressHarness />);

    await waitFor(() => {
      expect(screen.getByText(JSON.stringify({ status: 'success', rows: 0 }))).toBeTruthy();
    });

    expect(mockRequestGraphql).toHaveBeenCalledWith(expect.anything(), {
      tripId: 'HSL:trip-4',
      serviceDate: '20231114',
    });
    expect(
      queryKeys.departures.progress('HSL:1001', {
        tripId: 'HSL:trip-4',
        serviceDay: 1_700_000_000,
        scheduledDeparture: 120,
      })
    ).toEqual([
      'departures',
      'progress',
      'HSL:1001',
      {
        tripId: 'HSL:trip-4',
        serviceDay: 1_700_000_000,
        scheduledDeparture: 120,
      },
    ]);
  });

  it('does not keep the previous departure rows visible when the expanded departure changes', async () => {
    let resolveSecondRequest:
      | ((value: {
          trip: {
            id: string;
            semanticHash: string;
            pattern: { vehiclePositions: [] };
            stoptimesForDate: Array<{
              serviceDay: number;
              scheduledArrival: number;
              realtimeArrival: null;
              scheduledDeparture: number;
              realtimeDeparture: null;
              realtime: false;
              stopPositionInPattern: number;
              stop: { gtfsId: string; code: string; name: string };
            }>;
          };
        }) => void)
      | undefined;

    mockRequestGraphql
      .mockResolvedValueOnce({
        trip: {
          id: 'HSL:trip-4',
          semanticHash: 'trip-4-hash',
          pattern: {
            vehiclePositions: [],
          },
          stoptimesForDate: [
            {
              serviceDay: 1_700_000_000,
              scheduledArrival: 60,
              realtimeArrival: null,
              scheduledDeparture: 65,
              realtimeDeparture: null,
              realtime: false,
              stopPositionInPattern: 0,
              stop: {
                gtfsId: 'HSL:1000',
                code: '1000',
                name: 'Lasipalatsi',
              },
            },
            {
              serviceDay: 1_700_000_000,
              scheduledArrival: 120,
              realtimeArrival: null,
              scheduledDeparture: 125,
              realtimeDeparture: null,
              realtime: false,
              stopPositionInPattern: 1,
              stop: {
                gtfsId: 'HSL:1001',
                code: '1001',
                name: 'Central station',
              },
            },
          ],
        },
      })
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveSecondRequest = resolve as typeof resolveSecondRequest;
          })
      );

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          gcTime: Infinity,
          retry: false,
        },
      },
    });

    const screen = render(
      <QueryClientProvider client={queryClient}>
        <DepartureProgressRerenderHarness
          departure={{
            tripId: 'HSL:trip-4',
            serviceDate: '20231114',
            serviceDay: 1_700_000_000,
            scheduledDeparture: 125,
          }}
        />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(
        screen.getByText(JSON.stringify({ status: 'success', rows: ['HSL:1000'] }))
      ).toBeTruthy();
    });

    screen.rerender(
      <QueryClientProvider client={queryClient}>
        <DepartureProgressRerenderHarness
          departure={{
            tripId: 'HSL:trip-5',
            serviceDate: '20231114',
            serviceDay: 1_700_000_000,
            scheduledDeparture: 185,
          }}
        />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(JSON.stringify({ status: 'pending', rows: [] }))).toBeTruthy();
    });

    resolveSecondRequest?.({
      trip: {
        id: 'HSL:trip-5',
        semanticHash: 'trip-5-hash',
        pattern: {
          vehiclePositions: [],
        },
        stoptimesForDate: [
          {
            serviceDay: 1_700_000_000,
            scheduledArrival: 180,
            realtimeArrival: null,
            scheduledDeparture: 185,
            realtimeDeparture: null,
            realtime: false,
            stopPositionInPattern: 1,
            stop: {
              gtfsId: 'HSL:1001',
              code: '1001',
              name: 'Central station',
            },
          },
        ],
      },
    });
  });
});
