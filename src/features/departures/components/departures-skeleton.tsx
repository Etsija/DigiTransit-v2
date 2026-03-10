import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { theme } from '@/shared/theme/theme';

const CARD_COUNT = 4;
const SHIMMER_TRAVEL_DISTANCE = 260;

export function DeparturesSkeleton() {
  const shimmer = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    shimmer.setValue(0);

    const animation = Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 1250,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [shimmer]);

  const translateX = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-SHIMMER_TRAVEL_DISTANCE, SHIMMER_TRAVEL_DISTANCE],
  });

  return (
    <View style={styles.list} testID='departures-skeleton'>
      {Array.from({ length: CARD_COUNT }, (_, index) => (
        <View key={index} style={styles.card} testID={`departures-skeleton-card-${index}`}>
          <View style={styles.routeBlock} />
          <View style={styles.infoBlock}>
            <View style={styles.headsignLine} />
            <View style={styles.statusLine} />
          </View>
          <View style={styles.timeBlock}>
            <View style={styles.timeLine} />
            <View style={styles.metaLine} />
          </View>

          <Animated.View
            pointerEvents='none'
            style={[styles.shimmer, { transform: [{ translateX }] }]}
          >
            <LinearGradient
              colors={[
                theme.colors.skeleton.shimmerStart,
                theme.colors.skeleton.shimmerMid,
                theme.colors.skeleton.shimmerEnd,
              ]}
              end={{ x: 1, y: 0.5 }}
              start={{ x: 0, y: 0.5 }}
              style={styles.shimmerGradient}
            />
          </Animated.View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: theme.layout.cardListGap,
  },
  card: {
    position: 'relative',
    overflow: 'hidden',
    minHeight: 86,
    borderRadius: theme.radius.card,
    borderWidth: theme.borderWidth.subtle,
    borderColor: theme.colors.card.border,
    backgroundColor: theme.colors.card.bg,
    padding: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  routeBlock: {
    width: 40,
    height: 18,
    borderRadius: theme.radius.badge,
    backgroundColor: theme.colors.skeleton.base,
  },
  infoBlock: {
    flex: 1,
    gap: theme.spacing.sm,
  },
  headsignLine: {
    width: '72%',
    height: 16,
    borderRadius: theme.radius.badge,
    backgroundColor: theme.colors.skeleton.muted,
  },
  statusLine: {
    width: '38%',
    height: 12,
    borderRadius: theme.radius.badge,
    backgroundColor: theme.colors.skeleton.base,
  },
  timeBlock: {
    alignItems: 'flex-end',
    gap: theme.spacing.sm,
    minWidth: 72,
  },
  timeLine: {
    width: 56,
    height: 20,
    borderRadius: theme.radius.badge,
    backgroundColor: theme.colors.skeleton.strong,
  },
  metaLine: {
    width: 44,
    height: 12,
    borderRadius: theme.radius.badge,
    backgroundColor: theme.colors.skeleton.base,
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '36%',
  },
  shimmerGradient: {
    flex: 1,
  },
});
