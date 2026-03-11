export type NotificationPermissionState = {
  supported: boolean;
  granted: boolean;
  canPrompt: boolean;
};

export type NotificationPlatformAdapter = {
  getPermissionState: () => Promise<NotificationPermissionState>;
  requestPermission: () => Promise<NotificationPermissionState>;
  prepareRuntime: () => Promise<void>;
};

export { notificationPlatformAdapter } from './notifications';
