export const queryKeys = {
  stops: {
    nearby: (params: { lat: number; lon: number; radius: number }) =>
      ['stops', 'nearby', params] as const,
  },
  departures: {
    stop: (stopId: string) => ['departures', 'stop', stopId] as const,
    progress: (
      stopId: string,
      params: {
        tripId: string;
        serviceDay: number;
        scheduledDeparture: number;
      }
    ) => ['departures', 'progress', stopId, params] as const,
  },
} as const;
