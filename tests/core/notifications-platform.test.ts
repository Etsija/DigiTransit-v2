/// <reference types="jest" />

describe('notificationPlatformAdapter.native', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('treats iOS provisional authorization as granted', async () => {
    jest.doMock('react-native', () => ({
      Platform: {
        OS: 'ios',
      },
    }));
    jest.doMock('expo-notifications', () => ({
      IosAuthorizationStatus: {
        AUTHORIZED: 2,
        PROVISIONAL: 3,
        EPHEMERAL: 4,
      },
      AndroidImportance: {
        DEFAULT: 3,
      },
      getPermissionsAsync: jest.fn(async () => ({
        granted: false,
        canAskAgain: true,
        ios: {
          status: 3,
        },
      })),
      requestPermissionsAsync: jest.fn(),
      setNotificationChannelAsync: jest.fn(),
    }));

    const {
      notificationPlatformAdapter,
    } = require('@/core/platform/notifications/notifications.native');

    await expect(notificationPlatformAdapter.getPermissionState()).resolves.toEqual({
      supported: true,
      granted: true,
      canPrompt: true,
    });
  });

  it('bootstraps the Android notification channel before requesting permission', async () => {
    const setNotificationChannelAsync = jest.fn(async () => {});
    const requestPermissionsAsync = jest.fn(async () => ({
      granted: true,
      canAskAgain: true,
      ios: {
        status: 0,
      },
    }));

    jest.doMock('react-native', () => ({
      Platform: {
        OS: 'android',
      },
    }));
    jest.doMock('expo-notifications', () => ({
      IosAuthorizationStatus: {
        AUTHORIZED: 2,
        PROVISIONAL: 3,
        EPHEMERAL: 4,
      },
      AndroidImportance: {
        DEFAULT: 3,
      },
      getPermissionsAsync: jest.fn(),
      requestPermissionsAsync,
      setNotificationChannelAsync,
    }));

    const {
      notificationPlatformAdapter,
    } = require('@/core/platform/notifications/notifications.native');

    await notificationPlatformAdapter.requestPermission();

    expect(setNotificationChannelAsync).toHaveBeenCalledWith('default-departure-alerts', {
      name: 'Departure alerts',
      importance: 3,
    });
    expect(requestPermissionsAsync).toHaveBeenCalled();
  });

  it('can prepare the Android runtime without prompting for permission', async () => {
    const setNotificationChannelAsync = jest.fn(async () => {});
    const requestPermissionsAsync = jest.fn(async () => ({
      granted: true,
      canAskAgain: true,
      ios: {
        status: 0,
      },
    }));

    jest.doMock('react-native', () => ({
      Platform: {
        OS: 'android',
      },
    }));
    jest.doMock('expo-notifications', () => ({
      IosAuthorizationStatus: {
        AUTHORIZED: 2,
        PROVISIONAL: 3,
        EPHEMERAL: 4,
      },
      AndroidImportance: {
        DEFAULT: 3,
      },
      getPermissionsAsync: jest.fn(),
      requestPermissionsAsync,
      setNotificationChannelAsync,
    }));

    const {
      notificationPlatformAdapter,
    } = require('@/core/platform/notifications/notifications.native');

    await notificationPlatformAdapter.prepareRuntime();

    expect(setNotificationChannelAsync).toHaveBeenCalledWith('default-departure-alerts', {
      name: 'Departure alerts',
      importance: 3,
    });
    expect(requestPermissionsAsync).not.toHaveBeenCalled();
  });
});

describe('notificationPlatformAdapter.web', () => {
  it('reports notifications as unsupported on web', async () => {
    const {
      notificationPlatformAdapter,
    } = require('@/core/platform/notifications/notifications.web');

    await expect(notificationPlatformAdapter.getPermissionState()).resolves.toEqual({
      supported: false,
      granted: false,
      canPrompt: false,
    });
  });
});
