import { Image } from 'expo-image';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import type { AppError } from '@/core/errors/app-error';
import { notificationPlatformAdapter } from '@/core/platform/notifications';
import { useDepartureReminderStore } from '@/core/store/departure-reminders.store';
import { DeparturesSkeleton } from '@/features/departures/components/departures-skeleton';
import {
  useStopDepartures,
  type StopDeparture,
} from '@/features/departures/hooks/use-stop-departures';
import {
  buildDepartureReminderKey,
  buildDepartureReminderNotificationBody,
  departureReminderLeadTimeOptions,
  isDepartureReminderLeadTimeAvailable,
  resolveDepartureReminderFireDate,
} from '@/features/departures/utils/departure-reminders';
import { CoordinatesBar } from '@/shared/components/coordinates-bar';
import { DepartureCard } from '@/shared/components/departure-card';
import { DepartureNotificationDialog } from '@/shared/components/departure-notification-dialog';
import { EmptyState } from '@/shared/components/empty-state';
import { ErrorBanner } from '@/shared/components/error-banner';
import { StopHeaderCard } from '@/shared/components/stop-header-card';
import { AppIcon } from '@/shared/icons';
import { theme } from '@/shared/theme/theme';

const DEPARTURES_RENDER_BUDGET_MS = 2000;

type DeparturesScreenProps = {
  stopId: string;
  onBack: () => void;
  coordinates: {
    latitude: number;
    longitude: number;
  } | null;
};

function getNow() {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }

  return Date.now();
}

function resolveErrorMessage(error: AppError | Error | null | undefined): string {
  if (!error?.message) {
    return 'DigiTransit API unavailable';
  }

  return error.message;
}

function resolveReminderKey(stopId: string, departure: StopDeparture) {
  return buildDepartureReminderKey({
    stopId,
    serviceDay: departure.serviceDay,
    scheduledDeparture: departure.scheduledDeparture,
    routeShortName: departure.routeShortName,
    headsign: departure.headsign,
  });
}

type SelectedReminderDialogState = {
  departure: StopDeparture;
  mode: 'idle' | 'cancel';
  reminderKey: string;
  notificationId: string | null;
};

