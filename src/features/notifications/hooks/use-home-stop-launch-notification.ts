import { useQueryClient } from '@tanstack/react-query';
import * as React from 'react';
import { AppState } from 'react-native';

import { notificationPlatformAdapter } from '@/core/platform/notifications';
import { useSettingsStore } from '@/core/store/settings.store';
import {
  fetchStopDeparturesModel,
  type StopDeparture,
} from '@/features/departures/hooks/use-stop-departures';

type UseHomeStopLaunchNotificationOptions = {
  isActive?: boolean;
};

const LAUNCH_NOTIFICATION_DELAY_MS = 0;

function getInitialAppState() {
  return AppState.currentState === 'background' ? 'background' : 'active';
}

function getMinutesUntilDeparture(departureEpochSeconds: number, nowMs: number) {
  return Math.max(0, Math.round((departureEpochSeconds * 1000 - nowMs) / 60_000));
}

function findNextUpcomingDeparture(departures: StopDeparture[], nowMs: number) {
  const nowEpochSeconds = Math.floor(nowMs / 1000);

  return departures.find((departure) => departure.displayDepartureEpochSeconds >= nowEpochSeconds);
}

export function useHomeStopLaunchNotification({
  isActive = true,
}: UseHomeStopLaunchNotificationOptions) {
  const queryClient = useQueryClient();
  const homeStop = useSettingsStore((state) => state.homeStop);
  const pushNotificationsEnabled = useSettingsStore((state) => state.pushNotificationsEnabled);
  const notificationLeadTimeMinutes = useSettingsStore(
    (state) => state.notificationLeadTimeMinutes
  );
  const [appState, setAppState] = React.useState(getInitialAppState);
  const launchCycleRef = React.useRef(1);
  const lastAttemptKeyRef = React.useRef<string | null>(null);
  const lastNotificationKeyRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      setAppState((previousAppState) => {
        if (previousAppState !== 'active' && nextAppState === 'active') {
          launchCycleRef.current += 1;
          lastAttemptKeyRef.current = null;
          lastNotificationKeyRef.current = null;
        }

        return nextAppState;
      });
    });

    return () => {
      subscription.remove();
    };
  }, []);

  React.useEffect(() => {
    const homeStopId = homeStop?.gtfsId?.trim();

    if (!isActive || appState !== 'active' || !pushNotificationsEnabled || !homeStopId) {
      return;
    }

    const attemptKey = `${launchCycleRef.current}:${homeStopId}:${notificationLeadTimeMinutes}`;

    if (lastAttemptKeyRef.current === attemptKey) {
      return;
    }

    lastAttemptKeyRef.current = attemptKey;

    let isCancelled = false;
    const timeoutId = setTimeout(() => {
      void (async () => {
        try {
          const permissionState = await notificationPlatformAdapter.getPermissionState();

          if (!permissionState.supported || !permissionState.granted || isCancelled) {
            return;
          }

          const model = await fetchStopDeparturesModel(queryClient, homeStopId);
          const nowMs = Date.now();
          const nextDeparture = model
            ? findNextUpcomingDeparture(model.departures, nowMs)
            : undefined;

          if (!nextDeparture || isCancelled) {
            return;
          }

          const notificationKey = `${launchCycleRef.current}:${homeStopId}:${nextDeparture.displayDepartureEpochSeconds}`;

          if (lastNotificationKeyRef.current === notificationKey) {
            return;
          }

          lastNotificationKeyRef.current = notificationKey;

          const stopName = model?.header.name ?? homeStop?.name?.trim() ?? 'Home stop';
          const minutesUntilDeparture = getMinutesUntilDeparture(
            nextDeparture.displayDepartureEpochSeconds,
            nowMs
          );

          await notificationPlatformAdapter.sendImmediateNotification({
            title: `Next ${nextDeparture.routeShortName} from ${stopName} at ${nextDeparture.displayTime}`,
            body: `in ${minutesUntilDeparture} min`,
          });
        } catch {
          // Launch notifications fail closed to avoid surfacing startup errors in the map UI.
        }
      })();
    }, LAUNCH_NOTIFICATION_DELAY_MS);

    return () => {
      isCancelled = true;
      clearTimeout(timeoutId);
    };
  }, [
    appState,
    homeStop?.gtfsId,
    homeStop?.name,
    isActive,
    notificationLeadTimeMinutes,
    pushNotificationsEnabled,
    queryClient,
  ]);
}
