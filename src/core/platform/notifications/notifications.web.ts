import type { NotificationPermissionState, NotificationPlatformAdapter } from './index';

const unsupportedPermissionState: NotificationPermissionState = {
  supported: false,
  granted: false,
  canPrompt: false,
};

export const notificationPlatformAdapter: NotificationPlatformAdapter = {
  async getPermissionState() {
    return unsupportedPermissionState;
  },

  async requestPermission() {
    return unsupportedPermissionState;
  },

  async prepareRuntime() {},
};
