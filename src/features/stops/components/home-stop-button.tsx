import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { NearbyStop } from '@/features/stops/hooks/use-nearby-stops';
import { theme } from '@/shared/theme/theme';

type HomeStopButtonProps = {
  stop: Pick<NearbyStop, 'name'>;
  mode: 'pin' | 'unpin';
  onConfirm: () => void;
  onDismiss: () => void;
};

export function HomeStopButton({ stop, mode, onConfirm, onDismiss }: HomeStopButtonProps) {
  const isUnpinMode = mode === 'unpin';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{isUnpinMode ? 'Remove home stop' : 'Set home stop'}</Text>
        <Text style={styles.message}>
          {isUnpinMode
            ? `${stop.name} will no longer be used for quick access and alerts.`
            : `${stop.name} will be used for quick access and alerts.`}
        </Text>
      </View>

      <View style={styles.actions}>
        <Pressable onPress={onConfirm} style={styles.primaryButton} accessibilityRole='button'>
          <Text style={styles.primaryButtonText}>
            {isUnpinMode ? 'Unpin home stop' : 'Pin as home stop'}
          </Text>
        </Pressable>

        <Pressable onPress={onDismiss} style={styles.dismissButton} accessibilityRole='button'>
          <Text style={styles.dismissText}>Cancel</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: theme.radius.card,
    borderWidth: theme.borderWidth.subtle,
    borderColor: theme.colors.card.border,
    backgroundColor: theme.colors.card.bg,
    padding: theme.spacing.md,
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  header: {
    gap: theme.spacing.xs,
  },
  title: {
    color: theme.colors.text.primary,
    fontSize: theme.typography.base.fontSize,
    fontWeight: '700',
  },
  message: {
    color: theme.colors.text.secondary,
    fontSize: theme.typography.sm.fontSize,
    fontWeight: theme.typography.sm.fontWeight,
  },
  actions: {
    gap: theme.spacing.sm,
  },
  primaryButton: {
    backgroundColor: theme.colors.status.realtime,
    borderRadius: theme.radius.bar,
    minHeight: theme.layout.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.md,
  },
  primaryButtonText: {
    color: theme.colors.text.inverse,
    fontSize: theme.typography.base.fontSize,
    fontWeight: '600',
  },
  dismissButton: {
    minHeight: theme.layout.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.sm,
  },
  dismissText: {
    color: theme.colors.text.secondary,
    fontSize: theme.typography.sm.fontSize,
    fontWeight: theme.typography.sm.fontWeight,
  },
});
