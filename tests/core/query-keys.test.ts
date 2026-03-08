/// <reference types="jest" />

import { queryKeys } from '@/core/api/query-keys';

describe('queryKeys', () => {
  it('builds a stable nearby stops key', () => {
    expect(queryKeys.stops.nearby({ lat: 60.17, lon: 24.94, radius: 500 })).toEqual([
      'stops',
      'nearby',
      { lat: 60.17, lon: 24.94, radius: 500 },
    ]);
  });

  it('builds a stable stop departures key', () => {
    expect(queryKeys.departures.stop('HSL:1234')).toEqual(['departures', 'stop', 'HSL:1234']);
  });
});
