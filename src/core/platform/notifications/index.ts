export type NotificationPermissionState = {
  supported: boolean;
  granted: boolean;
  canPrompt: boolean;
};

export type ImmediateNotification = {
  title: string;
  body: string;
};

export type NotificationPlatformAdapter = {
  getPermissionState: () => Promise<NotificationPermissionState>;
  requestPermission: () => Promise<NotificationPermissionState>;
  prepareRuntime: () => Promise<void>;
  sendImmediateNotification: (notification: ImmediateNotification) => Promise<void>;
};

export { notificationPlatformAdapter } from './notifications';
