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
import { useEffect, useRef } from 'react';
import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';

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
  hasRequestedPermission: boolean;
  isFixed: boolean;
  isLoading: boolean;
  error: string | null;
};

const DEFAULT_PERMISSION: DeviceLocationPermission = {
  status: 'idle',
  canAskAgain: true,
};

const initialLocationState: UseDeviceLocationResult = {
  coordinates: null,
  permission: DEFAULT_PERMISSION,
  hasRequestedPermission: false,
  isFixed: false,
  isLoading: false,
  error: null,
};

const deviceLocationStore = createStore<UseDeviceLocationResult>()(() => initialLocationState);

let nextConsumerId = 0;
let hasAcquiredLocation = false;
let activeRunToken = 0;
let activeSubscription: LocationSubscription | null = null;
let activeIntervalSeconds: number | null = null;
let isSyncing = false;

const activeConsumers = new Map<number, number>();

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

function setLocationState(patch: Partial<UseDeviceLocationResult>) {
  deviceLocationStore.setState((state) => ({
    ...state,
    ...patch,
  }));
}

function clearWatcher() {
  activeSubscription?.remove();
  activeSubscription = null;
}

export function __resetDeviceLocationTestState() {
  clearWatcher();
  deviceLocationStore.setState(initialLocationState);
  nextConsumerId = 0;
  hasAcquiredLocation = false;
  activeRunToken = 0;
  activeIntervalSeconds = null;
  isSyncing = false;
  activeConsumers.clear();
}

function applyLocation(location: LocationObject, fixed: boolean) {
  hasAcquiredLocation = true;
  setLocationState({
    coordinates: toCoordinates(location),
    isFixed: fixed,
  });
}

function resolveRequestedIntervalSeconds() {
  let nextInterval: number | null = null;

  for (const intervalSeconds of activeConsumers.values()) {
    nextInterval =
      nextInterval === null ? intervalSeconds : Math.min(nextInterval, intervalSeconds);
  }

  return nextInterval;
}

async function syncTracking(forcePermissionRequest = false) {
  const requestedIntervalSeconds = resolveRequestedIntervalSeconds();

  if (requestedIntervalSeconds === null) {
    activeRunToken += 1;
    activeIntervalSeconds = null;
    isSyncing = false;
    clearWatcher();
    setLocationState({ isLoading: false });
    return;
  }

  if (
    !forcePermissionRequest &&
    activeIntervalSeconds === requestedIntervalSeconds &&
    (activeSubscription !== null || isSyncing)
  ) {
    return;
  }

  const runToken = ++activeRunToken;
  activeIntervalSeconds = requestedIntervalSeconds;
  isSyncing = true;
  clearWatcher();

  try {
    setLocationState({ isLoading: true, error: null });

    const currentPermission = await getForegroundPermissionsAsync();
    if (runToken !== activeRunToken) {
      return;
    }

    let resolvedPermission = currentPermission;

    const locationState = deviceLocationStore.getState();
    const hasResolvedPermissionInSession = locationState.permission.status !== 'idle';

    if (
      currentPermission.status !== 'granted' &&
      (forcePermissionRequest || !locationState.hasRequestedPermission) &&
      (currentPermission.canAskAgain || !hasResolvedPermissionInSession)
    ) {
      setLocationState({ hasRequestedPermission: true });
      resolvedPermission = await requestForegroundPermissionsAsync();

      if (runToken !== activeRunToken) {
        return;
      }
    }

    setLocationState({ permission: toPermissionState(resolvedPermission) });

    if (!resolvedPermission.granted) {
      hasAcquiredLocation = false;
      setLocationState({
        coordinates: null,
        isFixed: false,
        isLoading: false,
      });
      return;
    }

    const lastKnown = await getLastKnownPositionAsync();
    if (runToken !== activeRunToken) {
      return;
    }

    if (lastKnown) {
      applyLocation(lastKnown, false);
    }

    try {
      const currentFix = await getCurrentPositionAsync({
        accuracy: Accuracy.Balanced,
      });

      if (runToken !== activeRunToken) {
        return;
      }

      applyLocation(currentFix, true);
    } catch (currentError) {
      if (runToken === activeRunToken) {
        setLocationState({
          error:
            currentError instanceof Error
              ? currentError.message
              : 'Unable to acquire a fresh location fix.',
        });
      }
    }

    const nextSubscription = await watchPositionAsync(
      {
        accuracy: Accuracy.Balanced,
        timeInterval: requestedIntervalSeconds * 1000,
        distanceInterval: 0,
      },
      (nextLocation) => {
        applyLocation(nextLocation, true);
        setLocationState({ error: null });
      }
    );

    if (runToken !== activeRunToken) {
      nextSubscription.remove();
      return;
    }

    activeSubscription = nextSubscription;
  } catch (locationError) {
    if (runToken === activeRunToken) {
      if (!hasAcquiredLocation) {
        setLocationState({
          coordinates: null,
          isFixed: false,
        });
      }

      setLocationState({
        error:
          locationError instanceof Error ? locationError.message : 'Location services unavailable.',
      });
    }
  } finally {
    if (runToken === activeRunToken) {
      isSyncing = false;
      setLocationState({ isLoading: false });
    }
  }
}

export async function requestDeviceLocationPermission() {
  const { canAskAgain } = deviceLocationStore.getState().permission;
  const { hasRequestedPermission } = deviceLocationStore.getState();

  if ((!canAskAgain && hasRequestedPermission) || activeConsumers.size === 0) {
    return;
  }

  clearWatcher();
  activeIntervalSeconds = null;
  await syncTracking(true);
}

export function useDeviceLocation({
  intervalSeconds,
  isActive,
}: UseDeviceLocationOptions): UseDeviceLocationResult {
  const consumerIdRef = useRef<number | null>(null);
  const locationState = useStore(deviceLocationStore, (state) => state);

  useEffect(() => {
    if (consumerIdRef.current === null) {
      nextConsumerId += 1;
      consumerIdRef.current = nextConsumerId;
    }

    const consumerId = consumerIdRef.current;

    if (isActive) {
      activeConsumers.set(consumerId, intervalSeconds);
    } else {
      activeConsumers.delete(consumerId);
    }

    void syncTracking();

    return () => {
      activeConsumers.delete(consumerId);
      void syncTracking();
    };
  }, [intervalSeconds, isActive]);

  return locationState;
}
