/// <reference types="jest" />

import { render } from '@testing-library/react-native';
import { usePathname, useRouter } from 'expo-router';
import React from 'react';

import AppTabs from '@/components/app-tabs';
import AppTabsWeb from '@/components/app-tabs.web';

jest.mock('expo-router', () => ({
  Stack: Object.assign(({ children }: { children?: React.ReactNode }) => <>{children}</>, {
    Screen: jest.fn(() => null),
  }),
  usePathname: jest.fn(),
  useRouter: jest.fn(),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('expo-glass-effect', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    GlassView: (props: any) => <View {...props} />,
    isGlassEffectAPIAvailable: () => false,
  };
});

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');

  return {
    Ionicons: (props: any) => <Text testID={props.testID}>{`ion:${props.name}`}</Text>,
    MaterialCommunityIcons: (props: any) => (
      <Text testID={props.testID}>{`mci:${props.name}`}</Text>
    ),
  };
});

describe('GlassTabBar', () => {
  const mockUsePathname = jest.mocked(usePathname);
  const mockUseRouter = jest.mocked(useRouter);

  beforeEach(() => {
    mockUsePathname.mockReturnValue('/map');
    mockUseRouter.mockReturnValue({
      back: jest.fn(),
      replace: jest.fn(),
      push: jest.fn(),
    } as unknown as ReturnType<typeof useRouter>);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Native tab shell', () => {
    it('shows exactly three tabs with icon-first presentation', () => {
      const { getByText, queryByText } = render(<AppTabs />);

      expect(getByText('Map')).toBeTruthy();
      expect(getByText('Stops')).toBeTruthy();
      expect(getByText('Settings')).toBeTruthy();
      expect(queryByText('Departures')).toBeNull();
    });

    it('renders icons for each tab', () => {
      const { getByText } = render(<AppTabs />);

      // Ionicons icons for the three tabs
      expect(getByText(/ion:map/)).toBeTruthy();
      expect(getByText(/ion:list/)).toBeTruthy();
      expect(getByText(/ion:settings/)).toBeTruthy();
    });

    it('hides the tab bar on the departures push route', () => {
      mockUsePathname.mockReturnValue('/stop/HSL:1234');

      const { queryByText } = render(<AppTabs />);

      expect(queryByText('Map')).toBeNull();
    });
  });

  describe('Web tab shell', () => {
    it('shows exactly three tabs with labels', () => {
      const { getByText, queryByText } = render(<AppTabsWeb />);

      expect(getByText('Map')).toBeTruthy();
      expect(getByText('Stops')).toBeTruthy();
      expect(getByText('Settings')).toBeTruthy();
      expect(queryByText('Departures')).toBeNull();
    });

    it('hides the tab bar on the departures push route', () => {
      mockUsePathname.mockReturnValue('/stop/HSL:1234');

      const { queryByText } = render(<AppTabsWeb />);

      expect(queryByText('Map')).toBeNull();
    });
  });
});
