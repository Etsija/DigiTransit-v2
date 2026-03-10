import React from 'react';
import { Animated, Easing, StyleSheet, Text } from 'react-native';

import { theme } from '@/shared/theme/theme';

export type ErrorBannerProps = {
  message: string;
};

export function ErrorBanner({ message }: ErrorBannerProps) {
  const entrance = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const animation = Animated.timing(entrance, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });

    animation.start();

    return () => {
      animation.stop();
    };
  }, [entrance]);

  return (
    <Animated.View
      accessibilityRole='alert'
      accessibilityLiveRegion='polite'
      style={[
        styles.container,
        {
          opacity: entrance,
          transform: [
            {
              translateY: entrance.interpolate({
                inputRange: [0, 1],
                outputRange: [-12, 0],
              }),
            },
          ],
        },
      ]}
    >
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
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
