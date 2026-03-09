import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { theme } from '@/shared/theme/theme';
import { buildShowcaseHref } from '@/types/navigation';

export default function SettingsScreen() {
  const router = useRouter();
  const versionTapCountRef = React.useRef(0);
  const appVersion = Constants.expoConfig?.version ?? '0.0.0';

  const handleVersionPress = () => {
    if (!__DEV__) {
      return;
    }

    versionTapCountRef.current += 1;

    if (versionTapCountRef.current >= 5) {
      versionTapCountRef.current = 0;
      router.push(buildShowcaseHref());
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.content}>
          <ThemedText type='subtitle'>Settings</ThemedText>
          <ThemedText>
            Developer tooling stays hidden behind the app version in development builds.
          </ThemedText>
          <ThemedText themeColor='textSecondary'>
            Persisted settings work will continue here in later stories without changing the shell.
          </ThemedText>

          {__DEV__ ? (
            <Pressable
              accessibilityLabel={`App version ${appVersion}`}
              accessibilityRole='button'
              onPress={handleVersionPress}
              style={({ pressed }) => [styles.versionButton, pressed && styles.versionButtonPressed]}
            >
              <ThemedText themeColor='textSecondary' style={styles.versionText}>
                Version {appVersion}
              </ThemedText>
            </Pressable>
          ) : (
            <View accessibilityLabel={`App version ${appVersion}`} style={styles.versionButton}>
              <ThemedText themeColor='textSecondary' style={styles.versionText}>
                Version {appVersion}
              </ThemedText>
            </View>
          )}
        </ThemedView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: theme.colors.background,
  },
  safeArea: {
    flex: 1,
    width: '100%',
    paddingHorizontal: theme.spacing.lg,
  },
  content: {
    width: '100%',
    maxWidth: theme.layout.maxContentWidth,
    alignSelf: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: theme.spacing['2xl'],
    gap: theme.spacing.md,
  },
  versionButton: {
    marginTop: theme.spacing.lg,
    alignSelf: 'flex-start',
    minHeight: theme.layout.minTouchTarget,
    justifyContent: 'center',
    borderRadius: theme.radius.bar,
    borderWidth: theme.borderWidth.subtle,
    borderColor: theme.colors.card.border,
    backgroundColor: theme.colors.card.bg,
    paddingHorizontal: theme.spacing.md,
  },
  versionButtonPressed: {
    opacity: 0.7,
  },
  versionText: {
    fontSize: theme.typography.sm.fontSize,
  },
});
