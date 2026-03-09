import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { TransportIcon } from '@/shared/icons';
import { theme, TransportMode } from '@/shared/theme/theme';

export type StopHeaderCardProps = {
  name: string;
  code: string;
  transportMode: TransportMode;
  distanceLabel?: string;
};

export function StopHeaderCard({
  name,
  code,
  transportMode,
  distanceLabel,
}: StopHeaderCardProps) {
  const transportColor = theme.colors.transport[transportMode];
  const accessibilityParts = [name, transportMode, 'stop', code];

  if (distanceLabel) {
    accessibilityParts.push(distanceLabel);
  }

  return (
    <View
      accessibilityRole='summary'
      accessibilityLabel={accessibilityParts.join(', ')}
      style={[
        styles.surface,
        {
          backgroundColor: `${transportColor}${Math.round(theme.glass.transportTintOpacity * 255)
            .toString(16)
            .padStart(2, '0')}`,
        },
      ]}
    >
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
        <TransportIcon mode={transportMode} size={18} color={theme.colors.text.primary} />
      </View>

      <View style={styles.textContainer}>
        <Text style={styles.nameText}>
          {name}
        </Text>
        <Text style={[styles.codeText, { color: transportColor }]}>{code}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  surface: {
    borderRadius: theme.radius.card,
    borderWidth: theme.borderWidth.subtle,
    borderColor: theme.colors.card.border,
    padding: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  iconBadge: {
    width: theme.glass.iconBadgeSizeLarge,
    height: theme.glass.iconBadgeSizeLarge,
    borderRadius: theme.glass.iconBadgeRadius,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  nameText: {
    color: theme.colors.text.primary,
    fontSize: theme.typography.heading.fontSize,
    fontWeight: theme.typography.heading.fontWeight,
  },
  codeText: {
    fontSize: theme.typography.sm.fontSize,
    fontWeight: '600',
  },
});
