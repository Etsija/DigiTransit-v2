import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CoordinatesBar } from '@/shared/components/coordinates-bar';
import { DepartureCard } from '@/shared/components/departure-card';
import { DepartureNotificationDialog } from '@/shared/components/departure-notification-dialog';
import { EmptyState } from '@/shared/components/empty-state';
import { ErrorBanner } from '@/shared/components/error-banner';
import { GlassCard } from '@/shared/components/glass-card';
import { MapMarker } from '@/shared/components/map-marker';
import { StopCard } from '@/shared/components/stop-card';
import { StopHeaderCard } from '@/shared/components/stop-header-card';
import { theme } from '@/shared/theme/theme';
import { buildSettingsHref } from '@/types/navigation';
import { LiveApiSection } from './live-api-section';
import {
  showcaseDepartureVariants,
  showcaseEmptyStates,
  showcaseHeaderStop,
  showcaseMarkerVariants,
  showcaseStopVariants,
} from './mock-data';

export function ShowcaseScreen() {
  const router = useRouter();
  const [selectedMarker, setSelectedMarker] = useState<string | null>('bus-tapped');

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.eyebrow}>Developer-only</Text>
              <Text style={styles.title}>Showcase</Text>
              <Text style={styles.subtitle}>
                All Story 1.4 components rendered from local mock data for rapid visual iteration.
              </Text>
            </View>

            <Pressable
              accessibilityRole='button'
              accessibilityLabel='Back to Settings'
              onPress={() => router.replace(buildSettingsHref())}
              style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
            >
              <Text style={styles.backButtonText}>Back to Settings</Text>
            </Pressable>
          </View>

          <ShowcaseSection
            title='GlassCard'
            description='Token-driven compositions update together when theme values change.'
          >
            <GlassCard
              accessibilityRole='summary'
              accessibilityLabel='Hero glass card preview'
              style={styles.heroCard}
            >
              <Text style={styles.heroTitle}>Downtown commuter snapshot</Text>
              <CoordinatesBar
                latitude={60.171}
                longitude={24.94}
                resolvedAddress='Asema-aukio 1, Helsinki'
                isFixed
              />
              <StopHeaderCard {...showcaseHeaderStop} />
              <DepartureCard
                routeShortName='7A'
                headsign='Kamppi'
                departureTime='14:35'
                status='realtime'
              />
            </GlassCard>
          </ShowcaseSection>

          <ShowcaseSection
            title='CoordinatesBar'
            description='Normal and location-unavailable states.'
          >
            <View style={styles.column}>
              <CoordinatesBar
                latitude={60.17}
                longitude={24.94}
                resolvedAddress='Asema-aukio 1, Helsinki'
                isFixed
              />
              <CoordinatesBar latitude={null} longitude={null} resolvedAddress='' isFixed={false} />
            </View>
          </ShowcaseSection>

          <ShowcaseSection
            title='StopCard'
            description='Five transport modes in pinned and nearby compositions.'
          >
            <View style={styles.column}>
              {showcaseStopVariants.map((stop) => (
                <GlassCard key={stop.key} style={styles.variantCard}>
                  <View style={styles.variantHeader}>
                    <Text style={styles.variantLabel}>{stop.label}</Text>
                    <Text style={styles.variantMeta}>{stop.transportMode}</Text>
                  </View>
                  <StopCard
                    name={stop.name}
                    code={stop.code}
                    transportMode={stop.transportMode}
                    distanceLabel={stop.distanceLabel}
                    isPinned={stop.isPinned}
                    onPress={() => {}}
                  />
                </GlassCard>
              ))}
            </View>
          </ShowcaseSection>

          <ShowcaseSection
            title='DepartureCard'
            description='Realtime, estimated, and notification-scheduled compositions.'
          >
            <View style={styles.column}>
              {showcaseDepartureVariants.map((departure) => (
                <GlassCard key={departure.key} style={styles.variantCard}>
                  <View style={styles.variantHeader}>
                    <Text style={styles.variantLabel}>{departure.label}</Text>
                    {departure.key === 'notification-scheduled' ? (
                      <Text style={styles.notificationBadge}>Clock badge active</Text>
                    ) : null}
                  </View>
                  <DepartureCard
                    routeShortName={departure.routeShortName}
                    headsign={departure.headsign}
                    departureTime={departure.departureTime}
                    status={departure.status}
                    notificationScheduled={departure.notificationScheduled}
                  />
                </GlassCard>
              ))}
            </View>
          </ShowcaseSection>

          <ShowcaseSection
            title='StopHeaderCard'
            description='Expanded stop summary for detail surfaces.'
          >
            <StopHeaderCard {...showcaseHeaderStop} />
          </ShowcaseSection>

          <ShowcaseSection
            title='MapMarker'
            description='All transport modes in normal and tapped previews.'
          >
            <View style={styles.markerGrid}>
              {showcaseMarkerVariants.map((marker) => {
                const isTapped = marker.key === selectedMarker;

                return (
                  <GlassCard
                    key={marker.key}
                    style={[styles.markerCard, isTapped && styles.markerCardActive]}
                  >
                    <Text style={styles.variantLabel}>{marker.label.replace(' marker', '')}</Text>
                    <MapMarker
                      transportMode={marker.transportMode}
                      label={marker.label}
                      size={marker.size}
                      onPress={() => setSelectedMarker(marker.key)}
                    />
                    <Text style={styles.variantMeta}>
                      {isTapped ? 'Tapped preview' : 'Normal preview'}
                    </Text>
                  </GlassCard>
                );
              })}
            </View>
          </ShowcaseSection>

          <ShowcaseSection
            title='ErrorBanner'
            description='Alert treatment for recoverable failures.'
          >
            <ErrorBanner message='Unable to load departures. Pull to retry with mock data.' />
          </ShowcaseSection>

          <ShowcaseSection
            title='EmptyState'
            description='GPS denied and no-stops-in-radius variants.'
          >
            <View style={styles.column}>
              {showcaseEmptyStates.map((emptyState) => (
                <GlassCard key={emptyState.key} style={styles.emptyStateCard}>
                  <EmptyState title={emptyState.title} message={emptyState.message} />
                </GlassCard>
              ))}
            </View>
          </ShowcaseSection>

          <ShowcaseSection
            title='DepartureNotificationDialog'
            description='Idle and notification-scheduled cancellation flows.'
          >
            <View style={styles.column}>
              <GlassCard style={styles.variantCard}>
                <Text style={styles.variantLabel}>Idle</Text>
                <DepartureNotificationDialog
                  mode='idle'
                  routeShortName='7A'
                  departureTime='14:35'
                  onNotify={() => {}}
                  onDismiss={() => {}}
                />
              </GlassCard>

              <GlassCard style={styles.variantCard}>
                <Text style={styles.variantLabel}>Notification scheduled</Text>
                <DepartureNotificationDialog
                  mode='cancel'
                  routeShortName='I'
                  departureTime='14:51'
                  onCancel={() => {}}
                  onDismiss={() => {}}
                />
              </GlassCard>
            </View>
          </ShowcaseSection>

          <ShowcaseSection
            title='Live API'
            description='Runs the real DigiTransit nearby-stop and departures queries against fixed dev coordinates.'
          >
            <LiveApiSection />
          </ShowcaseSection>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

