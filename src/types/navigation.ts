import type { Href } from 'expo-router';

export const TAB_ROUTES = [
  { key: 'map', label: 'Map', href: '/map' },
  { key: 'stops', label: 'Stops', href: '/stops' },
  { key: 'settings', label: 'Settings', href: '/settings' },
] as const;

export type TabRoute = (typeof TAB_ROUTES)[number];
export type TabRouteHref = TabRoute['href'];

export type StopRouteParams = {
  stopId: string;
};

export type StopRouteHref = Extract<Href, { pathname: '/stop/[stopId]' }>;

export function isPrimaryTabPath(pathname: string | null | undefined): pathname is TabRouteHref {
  return TAB_ROUTES.some((route) => route.href === pathname);
}

export function buildStopHref(stopId: string): StopRouteHref {
  return {
    pathname: '/stop/[stopId]',
    params: { stopId },
  };
}
