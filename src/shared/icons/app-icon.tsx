import { Ionicons } from '@expo/vector-icons';
import React from 'react';

export type AppIconName = React.ComponentProps<typeof Ionicons>['name'];

export type AppIconProps = {
  name: AppIconName;
  size: number;
  color: string;
  testID?: string;
};

export function AppIcon({ name, size, color, testID }: AppIconProps) {
  return <Ionicons name={name} size={size} color={color} testID={testID} />;
}
