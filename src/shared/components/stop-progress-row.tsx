import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { theme } from '@/shared/theme/theme';

export type StopProgressRowProps = {
  stopCode: string;
  stopName: string;
  state: 'upcoming' | 'arriving' | 'passed';
};

function resolveAccentColor(state: StopProgressRowProps['state']) {
  if (state === 'arriving') {
    return theme.colors.status.realtime;
  }

  if (state === 'passed') {
    return theme.colors.text.muted;
  }

  return theme.colors.status.estimated;
}

export function StopProgressRow({ stopCode, stopName, state }: StopProgressRowProps) {
  const accentColor = resolveAccentColor(state);

  return (
    <View
      accessibilityLabel={`${stopCode} ${stopName}, ${state}`}
      style={[styles.container, { borderLeftColor: accentColor }]}
      testID={`stop-progress-row-${state}`}
    >
      <Text style={styles.label}>
        <Text style={styles.stopCode}>{stopCode}</Text>
        <Text>{` ${stopName}`}</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 32,
    justifyContent: 'center',
    borderRadius: theme.radius.bar,
    borderWidth: theme.borderWidth.subtle,
    borderColor: theme.colors.card.border,
    borderLeftWidth: theme.borderWidth.statusAccent,
    backgroundColor: theme.colors.card.bg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  label: {
    color: theme.colors.text.primary,
    fontSize: theme.typography.sm.fontSize,
    fontWeight: theme.typography.sm.fontWeight,
  },
  stopCode: {
    fontWeight: '700',
  },
});
