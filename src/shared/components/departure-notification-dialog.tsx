import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/shared/theme/theme';

type IdleProps = {
  mode: 'idle';
  routeShortName: string;
  departureTime: string;
  onNotify: () => void;
  onDismiss: () => void;
  onCancel?: never;
};

type CancelProps = {
  mode: 'cancel';
  routeShortName: string;
  departureTime: string;
  onCancel: () => void;
  onDismiss: () => void;
  onNotify?: never;
};

export type DepartureNotificationDialogProps = IdleProps | CancelProps;

export function DepartureNotificationDialog(props: DepartureNotificationDialogProps) {
  const { mode, routeShortName, departureTime, onDismiss } = props;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.routeText}>{routeShortName}</Text>
        <Text style={styles.timeText}>{departureTime}</Text>
      </View>

      <View style={styles.actions}>
        {mode === 'idle' ? (
          <Pressable onPress={props.onNotify} style={styles.button} accessibilityRole='button'>
            <Text style={styles.buttonText}>Notify Me</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={props.onCancel}
            style={styles.cancelButton}
            accessibilityRole='button'
          >
            <Text style={styles.cancelButtonText}>Cancel Notification</Text>
          </Pressable>
        )}

        <Pressable onPress={onDismiss} style={styles.dismissButton} accessibilityRole='button'>
          <Text style={styles.dismissText}>Dismiss</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.card.bg,
    borderRadius: theme.radius.card,
    borderWidth: theme.borderWidth.subtle,
    borderColor: theme.colors.card.border,
    padding: theme.spacing.lg,
    gap: theme.spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  routeText: {
    color: theme.colors.text.primary,
    fontSize: theme.typography.lg.fontSize,
    fontWeight: theme.typography.lg.fontWeight,
  },
  timeText: {
    color: theme.colors.text.primary,
    fontSize: theme.typography.xl.fontSize,
    fontWeight: theme.typography.xl.fontWeight,
  },
  actions: {
    gap: theme.spacing.sm,
  },
  button: {
    backgroundColor: theme.colors.status.realtime,
    borderRadius: theme.radius.bar,
    padding: theme.spacing.md,
    alignItems: 'center',
    minHeight: theme.layout.minTouchTarget,
    justifyContent: 'center',
  },
  buttonText: {
    color: theme.colors.text.inverse,
    fontSize: theme.typography.base.fontSize,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: `${theme.colors.status.error}33`,
    borderRadius: theme.radius.bar,
    padding: theme.spacing.md,
    alignItems: 'center',
    minHeight: theme.layout.minTouchTarget,
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: theme.colors.status.error,
    fontSize: theme.typography.base.fontSize,
    fontWeight: '600',
  },
  dismissButton: {
    padding: theme.spacing.md,
    alignItems: 'center',
    minHeight: theme.layout.minTouchTarget,
    justifyContent: 'center',
  },
  dismissText: {
    color: theme.colors.text.secondary,
    fontSize: theme.typography.sm.fontSize,
  },
});
