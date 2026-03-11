# Story 4.3: Notification Preferences in Settings

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to configure push notification settings — toggle on/off and set my default lead time,
so that I control whether and how early I get departure alerts.

## Acceptance Criteria

1. **Given** the user taps the push notifications toggle when it is currently off
   **When** the toggle is activated
   **Then** the OS notification permission prompt is shown
   **And** if permission is granted, the toggle turns on and persists
   **And** if permission is denied, the toggle remains off and reflects the system state

2. **Given** the user taps the push notifications toggle when it is currently on
   **When** the toggle is deactivated
   **Then** the toggle turns off immediately, home-stop launch notifications cease, and no OS permission prompt is shown

3. **Given** push notifications are enabled
   **When** the user taps the notification lead time row
   **Then** they can set a default lead time in minutes (for example 5, 10, or 15)
   **And** that value is used as the pre-selected option in the `DepartureNotificationDialog`

4. **Given** the notification lead time row
   **When** push notifications are disabled
   **Then** the lead time row is visually dimmed and non-interactive

## Tasks / Subtasks

- [x] Task 1: Add the notification platform boundary and dependency wiring required for Settings permission orchestration (AC: 1, 2)
  - [x] Add `expo-notifications` with the Expo SDK 55 compatible version instead of hardcoding an arbitrary semver
  - [x] Update Expo config in `app.json` / `app.config.js` so notification permissions are declared through the supported config-plugin path rather than ad hoc native edits
  - [x] Create a small platform adapter under `src/core/platform/notifications/` with native and web implementations for:
        - reading current notification permission state
        - requesting permission when the user enables the toggle
        - performing any Android channel bootstrap the runtime requires before permission-driven notification features
  - [x] Keep all `expo-notifications` imports out of `src/features/settings/settings-screen.tsx`; the screen should talk to the adapter, not the Expo module directly

- [x] Task 2: Replace the current read-only notification placeholders in Settings with the real interactive controls (AC: 1, 2, 3, 4)
  - [x] Replace the `Push notifications` placeholder row in `src/features/settings/settings-screen.tsx` with a controlled React Native `Switch`
  - [x] When toggling on, check current permission first, request permission only when needed, and persist `pushNotificationsEnabled: true` only if permission is actually granted
  - [x] When toggling off, persist `pushNotificationsEnabled: false` immediately without showing the OS permission prompt
  - [x] Replace the `Notification lead time` placeholder with an interactive row that lets the user choose the default lead time while preserving the existing plain functional Settings layout
  - [x] Dim and disable the lead-time control whenever notifications are off

- [x] Task 3: Keep the implementation scoped to Settings and permission state, not Epic 5 delivery behavior (AC: 1, 2, 3, 4)
  - [x] Continue using `updateSettings` from `src/core/store/settings.store.ts` as the single write path for `pushNotificationsEnabled` and `notificationLeadTimeMinutes`
  - [x] Sync the Settings UI with the real OS permission state on screen mount or focus so the toggle can recover correctly if the user changes notification permissions in device settings
  - [x] Treat web as unsupported for notifications in MVP: no prompt, no crash, and no fake enabled state
  - [x] Do not schedule notifications, query the home stop on launch, or add departure reminder persistence in this story; those behaviors belong to Epic 5
  - [x] If a previously stored lead time is not one of the common quick options, keep it selectable and visible instead of silently coercing it in the UI

- [x] Task 4: Add regression coverage for permission flows, disabled-state behavior, and persistence invariants (AC: 1, 2, 3, 4)
  - [x] Extend `tests/features/settings/settings-screen.test.tsx` to cover:
        - permission granted on enable
        - permission denied on enable
        - immediate disable with no prompt
        - dimmed/non-interactive lead-time control while notifications are off
        - lead-time update persistence when notifications are on
  - [x] Add focused unit tests for the new notification adapter if its behavior is more than a thin pass-through
  - [x] Keep or extend `tests/core/settings.store.test.ts` coverage around sanitized `notificationLeadTimeMinutes` values and persisted `pushNotificationsEnabled` state

## Dev Notes

### Story Foundation

