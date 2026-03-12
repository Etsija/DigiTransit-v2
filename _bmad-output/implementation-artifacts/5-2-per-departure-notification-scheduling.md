# Story 5.2: Per-Departure Notification Scheduling

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to long-press a departure card to schedule a reminder notification for that specific departure,
so that I can be alerted before a particular service leaves without watching the screen.

## Acceptance Criteria

1. **Given** the departures screen is open
   **When** the user long-presses a `DepartureCard`
   **Then** the `DepartureNotificationDialog` bottom sheet opens without navigating away from the departures view

2. **Given** the dialog is open
   **When** it renders
   **Then** lead time options are shown (5 min, 10 min, 15 min) with the Settings default value pre-selected

3. **Given** the user selects a lead time and confirms
   **When** the dialog closes
   **Then** a local notification is scheduled for `departure scheduledTime - lead time` via `expo-notifications`
   **And** the `DepartureCard` displays a small clock badge indicating a notification is scheduled
   **And** the notification content reads: "[shortName] to [headsign] departs in [lead time] min from [stop name]"

4. **Given** the user dismisses the dialog without confirming
   **When** the dialog closes
   **Then** no notification is scheduled and the `DepartureCard` is unchanged
   **And** dismiss is a no-op

5. **Given** multiple departure notifications are scheduled simultaneously
   **When** each scheduled time arrives
   **Then** each fires independently and correctly

## Tasks / Subtasks

- [x] Task 1: Wire long-press reminder entry from the departures list without breaking the current two-tap departures flow (AC: 1, 4)
  - [x] Extend `DepartureCard` to support `onLongPress` while preserving its existing button semantics, accessibility label, and scheduled-badge rendering path
  - [x] In `DeparturesScreen`, track the currently selected departure row and present the existing `DepartureNotificationDialog` as an in-place bottom-sheet style overlay rather than a route change or full-screen modal
  - [x] Keep long-press as a no-op on web and avoid surfacing dead controls there; the departures screen should still render normally
  - [x] Ensure dismissing the dialog clears only transient selection UI and does not mutate notification state

- [x] Task 2: Add scheduled departure reminder capabilities behind the notification platform adapter (AC: 3, 5)
  - [x] Extend `src/core/platform/notifications/index.ts` with native-safe methods for scheduling a notification at an absolute `Date` and canceling or querying scheduled identifiers as needed by the feature
  - [x] Implement the native adapter in `src/core/platform/notifications/notifications.native.ts` using Expo Notifications scheduled local notification APIs while preserving Android channel setup and foreground presentation handling
  - [x] Keep the web adapter as a hard no-op that reports unsupported behavior without throwing or leaking native-only types into feature code
  - [x] Return the scheduled notification identifier to feature code so the departures UI can reflect booked reminders and Story 5.3 can reuse the same identifier for cancellation

- [x] Task 3: Create a one-shot departure reminder scheduling flow that reuses existing departures data instead of refetching or inventing duplicate models (AC: 2, 3, 5)
  - [x] Use the normalized `StopDeparture` row already produced by `useStopDepartures` as the source of truth for route short name, headsign, scheduled departure, and rendered display time
  - [x] Schedule reminders from `scheduledDeparture` at booking time, not realtime-adjusted departure seconds, matching the planning constraint documented for Epic 5
  - [x] Compute the reminder fire date from `serviceDay + scheduledDeparture - leadTimeMinutes` and skip scheduling if that time is already in the past
  - [x] Build notification content as `"[shortName] to [headsign] departs in [lead time] min from [stop name]"` using the loaded stop header context from the departures screen

- [x] Task 4: Track scheduled reminder state so cards can render their booked badge, reminders survive restart, and Story 5.3 has a stable extension seam (AC: 3, 5)
  - [x] Introduce a lightweight persisted reminder registry under `src/core/store/` or a similarly focused feature-owned module; do not overload `settings.store.ts`
  - [x] Key reminder state by a deterministic departure composite such as `stopId + serviceDay + scheduledDeparture + routeShortName + headsign`
  - [x] Feed `notificationScheduled` into `DepartureCard` from that registry so the existing clock badge becomes real UI state rather than mock-only behavior
  - [x] Support multiple concurrent reminders and make duplicate scheduling idempotent for the same departure key within a session

