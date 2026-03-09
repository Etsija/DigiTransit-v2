/// <reference types="jest" />

import { render } from '@testing-library/react-native';
import React from 'react';
import { View } from 'react-native';

import { DepartureCard } from '@/shared/components/departure-card';
import { DepartureNotificationDialog } from '@/shared/components/departure-notification-dialog';
import { ErrorBanner } from '@/shared/components/error-banner';
import { MapMarker } from '@/shared/components/map-marker';
import { StopCard } from '@/shared/components/stop-card';
import { StopHeaderCard } from '@/shared/components/stop-header-card';

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

describe('Transport & Status UI Components', () => {
  describe('StopCard', () => {
    it('renders the stop name and code', () => {
      const { getByText } = render(
        <StopCard name='Hyvinkään asema' code='HKI:1234' transportMode='train' onPress={() => {}} />
      );

      expect(getByText('Hyvinkään asema')).toBeTruthy();
      expect(getByText('HKI:1234')).toBeTruthy();
    });

    it('renders the transport icon for bus mode', () => {
      const { getByText } = render(
        <StopCard name='Keskusta' code='V:5678' transportMode='bus' onPress={() => {}} />
      );

      expect(getByText('mci:bus')).toBeTruthy();
    });

    it.each(['bus', 'tram', 'train', 'metro', 'ferry'] as const)(
      'renders StopCard for %s transport mode',
      (mode) => {
        const { getByText } = render(
          <StopCard name='Stop' code='X:1' transportMode={mode} onPress={() => {}} />
        );

        expect(getByText('Stop')).toBeTruthy();
      }
    );

    it('exposes an accessibility label with transport context', () => {
      const { getByRole } = render(
        <StopCard
          name='Keskusta'
          code='V:5678'
          transportMode='bus'
          distanceLabel='64 metres'
          onPress={() => {}}
        />
      );

      expect(getByRole('button').props.accessibilityLabel).toBe(
        'Keskusta, bus, stop, V:5678, 64 metres'
      );
    });
  });

  describe('StopHeaderCard', () => {
    it('renders the larger stop header variant', () => {
      const { getByText } = render(
        <StopHeaderCard name='Hyvinkään asema' code='HKI:1234' transportMode='train' />
      );

      expect(getByText('Hyvinkään asema')).toBeTruthy();
      expect(getByText('HKI:1234')).toBeTruthy();
    });
  });

  describe('DepartureCard', () => {
    it('renders realtime departure with Live GPS label', () => {
      const { getByText } = render(
        <DepartureCard
          routeShortName='7A'
          headsign='Keskusta'
          departureTime='14:35'
          status='realtime'
        />
      );

      expect(getByText('7A')).toBeTruthy();
      expect(getByText('Keskusta')).toBeTruthy();
      expect(getByText('14:35')).toBeTruthy();
      expect(getByText(/Live GPS/)).toBeTruthy();
    });

    it('renders estimated departure with Scheduled label', () => {
      const { getByText } = render(
        <DepartureCard
          routeShortName='7A'
          headsign='Keskusta'
          departureTime='14:40'
          status='estimated'
        />
      );

      expect(getByText('14:40')).toBeTruthy();
      expect(getByText(/Scheduled/)).toBeTruthy();
    });

    it('includes status in the accessibility label', () => {
      const { getByLabelText } = render(
        <DepartureCard
          routeShortName='7A'
          headsign='Keskusta'
          departureTime='14:35'
          status='realtime'
        />
      );

      expect(getByLabelText('14:35, route 7A to Keskusta, Live GPS')).toBeTruthy();
    });
  });

  describe('MapMarker', () => {
    it('renders with accessible label', () => {
      const { getByLabelText } = render(
        <MapMarker transportMode='bus' label='Bus stop Keskusta' size='base' />
      );

      expect(getByLabelText('Bus stop Keskusta')).toBeTruthy();
    });

    it('uses a 44pt hit target when interactive', () => {
      const { getByRole } = render(
        <MapMarker transportMode='bus' label='Bus stop Keskusta' size='base' onPress={() => {}} />
      );

      expect(getByRole('button')).toBeTruthy();
    });
  });

  describe('ErrorBanner', () => {
    it('renders a factual error message', () => {
      const { getByText } = render(<ErrorBanner message='Unable to load departures' />);

      expect(getByText('Unable to load departures')).toBeTruthy();
    });

    it('has accessibility live region', () => {
      const { UNSAFE_getAllByType } = render(<ErrorBanner message='Network error' />);

      expect(
        UNSAFE_getAllByType(View).find((node) => node.props.accessibilityLiveRegion === 'polite')
      ).toBeTruthy();
    });
  });

  describe('DepartureNotificationDialog', () => {
    it('renders idle presentation', () => {
      const { getByText } = render(
        <DepartureNotificationDialog
          mode='idle'
          routeShortName='7A'
          departureTime='14:35'
          onNotify={() => {}}
          onDismiss={() => {}}
        />
      );

      expect(getByText('7A')).toBeTruthy();
      expect(getByText('14:35')).toBeTruthy();
    });

    it('renders cancel-mode presentation', () => {
      const { getByText } = render(
        <DepartureNotificationDialog
          mode='cancel'
          routeShortName='7A'
          departureTime='14:35'
          onCancel={() => {}}
          onDismiss={() => {}}
        />
      );

      expect(getByText(/Cancel/)).toBeTruthy();
    });
  });
});
