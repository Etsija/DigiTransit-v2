/// <reference types="jest" />

import { act, fireEvent, render } from '@testing-library/react-native';
import React from 'react';

import { PlatformMapView } from '@/core/platform/maps/map-view.native';
import { MAP_REGION_DELTA } from '@/features/map/constants';

const mockAnimateToRegion = jest.fn();

jest.mock('@/shared/icons', () => ({
  TransportIcon: () => null,
}));

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
    Circle: (props: any) => <View {...props} />,
    Marker: (props: any) => <View {...props} />,
    PROVIDER_GOOGLE: 'google',
  };
});

describe('PlatformMapView native', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockAnimateToRegion.mockClear();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('renders a live map surface with user location and dark style configuration', () => {
    const { getByTestId } = render(
      <PlatformMapView
        latitude={60.1699}
        liveLocationCoordinates={{ latitude: 60.1699, longitude: 24.9384 }}
        longitude={24.9384}
        showUserLocation
      />
    );

    const mapView = getByTestId('live-map-surface');

    expect(mapView.props.showsUserLocation).toBe(false);
    expect(mapView.props.customMapStyle).toEqual(expect.any(Array));
    expect(mapView.props.customMapStyle.length).toBeGreaterThan(0);
    expect(mapView.props.initialRegion).toMatchObject({
      latitude: 60.1699,
      longitude: 24.9384,
    });
    expect(getByTestId('map-live-location-marker')).toBeTruthy();
  });

  it('does not imperatively recenter when only center props change without an explicit camera request', () => {
    const { rerender } = render(
      <PlatformMapView latitude={60.1699} longitude={24.9384} showUserLocation />
    );

    mockAnimateToRegion.mockClear();

    rerender(<PlatformMapView latitude={60.1711} longitude={24.9412} showUserLocation />);

    expect(mockAnimateToRegion).not.toHaveBeenCalled();
  });

  it('recentres imperatively again when the recenter request changes without coordinate changes', () => {
    const { rerender } = render(
      <PlatformMapView
        latitude={60.1699}
        camera={{
          latitude: 60.1699,
          longitude: 24.9384,
          latitudeDelta: 0.025,
          longitudeDelta: 0.025,
        }}
        longitude={24.9384}
        recenterRequestKey={0}
        showUserLocation
      />
    );

    mockAnimateToRegion.mockClear();

    rerender(
      <PlatformMapView
        latitude={60.1699}
        camera={{
          latitude: 60.1699,
          longitude: 24.9384,
          latitudeDelta: 0.025,
          longitudeDelta: 0.025,
        }}
        longitude={24.9384}
        recenterRequestKey={1}
        showUserLocation
      />
    );

    expect(mockAnimateToRegion).toHaveBeenCalledWith(
      expect.objectContaining({
        latitude: 60.1699,
        longitude: 24.9384,
      }),
      250
    );
  });

  it('accepts marker scaffolding without changing the adapter boundary again', () => {
    const onPress = jest.fn();
    const { getAllByLabelText, getByTestId } = render(
      <PlatformMapView
        latitude={60.1699}
        longitude={24.9384}
        markers={[
          {
            id: 'stop-1',
            latitude: 60.17,
            longitude: 24.94,
            size: 44,
            transportMode: 'bus',
            accessibilityLabel: 'Central Railway stop',
            onPress,
          },
        ]}
        showUserLocation
      />
    );

    expect(getAllByLabelText('Central Railway stop').length).toBeGreaterThan(0);
    expect(getByTestId('map-marker-stop-1').props.tracksViewChanges).toBe(true);

    fireEvent.press(getByTestId('map-marker-stop-1'));

    expect(onPress).toHaveBeenCalledTimes(1);

    act(() => {
      jest.advanceTimersByTime(250);
    });

    expect(getByTestId('map-marker-stop-1').props.tracksViewChanges).toBe(false);
  });

  it('commits live detach on pan completion and ignores programmatic recenter callbacks', () => {
    const onUserCenterChange = jest.fn();
    const onUserInteractionStart = jest.fn();
    const { getByTestId, rerender } = render(
      <PlatformMapView
        latitude={60.1699}
        longitude={24.9384}
        onUserInteractionStart={onUserInteractionStart}
        onUserCenterChange={onUserCenterChange}
        camera={{
          latitude: 60.1699,
          longitude: 24.9384,
          latitudeDelta: 0.025,
          longitudeDelta: 0.025,
        }}
        recenterRequestKey={0}
        showUserLocation
      />
    );

    fireEvent(getByTestId('live-map-surface'), 'onPanDrag', {
      nativeEvent: { numberOfTouches: 1 },
    });

    expect(onUserInteractionStart).not.toHaveBeenCalled();

    fireEvent(getByTestId('live-map-surface'), 'onRegionChangeComplete', {
      latitude: 60.1699,
      longitude: 24.9384,
      latitudeDelta: MAP_REGION_DELTA.latitudeDelta,
      longitudeDelta: MAP_REGION_DELTA.longitudeDelta,
    });

    expect(onUserCenterChange).not.toHaveBeenCalled();

    fireEvent(
      getByTestId('live-map-surface'),
      'onRegionChangeComplete',
      {
        latitude: 60.175,
        longitude: 24.945,
        latitudeDelta: MAP_REGION_DELTA.latitudeDelta,
        longitudeDelta: MAP_REGION_DELTA.longitudeDelta,
      },
      { isGesture: true }
    );

    expect(onUserInteractionStart).toHaveBeenCalledTimes(1);
    expect(onUserCenterChange).toHaveBeenCalledWith({
      latitude: 60.175,
      longitude: 24.945,
    });

    rerender(
      <PlatformMapView
        latitude={60.1711}
        longitude={24.9412}
        onUserInteractionStart={onUserInteractionStart}
        onUserCenterChange={onUserCenterChange}
        camera={{
          latitude: 60.1711,
          longitude: 24.9412,
          latitudeDelta: 0.025,
          longitudeDelta: 0.025,
        }}
        recenterRequestKey={1}
        showUserLocation
      />
    );

    fireEvent(getByTestId('live-map-surface'), 'onRegionChangeComplete', {
      latitude: 60.1711,
      longitude: 24.9412,
    });

    expect(onUserCenterChange).toHaveBeenCalledTimes(1);
  });

  it('does not imperatively recenter from prop updates while the user is dragging', () => {
    const { getByTestId, rerender } = render(
      <PlatformMapView latitude={60.1699} longitude={24.9384} showUserLocation />
    );

    mockAnimateToRegion.mockClear();

    fireEvent(getByTestId('live-map-surface'), 'onPanDrag', {
      nativeEvent: { numberOfTouches: 1 },
    });

    rerender(<PlatformMapView latitude={60.1711} longitude={24.9412} showUserLocation />);

    expect(mockAnimateToRegion).not.toHaveBeenCalled();
  });

  it('renders a detached center overlay when the adapter is in detached mode', () => {
    const { getByTestId } = render(
      <PlatformMapView latitude={60.1699} longitude={24.9384} mode='detached' showUserLocation />
    );

    expect(getByTestId('map-detached-center-marker')).toBeTruthy();
  });

  it('ignores multi-touch pan drag callbacks so pinch zoom does not start detached mode', () => {
    const onUserCenterChange = jest.fn();
    const onUserInteractionStart = jest.fn();
    const { getByTestId } = render(
      <PlatformMapView
        latitude={60.1699}
        longitude={24.9384}
        onUserInteractionStart={onUserInteractionStart}
        onUserCenterChange={onUserCenterChange}
        showUserLocation
      />
    );

    fireEvent(getByTestId('live-map-surface'), 'onPanDrag', {
      nativeEvent: { numberOfTouches: 2 },
    });
    getByTestId('live-map-surface').props.onRegionChange(
      {
        latitude: 60.175,
        longitude: 24.945,
      },
      { isGesture: true }
    );

    expect(onUserInteractionStart).not.toHaveBeenCalled();
    expect(onUserCenterChange).not.toHaveBeenCalled();
  });

  it('ignores gesture region changes in live mode until a pan interaction has started', () => {
    const onUserCenterChange = jest.fn();
    const { getByTestId } = render(
      <PlatformMapView
        latitude={60.1699}
        longitude={24.9384}
        onUserCenterChange={onUserCenterChange}
        showUserLocation
      />
    );

    getByTestId('live-map-surface').props.onRegionChange(
      {
        latitude: 60.175,
        longitude: 24.945,
      },
      { isGesture: true }
    );

    fireEvent(
      getByTestId('live-map-surface'),
      'onRegionChangeComplete',
      {
        latitude: 60.175,
        longitude: 24.945,
      },
      { isGesture: true }
    );

    expect(onUserCenterChange).not.toHaveBeenCalled();
  });

  it('does not confirm a detach interaction when the gesture also changes zoom level', () => {
    const onUserCenterChange = jest.fn();
    const onUserInteractionStart = jest.fn();
    const { getByTestId } = render(
      <PlatformMapView
        latitude={60.1699}
        longitude={24.9384}
        onUserCenterChange={onUserCenterChange}
        onUserInteractionStart={onUserInteractionStart}
        showUserLocation
      />
    );

    fireEvent(getByTestId('live-map-surface'), 'onPanDrag', {
      nativeEvent: { numberOfTouches: 1 },
    });

    fireEvent(
      getByTestId('live-map-surface'),
      'onRegionChangeComplete',
      {
        latitude: 60.175,
        longitude: 24.945,
        latitudeDelta: 0.015,
        longitudeDelta: 0.015,
      },
      { isGesture: true }
    );

    expect(onUserInteractionStart).not.toHaveBeenCalled();
    expect(onUserCenterChange).not.toHaveBeenCalled();
  });

  it('keeps publishing center changes while panning in detached mode', () => {
    const onUserCenterChange = jest.fn();
    const { getByTestId } = render(
      <PlatformMapView
        latitude={60.1699}
        longitude={24.9384}
        mode='detached'
        onUserCenterChange={onUserCenterChange}
        showUserLocation
      />
    );

    fireEvent(getByTestId('live-map-surface'), 'onPanDrag', {
      nativeEvent: { numberOfTouches: 1 },
    });

    getByTestId('live-map-surface').props.onRegionChange(
      {
        latitude: 60.175,
        longitude: 24.945,
        latitudeDelta: 0.025,
        longitudeDelta: 0.025,
      },
      { isGesture: true }
    );

    expect(onUserCenterChange).toHaveBeenCalledWith({
      latitude: 60.175,
      longitude: 24.945,
    });
  });

  it('renders the configured query radius circle without replacing other overlays', () => {
    const { getByTestId } = render(
      <PlatformMapView
        latitude={60.1699}
        longitude={24.9384}
        mode='detached'
        queryRadiusCircle={{
          center: { latitude: 60.1699, longitude: 24.9384 },
          radiusMeters: 250,
        }}
        showUserLocation
      />
    );

    expect(getByTestId('map-query-radius-circle').props.radius).toBe(250);
    expect(getByTestId('map-detached-center-marker')).toBeTruthy();
  });
});