- [x] Task 5: Refine the existing dialog behavior so it functions as an actual reminder booking surface (AC: 2, 3, 4)
  - [x] Keep the stored Settings default lead time visibly preselected on open, but allow temporary selection changes inside the dialog without mutating global settings
  - [x] Make the confirm action pass the selected lead time back to the screen-level scheduling flow instead of only firing a parameterless callback
  - [x] Preserve dismiss as a true no-op and keep cancel-mode branching reserved for Story 5.3 instead of partially implementing cancellation here
  - [x] Ensure the dialog remains accessible as a grouped selection surface with 44x44pt touch targets and clear button labels

- [x] Task 6: Add regression coverage for scheduling logic, UI state, and unsupported-platform behavior (AC: 1, 2, 3, 4, 5)
  - [x] Extend shared component tests for `DepartureCard` long-press handling and `DepartureNotificationDialog` lead-time selection behavior
  - [x] Add feature tests for `DeparturesScreen` covering dialog open on long-press, dismiss no-op, successful scheduling, scheduled badge rendering, and multiple reminders
  - [x] Add notification adapter tests for absolute-date scheduling and returned notification identifiers, alongside web no-op assertions
  - [x] Add pure-unit coverage for the departure reminder key builder and reminder-time calculation, especially the "already in the past" guard

## Dev Notes

### Story Foundation

- Epic 5's second story adds the user-controlled reminder path on top of Story 5.1's launch notification groundwork. The user is already on the departures screen, sees a concrete departure, and wants a one-off reminder for that exact service rather than the generic home-stop launch alert.
- The core product constraint is unchanged: no backend, no remote push, no background fetch. This story must stay entirely client-side and local, using the existing Expo notifications boundary and the departures data already in memory.
- Acceptance criteria make three scope boundaries explicit:
  - schedule from a long-press on a `DepartureCard`
  - let the user choose 5 / 10 / 15 minutes with the Settings default preselected
  - show booked state on the card while supporting multiple reminders
- The planning artifacts also call out a deliberate limitation: booking is based on the departure's scheduled time at the moment of scheduling, not live-updated realtime data. Do not attempt to "improve" this with background refresh or moving notification times.
- Story 5.3 is the follow-up cancellation story. Story 5.2 should therefore create a clean scheduling seam and stable reminder identifiers, but it should not implement the cancel UX yet.

### Technical Requirements

- Reuse the normalized departures model from `src/features/departures/hooks/use-stop-departures.ts`. The `StopDeparture` rows already contain `scheduledDeparture`, `realtimeDeparture`, `serviceDay`, `routeShortName`, `headsign`, `displayDepartureEpochSeconds`, and `displayTime`; do not introduce a second "notification departure" DTO.
- For reminder scheduling, use `serviceDay + scheduledDeparture` as the booking anchor, not `displayDepartureEpochSeconds`. This matches the Epic 5 technical note that reminders are based on scheduled time at booking moment even when realtime data is present.
- The current departures screen already has both the stop header and the departure list loaded in one place. Build reminder content from the in-memory screen data instead of issuing another GraphQL request.
- Extend the notification platform adapter rather than importing `expo-notifications` inside the screen or shared components. Feature code should deal with domain inputs like `fireAt`, `title`, `body`, and returned notification IDs only.
- Introduce a deterministic reminder key builder for each departure. Recommended composite: `stopId + serviceDay + scheduledDeparture + routeShortName + headsign`.
- Skip scheduling when the computed reminder time is already in the past. The UI should fail closed and leave the card unchanged rather than scheduling an immediate or negative-offset reminder accidentally.
- Multiple reminders must coexist. Avoid any singleton "current reminder" state.
- Persist reminder ID state locally so scheduled reminders and booked badges survive app close/restart, while still keeping the data out of settings persistence.

### Architecture Compliance

