import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { buildStopHref } from '@/types/navigation';

const SAMPLE_STOP_ID = 'HSL:1234';

export default function StopsScreen() {
  const router = useRouter();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.content}>
          <ThemedText type='subtitle'>Stops</ThemedText>
          <ThemedText themeColor='textSecondary'>Stops screen stub</ThemedText>
          <ThemedText>
            Stops list, nearby logic, and real stop content are intentionally deferred beyond this
            navigation-shell story.
          </ThemedText>

          <Pressable
            accessibilityRole='button'
            onPress={() => router.push(buildStopHref(SAMPLE_STOP_ID))}
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          >
            <ThemedText type='smallBold'>Open sample stop</ThemedText>
          </Pressable>
        </ThemedView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    flexDirection: 'row',
  },
  safeArea: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.four,
    borderRadius: Spacing.four,
    gap: Spacing.three,
  },
  button: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
  },
  buttonPressed: {
    opacity: 0.7,
  },
});
