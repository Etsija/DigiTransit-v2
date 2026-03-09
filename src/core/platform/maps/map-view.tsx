import type { ComponentType } from 'react';
import { Platform } from 'react-native';

import type { PlatformMapViewProps } from './types';

/* eslint-disable @typescript-eslint/no-require-imports */
const platformModule =
  Platform.OS === 'web' ? require('./map-view.web') : require('./map-view.native');
/* eslint-enable @typescript-eslint/no-require-imports */

export const PlatformMapView =
  platformModule.PlatformMapView as ComponentType<PlatformMapViewProps>;
export type { PlatformMapViewProps } from './types';
