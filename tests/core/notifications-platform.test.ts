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
      setNotificationHandler: jest.fn(),
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
    const setNotificationHandler = jest.fn();
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
      setNotificationHandler,
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
    const setNotificationHandler = jest.fn();
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
      setNotificationHandler,
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
    expect(setNotificationHandler).toHaveBeenCalledWith({
      handleNotification: expect.any(Function),
    });
    expect(requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('sends an immediate local notification through Expo Notifications after runtime prep', async () => {
    const setNotificationChannelAsync = jest.fn(async () => {});
    const setNotificationHandler = jest.fn();
    const scheduleNotificationAsync = jest.fn(async () => 'notification-id');

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
      SchedulableTriggerInputTypes: {
        TIME_INTERVAL: 'timeInterval',
      },
      getPermissionsAsync: jest.fn(),
      requestPermissionsAsync: jest.fn(),
      setNotificationHandler,
      setNotificationChannelAsync,
      scheduleNotificationAsync,
    }));

    const {
      notificationPlatformAdapter,
    } = require('@/core/platform/notifications/notifications.native');

    await notificationPlatformAdapter.sendImmediateNotification({
      title: 'Next 550 from Kamppi at 12:04',
      body: 'in 3 min',
    });

    expect(setNotificationChannelAsync).toHaveBeenCalledWith('default-departure-alerts', {
      name: 'Departure alerts',
      importance: 3,
    });
    expect(setNotificationHandler).toHaveBeenCalledWith({
      handleNotification: expect.any(Function),
    });
    expect(scheduleNotificationAsync).toHaveBeenCalledWith({
      content: {
        title: 'Next 550 from Kamppi at 12:04',
        body: 'in 3 min',
      },
      trigger: null,
    });
  });

  it('schedules a one-shot local notification at an absolute date and returns its identifier', async () => {
    const setNotificationChannelAsync = jest.fn(async () => {});
    const setNotificationHandler = jest.fn();
    const scheduleNotificationAsync = jest.fn(async () => 'scheduled-notification-id');
    const fireAt = new Date('2026-03-12T10:00:00.000Z');

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
      SchedulableTriggerInputTypes: {
        DATE: 'date',
      },
      getPermissionsAsync: jest.fn(),
      requestPermissionsAsync: jest.fn(),
      setNotificationHandler,
      setNotificationChannelAsync,
      scheduleNotificationAsync,
    }));

    const {
      notificationPlatformAdapter,
    } = require('@/core/platform/notifications/notifications.native');

    await expect(
      notificationPlatformAdapter.scheduleNotification({
        title: '550 to Itakeskus departs in 5 min from Kamppi',
        body: '550 to Itakeskus departs in 5 min from Kamppi',
        fireAt,
      })
    ).resolves.toBe('scheduled-notification-id');

    expect(scheduleNotificationAsync).toHaveBeenCalledWith({
      content: {
        title: '550 to Itakeskus departs in 5 min from Kamppi',
        body: '550 to Itakeskus departs in 5 min from Kamppi',
      },
      trigger: {
        type: 'date',
        date: fireAt,
      },
    });
  });

  it('configures foreground presentation so immediate notifications can be shown while the app is open', async () => {
    const setNotificationChannelAsync = jest.fn(async () => {});
    const setNotificationHandler = jest.fn();

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
      requestPermissionsAsync: jest.fn(),
      setNotificationHandler,
      setNotificationChannelAsync,
    }));

    const {
      notificationPlatformAdapter,
    } = require('@/core/platform/notifications/notifications.native');

    await notificationPlatformAdapter.prepareRuntime();

    const firstCall = setNotificationHandler.mock.calls[0]?.[0];
    expect(firstCall).toBeDefined();
    await expect(firstCall.handleNotification()).resolves.toEqual({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    });
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

  it('is a hard no-op for immediate local notifications on web', async () => {
    const {
      notificationPlatformAdapter,
    } = require('@/core/platform/notifications/notifications.web');

    await expect(
      notificationPlatformAdapter.sendImmediateNotification({
        title: 'ignored',
        body: 'ignored',
      })
    ).resolves.toBeUndefined();
  });

  it('is a hard no-op for scheduled local notifications on web', async () => {
    const {
      notificationPlatformAdapter,
    } = require('@/core/platform/notifications/notifications.web');

    await expect(
      notificationPlatformAdapter.scheduleNotification({
        title: 'ignored',
        body: 'ignored',
        fireAt: new Date('2026-03-12T10:00:00.000Z'),
      })
    ).resolves.toBeNull();
  });
});
