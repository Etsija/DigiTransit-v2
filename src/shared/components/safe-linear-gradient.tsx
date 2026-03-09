import React from 'react';
import { Platform, View, type ViewProps } from 'react-native';

type Point = {
  x: number;
  y: number;
};

export type SafeLinearGradientProps = ViewProps & {
  colors: string[];
  locations?: number[];
  start?: Point;
  end?: Point;
  children?: React.ReactNode;
};

function canUseNativeLinearGradient() {
  if (Platform.OS === 'web') {
    return true;
  }

  try {
    return Boolean(
      globalThis.expo &&
        'getViewConfig' in globalThis.expo &&
        globalThis.expo.getViewConfig?.('ExpoLinearGradient')
    );
  } catch {
    return false;
  }
}

const hasNativeLinearGradient =
  canUseNativeLinearGradient();

const NativeLinearGradient: React.ComponentType<SafeLinearGradientProps> | null =
  hasNativeLinearGradient
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    ? (require('expo-linear-gradient')
        .LinearGradient as React.ComponentType<SafeLinearGradientProps>)
    : null;

export function SafeLinearGradient({ children, style, ...rest }: SafeLinearGradientProps) {
  if (NativeLinearGradient) {
    return (
      <NativeLinearGradient style={style} {...rest}>
        {children}
      </NativeLinearGradient>
    );
  }

  return <View style={style}>{children}</View>;
}