- Epic 4 already established the Settings shell in Story 4.1 and the real Home stop row in Story 4.2.
- Story 4.3 should convert the two remaining notification placeholders into actual controls without restructuring the screen.
- The core user value here is preference management and permission orchestration, not notification delivery. Delivery starts in Epic 5.

### Technical Requirements

- **The repo does not currently include `expo-notifications`.** Story 4.3 must add that dependency before any permission logic can work. The current `package.json` has Expo 55 packages but no notification library yet.
- **Keep notification platform code behind a boundary.** The architecture points notification behavior to `src/core/platform/notifications`, and the live repo does not yet have that module. Create it now so Settings does not become the permanent home of platform-specific notification code.
- **Use the existing settings store.** `pushNotificationsEnabled` and `notificationLeadTimeMinutes` already exist in `src/core/store/settings.store.ts` and `src/features/settings/schema/settings.schema.ts`.
- **Do not write directly to AsyncStorage from the screen.** Persist through `updateSettings`, just like the rest of the Settings form.
- **Permission state must be authoritative.** If the OS denies or later revokes notification permission, the UI must reflect that instead of trusting stale Zustand state.
- **Keep lead time local to settings for now.** This story only defines the default value that Epic 5 will later consume from `DepartureNotificationDialog`.

### Architecture Compliance

- Keep the implementation inside the existing feature/core boundaries:
  - `src/features/settings/settings-screen.tsx` owns the Settings UI
  - `src/core/store/settings.store.ts` owns persisted preference writes
  - `src/core/platform/notifications/*` owns OS notification APIs
- Do not create a parallel notification settings store, bespoke native module wrapper in the screen, or a separate Settings route just for notifications.
- Respect the architecture note that notifications are local-only via Expo and that web push notifications are out of scope for MVP.
- Do not pull Epic 5 hooks such as home-stop launch queries or per-departure scheduling into this story. The only cross-story contract needed now is the stored lead time value.

### Library / Framework Requirements

- Current Expo notifications documentation lists `expo-notifications` bundled at `~55.0.11` for the latest Expo SDK docs, which matches this repo's Expo 55 baseline. Use Expo's compatible install path rather than guessing a version. Source: https://docs.expo.dev/versions/latest/sdk/notifications/
- Current Expo notifications docs specify `getPermissionsAsync()` for checking notification permission with no user-facing side effect, and `requestPermissionsAsync()` for prompting when permission is needed. On iOS, the docs explicitly say to interpret `ios.status`, not only the root `status`, because permission states are more granular there. Source: https://docs.expo.dev/versions/latest/sdk/notifications/
- The same Expo docs show `setNotificationChannelAsync()` as the Android-specific channel setup API. Story 4.3 does not need to schedule notifications yet, but the adapter should own any required Android channel bootstrap so Epic 5 can build on it cleanly. Source: https://docs.expo.dev/versions/latest/sdk/notifications/
- Current React Native `Switch` docs describe it as a controlled component using `value` plus `onValueChange`, with `disabled` for non-interactive state. That is the correct primitive for the Settings toggle instead of building a fake switch from `Pressable`. Source: https://reactnative.dev/docs/switch

### File Structure Requirements

- Update:
  - `package.json`
  - `app.json`
  - `app.config.js`
  - `src/features/settings/settings-screen.tsx`
  - `tests/features/settings/settings-screen.test.tsx`
- Create:
  - `src/core/platform/notifications/index.ts`
  - `src/core/platform/notifications/notifications.native.ts`
  - `src/core/platform/notifications/notifications.web.ts`
- Likely verify or extend:
  - `src/features/settings/schema/settings.schema.ts`
  - `tests/core/settings.store.test.ts`
  - `src/shared/components/departure-notification-dialog.tsx`
- Do not create:
  - notification scheduling hooks
  - an on-launch notification workflow
  - persistent scheduled-notification IDs
  - a second store for notification preferences

### Testing Requirements

- Cover both permission grant and denial paths from the Settings toggle.
- Verify disabling notifications never triggers a permission prompt.
- Verify the lead-time control is visibly disabled and functionally non-interactive when notifications are off.
- Verify the selected lead time persists through the existing settings store contract.
- Verify the screen re-syncs with the real permission state when the underlying adapter reports notifications are unavailable or revoked.
- Preserve accessibility expectations:
  - toggle and lead-time row remain readable under system font scaling
  - disabled state is conveyed visually and semantically
  - touch targets remain at least 44x44

