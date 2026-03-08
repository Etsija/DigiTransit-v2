import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { buildStopHref } from '@/types/navigation';

const SAMPLE_STOP_ID = 'HSL:1234';

export default function MapScreen() {
  const router = useRouter();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.content}>
          <ThemedText type='subtitle'>Map</ThemedText>
          <ThemedText themeColor='textSecondary'>Map screen stub</ThemedText>
          <ThemedText>
            Navigation shell only for Story 1.3. Map data and interactions land in later stories.
          </ThemedText>

          <Pressable
            accessibilityRole='button'
            onPress={() => router.push(buildStopHref(SAMPLE_STOP_ID))}
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          >
            <ThemedText type='smallBold'>View sample departures</ThemedText>
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