- Respect the existing feature/core boundaries already reinforced by Story 5.1:
  - `src/features/departures/` owns screen orchestration and departure-row interactions
  - `src/shared/components/` owns presentational pieces such as `DepartureCard` and `DepartureNotificationDialog`
  - `src/core/platform/notifications/` owns all Expo notifications runtime calls
  - `src/core/store/` owns any cross-screen reminder state that must survive rerenders within the running app session
- Keep server state in TanStack Query and reminder UI state out of the query cache. Scheduled reminder IDs are client-side ephemeral state, not server data.
- Preserve the architecture's "local notifications only" decision. No `expo-task-manager`, no background fetch, no server-side scheduler, no web push, and no new backend integration.
- Preserve the current departures loading behavior in `DeparturesScreen`: last known data visible during refresh, error banner behavior unchanged, no blocking spinner introduced by reminder booking.
- Follow the project's shared error model and fail-closed posture for notification-side issues. Booking failures should not mutate settings or destabilize the departures route.

### Library / Framework Requirements

- The repo currently uses Expo `~55.0.3`, React Native `0.83.2`, React `19.2.0`, TanStack Query `^5.90.21`, and `expo-notifications ~55.0.11`. Work within this stack; do not add another notification abstraction or state library.
- `DepartureNotificationDialog` already reads the persisted default lead time from `useSettingsStore` and renders the exact 5 / 10 / 15 minute options. Extend its callback shape rather than replacing the component or duplicating it elsewhere.
- `DepartureCard` already supports a `notificationScheduled` visual badge but currently has no long-press hook. Extend that component directly so the existing visual treatment becomes real reminder state.
- The native notification adapter already prepares Android channels and foreground presentation. Scheduled reminders should reuse the same runtime bootstrap logic instead of creating a second Android channel path.
- Keep web unsupported for reminder scheduling, consistent with the PRD and the current adapter contract.

### File Structure Requirements

- Update:
  - `src/features/departures/departures-screen.tsx`
  - `src/shared/components/departure-card.tsx`
  - `src/shared/components/departure-notification-dialog.tsx`
  - `src/core/platform/notifications/index.ts`
  - `src/core/platform/notifications/notifications.native.ts`
  - `src/core/platform/notifications/notifications.web.ts`
- Likely create:
  - `src/features/departures/utils/departure-reminders.ts` for pure reminder-time and reminder-key helpers
  - `src/core/store/departure-reminders.store.ts` or a similarly narrow reminder registry
- Possible supporting test files:
  - `tests/features/departures/departures-screen.test.tsx`
  - `tests/core/notifications-platform.test.ts`
  - `tests/shared/ui-components.test.tsx`
  - `tests/features/departures/departure-reminders.test.ts`
- Do not create:
  - a new GraphQL query or mutation
  - a second dialog component just for scheduling
  - platform-specific notification calls outside `src/core/platform/notifications/`

### Testing Requirements

- Cover UI entry:
  - long-pressing a departure row opens the reminder dialog on native-capable paths
  - dismiss leaves both reminder registry state and card badge state unchanged
- Cover dialog behavior:
  - stored default lead time is preselected on open
  - selecting 5 / 10 / 15 changes only local dialog selection until confirm
  - confirm passes the selected value back to the scheduling flow
- Cover scheduling logic:
  - reminder fire date is computed from `serviceDay + scheduledDeparture - leadTimeMinutes`
  - past reminder times are rejected safely
  - multiple reminders can be scheduled independently
  - duplicate scheduling for the same departure key is idempotent or predictably replaces the same key without multiplying badges
- Cover platform adapter behavior:
  - native scheduling delegates to Expo Notifications with an absolute trigger and returns the scheduled identifier
  - web remains a hard no-op
- Preserve existing behavior:
  - departures route still renders cached data, refresh indicator, and error banner correctly
  - `DepartureCard` still exposes the existing accessibility label and visible clock badge state

### Previous Story Intelligence

