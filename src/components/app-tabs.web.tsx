import { Stack, usePathname, useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { MaxContentWidth, Spacing } from '@/constants/theme';
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
        <CustomTabList>
          {TAB_ROUTES.map((route) => (
            <TabButton
              key={route.key}
              accessibilityRole='button'
              isFocused={pathname === route.href}
              onPress={() => router.replace(route.href)}
            >
              {route.label}
            </TabButton>
          ))}
        </CustomTabList>
      ) : null}
    </View>
  );
}

type TabButtonProps = Omit<React.ComponentProps<typeof Pressable>, 'children'> & {
  children: React.ReactNode;
  isFocused?: boolean;
};

export function TabButton({ children, isFocused, ...props }: TabButtonProps) {
  return (
    <Pressable {...props} style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView
        type={isFocused ? 'backgroundSelected' : 'backgroundElement'}
        style={styles.tabButtonView}
      >
        <ThemedText type='small' themeColor={isFocused ? 'text' : 'textSecondary'}>
          {children}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

type CustomTabListProps = {
  children: React.ReactNode;
};

export function CustomTabList(props: CustomTabListProps) {
  return (
    <View style={styles.tabListContainer}>
      <ThemedView type='backgroundElement' style={styles.innerContainer}>
        <ThemedText type='smallBold' style={styles.brandText}>
          DigiTransit
        </ThemedText>

        {props.children}
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabListContainer: {
    position: 'absolute',
    width: '100%',
    padding: Spacing.three,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  innerContainer: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.five,
    borderRadius: Spacing.five,
    flexDirection: 'row',
    alignItems: 'center',
    flexGrow: 1,
    gap: Spacing.two,
    maxWidth: MaxContentWidth,
  },
  brandText: {
    marginRight: 'auto',
  },
  pressed: {
    opacity: 0.7,
  },
  tabButtonView: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
  },
});
