/// <reference types="jest" />

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, waitFor } from '@testing-library/react-native';
import React from 'react';

import { requestGraphql } from '@/core/api/graphql-client';
import { formatServiceDayDepartureTime } from '@/core/utils/date';
import { LiveApiSection } from '@/features/showcase/live-api-section';
import { StopDeparturesQueryDocument, StopsNearbyQueryDocument } from '@/generated/graphql';

jest.mock('@/core/api/graphql-client', () => ({
  requestGraphql: jest.fn(),
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

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((innerResolve, innerReject) => {
    resolve = innerResolve;
    reject = innerReject;
  });

  return { promise, reject, resolve };
}

describe('LiveApiSection', () => {
  const mockRequestGraphql = jest.mocked(requestGraphql);

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('automatically runs nearby stops first and then departures for the first valid stop', async () => {
    const expectedDepartureTime = formatServiceDayDepartureTime(1_710_028_800, 14 * 3600 + 35 * 60);
    const nearbyDeferred = createDeferred<unknown>();
    const departuresDeferred = createDeferred<unknown>();

    mockRequestGraphql
      .mockReturnValueOnce(nearbyDeferred.promise as Promise<any>)
      .mockReturnValueOnce(departuresDeferred.promise as Promise<any>);

    const screen = renderWithQueryClient(<LiveApiSection hasApiKey />);

    expect(screen.getByText('Running live DigiTransit queries...')).toBeTruthy();

    nearbyDeferred.resolve({
      stopsByRadius: {
        edges: [
          {
            node: {
              distance: 120,
              stop: {
                gtfsId: 'HSL:1001',
                name: 'Asema-aukio',
                code: '1001',
                zoneId: 'A',
                vehicleMode: 'BUS',
                parentStation: null,
                patterns: [
                  {
                    directionId: 0,
                    route: {
                      shortName: '1',
                      longName: 'Central Station',
                      mode: 'BUS',
                    },
                    stops: [],
                  },
                ],
              },
            },
          },
        ],
      },
    });

    await waitFor(() => {
      expect(mockRequestGraphql).toHaveBeenNthCalledWith(
        2,
        StopDeparturesQueryDocument,
        expect.objectContaining({ id: 'HSL:1001' })
      );
    });

    departuresDeferred.resolve({
      stop: {
        name: 'Asema-aukio',
        stoptimesWithoutPatterns: [
          {
            scheduledDeparture: 14 * 3600 + 35 * 60,
            realtimeDeparture: 14 * 3600 + 36 * 60,
            realtime: true,
            realtimeState: 'UPDATED',
            serviceDay: 1_710_028_800,
            headsign: 'Kamppi',
            trip: {
              route: {
                shortName: '7A',
              },
            },
          },
        ],
      },
    });

    await waitFor(() => {
      expect(mockRequestGraphql).toHaveBeenNthCalledWith(
        1,
        StopsNearbyQueryDocument,
        expect.objectContaining({ lat: 60.631, lon: 24.861, radius: 500 })
      );
    });

    expect(await screen.findByText('Asema-aukio')).toBeTruthy();
    expect(screen.getByText('GTFS ID: HSL:1001')).toBeTruthy();
    expect(screen.getByText('Stop vehicleMode: BUS')).toBeTruthy();
    expect(screen.getByText('Resolved UI transport mode: bus')).toBeTruthy();
    expect(screen.getByText('Distance: 120 m')).toBeTruthy();
    expect(
      screen.getByText(`Departure 1: ${expectedDepartureTime} · 7A · Kamppi · UPDATED`)
    ).toBeTruthy();
  });

  it('shows explicit authentication guidance when the API rejects access', async () => {
    mockRequestGraphql.mockRejectedValueOnce({
      kind: 'permission',
      message: 'DigiTransit API access was rejected.',
      retryable: false,
    });

    const screen = renderWithQueryClient(<LiveApiSection hasApiKey />);

    expect(
      await screen.findByText('Authentication failed for the live DigiTransit query.')
    ).toBeTruthy();
    expect(
      screen.getByText(
        'Check EXPO_PUBLIC_DIGITRANSIT_API_KEY and the digitransit-subscription-key header.'
      )
    ).toBeTruthy();
  });

  it('shows the same authentication guidance for 401-style auth failures', async () => {
    mockRequestGraphql.mockRejectedValueOnce({
      kind: 'permission',
      message: 'DigiTransit API access was rejected.',
      retryable: false,
    });

    const screen = renderWithQueryClient(<LiveApiSection hasApiKey />);

    expect(
      await screen.findByText('Authentication failed for the live DigiTransit query.')
    ).toBeTruthy();
    expect(
      screen.getByText(
        'Check EXPO_PUBLIC_DIGITRANSIT_API_KEY and the digitransit-subscription-key header.'
      )
    ).toBeTruthy();
  });

  it('shows an explicit missing-api-key diagnostic without making network requests', async () => {
    const screen = renderWithQueryClient(<LiveApiSection hasApiKey={false} />);

    expect(
      await screen.findByText('Authentication failed for the live DigiTransit query.')
    ).toBeTruthy();
    expect(
      screen.getByText('Set EXPO_PUBLIC_DIGITRANSIT_API_KEY before using the Live API validator.')
    ).toBeTruthy();
    expect(mockRequestGraphql).not.toHaveBeenCalled();
  });

  it('keeps empty nearby-stop results visible as a validation failure', async () => {
    mockRequestGraphql.mockResolvedValueOnce({
      stopsByRadius: {
        edges: [],
      },
    });

    const screen = renderWithQueryClient(<LiveApiSection hasApiKey />);

    expect(await screen.findByText('Nearby stop validation failed.')).toBeTruthy();
    expect(
      screen.getByText(
        'The query did not return a stop with a name, gtfsId, and numeric distance for the Hyvinkaa dev coordinates.'
      )
    ).toBeTruthy();
  });

  it('keeps nearby-stop details visible and resolves transport mode from vehicleMode', async () => {
    mockRequestGraphql
      .mockResolvedValueOnce({
        stopsByRadius: {
          edges: [
            {
              node: {
                distance: 120,
                stop: {
                  gtfsId: 'HSL:1001',
                  name: 'Asema-aukio',
                  vehicleMode: 'BUS',
                  patterns: [
                    {
                      route: {
                        shortName: '1',
                        mode: 'BUS',
                      },
                    },
                  ],
                },
              },
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        stop: {
          name: 'Asema-aukio',
          stoptimesWithoutPatterns: [
            {
              scheduledDeparture: 14 * 3600 + 35 * 60,
              serviceDay: 1_710_028_800,
              realtimeState: 'UPDATED',
              headsign: 'Kamppi',
              trip: {
                route: {
                  shortName: '7A',
                },
              },
            },
          ],
        },
      });

    const screen = renderWithQueryClient(<LiveApiSection hasApiKey />);

    expect(await screen.findByText('Live DigiTransit validation passed.')).toBeTruthy();
    expect(screen.getByText('Stop vehicleMode: BUS')).toBeTruthy();
    expect(screen.getByText('Resolved UI transport mode: bus')).toBeTruthy();
    expect(screen.queryByText('Nearby stop validation failed.')).toBeNull();
  });

  it('treats departures with missing required fields as a validation failure', async () => {
    mockRequestGraphql
      .mockResolvedValueOnce({
        stopsByRadius: {
          edges: [
            {
              node: {
                distance: 120,
                stop: {
                  gtfsId: 'HSL:1001',
                  name: 'Asema-aukio',
                  vehicleMode: 'BUS',
                  patterns: [],
                },
              },
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        stop: {
          name: 'Asema-aukio',
          stoptimesWithoutPatterns: [
            {
              scheduledDeparture: 14 * 3600 + 35 * 60,
              serviceDay: 1_710_028_800,
              realtimeState: null,
              headsign: 'Kamppi',
              trip: {
                route: {
                  shortName: '7A',
                },
              },
            },
          ],
        },
      });

    const screen = renderWithQueryClient(<LiveApiSection hasApiKey />);

    expect(await screen.findByText('Departure validation failed.')).toBeTruthy();
    expect(
      screen.getByText(
        'The stop query did not return a departure with scheduledDeparture, serviceDay, realtimeState, trip.route.shortName, and headsign.'
      )
    ).toBeTruthy();
    expect(screen.queryByText('Live DigiTransit validation passed.')).toBeNull();
  });

  it('treats an empty departures payload as a validation failure', async () => {
    mockRequestGraphql
      .mockResolvedValueOnce({
        stopsByRadius: {
          edges: [
            {
              node: {
                distance: 120,
                stop: {
                  gtfsId: 'HSL:1001',
                  name: 'Asema-aukio',
                  vehicleMode: 'BUS',
                  patterns: [],
                },
              },
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        stop: {
          name: 'Asema-aukio',
          stoptimesWithoutPatterns: [],
        },
      });

    const screen = renderWithQueryClient(<LiveApiSection hasApiKey />);

    expect(await screen.findByText('Departure validation failed.')).toBeTruthy();
    expect(screen.queryByText('Live DigiTransit validation passed.')).toBeNull();
  });
});