- Story 5.1 already established the notification adapter boundary and proved the team wants Expo notifications completely hidden behind `src/core/platform/notifications/`. Reuse that seam; do not regress by calling Expo APIs in feature code.
- Story 5.1 also introduced a fail-closed notification posture: unsupported web behavior is silent, launch notification errors do not surface in UI, and Android channel preparation stays inside the adapter. Keep those same rules for scheduled reminders.
- Story 5.1 extracted shared departures fetching helpers from `use-stop-departures.ts` instead of duplicating the GraphQL shape. Story 5.2 should continue that reuse mindset by scheduling directly from the already normalized departures rows.
- The current launch hook uses deterministic dedupe keys for one-notification-per-launch behavior. That pattern is relevant here too: reminder booking should have a deterministic departure key so Story 5.3 can cancel the same scheduled item later instead of guessing.

### Git Intelligence

- Recent commits are sequential and feature-scoped:
  - `4805758 feat(ui): Story 5-1 on-launch home stop notification`
  - `af8526d feat(ui): Story 4-3 notification preferences in settings`
  - `1d37720 feat(ui): Story 4-2 display and clear home stop in settings`
  - `fa54273 feat(ui): Story 4-1 settings screen and configurable polling radius`
- The pattern is clear: extend the existing surface incrementally rather than restructuring large app areas. Story 5.2 should follow the same style by adding reminder capabilities to current departures and notification modules, not by introducing a new notifications feature shell.
- Epic 4 delivered the persisted prerequisites already in use:
  - notification permission toggle
  - default lead time preference
  - stable home-stop contract
- Story 5.1 then added native notification delivery. Story 5.2 should capitalize on that by adding scheduling and badge state as the next focused slice.

### Latest Tech Information

- Expo's current notifications docs describe `Notifications.scheduleNotificationAsync(...)` as the supported local scheduling API and show absolute date-based triggers for one-off reminders. That maps cleanly to this story's `scheduledDeparture - leadTime` requirement. Source: https://docs.expo.dev/versions/latest/sdk/notifications/
- The same Expo docs expose scheduled-notification management helpers such as `getAllScheduledNotificationsAsync`, `cancelScheduledNotificationAsync`, and `getNextTriggerDateAsync`. Story 5.2 mainly needs scheduling plus the returned identifier, but it should shape the adapter so Story 5.3 can cancel by identifier without another platform-boundary redesign. Source: https://docs.expo.dev/versions/latest/sdk/notifications/
- Android channel setup remains required for reliable delivery, and the current repo already centralizes that in the native adapter. Keep using the existing `setNotificationChannelAsync(...)` preparation path rather than duplicating it for scheduled reminders. Source: https://docs.expo.dev/versions/latest/sdk/notifications/
- The repo currently pins `expo-notifications ~55.0.11` in `package.json`, so the implementation should target the Expo SDK 55 surface already installed in the workspace rather than assuming a newer major API.

### Project Structure Notes

- The live code does not match the older architecture tree exactly, so prefer the current implementation seams over the aspirational document when they differ:
  - `DepartureCard` lives in `src/shared/components/`, not under `src/features/departures/components/`
  - `DepartureNotificationDialog` already exists in `src/shared/components/`
  - there is no `src/core/store/ui.store.ts` today, so any reminder registry should be introduced deliberately and narrowly
- `DeparturesScreen` currently owns row rendering and stop-header context, making it the correct orchestration point for long-press selection, dialog state, and feeding scheduled badge state into each row.
- `MapScreen` and the launch-notification hook are unaffected by this story except for sharing the same platform adapter boundary.
- No `project-context.md` file exists in the repository, so there are no extra project-context constraints beyond the planning artifacts and the live codebase.

### References

