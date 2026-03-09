import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { theme } from '@/shared/theme/theme';

export type EmptyStateProps = {
  title: string;
  message: string;
};

export function EmptyState({ title, message }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing.sm,
    padding: theme.spacing.xl,
  },
  title: {
    color: theme.colors.text.primary,
    fontSize: theme.typography.lg.fontSize,
    fontWeight: theme.typography.lg.fontWeight,
  },
  message: {
    color: theme.colors.text.secondary,
    fontSize: theme.typography.base.fontSize,
    fontWeight: theme.typography.base.fontWeight,
    textAlign: 'center',
  },
});
