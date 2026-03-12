import { GlassView } from 'expo-glass-effect';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { theme } from '@/shared/theme/theme';

export type CoordinatesBarProps = {
  latitude: number | null;
  longitude: number | null;
  resolvedAddress?: string;
  isFixed?: boolean;
};

export function CoordinatesBar({
  latitude,
  longitude,
  resolvedAddress,
  isFixed = true,
}: CoordinatesBarProps) {
  const available = latitude !== null && longitude !== null;
  const coordinateLabel = available ? `${latitude.toFixed(3)}°N, ${longitude.toFixed(3)}°E` : null;
  const primaryLabel = available ? (resolvedAddress ?? 'Current location') : 'Location unavailable';
  const indicatorColor =
    available && isFixed ? theme.colors.status.realtime : theme.colors.text.muted;

  return (
    <GlassView glassEffectStyle={theme.glass.glassStyle} style={styles.container}>
      <View style={styles.overlayBase} />
      <View style={styles.overlayTop} />
      <View style={styles.overlayBottom} />

      <View className='flex-row items-center gap-3'>
        <View style={[styles.indicatorShell, { borderColor: `${indicatorColor}55` }]}>
          <View style={[styles.indicatorDot, { backgroundColor: indicatorColor }]} />
        </View>

        <View className='flex-1'>
          <Text style={styles.primaryText}>{primaryLabel}</Text>
          {coordinateLabel ? <Text style={styles.secondaryText}>{coordinateLabel}</Text> : null}
        </View>
      </View>
    </GlassView>
  );
}

const styles = StyleSheet.create({
  container: {
    height: theme.layout.coordinatesBarHeight,
    borderRadius: theme.radius.bar,
    borderWidth: 1,
    borderColor: theme.colors.card.border,
    backgroundColor: theme.colors.card.bg,
    overflow: 'hidden',
    paddingHorizontal: theme.spacing.lg,
    justifyContent: 'center',
  },
  overlayBase: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.card.bg,
  },
  overlayTop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.card.gradientTop,
    opacity: 0.28,
  },
  overlayBottom: {
    ...StyleSheet.absoluteFillObject,
    top: '40%',
    backgroundColor: theme.colors.card.gradientBottom,
    opacity: 0.42,
  },
  indicatorShell: {
    width: 20,
    height: 20,
    borderRadius: theme.radius.pill,
    borderWidth: theme.borderWidth.subtle,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  indicatorDot: {
    width: 8,
    height: 8,
    borderRadius: theme.radius.pill,
  },
  primaryText: {
    color: theme.colors.text.primary,
    fontSize: theme.typography.sm.fontSize,
    fontWeight: '600',
  },
  secondaryText: {
    color: theme.colors.text.secondary,
    fontSize: theme.typography.xs.fontSize,
    fontWeight: theme.typography.xs.fontWeight,
  },
});
