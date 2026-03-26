import React, { useEffect, useRef } from 'react';
import { Platform, StyleSheet, View, type NativeSyntheticEvent } from 'react-native';
import MapView, { Circle, Marker, PROVIDER_GOOGLE, type Region } from 'react-native-maps';

import { getIosGoogleMapsApiKey } from '@/core/config/env';
import { MAP_REGION_DELTA } from '@/features/map/constants';
import { MapMarker } from '@/shared/components/map-marker';
import { nativeDarkMapStyle } from '@/shared/theme/map-theme';
import { theme } from '@/shared/theme/theme';
import type { PlatformMapViewProps } from './types';

type NativePanDragEvent = NativeSyntheticEvent<{
  coordinate: {
    latitude: number;
    longitude: number;
  };
  numberOfTouches?: number;
  position?: {
    x: number;
    y: number;
  };
}>;

function buildRegion(
  latitude: number,
  longitude: number,
  latitudeDelta: number = MAP_REGION_DELTA.latitudeDelta,
  longitudeDelta: number = MAP_REGION_DELTA.longitudeDelta
): Region {
  return {
    latitude,
    longitude,
    latitudeDelta,
    longitudeDelta,
  };
}

function shouldUseGoogleProvider() {
  return Platform.OS === 'android' || getIosGoogleMapsApiKey().length > 0;
}

const ZOOM_CHANGE_THRESHOLD = 0.08;

function getZoomChangeRatio(reference: Region, next: Region) {
  const latitudeRatio =
    Math.abs(next.latitudeDelta - reference.latitudeDelta) /
    Math.max(reference.latitudeDelta, Number.EPSILON);
  const longitudeRatio =
    Math.abs(next.longitudeDelta - reference.longitudeDelta) /
    Math.max(reference.longitudeDelta, Number.EPSILON);

  return Math.max(latitudeRatio, longitudeRatio);
}

