import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { TransportIcon } from '@/shared/icons';
import { theme, TransportMode } from '@/shared/theme/theme';

export type StopCardProps = {
  name: string;
  code: string;
  transportMode: TransportMode;
  distanceLabel?: string;
  onPress: () => void;
};

export function StopCard({ name, code, transportMode, distanceLabel, onPress }: StopCardProps) {
  const transportColor = theme.colors.transport[transportMode];
  const accessibilityParts = [name, transportMode, 'stop', code];

  if (distanceLabel) {
    accessibilityParts.push(distanceLabel);
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole='button'
      accessibilityLabel={accessibilityParts.join(', ')}
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
    >
      <View
        style={[
          styles.surface,
          {
            backgroundColor: `${transportColor}${Math.round(theme.glass.transportTintOpacity * 255)
              .toString(16)
              .padStart(2, '0')}`,
          },
        ]}
      >
        {/* Icon badge */}
        <View
          style={[
            styles.iconBadge,
            {
              backgroundColor: `${transportColor}${Math.round(theme.glass.iconBadgeBgOpacity * 255)
                .toString(16)
                .padStart(2, '0')}`,
            },
          ]}
        >
          <TransportIcon mode={transportMode} size={14} color={theme.colors.text.primary} />
        </View>

        {/* Stop code badge */}
        <View
          style={[
            styles.codeBadge,
            {
              backgroundColor: `${transportColor}${Math.round(theme.glass.codeBadgeBgOpacity * 255)
                .toString(16)
                .padStart(2, '0')}`,
            },
          ]}
        >
          <Text style={[styles.codeText, { color: transportColor }]}>{code}</Text>
        </View>

        {/* Stop name */}
        <Text style={styles.nameText}>
          {name}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: theme.layout.minTouchTarget,
  },
  surface: {
    borderRadius: theme.radius.card,
    borderWidth: theme.borderWidth.subtle,
    borderColor: theme.colors.card.border,
    padding: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    minHeight: theme.layout.minTouchTarget,
  },
  iconBadge: {
    width: theme.glass.iconBadgeSize,
    height: theme.glass.iconBadgeSize,
    borderRadius: theme.glass.iconBadgeRadius,
    justifyContent: 'center',
    alignItems: 'center',
  },
  codeBadge: {
    borderRadius: theme.radius.badge,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: theme.spacing.xs,
  },
  codeText: {
    fontSize: theme.typography.xs.fontSize,
    fontWeight: '600',
  },
  nameText: {
    flex: 1,
    color: theme.colors.text.primary,
    fontSize: theme.typography.lg.fontSize,
    fontWeight: theme.typography.lg.fontWeight,
  },
  pressed: {
    opacity: 0.7,
  },
});
