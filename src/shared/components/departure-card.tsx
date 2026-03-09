import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '@/shared/icons';
import { StatusType, theme } from '@/shared/theme/theme';

export type DepartureCardProps = {
  routeShortName: string;
  headsign: string;
  departureTime: string;
  status: StatusType;
  notificationScheduled?: boolean;
  onPress?: () => void;
};

export function DepartureCard({
  routeShortName,
  headsign,
  departureTime,
  status,
  notificationScheduled = false,
  onPress,
}: DepartureCardProps) {
  const isRealtime = status === 'realtime';
  const borderColor = isRealtime ? theme.colors.status.realtime : theme.colors.status.estimated;
  const statusLabel = isRealtime ? 'Live GPS' : 'Scheduled';
  const content = (
    <View style={[styles.container, { borderLeftColor: borderColor }]}>
      <View style={styles.routeContainer}>
        <Text style={styles.routeText}>{routeShortName}</Text>
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.headsignText}>{headsign}</Text>
        <Text style={[styles.statusLabel, { color: borderColor }]}>
          {isRealtime ? '● Live GPS' : '~ Scheduled'}
        </Text>
      </View>

      <View style={styles.timeContainer}>
        {notificationScheduled ? (
          <View
            accessibilityLabel='Notification scheduled'
            accessibilityRole='image'
            style={styles.notificationBadge}
          >
            <AppIcon name='time-outline' size={12} color={theme.colors.status.estimated} />
          </View>
        ) : null}

        <Text style={[styles.timeText, isRealtime && styles.timeTextBold]}>{departureTime}</Text>
      </View>
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole='button'
        accessibilityLabel={`${departureTime}, route ${routeShortName} to ${headsign}, ${statusLabel}`}
        onPress={onPress}
        style={({ pressed }) => pressed && styles.pressed}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View
      accessibilityRole='summary'
      accessibilityLabel={`${departureTime}, route ${routeShortName} to ${headsign}, ${statusLabel}`}
    >
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    minHeight: theme.layout.minTouchTarget,
  },
  routeContainer: {
    minWidth: 40,
  },
  routeText: {
    color: theme.colors.text.primary,
    fontSize: theme.typography.sm.fontSize,
    fontWeight: '600',
  },
  infoContainer: {
    flex: 1,
    gap: theme.spacing.xs,
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
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
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
  pressed: {
    opacity: 0.7,
  },
});