### Previous Story Intelligence

- Story 4.1 intentionally left `Push notifications` and `Notification lead time` as read-only placeholders to preserve the final screen structure early.
- Story 4.2 followed the established Settings pattern by making a narrow change inside `src/features/settings/settings-screen.tsx` and extending the existing test files rather than introducing new screen structure.
- Follow the same pattern here: extend the current Settings screen incrementally instead of extracting large new feature surfaces prematurely.

### Git Intelligence

- Recent commits show Epic 4 work landing incrementally in the existing Settings files:
  - `800eaa3 feat(ui): Story 4-1 settings screen and configurable polling radius`
  - `050a881 feat(ui): Story 4-2 display and clear home stop in settings`
- Those commits expanded `src/features/settings/settings-screen.tsx`, `tests/features/settings/settings-screen.test.tsx`, and store-related tests rather than moving the route architecture again. Story 4.3 should continue that pattern.
- The current workspace commit history does not show any notification-platform scaffolding yet, which is a signal to keep the new adapter minimal and purpose-built.

### Latest Tech Information

- Expo's current notifications docs state that `getPermissionsAsync()` checks notification permission without triggering UI, while `requestPermissionsAsync()` performs the permission request. That supports a two-step toggle flow: inspect first, prompt second, persist only on granted. Source: https://docs.expo.dev/versions/latest/sdk/notifications/
- Expo also documents that iOS permission handling is more granular and should use `NotificationPermissionsStatus.ios.status` for accurate authorization checks. The Settings toggle must not rely only on the root status field if the implementation wants to reflect provisional or revoked states correctly. Source: https://docs.expo.dev/versions/latest/sdk/notifications/
- Expo's examples show Android notification setup using `setNotificationChannelAsync(...)`. Even though Story 4.3 stops short of scheduling notifications, creating the adapter with an Android-channel helper now avoids pushing platform setup into the later Epic 5 screen logic. Source: https://docs.expo.dev/versions/latest/sdk/notifications/
- React Native's current `Switch` docs still define the component as controlled via `value` and `onValueChange`, with `disabled` for non-interactive mode. That is directly aligned with this story's enabled/disabled lead-time behavior and the permission-synced toggle state. Source: https://reactnative.dev/docs/switch

### Implementation Notes

- Recommended implementation order:
  1. Add `expo-notifications` and Expo config/plugin support
  2. Introduce the `core/platform/notifications` adapter with native and web stubs
  3. Replace the Settings placeholders with a controlled toggle and lead-time row
  4. Add permission re-sync behavior on mount/focus
  5. Add screen and adapter tests
- The most likely failure mode is persisting `pushNotificationsEnabled: true` before OS permission is actually granted. Avoid optimistic writes that ignore the permission result.
- The second likely failure mode is leaking Epic 5 work into this story by scheduling notifications or introducing departure-specific state. Keep this story strictly about preference capture and permission truth.
- The third likely failure mode is trusting only stored Zustand state and forgetting that the user can revoke notification permission outside the app. Re-check the OS state when rendering the Settings screen.

### Project Structure Notes

- The live codebase already has the notification preference fields in the settings schema and store, so the missing piece is UI behavior and platform integration, not data-model invention.
- `src/shared/components/departure-notification-dialog.tsx` already exists and will eventually consume the default lead time from Settings. Story 4.3 should preserve that future handoff rather than hardcoding values elsewhere.
- No `project-context.md` file was found in the repository, so there are no additional project-context constraints beyond the planning artifacts and current code.

### References

