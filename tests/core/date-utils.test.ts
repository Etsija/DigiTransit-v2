/// <reference types="jest" />

import { formatServiceDayDepartureTime } from '@/core/utils/date';

describe('formatServiceDayDepartureTime', () => {
  it('formats service day plus departure seconds as HH:MM in UTC time', () => {
    expect(formatServiceDayDepartureTime(1_710_028_800, 14 * 3600 + 35 * 60)).toBe('14:35');
  });

  it('handles departures that roll into the next day', () => {
    expect(formatServiceDayDepartureTime(1_710_028_800, 24 * 3600 + 5 * 60)).toBe('00:05');
  });
});
