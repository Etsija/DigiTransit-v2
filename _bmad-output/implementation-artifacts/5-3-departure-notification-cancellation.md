# Story 5.3: Departure Notification Cancellation

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to cancel a scheduled departure notification by long-pressing the same departure card again,
so that I can undo a reminder I no longer need.

## Acceptance Criteria

1. **Given** a departure notification has been scheduled (clock badge visible on `DepartureCard`)
   **When** the user long-presses the same `DepartureCard`
   **Then** the `DepartureNotificationDialog` opens in cancel mode: "Cancel notification for this departure?"

2. **Given** the dialog is in cancel mode
   **When** the user confirms cancellation
   **Then** the scheduled local notification is cancelled via `expo-notifications`
   **And** the clock badge clears from the `DepartureCard`

3. **Given** the dialog is in cancel mode
   **When** the user dismisses without confirming
   **Then** the scheduled notification is preserved and the clock badge remains
   **And** dismiss is a no-op

4. **Given** the user navigates away from the departures screen and returns
   **When** the `DepartureCard` renders
   **Then** the clock badge state is correctly restored
   **And** scheduled notification IDs persist across navigation

## Tasks / Subtasks

- [x] Task 1: Add explicit cancellation support to the departure reminder registry without regressing scheduled badge hydration or expiry pruning (AC: 2, 4)
  - [x] Extend `src/core/store/departure-reminders.store.ts` with a focused removal API (`removeReminder` and, if helpful, a key-scoped selector/helper) instead of overloading `reset`
  - [x] Keep reminder records keyed by the existing deterministic composite from `buildDepartureReminderKey(...)`; do not invent a second identifier format for cancellation
  - [x] Preserve persisted hydration and `pruneExpiredReminders` behavior so reminder badges still restore after navigation/re-render and stale reminders still disappear naturally after trigger time
  - [x] Ensure failed cancellation attempts do not eagerly clear persisted reminder records or badges

- [x] Task 2: Branch the departures long-press flow between schedule mode and cancel mode using the current reminder registry as the source of truth (AC: 1, 3, 4)
  - [x] Update `src/features/departures/departures-screen.tsx` so long-pressing a departure with no reminder still opens the existing schedule flow from Story 5.2
  - [x] Detect an existing reminder for the selected departure and open `DepartureNotificationDialog` in `mode='cancel'` instead of `mode='idle'`
  - [x] Reuse the already loaded `selectedDeparture`, stop header, and reminder key resolution path; do not refetch data or add a second overlay/dialog system
  - [x] Preserve web behavior as a no-op for reminder booking and cancellation so departure rows remain non-interactive for long-press reminder actions on web

- [x] Task 3: Cancel the scheduled native notification through the platform adapter and clear local reminder state only after success (AC: 2, 3)
  - [x] Use the stored `notificationId` from `useDepartureReminderStore` and delegate cancellation through `notificationPlatformAdapter.cancelScheduledNotification(...)`
  - [x] After successful adapter cancellation, remove the matching reminder record from the store so the `DepartureCard` clock badge clears immediately
  - [x] If adapter cancellation throws, fail closed: keep the dialog dismissible, preserve the reminder record, and avoid leaving the departures screen in a broken loading state
  - [x] Keep all `expo-notifications` calls inside `src/core/platform/notifications/`; feature code should continue consuming only the adapter contract

- [x] Task 4: Activate the existing cancel-mode dialog branch instead of creating a new cancellation surface (AC: 1, 3)
  - [x] Reuse `src/shared/components/departure-notification-dialog.tsx`, which already defines `mode='cancel'`, and wire its `onCancel` path from `DeparturesScreen`
  - [x] Update the dialog copy for cancel mode to match the story intent clearly: "Cancel notification for this departure?"
  - [x] Keep dismiss semantics unchanged: dismiss closes the sheet and leaves the scheduled reminder intact
  - [x] Maintain 44x44pt touch targets, button roles, and accessible labeling for both the cancel action and dismiss action

