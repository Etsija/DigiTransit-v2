/// <reference types="jest" />

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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

jest.mock('@react-navigation/native', () => ({
  useIsFocused: jest.fn(() => true),
}));

jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');

  const MockMapView = React.forwardRef((props: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({
      animateToRegion: jest.fn(),
    }));

    return <View ref={ref} {...props} />;
  });
  MockMapView.displayName = 'MapView';

  return {
    __esModule: true,
    default: MockMapView,
    Marker: (props: any) => <View {...props} />,
    PROVIDER_GOOGLE: 'google',
  };
});

jest.mock('@/features/map/hooks/use-device-location', () => ({
  useDeviceLocation: jest.fn(() => ({
    coordinates: { latitude: 60.1699, longitude: 24.9384 },
    permission: { status: 'granted', canAskAgain: true },
    hasRequestedPermission: true,
    isFixed: true,
    isLoading: false,
    error: null,
  })),
}));

jest.mock('@/features/stops/stops-screen', () => ({
  StopsScreen: ({ isActive }: { isActive?: boolean }) => {
    const React = require('react');
    const { Text } = require('react-native');

    return <Text>{`Stops screen route (${isActive ? 'active' : 'inactive'})`}</Text>;
  },
}));

jest.mock('@/features/departures/departures-screen', () => ({
  DeparturesScreen: ({ stopId, onBack }: { stopId: string; onBack: () => void }) => {
    const React = require('react');
    const { Pressable, Text, View } = require('react-native');

    return (
      <View>
        <Text>Departures</Text>
        <Text>{`Stop ID: ${stopId}`}</Text>
        <Pressable accessibilityRole='button' accessibilityLabel='Back' onPress={onBack}>
          <Text>Back</Text>
        </Pressable>
      </View>
    );
  },
}));

jest.mock('@/core/store/settings.store', () => ({
  useSettingsStore: jest.fn(
    (
      selector: (state: {
        locationUpdateIntervalSeconds: number;
        searchRadiusMeters: number;
        stopsPollingIntervalSeconds: number;
        departuresPollingIntervalSeconds: number;
        homeStop: null;
        pushNotificationsEnabled: boolean;
        notificationLeadTimeMinutes: number;
        updateSettings: jest.Mock;
      }) => unknown
    ) =>
      selector({
        locationUpdateIntervalSeconds: 20,
        searchRadiusMeters: 250,
        stopsPollingIntervalSeconds: 20,
        departuresPollingIntervalSeconds: 10,
        homeStop: null,
        pushNotificationsEnabled: false,
        notificationLeadTimeMinutes: 10,
        updateSettings: jest.fn(),
      })
  ),
}));

jest.mock('@/core/platform/notifications', () => ({
  notificationPlatformAdapter: {
    getPermissionState: jest.fn(async () => ({
      supported: true,
      granted: false,
      canPrompt: true,
    })),
    requestPermission: jest.fn(async () => ({
      supported: true,
      granted: true,
      canPrompt: true,
    })),
    prepareRuntime: jest.fn(),
    sendImmediateNotification: jest.fn(),
  },
}));

jest.mock('@/features/notifications/hooks/use-home-stop-launch-notification', () => ({
  useHomeStopLaunchNotification: jest.fn(),
}));

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
const { useIsFocused } = jest.requireMock('@react-navigation/native') as {
  useIsFocused: jest.Mock;
};

function renderWithQueryClient(node: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        gcTime: Infinity,
        retry: false,
      },
    },
  });

  return render(<QueryClientProvider client={queryClient}>{node}</QueryClientProvider>);
}

