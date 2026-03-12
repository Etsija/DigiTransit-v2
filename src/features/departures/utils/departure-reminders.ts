import type { StopDeparture } from '@/features/departures/hooks/use-stop-departures';

type DepartureReminderIdentity = Pick<
  StopDeparture,
  'serviceDay' | 'scheduledDeparture' | 'routeShortName' | 'headsign'
> & {
  stopId: string;
};

type ReminderNotificationCopyInput = Pick<StopDeparture, 'routeShortName' | 'headsign'> & {
  leadTimeMinutes: number;
  stopName: string;
};

type ReminderFireDateInput = Pick<StopDeparture, 'serviceDay' | 'scheduledDeparture'> & {
  leadTimeMinutes: number;
  now?: Date;
};

export const departureReminderLeadTimeOptions = [5, 10, 15] as const;

export function buildDepartureReminderKey({
  stopId,
  serviceDay,
  scheduledDeparture,
  routeShortName,
  headsign,
}: DepartureReminderIdentity) {
  return `${stopId}::${serviceDay}::${scheduledDeparture}::${routeShortName}::${headsign}`;
}

export function resolveDepartureReminderFireDate({
  serviceDay,
  scheduledDeparture,
  leadTimeMinutes,
  now = new Date(),
}: ReminderFireDateInput) {
  const fireAtMs = (serviceDay + scheduledDeparture - leadTimeMinutes * 60) * 1000;

  if (fireAtMs <= now.getTime()) {
    return null;
  }

  return new Date(fireAtMs);
}

export function buildDepartureReminderNotificationBody({
  routeShortName,
  headsign,
  leadTimeMinutes,
  stopName,
}: ReminderNotificationCopyInput) {
  return `${routeShortName} to ${headsign} departs in ${leadTimeMinutes} min from ${stopName}`;
}

export function isDepartureReminderLeadTimeAvailable(input: ReminderFireDateInput) {
  return resolveDepartureReminderFireDate(input) !== null;
}
