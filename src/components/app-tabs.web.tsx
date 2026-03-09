import { Stack, usePathname, useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

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
        <View style={styles.navContainer}>
          <View style={styles.navBar}>
            <Text style={styles.brandText}>DigiTransit</Text>

            {TAB_ROUTES.map((route) => {
              const isActive = pathname === route.href;
              const iconName = TAB_ICONS[route.key];

              return (
                <Pressable
                  key={route.key}
                  accessibilityRole='button'
                  onPress={() => router.replace(route.href)}
                  style={({ pressed }) => [styles.tabButton, pressed && styles.pressed]}
                >
                  <AppIcon
                    name={iconName}
                    size={18}
                    color={isActive ? theme.colors.text.primary : theme.colors.text.muted}
                  />
                  <Text
                    style={[
                      styles.tabLabel,
                      { color: isActive ? theme.colors.text.primary : theme.colors.text.muted },
                      isActive && styles.tabLabelActive,
                    ]}
                  >
                    {route.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  navContainer: {
    position: 'absolute',
    width: '100%',
    padding: theme.spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  navBar: {
    backgroundColor: theme.colors.card.bg,
    borderWidth: 1,
    borderColor: theme.colors.card.border,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing['2xl'],
    borderRadius: theme.radius.bar,
    flexDirection: 'row',
    alignItems: 'center',
    flexGrow: 1,
    gap: theme.spacing.sm,
    maxWidth: theme.layout.maxContentWidth,
  },
  brandText: {
    color: theme.colors.text.primary,
    fontSize: theme.typography.sm.fontSize,
    fontWeight: '700',
    marginRight: 'auto',
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radius.bar,
    minHeight: theme.layout.minTouchTarget,
  },
  tabLabel: {
    fontSize: theme.typography.sm.fontSize,
    fontWeight: '500',
  },
  tabLabelActive: {
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.7,
  },
});
