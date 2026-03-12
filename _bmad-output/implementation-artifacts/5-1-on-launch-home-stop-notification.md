# Story 5.1: On-Launch Home Stop Notification

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want the app to automatically notify me of the next home stop departure when I open the app,
so that I get the one piece of information I need most without navigating anywhere.

## Acceptance Criteria

1. **Given** a home stop is set and push notifications are enabled
   **When** the app launches and the map tab loads
   **Then** the app immediately queries the home stop's next departure via `StopDeparturesQuery`
   **And** upon receiving data, fires a local notification: "Next [shortName] from [stop name] at [HH:MM] - in [X] min"

2. **Given** the on-launch notification fires
   **When** startup time is measured
   **Then** the notification processing adds no more than 50ms to app start time
   **And** battery consumption is no greater than a single API request

3. **Given** the home stop query fails (API unavailable)
   **When** the notification would fire
   **Then** it is silently skipped
   **And** the app continues loading normally with no error shown to the user

4. **Given** push notifications are disabled in Settings
   **When** the app launches with a home stop set
   **Then** no notification is fired
   **And** no API query for the home stop is made on launch

5. **Given** no home stop is set
   **When** the app launches
   **Then** no notification is fired
   **And** the feature is a no-op without a home stop

## Tasks / Subtasks

- [x] Task 1: Add a dedicated on-launch notification orchestration hook and runtime boundary that reuses existing departures and settings infrastructure (AC: 1, 2, 4, 5)
  - [x] Create a hook under `src/features/notifications/hooks/` such as `use-home-stop-launch-notification.ts` that reads `homeStop`, `pushNotificationsEnabled`, and `notificationLeadTimeMinutes` from `useSettingsStore`
  - [x] Gate the hook so it only runs on native platforms through the existing `src/core/platform/notifications` boundary and is a hard no-op on web
  - [x] Invoke the hook from the map-launch path that actually represents app open for this product, using the existing route stack in `src/app/_layout.tsx` and `src/app/map.tsx` rather than introducing a parallel bootstrap route
  - [x] Ensure the launch flow checks prerequisites first: app active, map route focused, `homeStop?.gtfsId` present, and `pushNotificationsEnabled === true`

- [x] Task 2: Reuse the existing GraphQL departures query contract without duplicating fetch logic or introducing a second API model (AC: 1, 3, 4, 5)
  - [x] Factor a shared request/normalization path from `src/features/departures/hooks/use-stop-departures.ts` if needed so the launch-notification hook can fetch the same `StopDeparturesQueryDocument` without mounting a UI-focused polling query
  - [x] Preserve the existing query key convention from `src/core/api/query-keys.ts` and error mapping through `requestGraphql` in `src/core/api/graphql-client.ts`
  - [x] Use the first valid upcoming departure from the normalized result and compute display time using the existing date utilities in `src/core/utils/date.ts`
  - [x] Skip notification dispatch entirely when the stop has no valid departure rows, the request errors, or the payload cannot be normalized cleanly

- [x] Task 3: Extend the notification platform adapter from permission-only support to actual local notification delivery for this launch flow (AC: 1, 2, 3)
  - [x] Add adapter methods behind `src/core/platform/notifications/` for immediate local notification delivery on native, keeping `expo-notifications` imports out of feature code
  - [x] Reuse the existing Android channel bootstrap path so the launch notification does not push channel setup into feature code
  - [x] Keep content generation deterministic and minimal: route short name, stop name, formatted `HH:MM`, and minutes-until-departure
  - [x] Do not add background fetch, task manager, scheduled departure reminder persistence, or web push support in this story

- [x] Task 4: Protect app startup performance and user experience while keeping failures silent (AC: 2, 3, 4, 5)
  - [x] Ensure the notification workflow runs asynchronously after the map shell begins loading so it does not block `MapScreen` rendering or the existing map performance logging path
  - [x] Avoid firing duplicate notifications during the same foreground launch sequence if the map route re-renders or focus changes quickly
  - [x] Keep all failures silent to the user: no `ErrorBanner`, no toast, no modal, and no settings mutation on transient query failures
  - [x] Add a small dedupe guard keyed to the current app-open cycle and target departure so one launch yields at most one immediate notification