- [x] Task 5: Add regression coverage for cancel-mode UI, adapter interaction, and persisted badge behavior (AC: 1, 2, 3, 4)
  - [x] Extend `tests/features/departures/departures-screen.test.tsx` to cover long-pressing a scheduled departure, rendering the cancel-mode dialog, confirming cancellation, and preserving the badge on dismiss
  - [x] Extend shared component tests in `tests/shared/ui-components.test.tsx` for the cancel-mode dialog copy and actions
  - [x] Add or extend store tests in `tests/core/departure-reminders.store.test.ts` for targeted reminder removal without disturbing unrelated reminders
  - [x] Extend notification adapter tests in `tests/core/notifications-platform.test.ts` to verify cancellation delegates to the native Expo notifications API and remains a no-op on web

## Dev Notes

### Story Foundation

- Epic 5's third story is a direct follow-up to Story 5.2. The user already has one-off departure reminders working; this slice closes the loop by letting them undo that choice from the same long-press affordance.
- The product scope is still intentionally narrow: local notifications only, no background fetch, no backend, no web push, no route change for reminder interactions.
- The UX requirement is symmetric with Story 5.2:
  - first long-press on an unscheduled departure opens scheduling
  - long-press on the same scheduled departure opens cancellation
  - dismiss remains a no-op in both paths
- Acceptance criteria only require persistence across navigation, but the live implementation already persists reminder records through a dedicated reminder store. Build on that existing behavior rather than downgrading to ephemeral in-memory state.

### Technical Requirements

- Reuse `buildDepartureReminderKey(...)` from `src/features/departures/utils/departure-reminders.ts` as the single source of truth for mapping a `StopDeparture` row to its reminder record.
- The live reminder registry stores `{ notificationId, fireAtMs }` in `src/core/store/departure-reminders.store.ts`. Cancellation must use the stored `notificationId`; do not derive guessed Expo identifiers from departure data.
- `DeparturesScreen` currently computes `notificationScheduled` per row by checking `remindersByKey[buildDepartureReminderKey(...)]`. Keep that path intact so clearing the reminder record is sufficient to remove the badge.
- `DeparturesScreen` already owns `selectedDeparture`, overlay presentation, and reminder submission state. Keep cancellation orchestration in this screen instead of introducing a new notifications feature wrapper.
- `DepartureNotificationDialog` already has a `cancel` mode union branch with `onCancel`. Prefer wiring this existing branch over adding a second dialog component or a one-off alert.
- Keep reminder cleanup fail-closed:
  - successful native cancellation => remove reminder record
  - failed native cancellation => preserve reminder record and badge
  - dismiss => preserve reminder record and badge
- Do not introduce new GraphQL operations, query invalidation, or query cache writes. This story is entirely client-side and local.

### Architecture Compliance

- Preserve the established module boundaries:
  - `src/features/departures/` owns row interaction orchestration and selected-departure state
  - `src/shared/components/` owns `DepartureCard` and `DepartureNotificationDialog`
  - `src/core/platform/notifications/` owns all platform notification APIs
  - `src/core/store/` owns persisted reminder state
- Keep server state in TanStack Query and reminder state in the reminder store. Reminder cancellation is not server data and should not be modeled as query cache state.
- Keep the departures route resilient:
  - no blocking spinner over the whole screen
  - no disruption to existing background-refresh indicator behavior
  - no error banner changes for notification-side failures
- Continue following the architecture's local-notifications-only decision. No `expo-task-manager`, no background sync, no OS-specific logic leaking outside the platform adapter.

### Library / Framework Requirements

- Target the currently installed stack from `package.json`, especially:
  - `expo ~55.0.3`
  - `expo-notifications ~55.0.11`
  - `@tanstack/react-query ^5.90.21`
  - `zustand ^5.0.11`
- `expo-notifications` scheduling and cancellation should stay within the current adapter surface. Story 5.3 only needs `cancelScheduledNotificationAsync(identifier)` through the adapter contract already present in `src/core/platform/notifications/index.ts`.
- The current native adapter already prepares Android channels and foreground presentation. Do not fork or bypass that runtime setup while adding cancellation.
- Keep web behavior aligned with the existing adapter contract: cancellation is a silent no-op on unsupported platforms and should not throw.

