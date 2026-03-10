import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { SafeLinearGradient } from '@/shared/components/safe-linear-gradient';
import { TransportIcon } from '@/shared/icons';
import { theme, TransportMode } from '@/shared/theme/theme';

export type StopHeaderCardProps = {
  name: string;
  code?: string | null;
  transportMode?: TransportMode | null;
  zoneLabel?: string | null;
  directionLabel?: string | null;
  patternLabels?: string[];
};

export function StopHeaderCard({
  name,
  code,
  transportMode,
  zoneLabel,
  directionLabel,
  patternLabels = [],
}: StopHeaderCardProps) {
  const resolvedTransportMode = transportMode ?? 'bus';
  const transportColor = theme.colors.transport[resolvedTransportMode];
  const accessibilityParts = [name, resolvedTransportMode, 'stop', code];
  const tintOpacity = Math.round(theme.glass.transportTintOpacity * 255)
    .toString(16)
    .padStart(2, '0');

  if (zoneLabel) {
    accessibilityParts.push(zoneLabel);
  }

  if (directionLabel) {
    accessibilityParts.push(`towards ${directionLabel}`);
  }

  if (patternLabels.length > 0) {
    accessibilityParts.push(`patterns ${patternLabels.join(', ')}`);
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

      <View style={styles.textContainer}>
        <View style={styles.titleRow}>
          <View
            style={[
              styles.inlineIconBadge,
              {
                backgroundColor: `${transportColor}${Math.round(theme.glass.iconBadgeBgOpacity * 255)
                  .toString(16)
                  .padStart(2, '0')}`,
              },
            ]}
          >
            <TransportIcon
              mode={resolvedTransportMode}
              size={16}
              color={theme.colors.text.primary}
            />
          </View>
          <Text style={styles.nameText}>{name}</Text>
        </View>
        {directionLabel ? <Text style={styles.directionText}>{`-> ${directionLabel}`}</Text> : null}
        <View style={styles.metaRow}>
          {code ? <Text style={[styles.codeText, { color: transportColor }]}>{code}</Text> : null}
          {zoneLabel ? <Text style={styles.zoneText}>{zoneLabel}</Text> : null}
        </View>
        {patternLabels.length > 0 ? (
          <View style={styles.patternsBlock}>
            <Text style={styles.patternsLabel}>Patterns via this stop:</Text>
            {patternLabels.map((patternLabel) => (
              <Text key={patternLabel} style={styles.patternText}>
                {patternLabel}
              </Text>
            ))}
          </View>
        ) : null}
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
    flexDirection: 'column',
    alignItems: 'stretch',
    overflow: 'hidden',
  },
  textContainer: {
    width: '100%',
    gap: theme.spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    width: '100%',
  },
  inlineIconBadge: {
    width: 24,
    height: 24,
    borderRadius: theme.radius.pill,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  nameText: {
    color: theme.colors.text.primary,
    fontSize: theme.typography.heading.fontSize,
    fontWeight: theme.typography.heading.fontWeight,
    flex: 1,
    flexShrink: 1,
  },
  directionText: {
    color: theme.colors.text.secondary,
    fontSize: theme.typography.base.fontSize,
    fontStyle: 'italic',
    fontWeight: theme.typography.base.fontWeight,
  },
  codeText: {
    fontSize: theme.typography.sm.fontSize,
    fontWeight: '600',
  },
  zoneText: {
    color: theme.colors.text.secondary,
    fontSize: theme.typography.sm.fontSize,
    fontWeight: theme.typography.sm.fontWeight,
  },
  patternsBlock: {
    gap: theme.spacing.xs,
  },
  patternsLabel: {
    color: theme.colors.text.secondary,
    fontSize: theme.typography.sm.fontSize,
    fontWeight: theme.typography.sm.fontWeight,
  },
  patternText: {
    color: theme.colors.text.secondary,
    fontSize: theme.typography.sm.fontSize,
    fontWeight: theme.typography.sm.fontWeight,
  },
});
