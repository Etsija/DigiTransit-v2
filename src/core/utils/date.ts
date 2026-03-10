function padTimeUnit(value: number): string {
  return value.toString().padStart(2, '0');
}

export function formatServiceDayDepartureTime(
  serviceDay: number | null | undefined,
  departureSeconds: number | null | undefined
): string {
  if (serviceDay == null || departureSeconds == null) {
    return '--:--';
  }

  const departureDate = new Date((serviceDay + departureSeconds) * 1000);

  return `${padTimeUnit(departureDate.getHours())}:${padTimeUnit(departureDate.getMinutes())}`;
}
