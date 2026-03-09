/**
 * Compatibility bridge — re-exports legacy token names from the canonical
 * design-system module at src/shared/theme/theme.ts.
 *
 * Existing imports (Colors, Spacing, Fonts, etc.) continue to work.
 * New code should import from '@/shared/theme/theme' directly.
 */

import '@/global.css';

import { Platform } from 'react-native';

import { theme } from '@/shared/theme/theme';

// Legacy Colors shape used by useTheme / ThemedView / ThemedText
export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = theme.fonts;

export const Spacing = {
  half: 2,
  one: theme.spacing.xs,
  two: theme.spacing.sm,
  three: theme.spacing.lg,
  four: theme.spacing.xl,
  five: theme.spacing['2xl'],
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = theme.layout.maxContentWidth;