- [x] Task 5: Add regression coverage for launch gating, native/web behavior, and silent-failure rules (AC: 1, 3, 4, 5)
  - [x] Add unit tests for the new launch hook covering: notifications enabled with home stop, notifications disabled, no home stop, web no-op, and API failure skip behavior
  - [x] Extend notification platform tests in `tests/core/notifications-platform.test.ts` for the new immediate-fire adapter method
  - [x] Add focused route or screen tests proving the map route can mount with the launch hook present without surfacing an error UI on failures
  - [x] Preserve and reuse existing departures normalization tests instead of creating duplicate assertions for time formatting and realtime handling

## Dev Notes

### Story Foundation

- Epic 5 begins with the lightest notification delivery path: on app launch, read the already-pinned home stop and tell the user the next departure without any in-app navigation.
- Story 4.3 already established the notification permission boundary and the persisted settings fields (`pushNotificationsEnabled`, `notificationLeadTimeMinutes`) that this story must consume rather than reimplement.
- Story 2.5 and Story 4.2 already established the home-stop data contract and management UX. This story must treat that persisted home stop as an input only, not redesign how home stop selection works.
- The planning artifacts explicitly say this story reuses `StopDeparturesQuery` and local notifications only. It is not a background polling story, and it is not the per-departure scheduler from Stories 5.2 and 5.3.

### Technical Requirements

- **Reuse the existing settings store.** `src/core/store/settings.store.ts` already persists `homeStop`, `pushNotificationsEnabled`, and `notificationLeadTimeMinutes`. Do not create another store, AsyncStorage key, or hydration path for launch notifications.
- **Reuse the existing departures query contract.** `src/features/departures/hooks/use-stop-departures.ts` already normalizes `StopDeparturesQuery` data into a usable `StopDeparture` model. If the hook itself is too UI-oriented because of polling/query lifecycle concerns, extract shared request/normalization helpers instead of rewriting the GraphQL shape by hand.
- **Keep notification platform logic behind the adapter.** `src/core/platform/notifications/notifications.native.ts`, `notifications.web.ts`, and `notifications.ts` already isolate permission behavior. Extend that boundary with immediate-fire support rather than importing `expo-notifications` in `MapScreen` or the feature hook.
- **Web remains unsupported.** The current adapter explicitly reports notifications unsupported on web. Story 5.1 must preserve that contract and silently skip all launch notification behavior on web.
- **No user-facing error on failure.** Epic 5.1 acceptance criteria require silent skip when the home-stop query fails. Errors should not surface in the map UI, and no settings should be toggled off just because one request failed.
- **No duplicate fetch stacks.** The repo already has `requestGraphql`, shared retry/backoff behavior in `src/core/api/query-client.ts`, query key conventions in `src/core/api/query-keys.ts`, and `AppError` mapping. Build on these.
- **Keep startup cost low.** NFR4 is stricter than the earlier data features. The implementation should defer notification work so the visible app shell continues loading immediately, with at most a single request worth of extra work.

### Architecture Compliance

- Respect the existing feature/core boundaries:
  - `src/features/notifications/` owns the launch-notification orchestration hook
  - `src/core/platform/notifications/` owns native/web notification API details
  - `src/core/store/settings.store.ts` remains the only source of truth for persisted notification/home-stop inputs
  - `src/features/departures/` remains the owner of departure query structure and normalization
- Do not put launch notification orchestration directly in `src/app/map.tsx` beyond invoking a hook.
- Do not instantiate a second GraphQL client, a bespoke fetch wrapper, or hand-authored duplicate departure DTOs.
- Keep to the architecture's "local notifications only" decision: no `expo-task-manager`, no background fetch, no server, no remote push provider, no web push.
- Preserve the tuple query-key convention and the shared `AppError { kind, message, retryable, cause? }` error model.

### Library / Framework Requirements

- The repo already uses Expo SDK 55 with `expo-notifications ~55.0.11` installed and a permission adapter in place.
- Extend notification delivery using Expo Notifications APIs through the adapter layer. The current Expo notifications docs describe:
  - `getPermissionsAsync()` and `requestPermissionsAsync()` for permission state
  - Android channel setup through `setNotificationChannelAsync(...)`
  - local notification scheduling/delivery APIs under `expo-notifications`
