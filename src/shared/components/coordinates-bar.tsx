import { GlassView } from 'expo-glass-effect';
import React from 'react';
import { StyleSheet, Text } from 'react-native';

import { theme } from '@/shared/theme/theme';

export type CoordinatesBarProps = {
  latitude: number | null;
  longitude: number | null;
};

export function CoordinatesBar({ latitude, longitude }: CoordinatesBarProps) {
  const available = latitude !== null && longitude !== null;

  return (
    <GlassView glassEffectStyle={theme.glass.glassStyle} style={styles.container}>
      <Text style={styles.text}>
        {available ? `${latitude.toFixed(3)}°N, ${longitude.toFixed(3)}°E` : 'Location unavailable'}
      </Text>
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
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  text: {
    color: theme.colors.text.secondary,
    fontSize: theme.typography.sm.fontSize,
    fontWeight: theme.typography.sm.fontWeight,
  },
});
