import type { NearbyStop } from '@/features/stops/hooks/use-nearby-stops';

export function formatDistanceMeters(distanceMeters: number): string {
  return `${Math.round(distanceMeters)} m`;
}

export function formatZoneLabel(zoneId: string | null): string | undefined {
  return zoneId ? `Zone ${zoneId}` : undefined;
}

export function formatRoutePatternsLabel(routePatterns: NearbyStop['routePatterns']): string {
  return routePatterns
    .map((pattern) => pattern.label)
    .filter(Boolean)
    .join(', ');
}