### File Structure Requirements

- Update:
  - `src/features/departures/departures-screen.tsx`
  - `src/shared/components/departure-notification-dialog.tsx`
  - `src/core/store/departure-reminders.store.ts`
  - `tests/features/departures/departures-screen.test.tsx`
  - `tests/shared/ui-components.test.tsx`
  - `tests/core/departure-reminders.store.test.ts`
  - `tests/core/notifications-platform.test.ts`
- Reuse without structural changes unless clearly necessary:
  - `src/shared/components/departure-card.tsx`
  - `src/features/departures/utils/departure-reminders.ts`
  - `src/core/platform/notifications/index.ts`
  - `src/core/platform/notifications/notifications.native.ts`
  - `src/core/platform/notifications/notifications.web.ts`
- Do not create:
  - a second reminder dialog component
  - a new reminder identifier format
  - a new store for cancellation-only state
  - any new GraphQL query or mutation

### Testing Requirements

- Cover the cancel-mode entry path:
  - a scheduled departure row long-press opens the dialog in cancel mode
  - an unscheduled departure row still opens the scheduling flow from Story 5.2
- Cover confirmation behavior:
  - confirming cancellation delegates to `notificationPlatformAdapter.cancelScheduledNotification(...)`
  - the reminder record is removed only after a successful adapter call
  - the `DepartureCard` clock badge disappears immediately after successful cancellation
- Cover dismiss behavior:
  - dismiss leaves the reminder record unchanged
  - dismiss leaves the scheduled badge visible
- Cover persisted behavior:
  - reminder badges still restore after hydration/navigation until canceled or expired
  - removing one reminder does not remove unrelated reminder records
- Cover unsupported-platform behavior:
  - web remains non-interactive for reminder long-press actions
  - adapter cancellation remains safe and non-throwing on web

### Previous Story Intelligence

- Story 5.2 already established the exact implementation seams this story should continue:
  - persisted reminder registry in `src/core/store/departure-reminders.store.ts`
  - long-press entry orchestration in `src/features/departures/departures-screen.tsx`
  - adapter-owned notification scheduling and cancellation boundaries in `src/core/platform/notifications/`
- Story 5.2 deliberately avoided implementing cancel mode even though `DepartureNotificationDialog` already has a cancel branch. Story 5.3 should activate that branch rather than redesign the interaction.
- Story 5.2 also enforced a fail-closed rule for notification errors. Preserve that same posture here: cancellation failures must not clear reminder state optimistically or destabilize the departures route.
- The current reminder store is persisted through AsyncStorage, which is stronger than the original epic note about surviving navigation only. Treat the live code as authoritative.

### Git Intelligence

- Recent commits show focused, additive feature slices rather than structural rewrites:
  - `9e17989 GitButler Workspace Commit`
  - `5ea4340 feat(ui): Story 5-2 per-departure notification scheduling`
  - `23851a2 feat(ui): Story 5-1 on-launch home stop notification`
  - `af8526d feat(ui): Story 4-3 notification preferences in settings`
  - `1d37720 feat(ui): Story 4-2 display and clear home stop in settings`
- Follow that pattern here: extend the existing reminder flow in place instead of introducing new feature shells or wide refactors.
- The work from Stories 4.3, 5.1, and 5.2 already established permission handling, runtime preparation, and reminder persistence. Story 5.3 should be the narrow cancellation slice that completes that stack.

### Latest Tech Information

