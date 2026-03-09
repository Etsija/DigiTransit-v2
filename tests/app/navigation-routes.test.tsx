/// <reference types="jest" />

import { fireEvent, render } from '@testing-library/react-native';
import { Redirect, useLocalSearchParams, usePathname, useRouter } from 'expo-router';
import React from 'react';

import IndexRoute from '@/app/index';
import MapScreen from '@/app/map';
import SettingsScreen from '@/app/settings';
import ShowcaseRoute from '@/app/showcase';
import StopDetailsScreen from '@/app/stop/[stopId]';
import StopsScreen from '@/app/stops';
import AppTabs from '@/components/app-tabs';
import AppTabsWeb from '@/components/app-tabs.web';
import { buildSettingsHref, buildShowcaseHref, buildStopHref } from '@/types/navigation';

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: {
      version: '1.0.0',
    },
  },
}));

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');
  const SafeAreaView = React.forwardRef((props: any, ref: any) => <View ref={ref} {...props} />);
  SafeAreaView.displayName = 'SafeAreaView';
  return {
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
    SafeAreaView,
  };
});

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

jest.mock('expo-router', () => ({
  Stack: Object.assign(({ children }: { children?: React.ReactNode }) => <>{children}</>, {
    Screen: jest.fn(() => null),
  }),
  Redirect: jest.fn(({ href }) => `redirect:${href}`),
  useLocalSearchParams: jest.fn(),
  usePathname: jest.fn(),
  useRouter: jest.fn(),
}));

const devGlobal = globalThis as typeof globalThis & { __DEV__: boolean };

describe('navigation route stubs', () => {
  const mockRedirect = jest.mocked(Redirect);
  const mockUseLocalSearchParams = jest.mocked(useLocalSearchParams);
  const mockUsePathname = jest.mocked(usePathname);
  const mockUseRouter = jest.mocked(useRouter);
  const originalDev = devGlobal.__DEV__;

  beforeEach(() => {
    Object.defineProperty(devGlobal, '__DEV__', {
      configurable: true,
      value: true,
      writable: true,
    });

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

  afterAll(() => {
    Object.defineProperty(devGlobal, '__DEV__', {
      configurable: true,
      value: originalDev,
      writable: true,
    });
  });

  it('renders the map stub screen', () => {
    const { getByText } = render(<MapScreen />);

    expect(getByText('Map')).toBeTruthy();
    expect(getByText('Map screen stub')).toBeTruthy();
  });

  it('redirects the root index route to the map screen', () => {
    render(<IndexRoute />);

    expect(mockRedirect).toHaveBeenCalledWith({ href: '/map' }, undefined);
  });

  it('renders the native tab shell with the three primary tabs only', () => {
    const { getByText, queryByText } = render(<AppTabs />);

    expect(getByText('Map')).toBeTruthy();
    expect(getByText('Stops')).toBeTruthy();
    expect(getByText('Settings')).toBeTruthy();
    expect(queryByText('Departures')).toBeNull();
  });

  it('hides the native tab bar on the departures push route', () => {
    mockUsePathname.mockReturnValue('/stop/HSL:1234');

    const { queryByText } = render(<AppTabs />);

    expect(queryByText('Map')).toBeNull();
    expect(queryByText('Stops')).toBeNull();
    expect(queryByText('Settings')).toBeNull();
  });

  it('renders the stops stub screen', () => {
    const { getByText } = render(<StopsScreen />);

    expect(getByText('Stops')).toBeTruthy();
    expect(getByText('Stops screen stub')).toBeTruthy();
  });

  it('renders the settings screen with the current app version', () => {
    const { getByText } = render(<SettingsScreen />);

    expect(getByText('Settings')).toBeTruthy();
    expect(
      getByText('Developer tooling stays hidden behind the app version in development builds.')
    ).toBeTruthy();
    expect(getByText('Version 1.0.0')).toBeTruthy();
  });

  it('opens the showcase route after five version taps in development mode', () => {
    const push = jest.fn();

    mockUseRouter.mockReturnValue({
      back: jest.fn(),
      replace: jest.fn(),
      push,
    } as unknown as ReturnType<typeof useRouter>);

    const { getByRole } = render(<SettingsScreen />);
    const versionButton = getByRole('button', { name: 'App version 1.0.0' });

    for (let tap = 0; tap < 5; tap += 1) {
      fireEvent.press(versionButton);
    }

    expect(push).toHaveBeenCalledWith(buildShowcaseHref());
  });

  it('does nothing after five version taps in production mode', () => {
    const push = jest.fn();

    Object.defineProperty(devGlobal, '__DEV__', {
      configurable: true,
      value: false,
      writable: true,
    });

    mockUseRouter.mockReturnValue({
      back: jest.fn(),
      replace: jest.fn(),
      push,
    } as unknown as ReturnType<typeof useRouter>);

    const { getByLabelText, queryByRole } = render(<SettingsScreen />);

    expect(queryByRole('button', { name: 'App version 1.0.0' })).toBeNull();
    expect(getByLabelText('App version 1.0.0')).toBeTruthy();

    expect(push).not.toHaveBeenCalled();
  });

  it('renders the web tab shell with the three primary tabs only', () => {
    const { getByText, queryByText } = render(<AppTabsWeb />);

    expect(getByText('Map')).toBeTruthy();
    expect(getByText('Stops')).toBeTruthy();
    expect(getByText('Settings')).toBeTruthy();
    expect(queryByText('Departures')).toBeNull();
    expect(queryByText('Showcase')).toBeNull();
  });

  it('hides the web tab bar on the departures push route', () => {
    mockUsePathname.mockReturnValue('/stop/HSL:1234');

    const { queryByText } = render(<AppTabsWeb />);

    expect(queryByText('Map')).toBeNull();
    expect(queryByText('Stops')).toBeNull();
    expect(queryByText('Settings')).toBeNull();
  });

  it('renders the departures stub with the typed stopId and back action', () => {
    const back = jest.fn();

    mockUseLocalSearchParams.mockReturnValue({ stopId: 'HSL:1234' });
    mockUseRouter.mockReturnValue({ back } as unknown as ReturnType<typeof useRouter>);

    const { getByRole, getByText } = render(<StopDetailsScreen />);

    expect(getByText('Departures')).toBeTruthy();
    expect(getByText('Stop ID: HSL:1234')).toBeTruthy();

    fireEvent.press(getByRole('button', { name: 'Back' }));

    expect(back).toHaveBeenCalledTimes(1);
  });

  it('builds the canonical typed href for stop departures', () => {
    expect(buildStopHref('HSL:1234')).toEqual({
      pathname: '/stop/[stopId]',
      params: { stopId: 'HSL:1234' },
    });
  });

  it('builds the canonical typed href for the showcase route', () => {
    expect(buildShowcaseHref()).toBe('/showcase');
  });

  it('builds the canonical typed href for the settings route', () => {
    expect(buildSettingsHref()).toBe('/settings');
  });

  it('redirects the showcase route to settings outside development mode', () => {
    Object.defineProperty(devGlobal, '__DEV__', {
      configurable: true,
      value: false,
      writable: true,
    });

    render(<ShowcaseRoute />);

    expect(mockRedirect).toHaveBeenCalledWith({ href: '/settings' }, undefined);
  });
});
