import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { DIGITRANSIT_API_KEY, DIGITRANSIT_API_URL } from '@/core/config/env';
import { useSettingsStore } from '@/core/store/settings.store';
import {
  sanitizeSettingsPatch,
  settingsNumericBounds,
} from '@/features/settings/schema/settings.schema';
import { AppIcon } from '@/shared/icons';
import { theme } from '@/shared/theme/theme';
import { buildShowcaseHref } from '@/types/navigation';

type EditableSettingKey =
  | 'searchRadiusMeters'
  | 'locationUpdateIntervalSeconds'
  | 'stopsPollingIntervalSeconds'
  | 'departuresPollingIntervalSeconds';

type EditableValues = Record<EditableSettingKey, number>;
type DraftValues = Record<EditableSettingKey, string>;
type ValidationErrors = Partial<Record<EditableSettingKey, string>>;

const editableFieldOrder: EditableSettingKey[] = [
  'searchRadiusMeters',
  'locationUpdateIntervalSeconds',
  'stopsPollingIntervalSeconds',
  'departuresPollingIntervalSeconds',
];

const editableFieldMeta: Record<
  EditableSettingKey,
  {
    label: string;
    helper: string;
    keyboardLabel: string;
  }
> = {
  searchRadiusMeters: {
    label: 'Search radius',
    helper: 'Controls the radius for nearby stop queries, in meters.',
    keyboardLabel: 'Search radius',
  },
  locationUpdateIntervalSeconds: {
    label: 'Location update interval',
    helper: 'How often device location is refreshed while the app is active.',
    keyboardLabel: 'Location update interval',
  },
  stopsPollingIntervalSeconds: {
    label: 'Stops polling interval',
    helper: 'How often nearby stops refresh when location is available.',
    keyboardLabel: 'Stops polling interval',
  },
  departuresPollingIntervalSeconds: {
    label: 'Departures polling interval',
    helper: 'How often live departures refresh on the departures screen.',
    keyboardLabel: 'Departures polling interval',
  },
};

