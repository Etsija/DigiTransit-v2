/// <reference types="jest" />

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render } from '@testing-library/react-native';
import { useRouter } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

import { ShowcaseScreen } from '@/features/showcase/showcase-screen';
import { buildSettingsHref } from '@/types/navigation';

jest.mock('@/features/showcase/live-api-section', () => ({
  LiveApiSection: () => {
    const React = require('react');
    const { View } = require('react-native');

    return <View accessibilityLabel='Live API section stub' />;
  },
}));

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

  function renderScreen() {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          gcTime: Infinity,
          retry: false,
        },
      },
    });

    return render(
      <QueryClientProvider client={queryClient}>
        <ShowcaseScreen />
      </QueryClientProvider>
    );
  }

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
    const { getAllByLabelText, getAllByText, getByText, getByLabelText } = renderScreen();

    expect(getByText('Showcase')).toBeTruthy();
    expect(getByText('GlassCard')).toBeTruthy();
    expect(getByText('CoordinatesBar')).toBeTruthy();
    expect(getByText('StopCard')).toBeTruthy();
    expect(getByText('DepartureCard')).toBeTruthy();
    expect(getByText('MapMarker')).toBeTruthy();
    expect(getByText('ErrorBanner')).toBeTruthy();
    expect(getByText('EmptyState')).toBeTruthy();
    expect(getByText('DepartureNotificationDialog')).toBeTruthy();
    expect(getByText('Live API')).toBeTruthy();
    expect(getAllByText('Asema-aukio 1, Helsinki').length).toBeGreaterThan(0);
    expect(getAllByText('Pinned').length).toBeGreaterThan(0);
    expect(getAllByText('Notification scheduled').length).toBeGreaterThan(0);
    expect(getByText('600')).toBeTruthy();
    expect(getByLabelText('Notification scheduled')).toBeTruthy();
    expect(
      getAllByLabelText(
        'Asema-aukio 1, Helsinki, bus, stop, HSL:1001, Zone A, towards Kamppi, patterns 600 to Helsinki Airport, 615'
      ).length
    ).toBeGreaterThan(0);
    expect(getByLabelText('Bus marker tapped')).toBeTruthy();
  });

  it('returns to settings when the back action is pressed', () => {
    const replace = jest.fn();

    mockUseRouter.mockReturnValue({
      back: jest.fn(),
      replace,
    } as unknown as ReturnType<typeof useRouter>);

    const { getByRole } = renderScreen();

    fireEvent.press(getByRole('button', { name: 'Back to Settings' }));

    expect(replace).toHaveBeenCalledWith(buildSettingsHref());
  });
});
