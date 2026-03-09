import type { TransportMode } from '@/shared/theme/theme';

export const SHOWCASE_TRANSPORT_MODES: TransportMode[] = ['bus', 'tram', 'train', 'metro', 'ferry'];

export const showcaseHeaderStop = {
  name: 'Asema-aukio 1, Helsinki',
  code: 'HSL:1001',
  transportMode: 'bus' as const,
  distanceLabel: '120 m',
};

export const showcaseStopVariants = SHOWCASE_TRANSPORT_MODES.flatMap((transportMode, index) => [
  {
    key: `${transportMode}-unpinned`,
    label: 'Nearby',
    isPinned: false,
    name: {
      bus: 'Kamppi',
      tram: 'Lasipalatsi',
      train: 'Pasila',
      metro: 'Ruoholahti',
      ferry: 'Kauppatori',
    }[transportMode],
    code: `HSL:${1001 + index}`,
    transportMode,
    distanceLabel: `${120 + index * 35} m`,
  },
  {
    key: `${transportMode}-pinned`,
    label: 'Pinned',
    isPinned: true,
    name: {
      bus: 'Helsinki',
      tram: 'Ooppera',
      train: 'Tikkurila',
      metro: 'Hakaniemi',
      ferry: 'Suomenlinna',
    }[transportMode],
    code: `HSL:${2001 + index}`,
    transportMode,
    distanceLabel: `${75 + index * 20} m`,
  },
]);

export const showcaseDepartureVariants = [
  {
    key: 'realtime',
    label: 'Realtime',
    routeShortName: '7A',
    headsign: 'Kamppi',
    departureTime: '14:35',
    status: 'realtime' as const,
  },
  {
    key: 'estimated',
    label: 'Estimated',
    routeShortName: '550',
    headsign: 'Itakeskus',
    departureTime: '14:42',
    status: 'estimated' as const,
  },
  {
    key: 'notification-scheduled',
    label: 'Notification scheduled',
    routeShortName: '600',
    headsign: 'Helsinki Airport',
    departureTime: '14:51',
    status: 'realtime' as const,
    notificationScheduled: true,
  },
];

export const showcaseMarkerVariants = SHOWCASE_TRANSPORT_MODES.flatMap((transportMode) => [
  {
    key: `${transportMode}-normal`,
    label: `${transportMode[0].toUpperCase()}${transportMode.slice(1)} marker`,
    transportMode,
    size: 'base' as const,
  },
  {
    key: `${transportMode}-tapped`,
    label: `${transportMode[0].toUpperCase()}${transportMode.slice(1)} marker tapped`,
    transportMode,
    size: 'near' as const,
  },
]);

export const showcaseEmptyStates = [
  {
    key: 'gps-denied',
    title: 'Location access denied',
    message: 'Enable GPS permissions to show nearby stops.',
  },
  {
    key: 'no-stops',
    title: 'No stops in radius',
    message: 'Try a wider radius or move the map closer to transit.',
  },
];