- Reuse React Query and GraphQL Request patterns already established in the repo rather than adding another data-fetching abstraction.
- Use existing shared date formatting utilities and normalized departure models whenever possible.

### File Structure Requirements

- Update:
  - `src/app/map.tsx`
  - `src/features/map/map-screen.tsx`
  - `src/core/platform/notifications/index.ts`
  - `src/core/platform/notifications/notifications.native.ts`
  - `src/core/platform/notifications/notifications.web.ts`
  - `src/core/platform/notifications/notifications.ts`
  - `src/features/departures/hooks/use-stop-departures.ts` or extracted helper modules it delegates to
  - `tests/core/notifications-platform.test.ts`
- Create:
  - `src/features/notifications/hooks/use-home-stop-launch-notification.ts`
- Likely create or extend:
  - `tests/features/notifications/use-home-stop-launch-notification.test.tsx`
  - `tests/features/map-screen.test.tsx` or `tests/app/navigation-routes.test.tsx`
- Do not create:
  - background task registration
  - notification persistence for scheduled reminders
  - a second departures GraphQL document
  - a new home-stop data model

### Testing Requirements

- Cover gating behavior:
  - home stop present + notifications enabled => native notification path can run
  - notifications disabled => no query, no notification
  - no home stop => no query, no notification
  - web => no query, no notification
- Cover failure behavior:
  - API failure => no notification and no visible error UI regression
  - empty departures => no notification
  - duplicate mount/focus events within one launch => at most one notification
- Cover adapter behavior:
  - native immediate-fire helper delegates to Expo Notifications
  - Android runtime/channel prep still occurs through the adapter, not feature code
- Preserve existing behavior:
  - `MapScreen` still renders and logs performance without being blocked by the new hook
  - departures normalization tests remain the canonical assertions for time/status shaping

### Previous Story Intelligence

- Story 4.3 already implemented the notification permission boundary in `src/core/platform/notifications/` and set the pattern that feature code should not import `expo-notifications` directly.
- Story 4.3 also proved that web should be treated as unsupported and non-crashing for notification features. Story 5.1 must preserve that exact stance.
- Story 4.2 finalized the home-stop row and clear action in Settings, so the current home-stop contract is now stable enough to consume directly from the store.
- Story 3.1 through 3.3 established the stop departures data flow and the existing `StopDeparturesQuery` normalization path. Reuse those patterns rather than introducing a special-case "notification departures" fetch shape.

### Git Intelligence

- Recent commits show a clean sequential setup for this work:
  - `af8526d feat(ui): Story 4-3 notification preferences in settings`
  - `1d37720 feat(ui): Story 4-2 display and clear home stop in settings`
  - `fa54273 feat(ui): Story 4-1 settings screen and configurable polling radius`
- This means Epic 4 already delivered the necessary inputs for Epic 5.1:
  - persisted home stop
  - persisted push-notification toggle
  - notification lead-time preference
  - platform permission adapter
- Follow the same incremental pattern: add one focused hook and extend the existing adapter instead of restructuring app startup.

### Latest Tech Information

- Current Expo notifications docs for the latest SDK track describe local notification support, permission inspection via `getPermissionsAsync()`, permission requests via `requestPermissionsAsync()`, and Android channel setup with `setNotificationChannelAsync(...)`. This aligns with the repo's existing adapter and supports extending that adapter with an immediate local-notification method. Source: https://docs.expo.dev/versions/latest/sdk/notifications/
- The current adapter already treats iOS provisional/ephemeral authorization as granted in tests. Preserve that behavior when deciding whether launch notifications are allowed; do not regress to a simplistic boolean that ignores iOS-specific authorization states. [Source: `tests/core/notifications-platform.test.ts`]
- Because web is explicitly unsupported by the current adapter, the launch feature should branch at the adapter boundary instead of sprinkling `Platform.OS !== 'web'` checks throughout feature code. [Source: `src/core/platform/notifications/notifications.web.ts`]

### Implementation Notes

