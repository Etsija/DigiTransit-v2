import { GlassView } from 'expo-glass-effect';
import { Stack, usePathname, useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppIcon, AppIconName } from '@/shared/icons';
import { theme } from '@/shared/theme/theme';
import { isPrimaryTabPath, TAB_ROUTES } from '@/types/navigation';

const TAB_ICONS: Record<string, AppIconName> = {
  map: 'map',
  stops: 'list',
  settings: 'settings-sharp',
};

export default function AppTabs() {
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const showTabBar = isPrimaryTabPath(pathname);

  return (
    <View style={styles.container}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name='index' />
        <Stack.Screen name='map' />
        <Stack.Screen name='stops' />
        <Stack.Screen name='settings' />
        <Stack.Screen name='showcase' />
        <Stack.Screen name='stop/[stopId]' />
      </Stack>

      {showTabBar ? (
        <GlassView
          glassEffectStyle={theme.glass.glassStyle}
          style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, theme.spacing.sm) }]}
        >
          {TAB_ROUTES.map((route) => {
            const isActive = pathname === route.href;
            const iconName = TAB_ICONS[route.key];

            return (
              <Pressable
                key={route.key}
                accessibilityRole='button'
                accessibilityLabel={route.label}
                accessibilityState={{ selected: isActive }}
                onPress={() => router.replace(route.href)}
                style={({ pressed }) => [styles.button, pressed && styles.pressed]}
              >
                <AppIcon
                  name={iconName}
                  size={22}
                  color={isActive ? theme.colors.text.primary : theme.colors.text.muted}
                />
                <Text
                  style={[
                    styles.label,
                    { color: isActive ? theme.colors.text.primary : theme.colors.text.muted },
                    isActive && styles.labelActive,
                  ]}
                >
                  {route.label}
                </Text>
              </Pressable>
            );
          })}
        </GlassView>
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
    left: theme.spacing.lg,
    right: theme.spacing.lg,
    bottom: theme.spacing.sm,
    borderRadius: theme.radius.bar,
    borderWidth: 1,
    borderColor: theme.colors.card.border,
    backgroundColor: theme.colors.card.bg,
    overflow: 'hidden',
    paddingTop: theme.spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    minHeight: theme.layout.tabBarHeight,
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: theme.layout.minTouchTarget,
    minHeight: theme.layout.minTouchTarget,
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.xs,
  },
  label: {
    fontSize: theme.typography.xs.fontSize,
    fontWeight: '500',
  },
  labelActive: {
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.7,
  },
});
