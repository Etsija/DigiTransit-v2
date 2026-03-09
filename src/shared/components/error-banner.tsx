import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { theme } from '@/shared/theme/theme';

export type ErrorBannerProps = {
  message: string;
};

export function ErrorBanner({ message }: ErrorBannerProps) {
  return (
    <View style={styles.container} accessibilityRole='alert' accessibilityLiveRegion='polite'>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: `${theme.colors.status.error}22`,
    borderRadius: theme.radius.bar,
    borderWidth: theme.borderWidth.subtle,
    borderColor: `${theme.colors.status.error}44`,
    padding: theme.spacing.md,
  },
  text: {
    color: theme.colors.status.error,
    fontSize: theme.typography.sm.fontSize,
    fontWeight: '500',
  },
});