describe('navigation route stubs', () => {
  const mockRedirect = jest.mocked(Redirect);
  const mockUseLocalSearchParams = jest.mocked(useLocalSearchParams);
  const mockUsePathname = jest.mocked(usePathname);
  const mockUseRouter = jest.mocked(useRouter);
  const originalDev = devGlobal.__DEV__;

  beforeEach(() => {
    useIsFocused.mockReturnValue(true);
    Object.defineProperty(devGlobal, '__DEV__', {
      configurable: true,
      value: true,
      writable: true,
    });

    mockUsePathname.mockReturnValue('/map');
    mockUseRouter.mockReturnValue({
      back: jest.fn(),
      navigate: jest.fn(),
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

  it('renders the map route entry point', () => {
    const { getByText } = renderWithQueryClient(<MapScreen />);

    expect(getByText('Current location')).toBeTruthy();
  });

  it('pushes the canonical stop href when the map route selects a marker', () => {
    const push = jest.fn();

    mockUseRouter.mockReturnValue({
      back: jest.fn(),
      navigate: jest.fn(),
      replace: jest.fn(),
      push,
    } as unknown as ReturnType<typeof useRouter>);

    let capturedProps:
      | {
          isActive?: boolean;
          onSelectStop?: (stopId: string) => void;
        }
      | undefined;

    jest.isolateModules(() => {
      jest.doMock('@/features/map/map-screen', () => ({
        MapScreen: (props: typeof capturedProps) => {
          capturedProps = props;
          return null;
        },
      }));

      const MapRoute = require('@/app/map').default;
      render(<MapRoute />);
    });

    capturedProps?.onSelectStop?.('HSL:1234');

    expect(push).toHaveBeenCalledWith(buildStopHref('HSL:1234'));
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

  it('renders the stops route entry point', () => {
    const { getByText } = render(<StopsScreen />);

    expect(getByText('Stops screen route (active)')).toBeTruthy();
  });

  it('renders the settings screen with diagnostics and a normal showcase action', async () => {
    useIsFocused.mockReturnValue(false);
    const { getByRole, getByText } = render(<SettingsScreen />);

    expect(getByText('Settings')).toBeTruthy();
    expect(getByText('Build diagnostics')).toBeTruthy();
    expect(getByText('Version 1.0.0')).toBeTruthy();
    expect(getByRole('button', { name: 'Open Showcase' })).toBeTruthy();
  });

  it('opens the showcase route with a single settings action tap', async () => {
    useIsFocused.mockReturnValue(false);
    const navigate = jest.fn();
    const push = jest.fn();

    mockUseRouter.mockReturnValue({
      back: jest.fn(),
      navigate,
      replace: jest.fn(),
      push,
    } as unknown as ReturnType<typeof useRouter>);

    const { getByRole } = render(<SettingsScreen />);

    fireEvent.press(getByRole('button', { name: 'Open Showcase' }));

    expect(push).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(buildShowcaseHref());
  });

  it('keeps the showcase action available in production mode', async () => {
    useIsFocused.mockReturnValue(false);
    const navigate = jest.fn();
    const push = jest.fn();

    Object.defineProperty(devGlobal, '__DEV__', {
      configurable: true,
      value: false,
      writable: true,
    });

    mockUseRouter.mockReturnValue({
      back: jest.fn(),
      navigate,
      replace: jest.fn(),
      push,
    } as unknown as ReturnType<typeof useRouter>);

    const { getByLabelText, getByRole, queryByRole } = render(<SettingsScreen />);

    expect(getByRole('button', { name: 'Open Showcase' })).toBeTruthy();
    expect(queryByRole('button', { name: 'App version 1.0.0' })).toBeNull();
    expect(getByLabelText('App version 1.0.0')).toBeTruthy();

    fireEvent.press(getByRole('button', { name: 'Open Showcase' }));

    expect(push).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(buildShowcaseHref());
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

  it('renders the showcase route outside development mode without redirecting', () => {
    Object.defineProperty(devGlobal, '__DEV__', {
      configurable: true,
      value: false,
      writable: true,
    });

    const { queryByText } = renderWithQueryClient(<ShowcaseRoute />);

    expect(mockRedirect).not.toHaveBeenCalled();
    expect(queryByText('redirect:/settings')).toBeNull();
  });
});
