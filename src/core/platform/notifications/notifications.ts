import { Platform } from 'react-native';

import { notificationPlatformAdapter as nativeNotificationPlatformAdapter } from './notifications.native';
import { notificationPlatformAdapter as webNotificationPlatformAdapter } from './notifications.web';

export const notificationPlatformAdapter =
  Platform.OS === 'web' ? webNotificationPlatformAdapter : nativeNotificationPlatformAdapter;
