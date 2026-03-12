import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useSettingsStore } from '@/core/store/settings.store';
import { departureReminderLeadTimeOptions } from '@/features/departures/utils/departure-reminders';
import { theme } from '@/shared/theme/theme';

type LeadTimeOption = {
  minutes: number;
  disabled?: boolean;
};

type IdleProps = {
  mode: 'idle';
  routeShortName: string;
  departureTime: string;
  onNotify: (minutes: number) => void;
  onDismiss: () => void;
  leadTimeOptions?: LeadTimeOption[];
  initialLeadTimeMinutes?: number;
  isSubmitting?: boolean;
  onCancel?: never;
};

type CancelProps = {
  mode: 'cancel';
  routeShortName: string;
  departureTime: string;
  onCancel: () => void;
  onDismiss: () => void;
  onLeadTimeChange?: never;
  onNotify?: never;
};

export type DepartureNotificationDialogProps = IdleProps | CancelProps;

export function DepartureNotificationDialog(props: DepartureNotificationDialogProps) {
  const { mode, routeShortName, departureTime, onDismiss } = props;
  const notificationLeadTimeMinutes = useSettingsStore(
    (state) => state.notificationLeadTimeMinutes
  );
  const leadTimeOptions: LeadTimeOption[] =
    mode === 'idle'
      ? (props.leadTimeOptions ?? departureReminderLeadTimeOptions.map((minutes) => ({ minutes })))
      : [];
  const largestEnabledLeadTime =
    [...leadTimeOptions].reverse().find((option) => !option.disabled)?.minutes ?? null;
  const resolvedInitialLeadTime =
    mode === 'idle'
      ? (props.initialLeadTimeMinutes ??
        (leadTimeOptions.some(
          (option) => option.minutes === notificationLeadTimeMinutes && !option.disabled
        )
          ? notificationLeadTimeMinutes
          : largestEnabledLeadTime))
      : null;
  const [selectedLeadTimeMinutes, setSelectedLeadTimeMinutes] = React.useState<number | null>(
    resolvedInitialLeadTime
  );
  const notifyDisabled =
    mode === 'idle' && (selectedLeadTimeMinutes === null || props.isSubmitting === true);

  React.useEffect(() => {
    if (mode === 'idle') {
      setSelectedLeadTimeMinutes(resolvedInitialLeadTime);
    }
  }, [mode, notificationLeadTimeMinutes, resolvedInitialLeadTime]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.routeText}>{routeShortName}</Text>
        <Text style={styles.timeText}>{departureTime}</Text>
      </View>

      {mode === 'idle' ? (
        <View style={styles.preferenceSection}>
          <Text style={styles.preferenceText}>
            {`Default alert: ${notificationLeadTimeMinutes} min before departure`}
          </Text>

          <View accessibilityRole='radiogroup' style={styles.optionRow}>
            {leadTimeOptions.map(({ minutes, disabled = false }) => {
              const selected = minutes === selectedLeadTimeMinutes;

              return (
                <Pressable
                  accessibilityLabel={`${minutes} minutes`}
                  accessibilityRole='radio'
                  accessibilityState={{ disabled, selected }}
                  disabled={disabled}
                  key={minutes}
                  onPress={() => setSelectedLeadTimeMinutes(minutes)}
                  style={[
                    styles.optionButton,
                    selected ? styles.optionButtonSelected : null,
                    disabled ? styles.optionButtonDisabled : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.optionButtonText,
                      selected ? styles.optionButtonTextSelected : null,
                      disabled ? styles.optionButtonTextDisabled : null,
                    ]}
                  >
                    {`${minutes} min`}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      <View style={styles.actions}>
        {mode === 'idle' ? (
          <Pressable
            accessibilityRole='button'
            accessibilityState={{ disabled: notifyDisabled }}
            disabled={notifyDisabled}
            onPress={() => {
              if (selectedLeadTimeMinutes !== null) {
                props.onNotify(selectedLeadTimeMinutes);
              }
            }}
            style={styles.button}
          >
            <Text style={styles.buttonText}>
              {props.isSubmitting ? 'Scheduling...' : 'Notify Me'}
            </Text>
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
  preferenceText: {
    color: theme.colors.text.secondary,
    fontSize: theme.typography.sm.fontSize,
  },
  preferenceSection: {
    gap: theme.spacing.sm,
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  optionButton: {
    minHeight: theme.layout.minTouchTarget,
    minWidth: theme.layout.minTouchTarget,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.bar,
    borderWidth: theme.borderWidth.subtle,
    borderColor: theme.colors.card.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionButtonSelected: {
    borderColor: theme.colors.status.realtime,
    backgroundColor: `${theme.colors.status.realtime}22`,
  },
  optionButtonDisabled: {
    opacity: 0.38,
  },
  optionButtonText: {
    color: theme.colors.text.primary,
    fontSize: theme.typography.sm.fontSize,
    fontWeight: '500',
  },
  optionButtonTextSelected: {
    color: theme.colors.status.realtime,
    fontWeight: '700',
  },
  optionButtonTextDisabled: {
    color: theme.colors.text.muted,
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