- Expo's current notifications documentation lists `scheduleNotificationAsync(...)` as the one-off scheduling API and `cancelScheduledNotificationAsync(identifier)` as the matching cancellation API for a scheduled notification ID. That aligns directly with the current adapter design and this story's cancellation path. Source: https://docs.expo.dev/versions/latest/sdk/notifications
- The same Expo docs expose `getAllScheduledNotificationsAsync()` and `getNextTriggerDateAsync()` for schedule introspection. Story 5.3 does not need to expand the adapter to use them unless a concrete reconciliation bug appears, so cancellation should stay minimal. Source: https://docs.expo.dev/versions/latest/sdk/notifications
- Expo's Android guidance still requires notification channels for reliable delivery, and Android 13 permission behavior depends on channels being configured. The current native adapter already centralizes channel setup; keep using it rather than adding any ad hoc notification setup in feature code. Source: https://docs.expo.dev/versions/latest/sdk/notifications

### Project Structure Notes

- The planning artifacts mention storing IDs in `src/core/store/ui.store.ts`, but the live codebase already uses `src/core/store/departure-reminders.store.ts` with persisted storage. Use the live implementation seam.
- `DeparturesScreen` already resolves reminder status row-by-row and presents the bottom-sheet overlay. It is the correct orchestration point for cancel-mode branching and adapter calls.
- `DepartureCard` already renders the clock badge via `notificationScheduled`; it likely does not need structural changes for this story beyond any test adjustments.
- No `project-context.md` file exists in this repository, so there are no extra project-context constraints beyond the planning artifacts and current codebase.

### References

