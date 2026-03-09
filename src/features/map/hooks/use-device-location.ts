import {
  Accuracy,
  getCurrentPositionAsync,
  getForegroundPermissionsAsync,
  getLastKnownPositionAsync,
  requestForegroundPermissionsAsync,
  watchPositionAsync,
  type LocationObject,
  type LocationPermissionResponse,
  type LocationSubscription,
} from 'expo-location';
import { useEffect, useRef, useState } from 'react';

type Coordinates = {
  latitude: number;
  longitude: number;
};

type DeviceLocationPermission = {
  status: 'idle' | LocationPermissionResponse['status'];
  canAskAgain: boolean;
};

type UseDeviceLocationOptions = {
  intervalSeconds: number;
  isActive: boolean;
};

type UseDeviceLocationResult = {
  coordinates: Coordinates | null;
  permission: DeviceLocationPermission;
  isFixed: boolean;
  isLoading: boolean;
  error: string | null;
};

const DEFAULT_PERMISSION: DeviceLocationPermission = {
  status: 'idle',
  canAskAgain: true,
};

function toCoordinates(location: LocationObject): Coordinates {
  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
  };
}

function toPermissionState(response: LocationPermissionResponse): DeviceLocationPermission {
  return {
    status: response.status,
    canAskAgain: response.canAskAgain,
  };
}

export function useDeviceLocation({
  intervalSeconds,
  isActive,
}: UseDeviceLocationOptions): UseDeviceLocationResult {
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [permission, setPermission] = useState<DeviceLocationPermission>(DEFAULT_PERMISSION);
  const [isFixed, setIsFixed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasRequestedPermissionRef = useRef(false);
  const hasAcquiredLocationRef = useRef(false);
  const subscriptionRef = useRef<LocationSubscription | null>(null);

  useEffect(() => {
    function clearWatcher() {
      subscriptionRef.current?.remove();
      subscriptionRef.current = null;
    }

    function applyLocation(location: LocationObject, fixed: boolean) {
      hasAcquiredLocationRef.current = true;
      setCoordinates(toCoordinates(location));
      setIsFixed(fixed);
    }

    if (!isActive) {
      clearWatcher();
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function startTracking() {
      try {
        setIsLoading(true);
        setError(null);
        clearWatcher();

        const currentPermission = await getForegroundPermissionsAsync();
        if (cancelled) {
          return;
        }

        let resolvedPermission = currentPermission;

        if (currentPermission.status === 'undetermined' && !hasRequestedPermissionRef.current) {
          hasRequestedPermissionRef.current = true;
          resolvedPermission = await requestForegroundPermissionsAsync();
          if (cancelled) {
            return;
          }
        }

        setPermission(toPermissionState(resolvedPermission));

        if (!resolvedPermission.granted) {
          hasAcquiredLocationRef.current = false;
          setCoordinates(null);
          setIsFixed(false);
          setIsLoading(false);
          return;
        }

        const lastKnown = await getLastKnownPositionAsync();
        if (!cancelled && lastKnown) {
          applyLocation(lastKnown, false);
        }

        try {
          const currentFix = await getCurrentPositionAsync({
            accuracy: Accuracy.Balanced,
          });

          if (!cancelled) {
            applyLocation(currentFix, true);
          }
        } catch (currentError) {
          if (!cancelled) {
            setError(
              currentError instanceof Error
                ? currentError.message
                : 'Unable to acquire a fresh location fix.'
            );
          }
        }

        const nextSubscription = await watchPositionAsync(
          {
            accuracy: Accuracy.Balanced,
            timeInterval: intervalSeconds * 1000,
            distanceInterval: 0,
          },
          (nextLocation) => {
            applyLocation(nextLocation, true);
            setError(null);
          }
        );

        if (cancelled) {
          nextSubscription.remove();
          return;
        }

        subscriptionRef.current = nextSubscription;
      } catch (locationError) {
        if (!cancelled) {
          if (!hasAcquiredLocationRef.current) {
            setCoordinates(null);
            setIsFixed(false);
          }
          setError(
            locationError instanceof Error
              ? locationError.message
              : 'Location services unavailable.'
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void startTracking();

    return () => {
      cancelled = true;
      clearWatcher();
      setIsLoading(false);
    };
  }, [intervalSeconds, isActive]);

  return {
    coordinates,
    permission,
    isFixed,
    isLoading,
    error,
  };
}
