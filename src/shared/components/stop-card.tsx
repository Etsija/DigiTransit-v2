import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SafeLinearGradient } from '@/shared/components/safe-linear-gradient';
import { AppIcon, TransportIcon } from '@/shared/icons';
import { theme, TransportMode } from '@/shared/theme/theme';

export type StopCardProps = {
  name: string;
  code?: string | null;
  transportMode?: TransportMode | null;
  distanceLabel?: string;
  zoneLabel?: string;
  routePatternsLabel?: string;
  secondaryLabel?: string;
  isPinned?: boolean;
  onPress: () => void;
  onLongPress?: () => void;
};

export function StopCard({
  name,
  code,
  transportMode,
  distanceLabel,
  zoneLabel,
  routePatternsLabel,
  secondaryLabel,
  isPinned = false,
  onPress,
  onLongPress,
}: StopCardProps) {
  const skipNextPressRef = React.useRef(false);
  const resetSkipPressTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const resolvedTransportMode = transportMode ?? 'bus';
  const transportColor = transportMode
    ? theme.colors.transport[transportMode]
    : theme.colors.text.secondary;
  const accessibilityParts = [name];

  if (transportMode) {
    accessibilityParts.push(transportMode);
  }

  accessibilityParts.push('stop', code ?? 'No code');
  const tintOpacity = Math.round(theme.glass.transportTintOpacity * 255)
    .toString(16)
    .padStart(2, '0');

  if (distanceLabel) {
    accessibilityParts.push(distanceLabel);
  }
  if (zoneLabel) {
    accessibilityParts.push(zoneLabel);
  }
  if (routePatternsLabel) {
    accessibilityParts.push(`routes ${routePatternsLabel}`);
  }
  if (isPinned) {
    accessibilityParts.push('home pinned');
  }

  const handleLongPress = () => {
    skipNextPressRef.current = true;
    onLongPress?.();
  };

  const handlePress = () => {
    if (skipNextPressRef.current) {
      skipNextPressRef.current = false;
      if (resetSkipPressTimeoutRef.current) {
        clearTimeout(resetSkipPressTimeoutRef.current);
        resetSkipPressTimeoutRef.current = null;
      }
      return;
    }

    onPress();
  };

  const handlePressOut = () => {
    if (!skipNextPressRef.current) {
      return;
    }

    if (resetSkipPressTimeoutRef.current) {
      clearTimeout(resetSkipPressTimeoutRef.current);
    }

    resetSkipPressTimeoutRef.current = setTimeout(() => {
      skipNextPressRef.current = false;
      resetSkipPressTimeoutRef.current = null;
    }, 0);
  };

  React.useEffect(() => {
    return () => {
      if (resetSkipPressTimeoutRef.current) {
        clearTimeout(resetSkipPressTimeoutRef.current);
      }
    };
  }, []);

  return (
    <Pressable
      onLongPress={handleLongPress}
      onPress={handlePress}
      onPressOut={handlePressOut}
      accessibilityRole='button'
      accessibilityLabel={accessibilityParts.join(', ')}
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
    >
      <View style={styles.surface}>
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

        <View style={styles.content}>
          <View
            style={[
              styles.iconBadge,
              {
                backgroundColor: `${transportColor}${Math.round(
                  theme.glass.iconBadgeBgOpacity * 255
                )
                  .toString(16)
                  .padStart(2, '0')}`,
              },
            ]}
          >
            <TransportIcon
              mode={resolvedTransportMode}
              size={14}
              color={theme.colors.text.primary}
            />
          </View>

          <View style={styles.textContent}>
            <View style={styles.nameRow}>
              <Text style={styles.nameText}>{name}</Text>
              {isPinned ? (
                <View
                  accessibilityLabel='Home stop pinned'
                  accessibilityRole='image'
                  style={styles.pinnedBadge}
                >
                  <AppIcon name='home' size={12} color={theme.colors.text.primary} />
                </View>
              ) : null}
            </View>
            {secondaryLabel ? <Text style={styles.metaText}>{secondaryLabel}</Text> : null}
            {distanceLabel || zoneLabel ? (
              <Text style={styles.metaText}>
                {[zoneLabel, distanceLabel].filter(Boolean).join(' • ')}
              </Text>
            ) : null}
            {routePatternsLabel ? <Text style={styles.routeText}>{routePatternsLabel}</Text> : null}
          </View>

          {code ? (
            <View
              style={[
                styles.codeBadge,
                {
                  backgroundColor: `${transportColor}${Math.round(
                    theme.glass.codeBadgeBgOpacity * 255
                  )
                    .toString(16)
                    .padStart(2, '0')}`,
                },
              ]}
            >
              <Text style={[styles.codeText, { color: transportColor }]}>{code}</Text>
            </View>
          ) : null}
        </View>
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
    backgroundColor: theme.colors.card.bg,
    padding: theme.spacing.md,
    minHeight: theme.layout.minTouchTarget,
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  iconBadge: {
    width: theme.glass.iconBadgeSize,
    height: theme.glass.iconBadgeSize,
    borderRadius: theme.glass.iconBadgeRadius,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContent: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  codeBadge: {
    borderRadius: theme.radius.badge,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: theme.spacing.xs,
    alignSelf: 'flex-start',
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
  pinnedBadge: {
    width: 22,
    height: 22,
    borderRadius: theme.radius.pill,
    borderWidth: theme.borderWidth.subtle,
    borderColor: `${theme.colors.status.realtime}44`,
    backgroundColor: `${theme.colors.status.realtime}22`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metaText: {
    color: theme.colors.text.secondary,
    fontSize: theme.typography.sm.fontSize,
    fontWeight: theme.typography.sm.fontWeight,
  },
  routeText: {
    color: theme.colors.text.primary,
    fontSize: theme.typography.sm.fontSize,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.7,
  },
});
