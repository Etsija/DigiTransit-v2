/// <reference types="jest" />

import {
  buildDepartureReminderKey,
  buildDepartureReminderNotificationBody,
  isDepartureReminderLeadTimeAvailable,
  resolveDepartureReminderFireDate,
} from '@/features/departures/utils/departure-reminders';

describe('departure reminder helpers', () => {
  it('builds a deterministic reminder key from the stop and departure identity', () => {
    expect(
      buildDepartureReminderKey({
        stopId: 'HSL:1001',
        serviceDay: 1_700_000_000,
        scheduledDeparture: 120,
        routeShortName: '4',
        headsign: 'Munkkiniemi',
      })
    ).toBe('HSL:1001::1700000000::120::4::Munkkiniemi');
  });

  it('computes the fire date from scheduled departure minus lead time', () => {
    expect(
      resolveDepartureReminderFireDate({
        serviceDay: 1_700_000_000,
        scheduledDeparture: 3_600,
        leadTimeMinutes: 10,
        now: new Date((1_700_000_000 + 60) * 1000),
      })
    ).toEqual(new Date((1_700_000_000 + 3_600 - 600) * 1000));
  });

  it('rejects reminder times that are already in the past', () => {
    expect(
      resolveDepartureReminderFireDate({
        serviceDay: 1_700_000_000,
        scheduledDeparture: 3_600,
        leadTimeMinutes: 10,
        now: new Date((1_700_000_000 + 3_100) * 1000),
      })
    ).toBeNull();
  });

  it('reports lead times as unavailable once their trigger time is in the past', () => {
    expect(
      isDepartureReminderLeadTimeAvailable({
        serviceDay: 1_700_000_000,
        scheduledDeparture: 600,
        leadTimeMinutes: 15,
        now: new Date((1_700_000_000 + 601) * 1000),
      })
    ).toBe(false);
  });

  it('builds the scheduled reminder body from departure and stop context', () => {
    expect(
      buildDepartureReminderNotificationBody({
        routeShortName: '4',
        headsign: 'Munkkiniemi',
        leadTimeMinutes: 5,
        stopName: 'Central station',
      })
    ).toBe('4 to Munkkiniemi departs in 5 min from Central station');
  });
});