function maskApiKey(value: string) {
  if (!value) {
    return 'Missing';
  }

  if (value.length <= 8) {
    return `${value.slice(0, 2)}...${value.slice(-2)}`;
  }

  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function toDraftValues(values: EditableValues): DraftValues {
  return {
    searchRadiusMeters: String(values.searchRadiusMeters),
    locationUpdateIntervalSeconds: String(values.locationUpdateIntervalSeconds),
    stopsPollingIntervalSeconds: String(values.stopsPollingIntervalSeconds),
    departuresPollingIntervalSeconds: String(values.departuresPollingIntervalSeconds),
  };
}

function validateDraftValue(key: EditableSettingKey, value: string): string | undefined {
  const trimmed = value.trim();
  const bounds = settingsNumericBounds[key];

  if (trimmed.length === 0) {
    return `${editableFieldMeta[key].label} is required.`;
  }

  if (!/^\d+$/.test(trimmed)) {
    return `${editableFieldMeta[key].label} must be a whole number.`;
  }

  const parsed = Number.parseInt(trimmed, 10);

  if (parsed < bounds.min || parsed > bounds.max) {
    return `${editableFieldMeta[key].label} must be between ${bounds.min} and ${bounds.max}.`;
  }

  return undefined;
}

function getValidationErrors(draft: DraftValues): ValidationErrors {
  const errors: ValidationErrors = {};

  for (const key of editableFieldOrder) {
    const message = validateDraftValue(key, draft[key]);

    if (message) {
      errors[key] = message;
    }
  }

  return errors;
}

function buildEditableValues(state: EditableValues): EditableValues {
  return {
    searchRadiusMeters: state.searchRadiusMeters,
    locationUpdateIntervalSeconds: state.locationUpdateIntervalSeconds,
    stopsPollingIntervalSeconds: state.stopsPollingIntervalSeconds,
    departuresPollingIntervalSeconds: state.departuresPollingIntervalSeconds,
  };
}

function ReadOnlyRow(props: {
  label: string;
  value: string;
  helper: string;
  accessibilityLabel: string;
}) {
  return (
    <View accessibilityLabel={props.accessibilityLabel} style={styles.row}>
      <ThemedText type='smallBold'>{props.label}</ThemedText>
      <ThemedText>{props.value}</ThemedText>
      <ThemedText themeColor='textSecondary' style={styles.helperText}>
        {props.helper}
      </ThemedText>
    </View>
  );
}

function EditableRow(props: {
  field: EditableSettingKey;
  value: string;
  error?: string;
  onChangeText: TextInputProps['onChangeText'];
}) {
  const meta = editableFieldMeta[props.field];
  const bounds = settingsNumericBounds[props.field];

  return (
    <View style={styles.row}>
      <ThemedText type='smallBold'>{meta.label}</ThemedText>
      <ThemedText themeColor='textSecondary' style={styles.helperText}>
        {meta.helper}
      </ThemedText>
      <TextInput
        accessibilityLabel={meta.keyboardLabel}
        inputMode='numeric'
        keyboardType='number-pad'
        onChangeText={props.onChangeText}
        placeholder={`${bounds.defaultValue}`}
        placeholderTextColor={theme.colors.text.muted}
        style={[styles.input, props.error ? styles.inputError : null]}
        value={props.value}
      />
      <ThemedText themeColor='textSecondary' style={styles.rangeText}>
        {`Allowed range: ${bounds.min}-${bounds.max}`}
      </ThemedText>
      {props.error ? (
        <ThemedText accessibilityRole='alert' style={styles.errorText}>
          {props.error}
        </ThemedText>
      ) : null}
    </View>
  );
}

export function SettingsScreenContent() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const appVersion = Constants.expoConfig?.version ?? '0.0.0';
  const apiKeyFingerprint = maskApiKey(DIGITRANSIT_API_KEY);
  const hasApiKey = DIGITRANSIT_API_KEY.length > 0;

  const searchRadiusMeters = useSettingsStore((state) => state.searchRadiusMeters);
  const locationUpdateIntervalSeconds = useSettingsStore(
    (state) => state.locationUpdateIntervalSeconds
  );
  const stopsPollingIntervalSeconds = useSettingsStore(
    (state) => state.stopsPollingIntervalSeconds
  );
  const departuresPollingIntervalSeconds = useSettingsStore(
    (state) => state.departuresPollingIntervalSeconds
  );
  const homeStop = useSettingsStore((state) => state.homeStop);
  const pushNotificationsEnabled = useSettingsStore((state) => state.pushNotificationsEnabled);
  const notificationLeadTimeMinutes = useSettingsStore(
    (state) => state.notificationLeadTimeMinutes
  );
  const updateSettings = useSettingsStore((state) => state.updateSettings);

  const persistedValues = React.useMemo(
    () =>
      buildEditableValues({
        searchRadiusMeters,
        locationUpdateIntervalSeconds,
        stopsPollingIntervalSeconds,
        departuresPollingIntervalSeconds,
      }),
    [
      departuresPollingIntervalSeconds,
      locationUpdateIntervalSeconds,
      searchRadiusMeters,
      stopsPollingIntervalSeconds,
    ]
  );

  const [draftValues, setDraftValues] = React.useState<DraftValues>(() =>
    toDraftValues(persistedValues)
  );

  React.useEffect(() => {
    setDraftValues(toDraftValues(persistedValues));
  }, [persistedValues]);

  const validationErrors = React.useMemo(() => getValidationErrors(draftValues), [draftValues]);
  const hasErrors = Object.keys(validationErrors).length > 0;
  const parsedValues = React.useMemo(
    () =>
      hasErrors
        ? null
        : {
            searchRadiusMeters: Number.parseInt(draftValues.searchRadiusMeters, 10),
            locationUpdateIntervalSeconds: Number.parseInt(
              draftValues.locationUpdateIntervalSeconds,
              10
            ),
            stopsPollingIntervalSeconds: Number.parseInt(
              draftValues.stopsPollingIntervalSeconds,
              10
            ),
            departuresPollingIntervalSeconds: Number.parseInt(
              draftValues.departuresPollingIntervalSeconds,
              10
            ),
          },
    [draftValues, hasErrors]
  );

  const hasChanges = React.useMemo(() => {
    if (!parsedValues) {
      return false;
    }

    return editableFieldOrder.some((key) => parsedValues[key] !== persistedValues[key]);
  }, [parsedValues, persistedValues]);

  const handleChange = React.useCallback((field: EditableSettingKey, nextValue: string) => {
    setDraftValues((current) => ({
      ...current,
      [field]: nextValue,
    }));
  }, []);

  const handleSave = React.useCallback(() => {
    if (!parsedValues || !hasChanges) {
      return;
    }

    updateSettings(
      sanitizeSettingsPatch(
        {
          searchRadiusMeters: parsedValues.searchRadiusMeters,
          locationUpdateIntervalSeconds: parsedValues.locationUpdateIntervalSeconds,
          stopsPollingIntervalSeconds: parsedValues.stopsPollingIntervalSeconds,
          departuresPollingIntervalSeconds: parsedValues.departuresPollingIntervalSeconds,
        },
        {
          ...persistedValues,
          homeStop,
          pushNotificationsEnabled,
          notificationLeadTimeMinutes,
        }
      )
    );
  }, [
    hasChanges,
    homeStop,
    notificationLeadTimeMinutes,
    parsedValues,
    persistedValues,
    pushNotificationsEnabled,
    updateSettings,
  ]);

  const saveDisabled = !hasChanges || hasErrors;
  const footerBottomInset = theme.layout.tabBarHeight + insets.bottom + theme.spacing.sm;
  const stickyFooterHeight =
    theme.layout.minTouchTarget + theme.spacing.md * 2 + theme.spacing.sm + footerBottomInset;
  const scrollBottomPadding =
    stickyFooterHeight + theme.layout.tabBarHeight + theme.spacing.xl + theme.spacing.lg;
  const handleOpenShowcase = React.useCallback(() => {
    const href = buildShowcaseHref();

    if ('navigate' in router && typeof router.navigate === 'function') {
      router.navigate(href);
      return;
    }

    router.push(href);
  }, [router]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollBottomPadding }]}
          keyboardShouldPersistTaps='handled'
        >
          <View style={styles.mainSection}>
            <ThemedText type='subtitle'>Settings</ThemedText>
            <ThemedText themeColor='textSecondary'>
              Tune the polling cadence and search radius here. Home stop and notification actions
              stay visible for later stories without changing the screen structure.
            </ThemedText>

            {editableFieldOrder.map((field) => (
              <EditableRow
                error={validationErrors[field]}
                field={field}
                key={field}
                onChangeText={(value) => handleChange(field, value)}
                value={draftValues[field]}
              />
            ))}

            <ReadOnlyRow
              accessibilityLabel='Home stop'
              helper='Home stop management arrives in Story 4.2. The current selection still appears here.'
              label='Home stop'
              value={homeStop ? homeStop.name : 'Not set'}
            />

            <ReadOnlyRow
              accessibilityLabel='Push notifications'
              helper='Notification preferences are shown here now and become editable in Story 4.3.'
              label='Push notifications'
              value={pushNotificationsEnabled ? 'Enabled' : 'Disabled'}
            />

            <ReadOnlyRow
              accessibilityLabel='Notification lead time'
              helper='Lead time remains visible here until the notification settings story is implemented.'
              label='Notification lead time'
              value={`${notificationLeadTimeMinutes} minutes`}
            />
          </View>

          <View accessibilityLabel='Utilities section' style={styles.utilitySection}>
            <ThemedText type='subtitle'>Utilities</ThemedText>

            <View accessibilityLabel='Build diagnostics card' style={styles.utilityCard}>
              <View style={styles.utilityActionContent}>
                <View style={styles.utilityActionLeading}>
                  <AppIcon color={theme.colors.text.primary} name='construct-outline' size={18} />
                  <View style={styles.utilityActionTextGroup}>
                    <ThemedText type='smallBold'>Build diagnostics</ThemedText>
                    <ThemedText themeColor='textSecondary' style={styles.utilityActionHelper}>
                      Environment details for the current build
                    </ThemedText>
                  </View>
                </View>
              </View>

              <View style={styles.utilityDetails}>
                <ThemedText themeColor='textSecondary'>
                  DigiTransit URL: {DIGITRANSIT_API_URL}
                </ThemedText>
                <ThemedText themeColor='textSecondary'>
                  API key present: {hasApiKey ? 'Yes' : 'No'}
                </ThemedText>
                <ThemedText themeColor='textSecondary'>
                  API key fingerprint: {apiKeyFingerprint}
                </ThemedText>
              </View>
            </View>

            <Pressable
              accessibilityLabel='Open Showcase'
              accessibilityRole='button'
              onPress={handleOpenShowcase}
              style={({ pressed }) => [
                styles.utilityAction,
                pressed && styles.utilityActionPressed,
              ]}
            >
              <View style={styles.utilityActionContent}>
                <View style={styles.utilityActionLeading}>
                  <AppIcon color={theme.colors.text.primary} name='albums-outline' size={18} />
                  <View style={styles.utilityActionTextGroup}>
                    <ThemedText type='smallBold'>Showcase</ThemedText>
                    <ThemedText themeColor='textSecondary' style={styles.utilityActionHelper}>
                      Open the component preview screen
                    </ThemedText>
                  </View>
                </View>
                <AppIcon color={theme.colors.text.secondary} name='chevron-forward' size={18} />
              </View>
            </Pressable>

            <View accessibilityLabel={`App version ${appVersion}`} style={styles.utilityCard}>
              <View style={styles.utilityActionContent}>
                <View style={styles.utilityActionLeading}>
                  <AppIcon
                    color={theme.colors.text.primary}
                    name='information-circle-outline'
                    size={18}
                  />
                  <View style={styles.utilityActionTextGroup}>
                    <ThemedText type='smallBold'>App version</ThemedText>
                    <ThemedText themeColor='textSecondary' style={styles.utilityActionHelper}>
                      Version {appVersion}
                    </ThemedText>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>

        <View
          accessibilityLabel='Settings actions'
          style={[styles.stickyFooter, { paddingBottom: theme.spacing.md + footerBottomInset }]}
        >
          <ThemedText themeColor='textSecondary' style={styles.footerStatusText}>
            {hasErrors
              ? 'Resolve validation errors before saving.'
              : hasChanges
                ? 'Unsaved changes'
                : 'No changes to save'}
          </ThemedText>

          <Pressable
            accessibilityLabel='Save settings'
            accessibilityRole='button'
            accessibilityState={{ disabled: saveDisabled }}
            disabled={saveDisabled}
            onPress={handleSave}
            style={({ pressed }) => [
              styles.primaryButton,
              saveDisabled && styles.disabledButton,
              pressed && !saveDisabled ? styles.primaryButtonPressed : null,
            ]}
          >
            <ThemedText style={styles.primaryButtonText}>Save settings</ThemedText>
          </Pressable>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  safeArea: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    width: '100%',
    maxWidth: theme.layout.maxContentWidth,
    alignSelf: 'center',
    paddingVertical: theme.spacing['2xl'],
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.xl,
  },
  mainSection: {
    gap: theme.spacing.md,
  },
  utilitySection: {
    gap: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  row: {
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: theme.borderWidth.subtle,
    borderBottomColor: theme.colors.card.border,
  },
  helperText: {
    lineHeight: 20,
  },
  input: {
    minHeight: theme.layout.minTouchTarget,
    borderRadius: theme.radius.bar,
    borderWidth: theme.borderWidth.subtle,
    borderColor: theme.colors.card.border,
    backgroundColor: '#111827',
    color: theme.colors.text.primary,
    paddingHorizontal: theme.spacing.md,
    fontSize: theme.typography.base.fontSize,
  },
  inputError: {
    borderColor: theme.colors.status.error,
  },
  rangeText: {
    fontSize: theme.typography.sm.fontSize,
  },
  errorText: {
    color: theme.colors.status.error,
    fontSize: theme.typography.sm.fontSize,
    fontWeight: '600',
  },
  primaryButton: {
    minHeight: theme.layout.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.bar,
    backgroundColor: theme.colors.link.primary,
    paddingHorizontal: theme.spacing.md,
    borderWidth: theme.borderWidth.subtle,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  primaryButtonPressed: {
    opacity: 0.85,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 1,
    backgroundColor: '#334155',
    borderColor: theme.colors.card.border,
  },
  stickyFooter: {
    borderTopWidth: theme.borderWidth.subtle,
    borderTopColor: theme.colors.card.border,
    backgroundColor: 'rgba(9, 11, 16, 0.96)',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  footerStatusText: {
    fontSize: theme.typography.sm.fontSize,
  },
  utilityCard: {
    minHeight: theme.layout.minTouchTarget,
    borderRadius: theme.radius.bar,
    borderWidth: theme.borderWidth.subtle,
    borderColor: theme.colors.card.border,
    backgroundColor: theme.colors.card.bg,
    padding: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  utilityAction: {
    minHeight: theme.layout.minTouchTarget,
    borderRadius: theme.radius.bar,
    borderWidth: theme.borderWidth.subtle,
    borderColor: theme.colors.card.border,
    backgroundColor: theme.colors.card.bg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  utilityActionPressed: {
    opacity: 0.8,
  },
  utilityActionContent: {
    minHeight: theme.layout.minTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  utilityActionLeading: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  utilityActionTextGroup: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  utilityActionHelper: {
    fontSize: theme.typography.sm.fontSize,
  },
  utilityDetails: {
    gap: theme.spacing.xs,
    paddingTop: theme.spacing.xs,
    borderTopWidth: theme.borderWidth.subtle,
    borderTopColor: theme.colors.card.border,
  },
});
