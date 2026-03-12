/// <reference types="jest" />

import { act, renderHook } from '@testing-library/react-native';

import { useReverseGeocode } from '@/features/map/hooks/use-reverse-geocode';

jest.mock('expo-location', () => ({
  reverseGeocodeAsync: jest.fn(),
}));

const { reverseGeocodeAsync } = jest.requireMock('expo-location') as {
  reverseGeocodeAsync: jest.Mock;
};

type Coordinates = { latitude: number; longitude: number } | null;

describe('useReverseGeocode', () => {
  let dateNowSpy: jest.SpyInstance<number, []>;

  beforeEach(() => {
    jest.clearAllMocks();
    dateNowSpy = jest.spyOn(Date, 'now').mockReturnValue(1_000);
  });

  afterEach(() => {
    dateNowSpy.mockRestore();
  });

  it('returns undefined when coordinates are null', () => {
    const { result } = renderHook(() => useReverseGeocode(null));

    expect(result.current.address).toBeUndefined();
    expect(reverseGeocodeAsync).not.toHaveBeenCalled();
  });

  it('resolves a formatted address from reverse geocoding', async () => {
    reverseGeocodeAsync.mockResolvedValueOnce([
      { street: 'Mannerheimintie', streetNumber: '5', city: 'Helsinki', name: null },
    ]);

    const { result } = renderHook(() => useReverseGeocode({ latitude: 60.17, longitude: 24.94 }));

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.address).toBe('Mannerheimintie 5, Helsinki');
  });

  it('formats address without street number', async () => {
    reverseGeocodeAsync.mockResolvedValueOnce([
      { street: 'Aleksanterinkatu', streetNumber: null, city: 'Helsinki', name: null },
    ]);

    const { result } = renderHook(() => useReverseGeocode({ latitude: 60.17, longitude: 24.94 }));

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.address).toBe('Aleksanterinkatu, Helsinki');
  });

  it('falls back to name when street and city are unavailable', async () => {
    reverseGeocodeAsync.mockResolvedValueOnce([
      { street: null, streetNumber: null, city: null, name: 'Suomenlinna' },
    ]);

    const { result } = renderHook(() => useReverseGeocode({ latitude: 60.14, longitude: 24.98 }));

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.address).toBe('Suomenlinna');
  });

  it('falls back to undefined when geocoding returns empty results', async () => {
    reverseGeocodeAsync.mockResolvedValueOnce([]);

    const { result } = renderHook(() => useReverseGeocode({ latitude: 60.17, longitude: 24.94 }));

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.address).toBeUndefined();
  });

  it('falls back to undefined when geocoding fails', async () => {
    reverseGeocodeAsync.mockResolvedValueOnce([
      { street: 'Esplanadi', streetNumber: '1', city: 'Helsinki', name: null },
    ]);

    const { result, rerender } = renderHook(
      (props: { coords: Coordinates }) => useReverseGeocode(props.coords),
      { initialProps: { coords: { latitude: 60.17, longitude: 24.94 } as Coordinates } }
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.address).toBe('Esplanadi 1, Helsinki');

    dateNowSpy.mockReturnValue(7_000);
    reverseGeocodeAsync.mockRejectedValueOnce(new Error('Network error'));

    rerender({ coords: { latitude: 61.0, longitude: 25.0 } });

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.address).toBeUndefined();
  });

  it('throttles repeated reverse-geocode attempts after a failure', async () => {
    reverseGeocodeAsync.mockRejectedValueOnce(new Error('Network error'));

    const { rerender } = renderHook(
      (props: { coords: Coordinates }) => useReverseGeocode(props.coords),
      { initialProps: { coords: { latitude: 60.17, longitude: 24.94 } as Coordinates } }
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(reverseGeocodeAsync).toHaveBeenCalledTimes(1);

    dateNowSpy.mockReturnValue(2_000);
    rerender({ coords: { latitude: 60.1701, longitude: 24.9401 } });

    await act(async () => {
      await Promise.resolve();
    });

    expect(reverseGeocodeAsync).toHaveBeenCalledTimes(1);
  });

  it('clears address when coordinates become null', async () => {
    reverseGeocodeAsync.mockResolvedValueOnce([
      { street: 'Kaivokatu', streetNumber: '2', city: 'Helsinki', name: null },
    ]);

    const { result, rerender } = renderHook(
      (props: { coords: Coordinates }) => useReverseGeocode(props.coords),
      { initialProps: { coords: { latitude: 60.17, longitude: 24.94 } as Coordinates } }
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.address).toBe('Kaivokatu 2, Helsinki');

    rerender({ coords: null });

    expect(result.current.address).toBeUndefined();
  });
});
