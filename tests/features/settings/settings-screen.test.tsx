/// <reference types="jest" />

import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { Text } from 'react-native';
import { useStore } from 'zustand';
import { createStore, type StoreApi } from 'zustand/vanilla';

import { SettingsScreenContent } from '@/features/settings/settings-screen';

type MockSettingsState = {
  searchRadiusMeters: number;
  locationUpdateIntervalSeconds: number;
  stopsPollingIntervalSeconds: number;
  departuresPollingIntervalSeconds: number;
  homeStop: { gtfsId: string; name: string; transportMode: null } | null;
  pushNotificationsEnabled: boolean;
  notificationLeadTimeMinutes: number;
  updateSettings: jest.Mock;
};

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: {
      version: '1.0.0',
    },
  },
}));

jest.mock('@/core/config/env', () => ({
  DIGITRANSIT_API_KEY: 'abcd1234secret9876',
  DIGITRANSIT_API_URL: 'https://example.invalid/routing/v1',
}));

jest.mock('@/core/store/settings.store', () => ({
  useSettingsStore: jest.fn(),
}));

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');
  const SafeAreaView = React.forwardRef((props: any, ref: any) => <View ref={ref} {...props} />);
  SafeAreaView.displayName = 'SafeAreaView';
  return {
    SafeAreaView,
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

jest.mock('@/shared/icons', () => ({
  AppIcon: ({ name }: { name: string }) => {
    const React = require('react');
    const { Text } = require('react-native');
    return <Text>{`icon:${name}`}</Text>;
  },
}));

describe('SettingsScreenContent', () => {
  let settingsStore: StoreApi<MockSettingsState>;
  const { useSettingsStore } = jest.requireMock('@/core/store/settings.store') as {
    useSettingsStore: jest.Mock;
  };

  function RuntimeConsumer() {
    const radius = useSettingsStore((state: MockSettingsState) => state.searchRadiusMeters);
    return <Text>{`Radius consumer: ${radius}`}</Text>;
  }

  beforeEach(() => {
    settingsStore = createStore<MockSettingsState>()((set) => ({
      searchRadiusMeters: 250,
      locationUpdateIntervalSeconds: 20,
      stopsPollingIntervalSeconds: 20,
      departuresPollingIntervalSeconds: 10,
      homeStop: null,
      pushNotificationsEnabled: false,
      notificationLeadTimeMinutes: 10,
      updateSettings: jest.fn((patch: Partial<MockSettingsState>) => {
        set((state) => ({
          ...state,
          ...patch,
        }));
      }),
    }));

    useSettingsStore.mockImplementation((selector: (state: MockSettingsState) => unknown) =>
      useStore(settingsStore, selector)
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders all seven configurable rows and keeps diagnostics plus showcase in the utility section', () => {
    render(<SettingsScreenContent />);

    expect(screen.getByText('Settings')).toBeTruthy();
    expect(screen.getByLabelText('Search radius')).toBeTruthy();
    expect(screen.getByLabelText('Location update interval')).toBeTruthy();
    expect(screen.getByLabelText('Stops polling interval')).toBeTruthy();
    expect(screen.getByLabelText('Departures polling interval')).toBeTruthy();
    expect(screen.getByLabelText('Home stop')).toBeTruthy();
    expect(screen.getByLabelText('Push notifications')).toBeTruthy();
    expect(screen.getByLabelText('Notification lead time')).toBeTruthy();
    expect(screen.getByLabelText('Utilities section')).toBeTruthy();
    expect(screen.getByLabelText('Build diagnostics card')).toBeTruthy();
    expect(screen.getByText('Build diagnostics')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Open Showcase' })).toBeTruthy();
    expect(screen.getByLabelText('App version 1.0.0')).toBeTruthy();
    expect(screen.getByText('No changes to save')).toBeTruthy();
  });

  it('initializes editable fields from the store and keeps save disabled until something changes', () => {
    render(<SettingsScreenContent />);

    expect(screen.getByLabelText('Search radius').props.value).toBe('250');
    expect(screen.getByLabelText('Location update interval').props.value).toBe('20');
    expect(screen.getByLabelText('Stops polling interval').props.value).toBe('20');
    expect(screen.getByLabelText('Departures polling interval').props.value).toBe('10');

    const saveButton = screen.getByRole('button', { name: 'Save settings' });

    expect(saveButton.props.accessibilityState.disabled).toBe(true);

    fireEvent.changeText(screen.getByLabelText('Search radius'), '400');

    expect(
      screen.getByRole('button', { name: 'Save settings' }).props.accessibilityState.disabled
    ).toBe(false);
  });

  it('shows inline validation for invalid values before save', () => {
    render(<SettingsScreenContent />);

    fireEvent.changeText(screen.getByLabelText('Search radius'), '20');

    expect(screen.getByText('Search radius must be between 50 and 5000.')).toBeTruthy();
    expect(screen.getByText('Resolve validation errors before saving.')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Save settings' }).props.accessibilityState.disabled
    ).toBe(true);
  });

  it('shows an unsaved-changes status after a valid edit', () => {
    render(<SettingsScreenContent />);

    fireEvent.changeText(screen.getByLabelText('Search radius'), '400');

    expect(screen.getByText('Unsaved changes')).toBeTruthy();
  });

  it('saves sanitized values through updateSettings and store consumers react immediately', () => {
    render(
      <>
        <SettingsScreenContent />
        <RuntimeConsumer />
      </>
    );

    fireEvent.changeText(screen.getByLabelText('Search radius'), '400');
    fireEvent.changeText(screen.getByLabelText('Departures polling interval'), '15');
    fireEvent.press(screen.getByRole('button', { name: 'Save settings' }));

    expect(settingsStore.getState().updateSettings).toHaveBeenCalledWith({
      searchRadiusMeters: 400,
      locationUpdateIntervalSeconds: 20,
      stopsPollingIntervalSeconds: 20,
      departuresPollingIntervalSeconds: 15,
    });
    expect(screen.getByText('Radius consumer: 400')).toBeTruthy();
  });
});