export function DeparturesScreen({ stopId, onBack, coordinates }: DeparturesScreenProps) {
  const renderStartedAtRef = useRef(getNow());
  const hasReportedReadyRef = useRef(false);
  const schedulingReminderKeyRef = useRef<string | null>(null);
  const cancelingReminderKeyRef = useRef<string | null>(null);
  const insets = useSafeAreaInsets();
  const [showPatterns, setShowPatterns] = useState(false);
  const [selectedReminderDialog, setSelectedReminderDialog] =
    useState<SelectedReminderDialogState | null>(null);
  const [isSchedulingReminder, setIsSchedulingReminder] = useState(false);
  const departuresQuery = useStopDepartures({ stopId });
  const remindersByKey = useDepartureReminderStore((state) => state.remindersByKey);
  const hasHydratedReminders = useDepartureReminderStore((state) => state.hasHydrated);
  const header = departuresQuery.data?.header ?? null;
  const departures = departuresQuery.data?.departures ?? [];
  const setReminder = useDepartureReminderStore((state) => state.setReminder);
  const removeReminder = useDepartureReminderStore((state) => state.removeReminder);
  const pruneExpiredReminders = useDepartureReminderStore((state) => state.pruneExpiredReminders);
  const reminderBookingSupported = Platform.OS !== 'web';
  const hasCachedDepartures = Boolean(header) && departures.length > 0;
  const showInitialLoader = !header && departuresQuery.isPending;
  const showErrorBanner = departuresQuery.isError;
  const showInitialErrorBanner = showErrorBanner && !hasCachedDepartures;
  const showCachedDataErrorBanner = showErrorBanner && hasCachedDepartures;
  const showBackgroundRefreshIndicator =
    departuresQuery.isFetching && !departuresQuery.isPending && hasCachedDepartures;
  const showEmptyState =
    (!header || departures.length === 0) && !showInitialLoader && !hasCachedDepartures;

  React.useEffect(() => {
    if (!header || hasReportedReadyRef.current) {
      return;
    }

    hasReportedReadyRef.current = true;
    const durationMs = getNow() - renderStartedAtRef.current;

    if (__DEV__) {
      console.info(`[departures] visible in ${Math.round(durationMs)}ms`);

      if (durationMs > DEPARTURES_RENDER_BUDGET_MS) {
        console.warn(
          `[departures] visibility budget exceeded: ${Math.round(durationMs)}ms > ${DEPARTURES_RENDER_BUDGET_MS}ms`
        );
      }
    }
  }, [header]);

  React.useEffect(() => {
    setShowPatterns(false);
    setSelectedReminderDialog(null);
    schedulingReminderKeyRef.current = null;
    cancelingReminderKeyRef.current = null;
    setIsSchedulingReminder(false);
  }, [stopId]);

  React.useEffect(() => {
    if (hasHydratedReminders) {
      pruneExpiredReminders();
    }
  }, [hasHydratedReminders, pruneExpiredReminders]);

  React.useEffect(() => {
    const interval = setInterval(() => {
      pruneExpiredReminders();
    }, 30_000);

    return () => {
      clearInterval(interval);
    };
  }, [pruneExpiredReminders]);

  const leadTimeOptions =
    selectedReminderDialog === null
      ? []
      : departureReminderLeadTimeOptions.map((minutes) => ({
          minutes,
          disabled: !isDepartureReminderLeadTimeAvailable({
            serviceDay: selectedReminderDialog.departure.serviceDay,
            scheduledDeparture: selectedReminderDialog.departure.scheduledDeparture,
            leadTimeMinutes: minutes,
          }),
        }));
  const dialogBottomInset =
    insets.bottom + theme.layout.tabBarHeight + theme.spacing.sm + theme.spacing.xs;

  async function handleScheduleReminder(leadTimeMinutes: number) {
    if (!selectedReminderDialog || !header) {
      return;
    }

    const { departure, reminderKey } = selectedReminderDialog;

    if (remindersByKey[reminderKey] || schedulingReminderKeyRef.current === reminderKey) {
      setSelectedReminderDialog(null);
      return;
    }

    const fireAt = resolveDepartureReminderFireDate({
      serviceDay: departure.serviceDay,
      scheduledDeparture: departure.scheduledDeparture,
      leadTimeMinutes,
    });

    if (!fireAt) {
      setSelectedReminderDialog(null);
      return;
    }

    schedulingReminderKeyRef.current = reminderKey;
    setIsSchedulingReminder(true);

    try {
      const permissionState = await notificationPlatformAdapter.getPermissionState();

      if (!permissionState.supported || !permissionState.granted) {
        setSelectedReminderDialog(null);
        return;
      }

      await notificationPlatformAdapter.prepareRuntime();
      const notificationId = await notificationPlatformAdapter.scheduleNotification({
        title: 'Departure reminder',
        body: buildDepartureReminderNotificationBody({
          routeShortName: departure.routeShortName,
          headsign: departure.headsign,
          leadTimeMinutes,
          stopName: header.name,
        }),
        fireAt,
      });

      if (notificationId) {
        setReminder(reminderKey, {
          notificationId,
          fireAtMs: fireAt.getTime(),
        });
      }
    } catch {
      // Notification failures must not destabilize the departures route.
    } finally {
      if (schedulingReminderKeyRef.current === reminderKey) {
        schedulingReminderKeyRef.current = null;
      }
      setIsSchedulingReminder(false);
      setSelectedReminderDialog(null);
    }
  }

  async function handleCancelReminder() {
    if (!selectedReminderDialog || selectedReminderDialog.mode !== 'cancel') {
      setSelectedReminderDialog(null);
      return;
    }

    const { reminderKey, notificationId } = selectedReminderDialog;

    if (!notificationId) {
      setSelectedReminderDialog(null);
      return;
    }

    if (cancelingReminderKeyRef.current === reminderKey) {
      return;
    }

    cancelingReminderKeyRef.current = reminderKey;
    setIsSchedulingReminder(true);

    try {
      await notificationPlatformAdapter.cancelScheduledNotification(notificationId);
      removeReminder(reminderKey);
    } catch {
      // Cancellation failures must not clear reminder state or destabilize the departures route.
    } finally {
      if (cancelingReminderKeyRef.current === reminderKey) {
        cancelingReminderKeyRef.current = null;
      }
      setIsSchedulingReminder(false);
      setSelectedReminderDialog(null);
    }
  }

  return (
    <View className='flex-1' style={styles.container}>
      <Image
        source={require('../../../assets/images/map-backdrop.png')}
        blurRadius={1}
        contentFit='cover'
        contentPosition='center'
        testID='departures-static-backdrop'
        style={styles.backdrop}
      />
      <View style={styles.backdropScrim} />
      <View style={styles.backdropTint} />

      <SafeAreaView className='flex-1'>
        <View className='flex-1 gap-4 p-4'>
          <CoordinatesBar
            isFixed
            latitude={coordinates?.latitude ?? null}
            longitude={coordinates?.longitude ?? null}
          />

          {showInitialErrorBanner ? (
            <ErrorBanner message={resolveErrorMessage(departuresQuery.error)} />
          ) : null}

          <ScrollView
            contentContainerStyle={styles.panelContent}
            style={styles.panel}
            showsVerticalScrollIndicator={false}
            testID='departures-scroll-view'
          >
            <View className='flex-row items-center gap-3'>
              <Pressable
                accessibilityLabel='Back'
                accessibilityRole='button'
                onPress={onBack}
                className='min-h-11 min-w-11 flex-row items-center gap-1'
                style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
              >
                <AppIcon name='chevron-back' size={18} color={theme.colors.text.primary} />
                <Text style={styles.backButtonLabel}>Back</Text>
              </Pressable>

              <View className='flex-1 gap-1'>
                <Text style={styles.title}>Departures</Text>
                <Text style={styles.subtitle}>Selected stop identity stays pinned at the top.</Text>
              </View>
            </View>

            {header ? (
              <>
                <StopHeaderCard
                  code={header.code}
                  directionLabel={header.directionLabel}
                  name={header.name}
                  transportMode={header.transportMode}
                  zoneLabel={header.zoneLabel}
                />

                {header.patternLabels.length > 0 ? (
                  <View style={styles.patternsSection}>
                    <Pressable
                      className='h-16 w-full flex-row items-center justify-center px-4'
                      accessibilityRole='button'
                      accessibilityLabel={`Patterns via this stop (${header.patternLabels.length})`}
                      hitSlop={8}
                      onPress={() => setShowPatterns((current) => !current)}
                      style={({ pressed }) => [
                        styles.patternsToggle,
                        pressed && styles.patternsTogglePressed,
                      ]}
                    >
                      <Text style={styles.patternsToggleLabel}>
                        {`Patterns via this stop (${header.patternLabels.length})`}
                      </Text>
                      <View
                        pointerEvents='none'
                        className='absolute bottom-0 right-4 top-0 items-center justify-center'
                      >
                        <AppIcon
                          name={showPatterns ? 'chevron-up' : 'chevron-down'}
                          size={18}
                          color={theme.colors.text.secondary}
                        />
                      </View>
                    </Pressable>

                    {showPatterns ? (
                      <View className='gap-1 px-4 pb-4'>
                        {header.patternLabels.map((patternLabel) => (
                          <Text key={patternLabel} style={styles.patternText}>
                            {patternLabel}
                          </Text>
                        ))}
                      </View>
                    ) : null}
                  </View>
                ) : null}
              </>
            ) : null}

            {showCachedDataErrorBanner ? (
              <ErrorBanner message={resolveErrorMessage(departuresQuery.error)} />
            ) : null}

            {hasCachedDepartures ? (
              <View className='gap-2'>
                <View
                  pointerEvents='none'
                  style={styles.refreshIndicatorSlot}
                  testID='departures-refresh-indicator-slot'
                >
                  {showBackgroundRefreshIndicator ? (
                    <View style={styles.refreshIndicator} testID='departures-refresh-indicator'>
                      <ActivityIndicator color={theme.colors.text.secondary} size='small' />
                    </View>
                  ) : null}
                </View>

                <View className='gap-3'>
                  {departures.map((departure) => (
                    <DepartureCard
                      key={`${departure.serviceDay}-${departure.routeShortName}-${departure.headsign}-${departure.displayDepartureEpochSeconds}`}
                      routeShortName={departure.routeShortName}
                      headsign={departure.headsign}
                      departureTime={departure.displayTime}
                      departureEpochSeconds={departure.displayDepartureEpochSeconds}
                      status={departure.status}
                      accessibilityLabel={departure.accessibilityLabel}
                      notificationScheduled={Boolean(
                        remindersByKey[resolveReminderKey(stopId, departure)]
                      )}
                      onLongPress={
                        reminderBookingSupported
                          ? () => {
                              const reminderKey = resolveReminderKey(stopId, departure);
                              const reminder = remindersByKey[reminderKey] ?? null;

                              setSelectedReminderDialog({
                                departure,
                                mode: reminder ? 'cancel' : 'idle',
                                reminderKey,
                                notificationId: reminder?.notificationId ?? null,
                              });
                            }
                          : undefined
                      }
                    />
                  ))}
                </View>
              </View>
            ) : null}

            {showInitialLoader ? <DeparturesSkeleton /> : null}

            {showEmptyState ? (
              <EmptyState
                title={header ? 'No upcoming departures' : 'Stop unavailable'}
                message={
                  header
                    ? 'This stop has no upcoming departures right now.'
                    : 'We could not load this stop right now. The route shell will recover automatically when data becomes available.'
                }
              />
            ) : null}
          </ScrollView>
        </View>

        {selectedReminderDialog && header && reminderBookingSupported ? (
          <View style={styles.dialogOverlay} testID='departure-reminder-dialog-overlay'>
            <Pressable
              accessibilityRole='button'
              accessibilityLabel='Dismiss reminder dialog'
              onPress={() => setSelectedReminderDialog(null)}
              style={styles.dialogBackdrop}
            />
            <View
              className='px-4'
              style={[styles.dialogSheet, { paddingBottom: dialogBottomInset }]}
            >
              {selectedReminderDialog.mode === 'idle' ? (
                <DepartureNotificationDialog
                  mode='idle'
                  routeShortName={selectedReminderDialog.departure.routeShortName}
                  departureTime={selectedReminderDialog.departure.displayTime}
                  isSubmitting={isSchedulingReminder}
                  leadTimeOptions={leadTimeOptions}
                  onDismiss={() => setSelectedReminderDialog(null)}
                  onNotify={handleScheduleReminder}
                />
              ) : (
                <DepartureNotificationDialog
                  mode='cancel'
                  routeShortName={selectedReminderDialog.departure.routeShortName}
                  departureTime={selectedReminderDialog.departure.displayTime}
                  isSubmitting={isSchedulingReminder}
                  onDismiss={() => setSelectedReminderDialog(null)}
                  onCancel={handleCancelReminder}
                />
              )}
            </View>
          </View>
        ) : null}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.82,
  },
  backdropScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
  },
  backdropTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(4, 7, 12, 0.44)',
  },
  safeArea: {
    flex: 1,
  },
  panel: {
    flex: 1,
    borderRadius: theme.radius.card,
    borderWidth: theme.borderWidth.subtle,
    borderColor: theme.colors.card.border,
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
    overflow: 'hidden',
  },
  panelContent: {
    padding: theme.spacing.lg,
    gap: theme.spacing.lg,
    flexGrow: 1,
  },
  refreshIndicatorSlot: {
    minHeight: 28,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  refreshIndicator: {
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    backgroundColor: 'rgba(12, 14, 19, 0.7)',
    borderWidth: theme.borderWidth.subtle,
    borderColor: theme.colors.card.border,
  },
  patternsSection: {
    borderRadius: theme.radius.card,
    borderWidth: theme.borderWidth.subtle,
    borderColor: theme.colors.card.border,
    backgroundColor: 'rgba(11, 16, 26, 0.68)',
    overflow: 'hidden',
  },
  patternsToggle: {
    position: 'relative',
  },
  patternsTogglePressed: {
    opacity: 0.72,
  },
  patternsToggleLabel: {
    color: theme.colors.text.primary,
    fontSize: theme.typography.base.fontSize,
    fontWeight: '600',
    lineHeight: 20,
    paddingLeft: theme.spacing.lg,
    paddingRight: theme.spacing.xl,
  },
  patternText: {
    color: theme.colors.text.secondary,
    fontSize: theme.typography.sm.fontSize,
    fontWeight: theme.typography.sm.fontWeight,
  },
  backButton: {
    borderRadius: theme.radius.bar,
    borderWidth: theme.borderWidth.subtle,
    borderColor: theme.colors.card.border,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingHorizontal: theme.spacing.md,
  },
  backButtonPressed: {
    opacity: 0.72,
  },
  backButtonLabel: {
    color: theme.colors.text.primary,
    fontSize: theme.typography.sm.fontSize,
    fontWeight: '600',
  },
  title: {
    color: theme.colors.text.primary,
    fontSize: theme.typography.heading.fontSize,
    fontWeight: theme.typography.heading.fontWeight,
  },
  subtitle: {
    color: theme.colors.text.secondary,
    fontSize: theme.typography.sm.fontSize,
    fontWeight: theme.typography.sm.fontWeight,
    lineHeight: 18,
  },
  dialogOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
  dialogBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.42)',
  },
  dialogSheet: {
    paddingBottom: theme.spacing.lg,
  },
});
