import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '@/shared/icons';
import { StatusType, theme } from '@/shared/theme/theme';

export type DepartureCardProps = {
  routeShortName: string;
  headsign: string;
  departureTime: string;
  departureEpochSeconds: number;
  status: StatusType;
  accessibilityLabel?: string;
  notificationScheduled?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
};

function formatTimeToDeparture(departureEpochSeconds: number, nowMs: number): string {
  const secondsRemaining = departureEpochSeconds - Math.floor(nowMs / 1000);

  if (secondsRemaining <= 0) {
    return 'Due';
  }

  if (secondsRemaining < 60) {
    return '<1 min';
  }

  return `${Math.floor(secondsRemaining / 60)} min`;
}

export function DepartureCard({
  routeShortName,
  headsign,
  departureTime,
  departureEpochSeconds,
  status,
  accessibilityLabel,
  notificationScheduled = false,
  onPress,
  onLongPress,
}: DepartureCardProps) {
  const isRealtime = status === 'realtime';
  const borderColor = isRealtime ? theme.colors.status.realtime : theme.colors.status.estimated;
  const statusLabel = isRealtime ? 'Live GPS' : 'Scheduled';
  const [timeToDeparture, setTimeToDeparture] = React.useState(() =>
    formatTimeToDeparture(departureEpochSeconds, Date.now())
  );

  React.useEffect(() => {
    setTimeToDeparture(formatTimeToDeparture(departureEpochSeconds, Date.now()));

    const interval = setInterval(() => {
      setTimeToDeparture(formatTimeToDeparture(departureEpochSeconds, Date.now()));
    }, 30_000);

    return () => {
      clearInterval(interval);
    };
  }, [departureEpochSeconds]);

  const resolvedAccessibilityLabel =
    accessibilityLabel ??
    `${departureTime}, route ${routeShortName} to ${headsign}, ${statusLabel}`;
  const content = (
    <View
      className='min-h-11 flex-row items-center gap-2'
      style={[styles.container, { borderLeftColor: borderColor }]}
      testID='departure-card-surface'
    >
      <View className='min-w-10'>
        <Text style={styles.routeText}>{routeShortName}</Text>
      </View>

      <View className='flex-1 gap-1'>
        <Text style={styles.headsignText}>{headsign}</Text>
        <Text style={[styles.statusLabel, { color: borderColor }]}>
          {isRealtime ? '● Live GPS' : '~ Scheduled'}
        </Text>
      </View>

      <View className='flex-row items-center gap-2'>
        {notificationScheduled ? (
          <View
            accessibilityLabel='Notification scheduled'
            accessibilityRole='image'
            style={styles.notificationBadge}
          >
            <AppIcon name='time-outline' size={12} color={theme.colors.status.estimated} />
          </View>
        ) : null}

        <View className='items-end gap-1'>
          <Text style={[styles.timeText, isRealtime && styles.timeTextBold]}>{departureTime}</Text>
          <Text style={styles.timeToDepartureText}>{timeToDeparture}</Text>
        </View>
      </View>
    </View>
  );

  if (onPress || onLongPress) {
    return (
      <Pressable
        accessibilityRole='button'
        accessibilityLabel={resolvedAccessibilityLabel}
        onPress={onPress}
        onLongPress={onLongPress}
        style={({ pressed }) => pressed && styles.pressed}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View accessibilityRole='summary' accessibilityLabel={resolvedAccessibilityLabel}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.card.bg,
    borderRadius: theme.radius.card,
    borderWidth: theme.borderWidth.subtle,
    borderColor: theme.colors.card.border,
    borderLeftWidth: theme.borderWidth.statusAccent,
    padding: theme.spacing.md,
  },
  routeText: {
    color: theme.colors.text.primary,
    fontSize: theme.typography.sm.fontSize,
    fontWeight: '600',
  },
  headsignText: {
    color: theme.colors.text.primary,
    fontSize: theme.typography.base.fontSize,
    fontWeight: theme.typography.base.fontWeight,
  },
  statusLabel: {
    fontSize: theme.typography.xs.fontSize,
    fontWeight: theme.typography.xs.fontWeight,
  },
  notificationBadge: {
    width: 24,
    height: 24,
    borderRadius: theme.radius.pill,
    borderWidth: theme.borderWidth.subtle,
    borderColor: `${theme.colors.status.estimated}44`,
    backgroundColor: `${theme.colors.status.estimated}18`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeText: {
    color: theme.colors.text.primary,
    fontSize: theme.typography.xl.fontSize,
    fontWeight: theme.typography.base.fontWeight,
  },
  timeTextBold: {
    fontWeight: theme.typography.xl.fontWeight,
  },
  timeToDepartureText: {
    color: theme.colors.text.secondary,
    fontSize: theme.typography.sm.fontSize,
    fontWeight: theme.typography.sm.fontWeight,
  },
  pressed: {
    opacity: 0.7,
  },
});