- Epic 4 Story 4.3 definition and acceptance criteria: [Source: _bmad-output/planning-artifacts/epics.md]
- PRD notification and settings requirements: [Source: _bmad-output/planning-artifacts/prd.md]
- UX Settings form and notification behavior requirements: [Source: _bmad-output/planning-artifacts/ux-design-specification.md]
- Architecture boundaries for settings persistence and notification platform code: [Source: _bmad-output/planning-artifacts/architecture.md]
- Existing Settings screen placeholders: [Source: src/features/settings/settings-screen.tsx]
- Existing settings store fields and update path: [Source: src/core/store/settings.store.ts]
- Existing settings schema bounds and defaults: [Source: src/features/settings/schema/settings.schema.ts]
- Existing notification dialog component that will later consume the stored default lead time: [Source: src/shared/components/departure-notification-dialog.tsx]
- Existing Settings screen tests to extend: [Source: tests/features/settings/settings-screen.test.tsx]
- Existing settings store tests to preserve: [Source: tests/core/settings.store.test.ts]
- Current Expo config files: [Source: app.json], [Source: app.config.js]
- Current dependency baseline showing `expo-notifications` is not yet installed: [Source: package.json]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `sed -n '1,260p' _bmad-output/implementation-artifacts/sprint-status.yaml`
- `rg -n "Story 4\\.3|notification|Epic 4" _bmad-output/planning-artifacts/epics.md`
- `sed -n '1,260p' src/features/settings/settings-screen.tsx`
- `sed -n '260,560p' src/features/settings/settings-screen.tsx`
- `sed -n '1,260p' src/core/store/settings.store.ts`
- `sed -n '1,260p' src/features/settings/schema/settings.schema.ts`
- `sed -n '1,260p' tests/features/settings/settings-screen.test.tsx`
- `sed -n '1,260p' tests/core/settings.store.test.ts`
- `sed -n '220,520p' tests/core/settings.store.test.ts`
- `sed -n '1,240p' src/shared/components/departure-notification-dialog.tsx`
- `git log --oneline -5`
- `git show --stat --oneline 800eaa3`
- `git show --stat --oneline 050a881`
- `node -e "const mods=require('expo/bundledNativeModules.json'); console.log(mods['expo-notifications'])"`
- `pnpm add expo-notifications@~55.0.11`
- `pnpm test -- --runInBand tests/features/settings/settings-screen.test.tsx`
- `pnpm test -- --runInBand tests/core/notifications-platform.test.ts`
- `pnpm check`
- Expo notifications docs: https://docs.expo.dev/versions/latest/sdk/notifications/
- React Native Switch docs: https://reactnative.dev/docs/switch

### Implementation Plan

- Add the Expo-compatible `expo-notifications` dependency and register the supported config plugin in Expo config.
- Introduce a `src/core/platform/notifications` boundary so Settings can query/request permissions without importing Expo APIs directly.
- Replace the two notification placeholders in Settings with a controlled `Switch` and an expandable lead-time selector wired through `updateSettings`.
- Re-sync notification preference state from the OS on focus, keep web unsupported, and add regression coverage for permission, disabled-state, and adapter behavior.

### Completion Notes List

- Added `expo-notifications@~55.0.11` and registered the Expo notifications config plugin in `app.json`.
- Implemented a notification platform adapter with native, web, and runtime-selection entry points under `src/core/platform/notifications/`.
- Replaced the Settings notification placeholders with a controlled `Switch`, a dimmable lead-time selector, and OS permission re-sync on focus while preserving the existing screen layout.
- Preserved the Epic 5 boundary: no scheduling logic was added, but `DepartureNotificationDialog` now reads the stored default lead time for the future handoff.
- Added focused adapter tests, expanded Settings screen regression coverage, and passed `pnpm check`.

### File List

- app.json
- package.json
- pnpm-lock.yaml
- src/core/platform/notifications/index.ts
- src/core/platform/notifications/notifications.native.ts
- src/core/platform/notifications/notifications.ts
- src/core/platform/notifications/notifications.web.ts
- src/features/settings/settings-screen.tsx
- src/shared/components/departure-notification-dialog.tsx
- tests/core/notifications-platform.test.ts
- tests/features/settings/settings-screen.test.tsx
- tests/shared/ui-components.test.tsx
- _bmad-output/implementation-artifacts/4-3-notification-preferences-in-settings.md
- _bmad-output/implementation-artifacts/sprint-status.yaml

### Change Log

- 2026-03-11: Implemented Story 4.3 notification preference controls, permission adapter, dialog lead-time handoff, and regression coverage; story moved to `review`.