type ShowcaseSectionProps = {
  title: string;
  description: string;
  children: React.ReactNode;
};

function ShowcaseSection({ title, description, children }: ShowcaseSectionProps) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionDescription}>{description}</Text>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: theme.layout.maxContentWidth,
    padding: theme.spacing.lg,
    gap: theme.spacing.xl,
  },
  header: {
    gap: theme.spacing.lg,
  },
  headerText: {
    gap: theme.spacing.sm,
  },
  eyebrow: {
    color: theme.colors.link.primary,
    fontSize: theme.typography.sm.fontSize,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    color: theme.colors.text.primary,
    fontSize: theme.typography['2xl'].fontSize,
    fontWeight: theme.typography['2xl'].fontWeight,
  },
  subtitle: {
    color: theme.colors.text.secondary,
    fontSize: theme.typography.base.fontSize,
    fontWeight: theme.typography.base.fontWeight,
    lineHeight: 22,
  },
  backButton: {
    alignSelf: 'flex-start',
    minHeight: theme.layout.minTouchTarget,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radius.bar,
    backgroundColor: `${theme.colors.link.primary}22`,
    borderWidth: theme.borderWidth.subtle,
    borderColor: `${theme.colors.link.primary}55`,
  },
  backButtonText: {
    color: theme.colors.text.primary,
    fontSize: theme.typography.sm.fontSize,
    fontWeight: '600',
  },
  section: {
    gap: theme.spacing.md,
  },
  sectionHeader: {
    gap: theme.spacing.xs,
  },
  sectionTitle: {
    color: theme.colors.text.primary,
    fontSize: theme.typography.heading.fontSize,
    fontWeight: theme.typography.heading.fontWeight,
  },
  sectionDescription: {
    color: theme.colors.text.secondary,
    fontSize: theme.typography.sm.fontSize,
    fontWeight: theme.typography.sm.fontWeight,
    lineHeight: 20,
  },
  heroCard: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  heroTitle: {
    color: theme.colors.text.primary,
    fontSize: theme.typography.lg.fontSize,
    fontWeight: theme.typography.lg.fontWeight,
  },
  column: {
    gap: theme.spacing.md,
  },
  variantCard: {
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  variantHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  variantLabel: {
    color: theme.colors.text.primary,
    fontSize: theme.typography.base.fontSize,
    fontWeight: '600',
  },
  variantMeta: {
    color: theme.colors.text.secondary,
    fontSize: theme.typography.xs.fontSize,
    fontWeight: theme.typography.xs.fontWeight,
    textTransform: 'uppercase',
  },
  notificationBadge: {
    color: theme.colors.status.estimated,
    fontSize: theme.typography.xs.fontSize,
    fontWeight: '600',
  },
  markerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  markerCard: {
    width: '47%',
    minWidth: 150,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
    alignItems: 'center',
  },
  markerCardActive: {
    borderColor: `${theme.colors.link.primary}88`,
  },
  emptyStateCard: {
    minHeight: 180,
    padding: theme.spacing.md,
  },
  pressed: {
    opacity: 0.7,
  },
});