- Recommended implementation order:
  1. Extract or expose a shared departure-fetch/normalize helper from the current departures hook
  2. Extend the notification adapter with an immediate-fire API
  3. Build the `use-home-stop-launch-notification` hook with prerequisite gating and duplicate-fire protection
  4. Mount the hook from the map launch path
  5. Add hook and adapter tests, then verify no map/departures regressions
- The most likely failure mode is duplicate notifications caused by route focus changes or rerenders on app launch. Guard against this explicitly.
- The second likely failure mode is implementing this with `useQuery` + polling semantics, which would over-fetch and risk repeated notifications. Use a one-shot launch flow instead.
- The third likely failure mode is surfacing query failures through existing map error UI. Do not wire this story into `ErrorBanner`; failure must stay silent.
- The fourth likely failure mode is bypassing the adapter and importing Expo notifications directly in feature code. That would break the boundary Story 4.3 just established.

### Project Structure Notes

- The current codebase already matches the architecture closely enough for this story:
  - route wrappers in `src/app/`
  - feature modules under `src/features/`
  - platform boundaries under `src/core/platform/`
  - persisted settings in `src/core/store/`
- One important live-code variance is that `MapScreen` currently owns launch-time location and stop-query orchestration directly. For Story 5.1, keep that intact and add the new launch-notification behavior as a small hook dependency rather than moving map startup responsibilities around.
- Another live-code variance is that the departures logic currently packages fetching and normalization together in `use-stop-departures.ts`. If refactoring is needed for reuse, extract helpers surgically and preserve the public hook contract for existing screens/tests.
- No `project-context.md` file was found in the repository, so there are no extra project-context constraints beyond the planning artifacts and the live code.

### References

