import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import type { StopRouteParams } from '@/types/navigation';

export default function StopDetailsScreen() {
  const { stopId } = useLocalSearchParams<StopRouteParams>();
  const router = useRouter();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.content}>
          <ThemedText type='subtitle'>Departures</ThemedText>
          <ThemedText themeColor='textSecondary'>Departures screen stub</ThemedText>
          <ThemedText>Stop ID: {stopId}</ThemedText>

          <Pressable
            accessibilityRole='button'
            onPress={() => router.back()}
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          >
            <ThemedText type='smallBold'>Back</ThemedText>
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