- Epic 5 Story 5.2 acceptance criteria and technical notes: [Source: _bmad-output/planning-artifacts/epics.md#Story-52-Per-Departure-Notification-Scheduling]
- PRD notification strategy, FR43-FR45, and reminder limitation: [Source: _bmad-output/planning-artifacts/prd.md#Push-Notification-Strategy]
- UX bottom-sheet interaction and booked-reminder badge expectations: [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Departure-Notification-Scheduling]
- Architecture notification strategy and feature/core boundaries: [Source: _bmad-output/planning-artifacts/architecture.md#Core-Architectural-Decisions]
- Existing departures screen orchestration: [Source: src/features/departures/departures-screen.tsx]
- Existing normalized departures model and fetch helpers: [Source: src/features/departures/hooks/use-stop-departures.ts]
- Existing departure row scheduled-badge prop and missing long-press seam: [Source: src/shared/components/departure-card.tsx]
- Existing reminder dialog component and lead-time defaults: [Source: src/shared/components/departure-notification-dialog.tsx]
- Existing notification adapter contract: [Source: src/core/platform/notifications/index.ts], [Source: src/core/platform/notifications/notifications.native.ts], [Source: src/core/platform/notifications/notifications.web.ts]
- Story 5.1 context and learned notification boundary patterns: [Source: _bmad-output/implementation-artifacts/5-1-on-launch-home-stop-notification.md]
- Expo notifications SDK docs: [Source: https://docs.expo.dev/versions/latest/sdk/notifications/]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Implementation Plan

- Add a pure reminder helper module for deterministic reminder keys, body copy, and fire-date calculation from `scheduledDeparture`.
- Extend the notification platform adapter with absolute-date scheduling while keeping web unsupported and cancellation-ready for Story 5.3.
- Wire a bottom-sheet reminder dialog into `DeparturesScreen`, back it with an in-memory reminder registry, and feed scheduled badge state into `DepartureCard`.
- Cover the scheduling flow with unit, platform, shared-component, and screen-level regression tests, then run the full repo validation suite.

### Debug Log References

- `cat _bmad/core/tasks/workflow.xml`
- `cat _bmad/bmm/workflows/4-implementation/dev-story/workflow.yaml`
- `cat _bmad/bmm/workflows/4-implementation/dev-story/instructions.xml`
- `cat _bmad/bmm/workflows/4-implementation/dev-story/checklist.md`
- `cat _bmad/bmm/config.yaml`
- `cat _bmad-output/implementation-artifacts/sprint-status.yaml`
- `cat _bmad-output/implementation-artifacts/5-2-per-departure-notification-scheduling.md`
- `but status`
- `rg --files src tests`
- `pnpm test -- tests/features/departures/departure-reminders.test.ts tests/core/notifications-platform.test.ts tests/shared/ui-components.test.tsx tests/features/departures/departures-screen.test.tsx`
- `pnpm check`
- `cat package.json`

### Completion Notes List

- Added a deterministic departure reminder helper module for reminder keys, fire-date calculation, and notification copy based on `serviceDay + scheduledDeparture - leadTimeMinutes`.
- Added a persisted departure reminder registry so scheduled badges and reminder IDs survive app restart while remaining separate from settings persistence.
- Extended the notification platform adapter with native absolute-date scheduling and cancellation-ready surface area while keeping web a silent unsupported no-op.
- Updated `DeparturesScreen`, `DepartureCard`, and `DepartureNotificationDialog` to support native-only long-press reminder booking, in-place bottom-sheet presentation, lead-time confirmation, fail-closed past-time guards, and scheduled badge rendering.
- Added regression coverage across reminder helpers, notification adapters, shared components, and departures-screen scheduling flow.
- Validation passed with `pnpm check` on 2026-03-12.

### File List

- _bmad-output/implementation-artifacts/sprint-status.yaml
- _bmad-output/implementation-artifacts/5-2-per-departure-notification-scheduling.md
- src/core/platform/notifications/index.ts
- src/core/platform/notifications/notifications.native.ts
- src/core/platform/notifications/notifications.web.ts
- src/core/store/departure-reminders.store.ts
- src/core/store/storage-keys.ts
- src/features/departures/departures-screen.tsx
- src/features/departures/utils/departure-reminders.ts
- src/shared/components/departure-card.tsx
- src/shared/components/departure-notification-dialog.tsx
- tests/core/departure-reminders.store.test.ts
- tests/core/notifications-platform.test.ts
- tests/features/departures/departure-reminders.test.ts
- tests/features/departures/departures-screen.test.tsx
- tests/shared/ui-components.test.tsx

## Change Log

- 2026-03-12: Implemented Story 5.2 per-departure reminder scheduling, in-memory badge state, and supporting tests; updated story and sprint status to `review`.
- 2026-03-12: Fixed reminder lead-time fallback selection, prevented duplicate scheduling while booking is in flight, pruned expired reminder badges during the session, and closed the story as `done`.
