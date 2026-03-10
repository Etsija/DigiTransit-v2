import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '@/shared/components/empty-state';
import { theme } from '@/shared/theme/theme';

type LocationDeniedStateProps = {
  canRequestAgain?: boolean;
  message?: string;
  onOpenSettings: () => void;
  onRequestPermission?: () => void;
};

export function LocationDeniedState({
  canRequestAgain = false,
  message = 'Enable location access in your device settings to center the map on where you are.',
  onOpenSettings,
  onRequestPermission,
}: LocationDeniedStateProps) {
  const buttonLabel = canRequestAgain ? 'Allow location access' : 'Enable location in settings';
  const accessibilityLabel = canRequestAgain ? 'Request location permission' : 'Open app settings';
  const onPress = canRequestAgain && onRequestPermission ? onRequestPermission : onOpenSettings;

  return (
    <View style={styles.container}>
      <EmptyState title='Location unavailable' message={message} />
      <Pressable
        accessibilityRole='button'
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
      >
        <Text style={styles.buttonText}>{buttonLabel}</Text>
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
    marginBottom: theme.layout.tabBarHeight + theme.spacing.xl,
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
