/// <reference types="jest" />

import { render } from '@testing-library/react-native';
import React from 'react';

import { PlatformMapView } from '@/core/platform/maps/map-view.native';

const mockAnimateToRegion = jest.fn();

jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');

  const MockMapView = React.forwardRef((props: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({
      animateToRegion: mockAnimateToRegion,
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

describe('PlatformMapView native', () => {
  beforeEach(() => {
    mockAnimateToRegion.mockClear();
  });

  it('renders a live map surface with user location and dark style configuration', () => {
    const { getByTestId } = render(
      <PlatformMapView latitude={60.1699} longitude={24.9384} showUserLocation />
    );

    const mapView = getByTestId('live-map-surface');

    expect(mapView.props.showsUserLocation).toBe(true);
    expect(mapView.props.customMapStyle).toEqual(expect.any(Array));
    expect(mapView.props.customMapStyle.length).toBeGreaterThan(0);
    expect(mapView.props.initialRegion).toMatchObject({
      latitude: 60.1699,
      longitude: 24.9384,
    });
  });

  it('recentres imperatively when coordinates change instead of controlling region props', () => {
    const { rerender } = render(
      <PlatformMapView latitude={60.1699} longitude={24.9384} showUserLocation />
    );

    rerender(<PlatformMapView latitude={60.1711} longitude={24.9412} showUserLocation />);

    expect(mockAnimateToRegion).toHaveBeenCalledWith(
      expect.objectContaining({
        latitude: 60.1711,
        longitude: 24.9412,
      }),
      250
    );
  });

  it('accepts marker scaffolding without changing the adapter boundary again', () => {
    const { getByLabelText } = render(
      <PlatformMapView
        latitude={60.1699}
        longitude={24.9384}
        markers={[
          {
            id: 'stop-1',
            latitude: 60.17,
            longitude: 24.94,
            accessibilityLabel: 'Central Railway stop',
          },
        ]}
        showUserLocation
      />
    );

    expect(getByLabelText('Central Railway stop')).toBeTruthy();
  });
});