export function PlatformMapView({
  latitude,
  longitude,
  camera,
  liveLocationCoordinates,
  queryRadiusCircle = null,
  mode = 'live',
  recenterRequestKey = 0,
  markers = [],
  onMapReady,
  onUserInteractionStart,
  onUserCenterChange,
  showUserLocation,
}: PlatformMapViewProps) {
  const initialRegion = buildRegion(latitude, longitude);
  const mapRef = useRef<MapView | null>(null);
  const tracksViewChangesTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isUserInteractingRef = useRef(false);
  const gestureTouchCountRef = useRef(0);
  const lastSettledRegionRef = useRef(initialRegion);
  const lastRecenterRequestKeyRef = useRef(recenterRequestKey);
  const suppressNextRegionChangeRef = useRef(false);
  const [tracksViewChanges, setTracksViewChanges] = React.useState(markers.length > 0);
  const liveFollowLatRef = useRef(latitude);
  const liveFollowLonRef = useRef(longitude);

  useEffect(() => {
    if (mode !== 'live') {
      liveFollowLatRef.current = latitude;
      liveFollowLonRef.current = longitude;
      return;
    }

    if (latitude === liveFollowLatRef.current && longitude === liveFollowLonRef.current) {
      return;
    }

    // Don't fight an in-progress pan gesture.
    if (isUserInteractingRef.current) {
      return;
    }

    liveFollowLatRef.current = latitude;
    liveFollowLonRef.current = longitude;
    suppressNextRegionChangeRef.current = true;
    mapRef.current?.animateToRegion(buildRegion(latitude, longitude), 500);
  }, [latitude, longitude, mode]);

  useEffect(() => {
    const isExplicitRecenter = recenterRequestKey !== lastRecenterRequestKeyRef.current;
    lastRecenterRequestKeyRef.current = recenterRequestKey;

    if (!camera || (isUserInteractingRef.current && !isExplicitRecenter)) {
      return;
    }

    suppressNextRegionChangeRef.current = true;
    mapRef.current?.animateToRegion(
      buildRegion(camera.latitude, camera.longitude, camera.latitudeDelta, camera.longitudeDelta),
      250
    );
  }, [
    camera,
    camera?.latitude,
    camera?.latitudeDelta,
    camera?.longitude,
    camera?.longitudeDelta,
    recenterRequestKey,
  ]);

  useEffect(() => {
    if (tracksViewChangesTimeoutRef.current) {
      clearTimeout(tracksViewChangesTimeoutRef.current);
      tracksViewChangesTimeoutRef.current = null;
    }

    if (markers.length === 0) {
      setTracksViewChanges(false);
      return;
    }

    setTracksViewChanges(true);
    tracksViewChangesTimeoutRef.current = setTimeout(() => {
      setTracksViewChanges(false);
      tracksViewChangesTimeoutRef.current = null;
    }, 250);

    return () => {
      if (tracksViewChangesTimeoutRef.current) {
        clearTimeout(tracksViewChangesTimeoutRef.current);
        tracksViewChangesTimeoutRef.current = null;
      }
    };
  }, [markers]);

  const shouldHandleGestureRegion = (details?: { isGesture?: boolean }) => {
    if (suppressNextRegionChangeRef.current) {
      return false;
    }

    if (details && 'isGesture' in details && !details.isGesture) {
      return false;
    }

    if (gestureTouchCountRef.current > 1) {
      return false;
    }

    return true;
  };

  return (
    <View style={styles.container}>
      <MapView
        customMapStyle={nativeDarkMapStyle}
        initialRegion={initialRegion}
        onMapReady={onMapReady}
        onPanDrag={(event: NativePanDragEvent) => {
          const touchCount = event.nativeEvent.numberOfTouches ?? 1;
          gestureTouchCountRef.current = touchCount;

          // Native pan events expose touch count, but pinch gestures can still shift the
          // center. Defer the detach signal until region changes confirm that zoom stayed
          // roughly stable and the gesture looks like a drag rather than a pinch.
          if (touchCount > 1) {
            isUserInteractingRef.current = false;
            return;
          }

          isUserInteractingRef.current = true;
        }}
        onRegionChange={(region, details) => {
          if (
            mode !== 'detached' ||
            !isUserInteractingRef.current ||
            !shouldHandleGestureRegion(details)
          ) {
            return;
          }

          onUserCenterChange?.({
            latitude: region.latitude,
            longitude: region.longitude,
          });
        }}
        onRegionChangeComplete={(region, details) => {
          if (suppressNextRegionChangeRef.current) {
            suppressNextRegionChangeRef.current = false;
            lastSettledRegionRef.current = region;
            return;
          }

          const shouldHandleGesture = shouldHandleGestureRegion(details);
          const shouldCommitLiveDetach =
            mode === 'live' &&
            isUserInteractingRef.current &&
            shouldHandleGesture &&
            getZoomChangeRatio(lastSettledRegionRef.current, region) <= ZOOM_CHANGE_THRESHOLD;

          if (shouldCommitLiveDetach) {
            onUserInteractionStart?.({ kind: 'pan' });
            onUserCenterChange?.({
              latitude: region.latitude,
              longitude: region.longitude,
            });
          }

          lastSettledRegionRef.current = region;
          isUserInteractingRef.current = false;
          gestureTouchCountRef.current = 0;
        }}
        provider={shouldUseGoogleProvider() ? PROVIDER_GOOGLE : undefined}
        ref={mapRef}
        showsCompass={false}
        showsMyLocationButton={false}
        showsUserLocation={false}
        style={styles.map}
        testID='live-map-surface'
      >
        {showUserLocation && liveLocationCoordinates ? (
          <Marker
            accessibilityLabel='Current live location'
            anchor={{ x: 0.5, y: 0.5 }}
            coordinate={liveLocationCoordinates}
            testID='map-live-location-marker'
          >
            <View style={styles.liveLocationMarkerShell}>
              <View style={styles.liveLocationMarkerCore} />
            </View>
          </Marker>
        ) : null}
        {queryRadiusCircle ? (
          <Circle
            center={queryRadiusCircle.center}
            fillColor={`${theme.colors.link.primary}14`}
            radius={queryRadiusCircle.radiusMeters}
            strokeColor={`${theme.colors.link.primary}55`}
            strokeWidth={1}
            testID='map-query-radius-circle'
          />
        ) : null}
        {markers.map((marker) => (
          <Marker
            accessibilityLabel={marker.accessibilityLabel}
            anchor={{ x: 0.5, y: 0.5 }}
            coordinate={{ latitude: marker.latitude, longitude: marker.longitude }}
            key={marker.id}
            onPress={marker.onPress}
            testID={`map-marker-${marker.id}`}
            tracksViewChanges={tracksViewChanges}
          >
            <MapMarker
              isHomeStop={marker.isHomeStop}
              label={marker.accessibilityLabel ?? marker.id}
              size={marker.size}
              transportMode={marker.transportMode}
            />
          </Marker>
        ))}
      </MapView>
      {mode === 'detached' ? (
        <View pointerEvents='none' style={styles.centerTarget} testID='map-detached-center-marker'>
          <View style={styles.centerTargetOuter}>
            <View style={styles.centerTargetInner} />
          </View>
        </View>
      ) : null}
    </View>
  );
}

export { nativeDarkMapStyle as DARK_MAP_STYLE };

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  liveLocationMarkerShell: {
    width: 18,
    height: 18,
    borderRadius: theme.radius.pill,
    backgroundColor: `${theme.colors.status.realtime}33`,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: theme.borderWidth.subtle,
    borderColor: `${theme.colors.status.realtime}66`,
  },
  liveLocationMarkerCore: {
    width: 10,
    height: 10,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.status.realtime,
  },
  centerTarget: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerTargetOuter: {
    width: 26,
    height: 26,
    borderRadius: theme.radius.pill,
    borderWidth: 2,
    borderColor: theme.colors.link.primary,
    backgroundColor: '#00000033',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerTargetInner: {
    width: 10,
    height: 10,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.link.primary,
  },
});
