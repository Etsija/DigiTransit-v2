/// <reference types="jest" />

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Text } from 'react-native';

import { requestGraphql } from '@/core/api/graphql-client';
import { queryKeys } from '@/core/api/query-keys';
import { useDeviceLocation } from '@/features/map/hooks/use-device-location';
import { normalizeNearbyStops, useNearbyStops } from '@/features/stops/hooks/use-nearby-stops';

jest.mock('@/core/api/graphql-client', () => ({
  requestGraphql: jest.fn(),
}));

jest.mock('@/core/store/settings.store', () => ({
  useSettingsStore: jest.fn(),
}));

jest.mock('expo-location', () => ({
  Accuracy: {
    Balanced: 'balanced',
  },
  getCurrentPositionAsync: jest.fn(),
  getForegroundPermissionsAsync: jest.fn(),
  getLastKnownPositionAsync: jest.fn(),
  requestForegroundPermissionsAsync: jest.fn(),
  watchPositionAsync: jest.fn(),
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

function NearbyStopsHarness(props: {
  coordinates: { latitude: number; longitude: number } | null;
  enabled?: boolean;
}) {
  const query = useNearbyStops(props);

  return <Text>{JSON.stringify({ count: query.data?.length ?? 0, status: query.status })}</Text>;
}

function DualNearbyStopsHarness(props: {
  coordinates: { latitude: number; longitude: number } | null;
}) {
  useNearbyStops(props);
  useNearbyStops(props);

  return <Text>dual</Text>;
}

function SharedLocationNearbyStopsHarness() {
  const location = useDeviceLocation({
    intervalSeconds: 20,
    isActive: true,
  });
  const query = useNearbyStops({
    coordinates: location.coordinates,
    enabled: true,
  });

  return <Text>{JSON.stringify({ count: query.data?.length ?? 0, status: query.status })}</Text>;
}

describe('useNearbyStops', () => {
  const mockRequestGraphql = jest.mocked(requestGraphql);
  const { useSettingsStore } = jest.requireMock('@/core/store/settings.store') as {
    useSettingsStore: jest.Mock;
  };
  const expoLocation = jest.requireMock('expo-location') as {
    getCurrentPositionAsync: jest.Mock;
    getForegroundPermissionsAsync: jest.Mock;
    getLastKnownPositionAsync: jest.Mock;
    requestForegroundPermissionsAsync: jest.Mock;
    watchPositionAsync: jest.Mock;
  };
  const removeWatcher = jest.fn();

  beforeEach(() => {
    useSettingsStore.mockImplementation(
      (
        selector: (state: {
          searchRadiusMeters: number;
          stopsPollingIntervalSeconds: number;
        }) => unknown
      ) =>
        selector({
          searchRadiusMeters: 250,
          stopsPollingIntervalSeconds: 20,
        })
    );

    expoLocation.getForegroundPermissionsAsync.mockResolvedValue({
      granted: true,
      status: 'granted',
      canAskAgain: true,
    });
    expoLocation.requestForegroundPermissionsAsync.mockResolvedValue({
      granted: true,
      status: 'granted',
      canAskAgain: true,
    });
    expoLocation.getLastKnownPositionAsync.mockResolvedValue(null);
    expoLocation.getCurrentPositionAsync.mockResolvedValue({
      coords: {
        latitude: 60.1699,
        longitude: 24.9384,
      },
    });
    expoLocation.watchPositionAsync.mockResolvedValue({
      remove: removeWatcher,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('normalizes nearby stops, filters invalid nodes, and falls back to route mode when needed', () => {
    expect(
      normalizeNearbyStops({
        stopsByRadius: {
          edges: [
            {
              node: {
                distance: 180,
                stop: {
                  gtfsId: 'HSL:1002',
                  name: 'Filtered missing coordinates',
                  code: null,
                  zoneId: null,
                  lat: null,
                  lon: 24.94,
                  vehicleMode: 'BUS',
                  parentStation: null,
                  patterns: [],
                },
              },
            },
            {
              node: {
                distance: 140,
                stop: {
                  gtfsId: 'HSL:1003',
                  name: 'Outer stop',
                  code: '1003',
                  zoneId: 'B',
                  lat: 60.18,
                  lon: 24.95,
                  vehicleMode: 'BUS',
                  parentStation: null,
                  patterns: [],
                },
              },
            },
            {
              node: {
                distance: 30,
                stop: {
                  gtfsId: 'HSL:1001',
                  name: 'Central station',
                  code: '1001',
                  zoneId: 'A',
                  lat: 60.17,
                  lon: 24.94,
                  vehicleMode: null,
                  parentStation: {
                    name: 'Central',
                  },
                  patterns: [
                    {
                      directionId: 0,
                      route: {
                        shortName: '4',
                        longName: 'Munkkiniemi',
                        mode: 'TRAM',
                      },
                      stops: [],
                    },
                    {
                      directionId: 1,
                      route: {
                        shortName: '',
                        longName: 'Airport Express',
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
      } as never)
    ).toEqual([
      {
        gtfsId: 'HSL:1001',
        name: 'Central station',
        code: '1001',
        zoneId: 'A',
        distanceMeters: 30,
        latitude: 60.17,
        longitude: 24.94,
        transportMode: 'tram',
        parentStationName: 'Central',
        routePatterns: [
          { label: '4', mode: 'tram' },
          { label: 'Airport Express', mode: 'bus' },
        ],
      },
      {
        gtfsId: 'HSL:1003',
        name: 'Outer stop',
        code: '1003',
        zoneId: 'B',
        distanceMeters: 140,
        latitude: 60.18,
        longitude: 24.95,
        transportMode: 'bus',
        parentStationName: null,
        routePatterns: [],
      },
    ]);
  });

  it('does not run the nearby stops query when coordinates are unavailable', async () => {
    const screen = renderWithQueryClient(<NearbyStopsHarness coordinates={null} />);

    await waitFor(() => {
      expect(screen.getByText(JSON.stringify({ count: 0, status: 'pending' }))).toBeTruthy();
    });

    expect(mockRequestGraphql).not.toHaveBeenCalled();
  });

  it('uses settings-driven radius and polling values when querying nearby stops', async () => {
    mockRequestGraphql.mockResolvedValueOnce({
      stopsByRadius: {
        edges: [
          {
            node: {
              distance: 22,
              stop: {
                gtfsId: 'HSL:1001',
                name: 'Central station',
                code: '1001',
                zoneId: 'A',
                lat: 60.17,
                lon: 24.94,
                vehicleMode: 'BUS',
                parentStation: null,
                patterns: [],
              },
            },
          },
        ],
      },
    });

    const screen = renderWithQueryClient(
      <NearbyStopsHarness coordinates={{ latitude: 60.1699, longitude: 24.9384 }} />
    );

    await waitFor(() => {
      expect(screen.getByText(JSON.stringify({ count: 1, status: 'success' }))).toBeTruthy();
    });

    expect(mockRequestGraphql).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        lat: 60.1699,
        lon: 24.9384,
        radius: 250,
      })
    );
  });

  it('uses the shared nearby query key contract for cache deduplication', async () => {
    mockRequestGraphql.mockResolvedValueOnce({
      stopsByRadius: {
        edges: [],
      },
    });

    renderWithQueryClient(
      <DualNearbyStopsHarness coordinates={{ latitude: 60.1699, longitude: 24.9384 }} />
    );

    await waitFor(() => {
      expect(mockRequestGraphql).toHaveBeenCalledTimes(1);
    });

    const [, variables] = mockRequestGraphql.mock.calls[0] ?? [];
    expect(queryKeys.stops.nearby({ lat: 60.1699, lon: 24.9384, radius: 250 })).toEqual([
      'stops',
      'nearby',
      { lat: 60.1699, lon: 24.9384, radius: 250 },
    ]);
    expect(variables).toEqual({
      lat: 60.1699,
      lon: 24.9384,
      radius: 250,
    });
  });

  it('shares a single location source and query request across multiple mounted consumers', async () => {
    mockRequestGraphql.mockResolvedValue({
      stopsByRadius: {
        edges: [],
      },
    });

    renderWithQueryClient(
      <>
        <SharedLocationNearbyStopsHarness />
        <SharedLocationNearbyStopsHarness />
      </>
    );

    await waitFor(() => {
      expect(mockRequestGraphql).toHaveBeenCalledTimes(1);
    });

    expect(expoLocation.getForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(expoLocation.getCurrentPositionAsync).toHaveBeenCalledTimes(1);
    expect(expoLocation.watchPositionAsync).toHaveBeenCalledTimes(1);
  });
});
