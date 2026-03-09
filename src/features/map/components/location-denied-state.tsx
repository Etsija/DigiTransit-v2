import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '@/shared/components/empty-state';
import { theme } from '@/shared/theme/theme';

type LocationDeniedStateProps = {
  onOpenSettings: () => void;
};

export function LocationDeniedState({ onOpenSettings }: LocationDeniedStateProps) {
  return (
    <View style={styles.container}>
      <EmptyState
        title='Location unavailable'
        message='Enable location access in your device settings to center the map on where you are.'
      />
      <Pressable
        accessibilityRole='button'
        accessibilityLabel='Open app settings'
        onPress={onOpenSettings}
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
      >
        <Text style={styles.buttonText}>Enable location in settings</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: theme.radius.card,
    borderWidth: theme.borderWidth.subtle,
    borderColor: theme.colors.card.border,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    overflow: 'hidden',
  },
  button: {
    minHeight: theme.layout.minTouchTarget,
    marginHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.xl,
    borderRadius: theme.radius.bar,
    backgroundColor: theme.colors.link.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonText: {
    color: theme.colors.text.primary,
    fontSize: theme.typography.base.fontSize,
    fontWeight: '600',
  },
});
