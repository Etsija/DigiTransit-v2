import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { SafeLinearGradient } from '@/shared/components/safe-linear-gradient';
import { TransportIcon } from '@/shared/icons';
import { theme, TransportMode } from '@/shared/theme/theme';

export type StopHeaderCardProps = {
  name: string;
  code: string;
  transportMode: TransportMode;
  distanceLabel?: string;
};

export function StopHeaderCard({ name, code, transportMode, distanceLabel }: StopHeaderCardProps) {
  const transportColor = theme.colors.transport[transportMode];
  const accessibilityParts = [name, transportMode, 'stop', code];
  const tintOpacity = Math.round(theme.glass.transportTintOpacity * 255)
    .toString(16)
    .padStart(2, '0');

  if (distanceLabel) {
    accessibilityParts.push(distanceLabel);
  }

  return (
    <View
      accessibilityRole='summary'
      accessibilityLabel={accessibilityParts.join(', ')}
      style={styles.surface}
    >
      <SafeLinearGradient
        colors={[
          `${transportColor}${tintOpacity}`,
          theme.colors.card.gradientTop,
          theme.colors.card.gradientBottom,
        ]}
        locations={[0, 0.55, 1]}
        start={{ x: 0.04, y: 0.08 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

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
        <Text style={styles.nameText}>{name}</Text>
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
    backgroundColor: theme.colors.card.bg,
    padding: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    overflow: 'hidden',
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
