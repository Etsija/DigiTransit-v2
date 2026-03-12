import { useIsFocused } from '@react-navigation/native';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { DIGITRANSIT_API_KEY, DIGITRANSIT_API_URL } from '@/core/config/env';
import {
  notificationPlatformAdapter,
  type NotificationPermissionState,
} from '@/core/platform/notifications';
import { useSettingsStore } from '@/core/store/settings.store';
import {
  sanitizeSettingsPatch,
  settingsNumericBounds,
} from '@/features/settings/schema/settings.schema';
import { AppIcon, TransportIcon } from '@/shared/icons';
import { theme, type TransportMode } from '@/shared/theme/theme';
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

const commonNotificationLeadTimes = [5, 10, 15, 30];
const unsupportedNotificationPermissionState: NotificationPermissionState = {
  supported: false,
  granted: false,
  canPrompt: false,
};

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

const HOME_STOP_EMPTY_STATE = 'No home stop set — long-press a stop in the Stops list to pin one';

function formatTransportModeLabel(transportMode: TransportMode | null | undefined) {
  if (!transportMode) {
    return 'Unknown';
  }

  return `${transportMode.slice(0, 1).toUpperCase()}${transportMode.slice(1)}`;
}

function getNotificationLeadTimeOptions(selectedLeadTimeMinutes: number) {
  return [...new Set([...commonNotificationLeadTimes, selectedLeadTimeMinutes])].sort(
    (left, right) => left - right
  );
}

async function readNotificationPermissionState(): Promise<NotificationPermissionState> {
  try {
    return await notificationPlatformAdapter.getPermissionState();
  } catch {
    return unsupportedNotificationPermissionState;
  }
}

function HomeStopRow(props: {
  homeStop: {
    gtfsId: string;
    name: string;
    transportMode: TransportMode | null;
  } | null;
  onClear: () => void;
}) {
  const hasHomeStop = Boolean(props.homeStop);
  const transportModeLabel = formatTransportModeLabel(props.homeStop?.transportMode);
  const transportColor = props.homeStop?.transportMode
    ? theme.colors.transport[props.homeStop.transportMode]
    : theme.colors.text.secondary;
  const homeStopSummaryLabel = hasHomeStop
    ? `Home stop, ${props.homeStop?.name}, transport type ${transportModeLabel}, managed from the Stops tab.`
    : `Home stop, ${HOME_STOP_EMPTY_STATE}`;

  return (
    <View accessibilityLabel='Home stop' className='gap-1 border-b py-2' style={styles.row}>
      <View className='min-h-11 flex-row items-center justify-between gap-3'>
        <ThemedText type='smallBold'>Home stop</ThemedText>
        {hasHomeStop ? (
          <Pressable
            accessibilityLabel='Clear home stop'
            accessibilityRole='button'
            hitSlop={8}
            onPress={props.onClear}
            className='min-h-11 min-w-11 items-center justify-center px-3'
            style={({ pressed }) => [
              styles.inlineActionButton,
              pressed && styles.inlineActionPressed,
            ]}
          >
            <ThemedText style={styles.inlineActionText}>Clear</ThemedText>
          </Pressable>
        ) : null}
      </View>

      {hasHomeStop ? (
        <View
          accessibilityLabel={homeStopSummaryLabel}
          accessible
          className='gap-1 rounded-xl border p-3'
          style={styles.homeStopCard}
        >
          <View className='flex-row items-center gap-2'>
            <View
              style={[
                styles.transportBadge,
                {
                  backgroundColor: `${transportColor}${Math.round(
                    theme.glass.iconBadgeBgOpacity * 255
                  )
                    .toString(16)
                    .padStart(2, '0')}`,
                },
              ]}
            >
              {props.homeStop?.transportMode ? (
                <TransportIcon
                  color={theme.colors.text.primary}
                  mode={props.homeStop.transportMode}
                  size={14}
                />
              ) : (
                <AppIcon color={theme.colors.text.primary} name='help-circle-outline' size={14} />
              )}
            </View>

            <View className='flex-1 gap-1'>
              <View className='flex-row items-center gap-2'>
                <ThemedText>{props.homeStop?.name}</ThemedText>
                <View
                  accessibilityLabel='Home stop pinned'
                  accessibilityRole='image'
                  style={styles.homePinnedBadge}
                >
                  <AppIcon color={theme.colors.text.primary} name='home' size={12} />
                </View>
              </View>
              <ThemedText themeColor='textSecondary' style={styles.helperText}>
                {`Transport type: ${transportModeLabel}`}
              </ThemedText>
            </View>
          </View>

          <ThemedText themeColor='textSecondary' style={styles.helperText}>
            Managed from the Stops tab. Long-press a stop there to replace the current home stop.
          </ThemedText>
        </View>
      ) : (
        <View
          accessibilityLabel={homeStopSummaryLabel}
          accessible
          className='gap-1 rounded-xl border p-3'
          style={styles.homeStopCard}
        >
          <ThemedText>{HOME_STOP_EMPTY_STATE}</ThemedText>
        </View>
      )}
    </View>
  );
}

