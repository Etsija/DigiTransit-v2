/// <reference types="jest" />

import { formatServiceDayDepartureTime } from '@/core/utils/date';

describe('formatServiceDayDepartureTime', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('formats service day plus departure seconds using local device time', () => {
    jest.spyOn(Date.prototype, 'getHours').mockReturnValue(14);
    jest.spyOn(Date.prototype, 'getMinutes').mockReturnValue(35);
    jest.spyOn(Date.prototype, 'getUTCHours').mockReturnValue(12);
    jest.spyOn(Date.prototype, 'getUTCMinutes').mockReturnValue(35);

    expect(formatServiceDayDepartureTime(1_710_028_800, 14 * 3600 + 35 * 60)).toBe('14:35');
  });

  it('handles departures that roll into the next day in local time', () => {
    jest.spyOn(Date.prototype, 'getHours').mockReturnValue(0);
    jest.spyOn(Date.prototype, 'getMinutes').mockReturnValue(5);

    expect(formatServiceDayDepartureTime(1_710_028_800, 24 * 3600 + 5 * 60)).toBe('00:05');
  });
});
