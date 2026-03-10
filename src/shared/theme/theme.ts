/**
 * Design System Token Source of Truth
 *
 * All colour, spacing, typography, radius, layout, and surface tokens live here.
 * Components MUST reference these tokens — no hardcoded design values.
 */

import { Platform } from 'react-native';

// ---------------------------------------------------------------------------
// Colors
// ---------------------------------------------------------------------------

const colors = {
  text: {
    primary: '#F1F5F9',
    secondary: '#94A3B8',
    muted: '#64748B',
    inverse: '#000000',
  },

  link: {
    primary: '#3B82F6',
  },

  transport: {
    bus: '#3B82F6',
    tram: '#22C55E',
    train: '#A855F7',
    metro: '#F97316',
    ferry: '#06B6D4',
  },

  status: {
    realtime: '#4ADE80',
    estimated: '#FBBF24',
    error: '#F87171',
    homeStop: '#F43F5E',
  },

  card: {
    bg: 'rgba(18, 20, 26, 0.78)',
    gradientTop: 'rgba(30, 33, 42, 0.82)',
    gradientBottom: 'rgba(12, 14, 19, 0.88)',
    border: 'rgba(255, 255, 255, 0.10)',
  },

  background: '#000000',
} as const;

// ---------------------------------------------------------------------------
// Typography
// ---------------------------------------------------------------------------

type TypographyToken = {
  fontSize: number;
  fontWeight: '400' | '500' | '600' | '700';
  lineHeight?: number;
};

const typography = {
  xs: { fontSize: 11, fontWeight: '400' as const },
  sm: { fontSize: 13, fontWeight: '400' as const },
  base: { fontSize: 15, fontWeight: '400' as const },
  lg: { fontSize: 17, fontWeight: '600' as const },
  xl: { fontSize: 20, fontWeight: '700' as const },
  '2xl': { fontSize: 28, fontWeight: '700' as const },
  heading: { fontSize: 22, fontWeight: '600' as const },
} satisfies Record<string, TypographyToken>;

// ---------------------------------------------------------------------------
// Spacing (4px base unit)
// ---------------------------------------------------------------------------

const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
} as const;

// ---------------------------------------------------------------------------
// Border Radius
// ---------------------------------------------------------------------------

const radius = {
  card: 16,
  bar: 12,
  badge: 6,
  pill: 999,
} as const;

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

const layout = {
  screenPadding: 16,
  coordinatesBarHeight: 44,
  tabBarHeight: 64,
  cardListGap: 12,
  minTouchTarget: 44,
  markerSizeBase: 28,
  markerSizeNear: 44,
  maxContentWidth: 800,
} as const;

const borderWidth = {
  subtle: 1,
  marker: 2,
  statusAccent: 3,
} as const;

// ---------------------------------------------------------------------------
// Glass / Blur
// ---------------------------------------------------------------------------

const glass = {
  blurIntensity: 18,
  glassStyle: 'regular' as const,
  /** Transport colour tint opacity for StopCard C+D treatment */
  transportTintOpacity: 0.11,
  /** Icon badge background opacity */
  iconBadgeBgOpacity: 0.25,
  /** Stop code badge background opacity */
  codeBadgeBgOpacity: 0.22,
  /** Icon badge size */
  iconBadgeSize: 22,
  /** Large icon badge size for expanded cards */
  iconBadgeSizeLarge: 32,
  /** Icon badge border radius */
  iconBadgeRadius: 5,
} as const;

// ---------------------------------------------------------------------------
// Fonts (platform-specific)
// ---------------------------------------------------------------------------

const fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
})!;

// ---------------------------------------------------------------------------
// Composed theme export
// ---------------------------------------------------------------------------

export const theme = {
  colors,
  typography,
  spacing,
  radius,
  layout,
  borderWidth,
  glass,
  fonts,
} as const;

export type TransportMode = keyof typeof colors.transport;
export type StatusType = 'realtime' | 'estimated' | 'homeStop';
