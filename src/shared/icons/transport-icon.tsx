import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';

import type { TransportMode } from '@/shared/theme/theme';

const TRANSPORT_ICON_MAP: Record<
  TransportMode,
  React.ComponentProps<typeof MaterialCommunityIcons>['name']
> = {
  bus: 'bus',
  tram: 'tram',
  train: 'train',
  metro: 'subway-variant',
  ferry: 'ferry',
};

export type TransportIconProps = {
  mode: TransportMode;
  size: number;
  color: string;
  testID?: string;
};

export function TransportIcon({ mode, size, color, testID }: TransportIconProps) {
  return (
    <MaterialCommunityIcons
      name={TRANSPORT_ICON_MAP[mode]}
      size={size}
      color={color}
      testID={testID}
    />
  );
}