- Epic 5 Story 5.1 definition and acceptance criteria: [Source: _bmad-output/planning-artifacts/epics.md#Story-51-On-Launch-Home-Stop-Notification]
- PRD notification strategy, FR29, FR30, NFR4, and mobile platform notes: [Source: _bmad-output/planning-artifacts/prd.md#Push-Notification-Strategy]
- UX journey and silent-skip behavior expectations for on-launch notification: [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Journey-4-Home-Stop-On-Launch-Notification]
- Architecture notification strategy and feature/core boundaries: [Source: _bmad-output/planning-artifacts/architecture.md#Core-Architectural-Decisions]
- Existing map launch path: [Source: src/app/map.tsx], [Source: src/features/map/map-screen.tsx]
- Existing settings persistence inputs: [Source: src/core/store/settings.store.ts], [Source: src/features/settings/schema/settings.schema.ts]
- Existing home-stop persistence compatibility layer: [Source: src/core/store/home-stop-storage.ts]
- Existing notification platform boundary: [Source: src/core/platform/notifications/index.ts], [Source: src/core/platform/notifications/notifications.native.ts], [Source: src/core/platform/notifications/notifications.web.ts]
- Existing GraphQL request boundary: [Source: src/core/api/graphql-client.ts]
- Existing query retry/backoff behavior: [Source: src/core/api/query-client.ts]
- Existing query key conventions: [Source: src/core/api/query-keys.ts]
- Existing departures query and normalization path: [Source: src/features/departures/hooks/use-stop-departures.ts], [Source: src/features/departures/queries/stop-departures.graphql]
- Existing notification adapter tests: [Source: tests/core/notifications-platform.test.ts]
- Existing departures normalization tests: [Source: tests/features/departures/use-stop-departures.test.tsx]
- Expo notifications docs: [Source: https://docs.expo.dev/versions/latest/sdk/notifications/]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `sed -n '1,260p' _bmad/core/tasks/workflow.xml`
- `sed -n '1,260p' _bmad/bmm/workflows/4-implementation/create-story/workflow.yaml`
- `sed -n '1,320p' _bmad/bmm/workflows/4-implementation/create-story/instructions.xml`
- `sed -n '321,520p' _bmad/bmm/workflows/4-implementation/create-story/instructions.xml`
- `sed -n '1,220p' _bmad/bmm/workflows/4-implementation/create-story/checklist.md`
- `sed -n '1,260p' _bmad-output/implementation-artifacts/sprint-status.yaml`
- `sed -n '1,1120p' _bmad-output/planning-artifacts/epics.md`
- `sed -n '1,703p' _bmad-output/planning-artifacts/architecture.md`
- `sed -n '1,510p' _bmad-output/planning-artifacts/prd.md`
- `sed -n '1,652p' _bmad-output/planning-artifacts/ux-design-specification.md`
- `sed -n '1,260p' src/core/platform/notifications/notifications.native.ts`
- `sed -n '1,260p' src/core/platform/notifications/notifications.web.ts`
- `sed -n '1,260p' src/core/platform/notifications/notifications.ts`
- `sed -n '1,260p' src/core/platform/notifications/index.ts`
- `sed -n '1,260p' src/core/store/settings.store.ts`
- `sed -n '1,260p' src/core/store/home-stop-storage.ts`
- `sed -n '1,260p' src/features/settings/schema/settings.schema.ts`
- `sed -n '1,260p' src/app/_layout.tsx`
- `sed -n '1,260p' src/app/map.tsx`
- `sed -n '1,260p' src/features/map/map-screen.tsx`
- `sed -n '1,260p' src/features/departures/hooks/use-stop-departures.ts`
- `sed -n '1,260p' src/features/departures/departures-screen.tsx`
- `sed -n '1,260p' src/core/api/graphql-client.ts`
- `sed -n '1,260p' src/core/api/query-client.ts`
- `sed -n '1,260p' src/core/api/query-keys.ts`
- `sed -n '1,220p' tests/core/notifications-platform.test.ts`
- `sed -n '1,260p' tests/features/departures/use-stop-departures.test.tsx`
- `git log --oneline -5`
- `but status`
- `pnpm test -- --runInBand tests/core/notifications-platform.test.ts tests/features/notifications/use-home-stop-launch-notification.test.tsx tests/features/map-screen.test.tsx tests/app/navigation-routes.test.tsx tests/features/departures/use-stop-departures.test.tsx`
- `pnpm check`

### Implementation Plan

- Extract a shared one-shot departures fetch helper from `use-stop-departures.ts` so the launch flow can reuse the existing query document, normalization, and query keys without polling UI state.
- Extend the notification platform adapter with an immediate local-notification method that remains native-only and keeps `expo-notifications` out of feature code.
- Add a launch hook under `src/features/notifications/hooks/` that gates on app-active + focused map route + enabled notifications + home stop, defers work off initial render, and dedupes within a single launch cycle.
- Mount the hook from the map launch path with minimal surface-area change and keep failures silent.
- Add targeted tests for the adapter, launch hook, and map integration, then run repo validations before marking tasks complete.

### Completion Notes List

- Added a one-shot `useHomeStopLaunchNotification` hook that reads persisted notification and home-stop settings, waits until the map route is active, defers work off initial render, and silently skips unsupported, empty, or failing cases.
- Extracted shared departures fetch helpers from `use-stop-departures.ts` so launch notifications reuse the existing GraphQL document, query keys, retry behavior, and normalization path without mounting a polling query.
- Extended the notification platform adapter with native immediate local notification delivery while keeping web as a hard no-op and preserving Android channel bootstrap inside the adapter boundary.
- Mounted the launch hook in `MapScreen` without changing existing map rendering or error-banner behavior, and added regression tests for adapter delivery, hook gating, map integration, and route-level isolation.
- Verified the implementation with `pnpm check` after targeted red-green runs; lint, format check, typecheck, all 208 Jest tests, and codegen check passed.

### File List

- _bmad-output/implementation-artifacts/5-1-on-launch-home-stop-notification.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- src/core/platform/notifications/index.ts
- src/core/platform/notifications/notifications.native.ts
- src/core/platform/notifications/notifications.web.ts
- src/features/departures/hooks/use-stop-departures.ts
- src/features/map/map-screen.tsx
- src/features/notifications/hooks/use-home-stop-launch-notification.ts
- tests/app/navigation-routes.test.tsx
- tests/core/notifications-platform.test.ts
- tests/features/map-screen.test.tsx
- tests/features/notifications/use-home-stop-launch-notification.test.tsx

### Change Log

- 2026-03-12: Implemented Story 5.1 on-launch home-stop local notifications with shared departures fetching, native adapter delivery, map-route integration, and regression coverage; validated with `pnpm check`.
