import { GlassView } from 'expo-glass-effect';
import React from 'react';
import { Pressable, StyleSheet, View, type ViewProps } from 'react-native';

import { theme } from '@/shared/theme/theme';

export type GlassCardProps = ViewProps & {
  onPress?: () => void;
  children: React.ReactNode;
};

export function GlassCard({ children, onPress, style, ...rest }: GlassCardProps) {
  const content = (
    <GlassView glassEffectStyle={theme.glass.glassStyle} style={[styles.surface, style]} {...rest}>
      <View style={styles.overlayBase} />
      <View style={styles.overlayTop} />
      <View style={styles.overlayBottom} />
      {children}
    </GlassView>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => pressed && styles.pressed}
        accessibilityRole={rest.accessibilityRole ?? 'button'}
        accessibilityLabel={rest.accessibilityLabel}
      >
        {content}
      </Pressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  surface: {
    borderRadius: theme.radius.card,
    borderWidth: theme.borderWidth.subtle,
    borderColor: theme.colors.card.border,
    backgroundColor: theme.colors.card.bg,
    overflow: 'hidden',
    minHeight: theme.layout.minTouchTarget,
  },
  overlayBase: {
    ...StyleSheet.absoluteFill,
    backgroundColor: theme.colors.card.bg,
  },
  overlayTop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: theme.colors.card.gradientTop,
    opacity: 0.35,
  },
  overlayBottom: {
    ...StyleSheet.absoluteFill,
    top: '45%',
    backgroundColor: theme.colors.card.gradientBottom,
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.7,
  },
});
