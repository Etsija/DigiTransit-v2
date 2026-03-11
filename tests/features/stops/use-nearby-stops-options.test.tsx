/// <reference types="jest" />

import { useQuery } from '@tanstack/react-query';

import { useNearbyStops } from '@/features/stops/hooks/use-nearby-stops';

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
}));

jest.mock('@/core/store/settings.store', () => ({
  useSettingsStore: jest.fn(),
}));

jest.mock('@/core/api/graphql-client', () => ({
  requestGraphql: jest.fn(),
}));

describe('useNearbyStops query options', () => {
  const mockUseQuery = jest.mocked(useQuery);
  const { useSettingsStore } = jest.requireMock('@/core/store/settings.store') as {
    useSettingsStore: jest.Mock;
  };

  beforeEach(() => {
    mockUseQuery.mockReturnValue({
      data: [],
      status: 'success',
    } as never);

    useSettingsStore.mockImplementation(
      (
        selector: (state: {
          searchRadiusMeters: number;
          stopsPollingIntervalSeconds: number;
        }) => unknown
      ) =>
        selector({
          searchRadiusMeters: 500,
          stopsPollingIntervalSeconds: 45,
        })
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('forwards the configured stops polling interval to react-query', () => {
    useNearbyStops({
      coordinates: { latitude: 60.1699, longitude: 24.9384 },
    });

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        refetchInterval: 45_000,
      })
    );
  });
});
