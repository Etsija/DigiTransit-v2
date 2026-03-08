/// <reference types="jest" />

import { fireEvent, render } from '@testing-library/react-native';
import { Redirect, useLocalSearchParams, usePathname, useRouter } from 'expo-router';
import React from 'react';

import IndexRoute from '@/app/index';
import MapScreen from '@/app/map';
import SettingsScreen from '@/app/settings';
import StopDetailsScreen from '@/app/stop/[stopId]';
import StopsScreen from '@/app/stops';
import AppTabs from '@/components/app-tabs';
import AppTabsWeb from '@/components/app-tabs.web';
import { buildStopHref } from '@/types/navigation';

jest.mock('expo-router', () => ({
  Stack: Object.assign(({ children }: { children?: React.ReactNode }) => <>{children}</>, {
    Screen: jest.fn(() => null),
  }),
  Redirect: jest.fn(({ href }) => `redirect:${href}`),
  useLocalSearchParams: jest.fn(),
  usePathname: jest.fn(),
  useRouter: jest.fn(),
}));

describe('navigation route stubs', () => {
  const mockRedirect = jest.mocked(Redirect);
  const mockUseLocalSearchParams = jest.mocked(useLocalSearchParams);
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

  it('renders the settings stub screen', () => {
    const { getByText } = render(<SettingsScreen />);

    expect(getByText('Settings')).toBeTruthy();
    expect(getByText('Settings screen stub')).toBeTruthy();
  });

  it('renders the web tab shell with the three primary tabs only', () => {
    const { getByText, queryByText } = render(<AppTabsWeb />);

    expect(getByText('Map')).toBeTruthy();
    expect(getByText('Stops')).toBeTruthy();
    expect(getByText('Settings')).toBeTruthy();
    expect(queryByText('Departures')).toBeNull();
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
});
