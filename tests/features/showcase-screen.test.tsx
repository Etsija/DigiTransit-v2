/// <reference types="jest" />

import { fireEvent, render } from '@testing-library/react-native';
import { useRouter } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

import { ShowcaseScreen } from '@/features/showcase/showcase-screen';
import { buildSettingsHref } from '@/types/navigation';

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');
  const SafeAreaView = React.forwardRef((props: any, ref: any) => <View ref={ref} {...props} />);
  SafeAreaView.displayName = 'SafeAreaView';
  return {
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

jest.mock('expo-linear-gradient', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    LinearGradient: (props: any) => <View {...props} />,
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
  useRouter: jest.fn(),
}));

describe('ShowcaseScreen', () => {
  const mockUseRouter = jest.mocked(useRouter);

  beforeEach(() => {
    mockUseRouter.mockReturnValue({
      back: jest.fn(),
      replace: jest.fn(),
    } as unknown as ReturnType<typeof useRouter>);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the required showcase sections and variant labels', () => {
    const { getAllByLabelText, getAllByText, getByText, getByLabelText } = render(
      <ShowcaseScreen />
    );

    expect(getByText('Showcase')).toBeTruthy();
    expect(getByText('GlassCard')).toBeTruthy();
    expect(getByText('CoordinatesBar')).toBeTruthy();
    expect(getByText('StopCard')).toBeTruthy();
    expect(getByText('DepartureCard')).toBeTruthy();
    expect(getByText('MapMarker')).toBeTruthy();
    expect(getByText('ErrorBanner')).toBeTruthy();
    expect(getByText('EmptyState')).toBeTruthy();
    expect(getByText('DepartureNotificationDialog')).toBeTruthy();
    expect(getAllByText('Asema-aukio 1, Helsinki').length).toBeGreaterThan(0);
    expect(getAllByText('Pinned').length).toBeGreaterThan(0);
    expect(getAllByText('Notification scheduled').length).toBeGreaterThan(0);
    expect(getByText('600')).toBeTruthy();
    expect(getByLabelText('Notification scheduled')).toBeTruthy();
    expect(
      getAllByLabelText('Asema-aukio 1, Helsinki, bus, stop, HSL:1001, 120 m').length
    ).toBeGreaterThan(0);
    expect(getByLabelText('Bus marker tapped')).toBeTruthy();
  });

  it('returns to settings when the back action is pressed', () => {
    const replace = jest.fn();

    mockUseRouter.mockReturnValue({
      back: jest.fn(),
      replace,
    } as unknown as ReturnType<typeof useRouter>);

    const { getByRole } = render(<ShowcaseScreen />);

    fireEvent.press(getByRole('button', { name: 'Back to Settings' }));

    expect(replace).toHaveBeenCalledWith(buildSettingsHref());
  });
});
