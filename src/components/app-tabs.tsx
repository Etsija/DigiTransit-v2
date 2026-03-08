import { Stack, usePathname, useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { BottomTabInset, Spacing } from '@/constants/theme';
import { isPrimaryTabPath, TAB_ROUTES } from '@/types/navigation';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

export default function AppTabs() {
  const pathname = usePathname();
  const router = useRouter();

  const showTabBar = isPrimaryTabPath(pathname);

  return (
    <View style={styles.container}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name='index' />
        <Stack.Screen name='map' />
        <Stack.Screen name='stops' />
        <Stack.Screen name='settings' />
        <Stack.Screen name='stop/[stopId]' />
      </Stack>

      {showTabBar ? (
        <ThemedView type='backgroundElement' style={styles.tabBar}>
          {TAB_ROUTES.map((route) => {
            const isActive = pathname === route.href;

            return (
              <Pressable
                key={route.key}
                accessibilityRole='button'
                onPress={() => router.replace(route.href)}
                style={({ pressed }) => [styles.button, pressed && styles.pressed]}
              >
                <ThemedView
                  type={isActive ? 'backgroundSelected' : 'backgroundElement'}
                  style={styles.buttonInner}
                >
                  <ThemedText type='smallBold' themeColor={isActive ? 'text' : 'textSecondary'}>
                    {route.label}
                  </ThemedText>
                </ThemedView>
              </Pressable>
            );
          })}
        </ThemedView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabBar: {
    position: 'absolute',
    left: Spacing.three,
    right: Spacing.three,
    bottom: Spacing.three,
    borderRadius: Spacing.four,
    padding: Spacing.two,
    flexDirection: 'row',
    gap: Spacing.two,
  },
  button: {
    flex: 1,
  },
  buttonInner: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    minHeight: BottomTabInset,
  },
  pressed: {
    opacity: 0.7,
  },
});
