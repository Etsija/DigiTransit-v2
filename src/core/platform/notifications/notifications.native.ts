import { Platform } from 'react-native';

import type {
  ImmediateNotification,
  NotificationPermissionState,
  NotificationPlatformAdapter,
  ScheduledNotification,
} from './index';

const DEFAULT_ANDROID_CHANNEL_ID = 'default-departure-alerts';
let hasConfiguredForegroundPresentation = false;

function getNotificationsModule() {
  // Lazy load keeps Expo Go warnings out of unrelated imports and lets tests stub the module.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('expo-notifications') as typeof import('expo-notifications');
}

function ensureForegroundNotificationPresentation() {
  if (hasConfiguredForegroundPresentation) {
    return;
  }

  const notificationsModule = getNotificationsModule();

  notificationsModule.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });

  hasConfiguredForegroundPresentation = true;
}

function isGranted(
  status: Partial<{
    granted: boolean;
    ios: {
      status?: number | null;
    };
  }>,
  notificationsModule: typeof import('expo-notifications')
) {
  const iosStatus = status.ios?.status;

  return (
    status.granted === true ||
    iosStatus === notificationsModule.IosAuthorizationStatus.AUTHORIZED ||
    iosStatus === notificationsModule.IosAuthorizationStatus.PROVISIONAL ||
    iosStatus === notificationsModule.IosAuthorizationStatus.EPHEMERAL
  );
}

function mapPermissionState(
  status:
    | Partial<{
        granted: boolean;
        canAskAgain: boolean;
        ios: {
          status?: number | null;
        };
      }>
    | null
    | undefined,
  notificationsModule: typeof import('expo-notifications')
): NotificationPermissionState {
  return {
    supported: true,
    granted: isGranted(status ?? {}, notificationsModule),
    canPrompt: status?.canAskAgain ?? false,
  };
}

async function ensureAndroidNotificationChannel() {
  if (Platform.OS !== 'android') {
    return;
  }

  const notificationsModule = getNotificationsModule();

  await notificationsModule.setNotificationChannelAsync(DEFAULT_ANDROID_CHANNEL_ID, {
    name: 'Departure alerts',
    importance: notificationsModule.AndroidImportance.DEFAULT,
  });
}

async function scheduleImmediateNotification(notification: ImmediateNotification) {
  const notificationsModule = getNotificationsModule();

  await notificationsModule.scheduleNotificationAsync({
    content: {
      title: notification.title,
      body: notification.body,
    },
    trigger: null,
  });
}

async function scheduleAbsoluteNotification(notification: ScheduledNotification) {
  const notificationsModule = getNotificationsModule();

  return notificationsModule.scheduleNotificationAsync({
    content: {
      title: notification.title,
      body: notification.body,
    },
    trigger: {
      type: notificationsModule.SchedulableTriggerInputTypes.DATE,
      date: notification.fireAt,
    },
  });
}

export const notificationPlatformAdapter: NotificationPlatformAdapter = {
  async getPermissionState() {
    const notificationsModule = getNotificationsModule();
    const permissionStatus =
      typeof notificationsModule.getPermissionsAsync === 'function'
        ? await notificationsModule.getPermissionsAsync()
        : undefined;

    return mapPermissionState(permissionStatus, notificationsModule);
  },

  async requestPermission() {
    await ensureAndroidNotificationChannel();
    ensureForegroundNotificationPresentation();

    const notificationsModule = getNotificationsModule();

    const permissionStatus =
      typeof notificationsModule.requestPermissionsAsync === 'function'
        ? await notificationsModule.requestPermissionsAsync()
        : undefined;

    return mapPermissionState(permissionStatus, notificationsModule);
  },

  async prepareRuntime() {
    await ensureAndroidNotificationChannel();
    ensureForegroundNotificationPresentation();
  },

  async sendImmediateNotification(notification) {
    await ensureAndroidNotificationChannel();
    ensureForegroundNotificationPresentation();
    await scheduleImmediateNotification(notification);
  },

  async scheduleNotification(notification) {
    await ensureAndroidNotificationChannel();
    ensureForegroundNotificationPresentation();
    return scheduleAbsoluteNotification(notification);
  },

  async cancelScheduledNotification(identifier) {
    const notificationsModule = getNotificationsModule();
    await notificationsModule.cancelScheduledNotificationAsync(identifier);
  },
};
