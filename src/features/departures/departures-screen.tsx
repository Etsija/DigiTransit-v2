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

export function DeparturesScreen({ stopId, onBack, coordinates }: DeparturesScreenProps) {
  const renderStartedAtRef = useRef(getNow());
  const hasReportedReadyRef = useRef(false);
  const schedulingReminderKeyRef = useRef<string | null>(null);
  const insets = useSafeAreaInsets();
  const [showPatterns, setShowPatterns] = useState(false);
  const [selectedDeparture, setSelectedDeparture] = useState<StopDeparture | null>(null);
  const [isSchedulingReminder, setIsSchedulingReminder] = useState(false);
  const departuresQuery = useStopDepartures({ stopId });
  const remindersByKey = useDepartureReminderStore((state) => state.remindersByKey);
  const hasHydratedReminders = useDepartureReminderStore((state) => state.hasHydrated);
  const header = departuresQuery.data?.header ?? null;
  const departures = departuresQuery.data?.departures ?? [];
  const setReminder = useDepartureReminderStore((state) => state.setReminder);
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
    setSelectedDeparture(null);
    schedulingReminderKeyRef.current = null;
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
    selectedDeparture === null
      ? []
      : departureReminderLeadTimeOptions.map((minutes) => ({
          minutes,
          disabled: !isDepartureReminderLeadTimeAvailable({
            serviceDay: selectedDeparture.serviceDay,
            scheduledDeparture: selectedDeparture.scheduledDeparture,
            leadTimeMinutes: minutes,
          }),
        }));
  const dialogBottomInset =
    insets.bottom + theme.layout.tabBarHeight + theme.spacing.sm + theme.spacing.xs;

  async function handleScheduleReminder(leadTimeMinutes: number) {
    if (!selectedDeparture || !header) {
      return;
    }

    const reminderKey = buildDepartureReminderKey({
      stopId,
      serviceDay: selectedDeparture.serviceDay,
      scheduledDeparture: selectedDeparture.scheduledDeparture,
      routeShortName: selectedDeparture.routeShortName,
      headsign: selectedDeparture.headsign,
    });

    if (remindersByKey[reminderKey] || schedulingReminderKeyRef.current === reminderKey) {
      setSelectedDeparture(null);
      return;
    }

    const fireAt = resolveDepartureReminderFireDate({
      serviceDay: selectedDeparture.serviceDay,
      scheduledDeparture: selectedDeparture.scheduledDeparture,
      leadTimeMinutes,
    });

    if (!fireAt) {
      setSelectedDeparture(null);
      return;
    }

    schedulingReminderKeyRef.current = reminderKey;
    setIsSchedulingReminder(true);

    try {
      const permissionState = await notificationPlatformAdapter.getPermissionState();

      if (!permissionState.supported || !permissionState.granted) {
        setSelectedDeparture(null);
        return;
      }

      await notificationPlatformAdapter.prepareRuntime();
      const notificationId = await notificationPlatformAdapter.scheduleNotification({
        title: 'Departure reminder',
        body: buildDepartureReminderNotificationBody({
          routeShortName: selectedDeparture.routeShortName,
          headsign: selectedDeparture.headsign,
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
      setSelectedDeparture(null);
    }
  }

  return (
    <View style={styles.container}>
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

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
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
            <View style={styles.panelHeader}>
              <Pressable
                accessibilityLabel='Back'
                accessibilityRole='button'
                onPress={onBack}
                style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
              >
                <AppIcon name='chevron-back' size={18} color={theme.colors.text.primary} />
                <Text style={styles.backButtonLabel}>Back</Text>
              </Pressable>

              <View style={styles.headerCopy}>
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
                      className='py-4'
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
                      <View pointerEvents='none' style={styles.patternsToggleIcon}>
                        <AppIcon
                          name={showPatterns ? 'chevron-up' : 'chevron-down'}
                          size={18}
                          color={theme.colors.text.secondary}
                        />
                      </View>
                    </Pressable>

                    {showPatterns ? (
                      <View style={styles.patternsList}>
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
              <View style={styles.departuresSection}>
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

                <View style={styles.departuresList}>
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
                        remindersByKey[
                          buildDepartureReminderKey({
                            stopId,
                            serviceDay: departure.serviceDay,
                            scheduledDeparture: departure.scheduledDeparture,
                            routeShortName: departure.routeShortName,
                            headsign: departure.headsign,
                          })
                        ]
                      )}
                      onLongPress={
                        reminderBookingSupported ? () => setSelectedDeparture(departure) : undefined
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

        {selectedDeparture && header && reminderBookingSupported ? (
          <View style={styles.dialogOverlay} testID='departure-reminder-dialog-overlay'>
            <Pressable
              accessibilityRole='button'
              accessibilityLabel='Dismiss'
              onPress={() => setSelectedDeparture(null)}
              style={styles.dialogBackdrop}
            />
            <View style={[styles.dialogSheet, { paddingBottom: dialogBottomInset }]}>
              <DepartureNotificationDialog
                mode='idle'
                routeShortName={selectedDeparture.routeShortName}
                departureTime={selectedDeparture.displayTime}
                isSubmitting={isSchedulingReminder}
                leadTimeOptions={leadTimeOptions}
                onDismiss={() => setSelectedDeparture(null)}
                onNotify={handleScheduleReminder}
              />
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
  content: {
    flex: 1,
    padding: theme.spacing.lg,
    gap: theme.spacing.lg,
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
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  departuresList: {
    gap: theme.layout.cardListGap,
  },
  departuresSection: {
    gap: theme.spacing.sm,
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
    width: '100%',
    position: 'relative',
    height: 64,
    paddingHorizontal: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
  patternsToggleIcon: {
    position: 'absolute',
    right: theme.spacing.lg,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  patternsList: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
    gap: theme.spacing.xs,
  },
  patternText: {
    color: theme.colors.text.secondary,
    fontSize: theme.typography.sm.fontSize,
    fontWeight: theme.typography.sm.fontWeight,
  },
  backButton: {
    minWidth: theme.layout.minTouchTarget,
    minHeight: theme.layout.minTouchTarget,
    borderRadius: theme.radius.bar,
    borderWidth: theme.borderWidth.subtle,
    borderColor: theme.colors.card.border,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingHorizontal: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  backButtonPressed: {
    opacity: 0.72,
  },
  backButtonLabel: {
    color: theme.colors.text.primary,
    fontSize: theme.typography.sm.fontSize,
    fontWeight: '600',
  },
  headerCopy: {
    flex: 1,
    gap: theme.spacing.xs,
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
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
  },
});
