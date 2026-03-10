import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppIcon, TransportIcon } from '@/shared/icons';
import { theme, TransportMode } from '@/shared/theme/theme';

export type MapMarkerProps = {
  transportMode: TransportMode;
  label: string;
  size: 'base' | 'near' | number;
  isHomeStop?: boolean;
  onPress?: () => void;
};

export function MapMarker({
  transportMode,
  label,
  size,
  isHomeStop = false,
  onPress,
}: MapMarkerProps) {
  const markerColor = isHomeStop
    ? theme.colors.status.homeStop
    : theme.colors.transport[transportMode];
  const markerSize =
    typeof size === 'number'
      ? Math.min(theme.layout.markerSizeNear, Math.max(theme.layout.markerSizeBase, size))
      : size === 'near'
        ? theme.layout.markerSizeNear
        : theme.layout.markerSizeBase;
  const iconSize = Math.round(markerSize * 0.6);
  const marker = (
    <View style={styles.hitTarget}>
      <View
        style={[
          styles.marker,
          isHomeStop && styles.homeMarker,
          { width: markerSize, height: markerSize, backgroundColor: markerColor },
        ]}
      >
        {isHomeStop ? (
          <AppIcon name='home' size={iconSize} color={theme.colors.text.primary} />
        ) : (
          <TransportIcon mode={transportMode} size={iconSize} color={theme.colors.text.primary} />
        )}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <Pressable accessibilityRole='button' accessibilityLabel={label} onPress={onPress}>
        {marker}
      </Pressable>
    );
  }

  return (
    <View accessibilityRole='image' accessibilityLabel={label}>
      {marker}
    </View>
  );
}

const styles = StyleSheet.create({
  hitTarget: {
    minWidth: theme.layout.minTouchTarget,
    minHeight: theme.layout.minTouchTarget,
    justifyContent: 'center',
    alignItems: 'center',
  },
  marker: {
    borderRadius: theme.radius.pill,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: theme.borderWidth.marker,
    borderColor: `${theme.colors.text.primary}4d`,
  },
  homeMarker: {
    borderColor: `${theme.colors.status.homeStop}cc`,
    shadowColor: theme.colors.status.homeStop,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
});
