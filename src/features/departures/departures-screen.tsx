import { Image } from 'expo-image';
import React, { useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { AppError } from '@/core/errors/app-error';
import { useStopDepartures } from '@/features/departures/hooks/use-stop-departures';
import { AppIcon } from '@/shared/icons';
import { CoordinatesBar } from '@/shared/components/coordinates-bar';
import { EmptyState } from '@/shared/components/empty-state';
import { ErrorBanner } from '@/shared/components/error-banner';
import { LoadingState } from '@/shared/components/loading-state';
import { StopHeaderCard } from '@/shared/components/stop-header-card';
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
  const departuresQuery = useStopDepartures({ stopId });
  const header = departuresQuery.data?.header ?? null;
  const showInitialLoader = !header && departuresQuery.isPending;
  const showErrorBanner = departuresQuery.isError;
  const showEmptyState = !header && !showInitialLoader && !departuresQuery.isError;

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

          {showErrorBanner ? (
            <ErrorBanner
              message={resolveErrorMessage(departuresQuery.error)}
            />
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
              <StopHeaderCard
                code={header.code}
                directionLabel={header.directionLabel}
                name={header.name}
                patternLabels={header.patternLabels}
                transportMode={header.transportMode}
                zoneLabel={header.zoneLabel}
              />
            ) : null}

            {showInitialLoader ? <LoadingState message='Loading stop departures...' /> : null}

            {showEmptyState ? (
              <EmptyState
                title='Stop unavailable'
                message='We could not load this stop right now. The route shell will recover automatically when data becomes available.'
              />
            ) : null}
          </ScrollView>
        </View>
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
});