function NotificationSwitchRow(props: {
  value: boolean;
  disabled: boolean;
  helper: string;
  onValueChange: (nextValue: boolean) => void;
}) {
  return (
    <View className='gap-1 border-b py-2' style={styles.row}>
      <View className='min-h-11 flex-row items-center justify-between gap-3'>
        <View className='flex-1 gap-1'>
          <ThemedText type='smallBold'>Push notifications</ThemedText>
          <ThemedText themeColor='textSecondary' style={styles.helperText}>
            {props.helper}
          </ThemedText>
        </View>

        <Switch
          accessibilityLabel='Push notifications'
          disabled={props.disabled}
          onValueChange={props.onValueChange}
          trackColor={{
            false: theme.colors.card.border,
            true: theme.colors.link.primary,
          }}
          value={props.value}
        />
      </View>
    </View>
  );
}

function NotificationLeadTimeRow(props: {
  selectedLeadTimeMinutes: number;
  disabled: boolean;
  expanded: boolean;
  onPress: () => void;
  onSelectLeadTime: (minutes: number) => void;
}) {
  const options = getNotificationLeadTimeOptions(props.selectedLeadTimeMinutes);

  return (
    <View
      className='gap-1 border-b py-2'
      style={[styles.row, props.disabled ? styles.disabledRow : null]}
    >
      <Pressable
        accessibilityLabel='Notification lead time'
        accessibilityRole='button'
        accessibilityState={{ disabled: props.disabled, expanded: props.expanded }}
        disabled={props.disabled}
        onPress={props.onPress}
        className='min-h-11 justify-center'
        style={({ pressed }) => [
          props.disabled ? styles.disabledRow : null,
          pressed && !props.disabled ? styles.utilityActionPressed : null,
        ]}
      >
        <View className='flex-row items-center justify-between gap-3'>
          <View className='flex-1 gap-1'>
            <ThemedText type='smallBold'>Notification lead time</ThemedText>
            <ThemedText themeColor='textSecondary' style={styles.helperText}>
              Default lead time used when departure reminders are scheduled.
            </ThemedText>
          </View>

          <View className='flex-row items-center gap-1'>
            <ThemedText>{`${props.selectedLeadTimeMinutes} minutes`}</ThemedText>
            <AppIcon
              color={theme.colors.text.secondary}
              name={props.expanded ? 'chevron-up' : 'chevron-down'}
              size={18}
            />
          </View>
        </View>
      </Pressable>

      {props.expanded ? (
        <View className='flex-row flex-wrap gap-2 pt-1'>
          {options.map((option) => {
            const selected = option === props.selectedLeadTimeMinutes;

            return (
              <Pressable
                accessibilityLabel={`${option} minutes`}
                accessibilityRole='button'
                key={option}
                onPress={() => props.onSelectLeadTime(option)}
                style={({ pressed }) => [
                  styles.leadTimeOption,
                  selected ? styles.leadTimeOptionSelected : null,
                  pressed ? styles.utilityActionPressed : null,
                ]}
              >
                <ThemedText
                  style={selected ? styles.leadTimeOptionTextSelected : styles.leadTimeOptionText}
                >
                  {`${option} min`}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      ) : null}
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
    <View className='gap-1 border-b py-2' style={styles.row}>
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
  const isFocused = useIsFocused();
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
  const homeStopLaunchNotificationEnabled = useSettingsStore(
    (state) => state.homeStopLaunchNotificationEnabled
  );
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
  const [notificationPermissionState, setNotificationPermissionState] =
    React.useState<NotificationPermissionState>(unsupportedNotificationPermissionState);
  const [hasLoadedNotificationPermission, setHasLoadedNotificationPermission] =
    React.useState(false);
  const [isUpdatingNotificationPreference, setIsUpdatingNotificationPreference] =
    React.useState(false);
  const [leadTimeExpanded, setLeadTimeExpanded] = React.useState(false);

  React.useEffect(() => {
    setDraftValues(toDraftValues(persistedValues));
  }, [persistedValues]);

  React.useEffect(() => {
    if (!isFocused) {
      return;
    }

    let cancelled = false;

    async function syncNotificationPermissionState() {
      const nextPermissionState = await readNotificationPermissionState();

      if (cancelled) {
        return;
      }

      setNotificationPermissionState(nextPermissionState);
      setHasLoadedNotificationPermission(true);

      if (pushNotificationsEnabled && !nextPermissionState.granted) {
        updateSettings({ pushNotificationsEnabled: false });
        setLeadTimeExpanded(false);
      }
    }

    void syncNotificationPermissionState();

    return () => {
      cancelled = true;
    };
  }, [isFocused, pushNotificationsEnabled, updateSettings]);

  React.useEffect(() => {
    if (!pushNotificationsEnabled) {
      setLeadTimeExpanded(false);
    }
  }, [pushNotificationsEnabled]);

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
          homeStopLaunchNotificationEnabled,
          notificationLeadTimeMinutes,
        }
      )
    );
  }, [
    hasChanges,
    homeStop,
    homeStopLaunchNotificationEnabled,
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
  const scrollBottomPadding = stickyFooterHeight + theme.spacing.md;
  const notificationsEnabled = pushNotificationsEnabled && notificationPermissionState.granted;
  const notificationToggleDisabled =
    isUpdatingNotificationPreference || hasLoadedNotificationPermission === false
      ? isUpdatingNotificationPreference
      : !notificationPermissionState.supported;
  const notificationHelperText =
    notificationToggleDisabled && !notificationPermissionState.supported
      ? 'Push notifications are not available on web in this MVP.'
      : 'Enable departure alerts and choose the default reminder lead time.';
  const handleOpenShowcase = React.useCallback(() => {
    const href = buildShowcaseHref();

    if ('navigate' in router && typeof router.navigate === 'function') {
      router.navigate(href);
      return;
    }

    router.push(href);
  }, [router]);
  const handleClearHomeStop = React.useCallback(() => {
    updateSettings({ homeStop: null });
  }, [updateSettings]);
  const handleNotificationToggle = React.useCallback(
    async (nextValue: boolean) => {
      if (isUpdatingNotificationPreference) {
        return;
      }

      if (!nextValue) {
        updateSettings({ pushNotificationsEnabled: false });
        setLeadTimeExpanded(false);
        return;
      }

      setIsUpdatingNotificationPreference(true);

      try {
        const currentPermissionState = await readNotificationPermissionState();

        setNotificationPermissionState(currentPermissionState);
        setHasLoadedNotificationPermission(true);

        if (currentPermissionState.granted) {
          await notificationPlatformAdapter.prepareRuntime();
          updateSettings({ pushNotificationsEnabled: true });
          return;
        }

        if (!currentPermissionState.supported || !currentPermissionState.canPrompt) {
          updateSettings({ pushNotificationsEnabled: false });
          return;
        }

        const requestedPermissionState = await notificationPlatformAdapter.requestPermission();

        setNotificationPermissionState(requestedPermissionState);
        setHasLoadedNotificationPermission(true);

        if (requestedPermissionState.granted) {
          await notificationPlatformAdapter.prepareRuntime();
        }

        updateSettings({ pushNotificationsEnabled: requestedPermissionState.granted });
      } catch {
        setNotificationPermissionState(unsupportedNotificationPermissionState);
        setHasLoadedNotificationPermission(true);
        updateSettings({ pushNotificationsEnabled: false });
        setLeadTimeExpanded(false);
      } finally {
        setIsUpdatingNotificationPreference(false);
      }
    },
    [isUpdatingNotificationPreference, updateSettings]
  );
  const handleLeadTimePress = React.useCallback(() => {
    if (!notificationsEnabled) {
      return;
    }

    setLeadTimeExpanded((current) => !current);
  }, [notificationsEnabled]);
  const handleLeadTimeSelect = React.useCallback(
    (nextLeadTimeMinutes: number) => {
      updateSettings({ notificationLeadTimeMinutes: nextLeadTimeMinutes });
      setLeadTimeExpanded(false);
    },
    [updateSettings]
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView className='w-full flex-1'>
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollBottomPadding }]}
          keyboardShouldPersistTaps='handled'
        >
          <View className='gap-3'>
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

            <HomeStopRow homeStop={homeStop} onClear={handleClearHomeStop} />

            <NotificationSwitchRow
              disabled={notificationToggleDisabled}
              helper={notificationHelperText}
              onValueChange={(nextValue) => {
                void handleNotificationToggle(nextValue);
              }}
              value={notificationsEnabled}
            />

            <View
              className='gap-1 border-b py-2'
              style={[styles.row, !notificationsEnabled || !homeStop ? styles.disabledRow : null]}
            >
              <View className='min-h-11 flex-row items-center justify-between gap-3'>
                <View className='flex-1 gap-1'>
                  <ThemedText type='smallBold'>Home stop on-launch notification</ThemedText>
                  <ThemedText themeColor='textSecondary' style={styles.helperText}>
                    Show the next departure from your home stop when you open the app.
                  </ThemedText>
                </View>

                <Switch
                  accessibilityLabel='Home stop on-launch notification'
                  disabled={!notificationsEnabled || !homeStop}
                  onValueChange={(nextValue) => {
                    updateSettings({ homeStopLaunchNotificationEnabled: nextValue });
                  }}
                  trackColor={{
                    false: theme.colors.card.border,
                    true: theme.colors.link.primary,
                  }}
                  value={
                    homeStopLaunchNotificationEnabled && notificationsEnabled && Boolean(homeStop)
                  }
                />
              </View>
            </View>

            <NotificationLeadTimeRow
              disabled={!notificationsEnabled}
              expanded={leadTimeExpanded}
              onPress={handleLeadTimePress}
              onSelectLeadTime={handleLeadTimeSelect}
              selectedLeadTimeMinutes={notificationLeadTimeMinutes}
            />
          </View>

          <View accessibilityLabel='Utilities section' className='gap-3 pb-6'>
            <ThemedText type='subtitle'>Utilities</ThemedText>

            <View
              accessibilityLabel='Build diagnostics card'
              className='min-h-11 gap-1 rounded-xl border p-3'
              style={styles.utilityCard}
            >
              <View className='min-h-11 flex-row items-center justify-between gap-3'>
                <View className='flex-1 flex-row items-center gap-3'>
                  <AppIcon color={theme.colors.text.primary} name='construct-outline' size={18} />
                  <View className='flex-1 gap-1'>
                    <ThemedText type='smallBold'>Build diagnostics</ThemedText>
                    <ThemedText themeColor='textSecondary' style={styles.utilityActionHelper}>
                      Environment details for the current build
                    </ThemedText>
                  </View>
                </View>
              </View>

              <View className='gap-1 border-t pt-1' style={styles.utilityDetails}>
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
              className='min-h-11 rounded-xl border px-3 py-2'
              style={({ pressed }) => [
                styles.utilityAction,
                pressed && styles.utilityActionPressed,
              ]}
            >
              <View className='min-h-11 flex-row items-center justify-between gap-3'>
                <View className='flex-1 flex-row items-center gap-3'>
                  <AppIcon color={theme.colors.text.primary} name='albums-outline' size={18} />
                  <View className='flex-1 gap-1'>
                    <ThemedText type='smallBold'>Showcase</ThemedText>
                    <ThemedText themeColor='textSecondary' style={styles.utilityActionHelper}>
                      Open the component preview screen
                    </ThemedText>
                  </View>
                </View>
                <AppIcon color={theme.colors.text.secondary} name='chevron-forward' size={18} />
              </View>
            </Pressable>

            <View
              accessibilityLabel={`App version ${appVersion}`}
              className='min-h-11 rounded-xl border p-3'
              style={styles.utilityCard}
            >
              <View className='min-h-11 flex-row items-center justify-between gap-3'>
                <View className='flex-1 flex-row items-center gap-3'>
                  <AppIcon
                    color={theme.colors.text.primary}
                    name='information-circle-outline'
                    size={18}
                  />
                  <View className='flex-1 gap-1'>
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
          className='gap-2 border-t px-4 pt-3'
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
            className='min-h-11 items-center justify-center rounded-xl px-3'
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
  row: {
    borderBottomWidth: theme.borderWidth.subtle,
    borderBottomColor: theme.colors.card.border,
  },
  disabledRow: {
    opacity: 0.5,
  },
  homeStopCard: {
    borderRadius: theme.radius.bar,
    borderWidth: theme.borderWidth.subtle,
    borderColor: theme.colors.card.border,
    backgroundColor: theme.colors.card.bg,
  },
  leadTimeOption: {
    minHeight: theme.layout.minTouchTarget,
    minWidth: theme.layout.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.bar,
    borderWidth: theme.borderWidth.subtle,
    borderColor: theme.colors.card.border,
    backgroundColor: theme.colors.card.bg,
    paddingHorizontal: theme.spacing.md,
  },
  leadTimeOptionSelected: {
    backgroundColor: theme.colors.link.primary,
    borderColor: theme.colors.link.primary,
  },
  leadTimeOptionText: {
    color: theme.colors.text.primary,
    fontWeight: '600',
  },
  leadTimeOptionTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  transportBadge: {
    width: theme.glass.iconBadgeSize,
    height: theme.glass.iconBadgeSize,
    borderRadius: theme.glass.iconBadgeRadius,
    justifyContent: 'center',
    alignItems: 'center',
  },
  homePinnedBadge: {
    width: 22,
    height: 22,
    borderRadius: theme.radius.pill,
    borderWidth: theme.borderWidth.subtle,
    borderColor: `${theme.colors.status.realtime}44`,
    backgroundColor: `${theme.colors.status.realtime}22`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inlineActionButton: {
    minHeight: theme.layout.minTouchTarget,
    minWidth: theme.layout.minTouchTarget,
    borderRadius: theme.radius.bar,
    backgroundColor: 'rgba(248, 113, 113, 0.14)',
    borderWidth: theme.borderWidth.subtle,
    borderColor: 'rgba(248, 113, 113, 0.32)',
  },
  inlineActionPressed: {
    opacity: 0.85,
  },
  inlineActionText: {
    color: theme.colors.status.error,
    fontSize: theme.typography.sm.fontSize,
    fontWeight: '700',
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
    borderRadius: theme.radius.bar,
    backgroundColor: theme.colors.link.primary,
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
  },
  utilityAction: {
    minHeight: theme.layout.minTouchTarget,
    borderRadius: theme.radius.bar,
    borderWidth: theme.borderWidth.subtle,
    borderColor: theme.colors.card.border,
    backgroundColor: theme.colors.card.bg,
  },
  utilityActionPressed: {
    opacity: 0.8,
  },
  utilityActionHelper: {
    fontSize: theme.typography.sm.fontSize,
  },
  utilityDetails: {
    borderTopWidth: theme.borderWidth.subtle,
    borderTopColor: theme.colors.card.border,
  },
});