- Epic 5 Story 5.3 acceptance criteria and technical note: [Source: _bmad-output/planning-artifacts/epics.md#Story-53-Departure-Notification-Cancellation]
- PRD FR46 and notification strategy: [Source: _bmad-output/planning-artifacts/prd.md#Push-Notification-Strategy]
- UX departure notification scheduling and cancel interaction: [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Departure-Notification-Scheduling]
- Architecture local-notification boundary and feature ownership: [Source: _bmad-output/planning-artifacts/architecture.md#Project-Structure--Boundaries]
- Existing departures reminder orchestration: [Source: src/features/departures/departures-screen.tsx]
- Existing reminder key helpers: [Source: src/features/departures/utils/departure-reminders.ts]
- Existing reminder registry: [Source: src/core/store/departure-reminders.store.ts]
- Existing dialog cancel-mode seam: [Source: src/shared/components/departure-notification-dialog.tsx]
- Existing notification adapter contract: [Source: src/core/platform/notifications/index.ts], [Source: src/core/platform/notifications/notifications.native.ts], [Source: src/core/platform/notifications/notifications.web.ts]
- Story 5.2 learnings and current reminder architecture: [Source: _bmad-output/implementation-artifacts/5-2-per-departure-notification-scheduling.md]
- Expo notifications SDK docs: [Source: https://docs.expo.dev/versions/latest/sdk/notifications]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Implementation Plan

- Add targeted reminder-removal support to the persisted reminder store, keeping hydration and expiry pruning intact.
- Branch `DeparturesScreen` long-press behavior so scheduled rows open the existing dialog in cancel mode while unscheduled rows keep the Story 5.2 booking path.
- Delegate cancellation through the existing notification adapter and clear local reminder state only after successful native cancellation.
- Extend departures-screen, shared-component, store, and notification-platform tests to cover cancel mode, dismiss no-op, and badge persistence/removal behavior.

### Debug Log References

- `cat _bmad/core/tasks/workflow.xml`
- `cat _bmad/bmm/workflows/4-implementation/create-story/workflow.yaml`
- `cat _bmad/bmm/workflows/4-implementation/create-story/instructions.xml`
- `cat _bmad/bmm/workflows/4-implementation/create-story/template.md`
- `cat _bmad/bmm/workflows/4-implementation/create-story/checklist.md`
- `cat _bmad-output/implementation-artifacts/sprint-status.yaml`
- `cat _bmad-output/planning-artifacts/epics.md`
- `cat _bmad-output/planning-artifacts/prd.md`
- `cat _bmad-output/planning-artifacts/architecture.md`
- `cat _bmad-output/planning-artifacts/ux-design-specification.md`
- `cat _bmad-output/implementation-artifacts/5-2-per-departure-notification-scheduling.md`
- `git log --oneline -5`
- `sed -n '1,260p' src/features/departures/departures-screen.tsx`
- `sed -n '1,260p' src/shared/components/departure-card.tsx`
- `sed -n '1,260p' src/shared/components/departure-notification-dialog.tsx`
- `sed -n '1,260p' src/core/store/departure-reminders.store.ts`
- `sed -n '1,260p' src/features/departures/utils/departure-reminders.ts`
- `sed -n '1,260p' src/core/platform/notifications/index.ts`
- `sed -n '1,260p' src/core/platform/notifications/notifications.native.ts`
- `sed -n '1,260p' src/core/platform/notifications/notifications.web.ts`
- `sed -n '300,430p' tests/features/departures/departures-screen.test.tsx`
- `sed -n '1,220p' tests/core/departure-reminders.store.test.ts`
- `sed -n '1,220p' tests/shared/ui-components.test.tsx`
- `sed -n '1,260p' tests/features/departures/departures-screen.test.tsx`
- `sed -n '1,260p' tests/core/notifications-platform.test.ts`
- `but status`
- `pnpm test -- --runInBand tests/core/departure-reminders.store.test.ts tests/shared/ui-components.test.tsx tests/core/notifications-platform.test.ts tests/features/departures/departures-screen.test.tsx`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm format:check`
- `pnpm exec prettier --write src/features/departures/departures-screen.tsx tests/features/departures/departures-screen.test.tsx tests/shared/ui-components.test.tsx`
- `pnpm test:ci`

### Completion Notes List

- Added targeted reminder removal to the persisted departure reminder store without changing reminder key shape or hydration/pruning behavior.
- Wired `DeparturesScreen` to branch long-press between schedule and cancel modes using the existing reminder registry as the source of truth.
- Cancellation now delegates through the platform adapter and clears reminder badges only after successful native cancellation; failures keep badges and stored reminders intact.
- Updated the shared dialog copy and accessibility labeling for cancel mode while preserving dismiss as a no-op.
- Added regression coverage for store removal, cancel-mode dialog UI, native/web adapter cancellation behavior, cancellation dismiss/failure flows, and badge restoration after remount.
- Validation passed: `pnpm lint`, `pnpm typecheck`, `pnpm format:check`, targeted Jest suites, and full `pnpm test:ci`.

### File List

- src/core/store/departure-reminders.store.ts
- src/features/departures/departures-screen.tsx
- src/shared/components/departure-notification-dialog.tsx
- tests/core/departure-reminders.store.test.ts
- tests/core/notifications-platform.test.ts
- tests/features/departures/departures-screen.test.tsx
- tests/shared/ui-components.test.tsx
- _bmad-output/implementation-artifacts/5-3-departure-notification-cancellation.md
- _bmad-output/implementation-artifacts/sprint-status.yaml

### Change Log

- 2026-03-12: Implemented Story 5.3 departure reminder cancellation flow, added targeted reminder removal, activated cancel-mode dialog behavior, and expanded regression coverage for cancellation and persisted badges.
- 2026-03-12: Senior developer review follow-up fixes applied for stable cancel-mode behavior, duplicate-cancel protection, and unambiguous dismiss accessibility labels. Story closed as done.

## Senior Developer Review (AI)

- Reviewed against GitButler commit `31128e7 feat(ui): Story 5-3 departure notification cancellation`.
- Fixed review findings before closure:
  - froze dialog mode at open time so reminder pruning cannot flip an active cancel sheet into schedule mode
  - blocked duplicate cancellation requests and surfaced a disabled `Cancelling...` action while cancellation is in flight
  - renamed the backdrop dismissal control to `Dismiss reminder dialog` so it no longer collides with the visible `Dismiss` action
- Re-verified targeted coverage:
  - `pnpm test -- --runInBand tests/shared/ui-components.test.tsx tests/features/departures/departures-screen.test.tsx`
  - `pnpm test -- --runInBand tests/core/departure-reminders.store.test.ts tests/core/notifications-platform.test.ts`
- Outcome: all acceptance criteria satisfied, findings resolved, story approved for closure.
