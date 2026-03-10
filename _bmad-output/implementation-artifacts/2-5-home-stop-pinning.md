# Story 2.5: Home Stop Pinning

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to long-press a stop in the Stops list to pin it as my home stop,
so that I can designate my regular stop for notifications and quick access (FR15, FR24).

## Acceptance Criteria

1. **Given** the Stops list is displayed
   **When** the user long-presses a `StopCard`
   **Then** a pin affordance appears
   **And** the context action reads `Pin as home stop`

2. **Given** the user confirms the pin action
   **When** the home stop is saved to the store
   **Then** the pinned `StopCard` displays a home icon badge
   **And** only one stop can be home stop at a time
   **And** pinning a new one replaces the previous without a second confirmation dialog

3. **Given** a home stop is already pinned
   **When** the user long-presses a different stop and confirms
   **Then** the new stop becomes the home stop immediately
   **And** the previous stop badge clears

4. **Given** a home stop is pinned
   **When** the app is closed and relaunched
   **Then** the home stop is restored from `app.homeStop.v1` in AsyncStorage

## Tasks / Subtasks

- [x] **Task 1: Add a long-press pinning affordance to the Stops list without regressing tap-to-departures** (AC: 1, 2, 3)
  - [x] Extend the Stops list item interaction so a normal press still navigates with `buildStopHref(stop.gtfsId)` and a long press opens a confirmation affordance for pinning
  - [x] Keep the confirmation surface feature-local and cross-platform; do not add a new dependency for action sheets or menus
  - [x] Reuse the existing visual language from the Stops experience and the current dialog/button treatment patterns already present in the repo

- [x] **Task 2: Make `homeStop` a single source of truth in the shared client store and persist it to the required storage key** (AC: 2, 3, 4)
  - [x] Keep `homeStop` owned by the shared Zustand settings store rather than creating a second feature-local state container
  - [x] Reconcile the current implementation mismatch: the store currently persists `homeStop` inside `app.settings.v1`, but this story requires restoration from `app.homeStop.v1`
  - [x] Implement a migration-safe persistence path so existing installs with `homeStop` embedded in `app.settings.v1` continue to hydrate correctly, then write the canonical value to `app.homeStop.v1`
  - [x] Avoid two long-term writable sources of truth for the same preference

- [x] **Task 3: Reflect the pinned stop in the Stops UI and preserve downstream data needed by later stories** (AC: 2, 3)
  - [x] Mark the pinned stop in the Stops list using the existing `StopCard` home badge treatment
  - [x] Ensure pinning a different stop updates the visible badge state immediately without requiring a refresh or app restart
  - [x] Persist enough home-stop identity for downstream Settings and Notifications stories, but keep the stored shape minimal and schema-validated

- [x] **Task 4: Cover interaction, migration, and persistence behavior with focused tests** (AC: 1, 2, 3, 4)
  - [x] Add screen/component tests for long-press affordance, confirmation, and pinned badge rendering
  - [x] Add store/persistence tests for hydration from legacy `app.settings.v1` data and canonical persistence to `app.homeStop.v1`
  - [x] Add a regression test proving that normal card press still navigates to departures after long-press support is introduced

## Dev Notes

### Story Foundation

- Story 2.5 is the bridge between Epic 2 stop discovery and the later Settings / Notifications work. It must set one canonical home stop from the Stops list and keep that choice available for FR25-FR29 without introducing duplicate state. [Source: _bmad-output/planning-artifacts/epics.md#story-25-home-stop-pinning], [Source: _bmad-output/planning-artifacts/prd.md#5-home-stop--push-notifications]
- The UX spec is explicit: long-press on `StopCard` shows a pin affordance, then the user confirms. Replacing the current home stop is immediate and does not require a second "replace existing" dialog. [Source: _bmad-output/planning-artifacts/ux-design-specification.md#home-stop-pin]
- Story 2.4 already delivered the exact surface this story should extend: `StopsScreen`, shared `useNearbyStops()`, and `StopCard` support for an `isPinned` badge. Build on those seams rather than introducing parallel stop-list infrastructure. [Source: _bmad-output/implementation-artifacts/2-4-nearby-stops-list.md]

### Technical Requirements

- Reuse the existing shared settings store in [src/core/store/settings.store.ts](/home/jyrki/projects/DigiTransit-v2/src/core/store/settings.store.ts). `homeStop` already exists in the schema and should remain the single in-memory source of truth for the app. Do not add Redux, React Context state, or a second Zustand store for this story. [Source: src/core/store/settings.store.ts], [Source: src/features/settings/schema/settings.schema.ts]
- Reconcile the current storage-key mismatch deliberately:
  - Current code persists `homeStop` inside `app.settings.v1`
  - The story acceptance criterion requires restore from `app.homeStop.v1`
  - `HOME_STOP_STORAGE_KEY` already exists in [src/core/store/storage-keys.ts](/home/jyrki/projects/DigiTransit-v2/src/core/store/storage-keys.ts) but is not yet used
  Recommended direction: keep `state.homeStop` in the shared settings store, but move canonical persistence to `HOME_STOP_STORAGE_KEY` with migration logic that can read legacy embedded values from `SETTINGS_STORAGE_KEY` during hydration. [Source: src/core/store/storage-keys.ts], [Source: src/core/store/settings.store.ts], [Source: src/core/store/migrations.ts]
- The persisted shape should stay minimal and schema-validated. The current `homeStopSchema` already captures `gtfsId`, `name`, and `transportMode`, which is sufficient for this story and downstream launch-notification queries. Do not start persisting full nearby-stop payloads, route lists, coordinates, or query snapshots. [Source: src/features/settings/schema/settings.schema.ts], [Source: _bmad-output/planning-artifacts/architecture.md#requirements-to-structure-mapping]
- Preserve the existing `useNearbyStops()` query contract and `NearbyStop` model as the read model for the list. Home-stop pinning is client state layered on top of nearby-stop query results; it does not justify a new GraphQL operation, a mutation, or a cache rewrite. [Source: src/features/stops/hooks/use-nearby-stops.ts], [Source: _bmad-output/planning-artifacts/architecture.md#data-boundaries]
- A normal press on a stop must keep navigating to departures. Long-press is additive behavior, not a replacement for the core tap interaction. [Source: src/app/stops.tsx], [Source: _bmad-output/planning-artifacts/prd.md#4-departure-information]

### Architecture Compliance

- Keep route responsibility in `src/app/stops.tsx` and feature behavior in `src/features/stops/`. If a confirmation surface or helper component is needed, place it under `src/features/stops/components/`, consistent with the target architecture for `home-stop-button.tsx`. [Source: _bmad-output/planning-artifacts/architecture.md]
- Keep persisted client state under `src/core/store/` and schema/migration rules under the existing settings schema + migrations files. Do not hide AsyncStorage writes directly inside screen components. [Source: _bmad-output/planning-artifacts/architecture.md#data-boundaries], [Source: _bmad-output/planning-artifacts/architecture.md#component-boundaries]
- Do not edit generated GraphQL files. This story does not require API schema changes. [Source: _bmad-output/planning-artifacts/architecture.md]

### Library / Framework Requirements

- Use React Native `Pressable` long-press behavior for the interaction entrypoint. Official docs note `onLongPress` fires after `onPressIn`, with a default 500ms delay unless `delayLongPress` is customized. Use that instead of gesture-library overreach for this simple interaction. [Source: https://reactnative.dev/docs/pressable]
- If the confirmation UI needs persistence-aware migration, stay within the existing Zustand persist flow. The official persist docs cover `partialize`, `version`, `migrate`, and hydration hooks, which map directly to the current store implementation. [Source: https://zustand.docs.pmnd.rs/integrations/persisting-store-data]
- No new menu/action-sheet package is justified here. Prefer a small repo-native confirmation surface that works on iOS, Android, and web and matches the existing lightweight dialog composition approach already used by `DepartureNotificationDialog`. [Source: src/shared/components/departure-notification-dialog.tsx]

### File Structure Requirements

- Update:
  - `src/features/stops/stops-screen.tsx`
  - `src/shared/components/stop-card.tsx`
  - `src/core/store/settings.store.ts`
  - `src/core/store/migrations.ts`
  - `src/features/settings/schema/settings.schema.ts` only if the persisted home-stop shape truly needs a safe, backward-compatible extension
- Create likely new files:
  - `src/features/stops/components/home-stop-button.tsx` or a similarly scoped confirmation component
  - `src/core/store/home-stop-storage.ts` if a dedicated storage helper is needed to keep `HOME_STOP_STORAGE_KEY` logic isolated from the screen layer
- Update tests in:
  - `tests/features/stops/stops-screen.test.tsx`
  - `tests/core/settings.store.test.ts`
  - `tests/shared/ui-components.test.tsx` if `StopCard` interaction/accessibility changes
- Do not create:
  - a second settings store
  - a second persisted home-stop source that lives indefinitely beside the canonical one
  - a new GraphQL query or server mutation for home-stop pinning

### Testing Requirements

- Extend [tests/features/stops/stops-screen.test.tsx](/home/jyrki/projects/DigiTransit-v2/tests/features/stops/stops-screen.test.tsx) to cover:
  - long-press on a stop card opens the pin affordance
  - confirming the affordance marks the correct stop as pinned
  - pinning a different stop clears the prior badge
  - standard press still calls `onStopPress(stopId)`
- Extend [tests/core/settings.store.test.ts](/home/jyrki/projects/DigiTransit-v2/tests/core/settings.store.test.ts) to cover:
  - writing the canonical home stop to `HOME_STOP_STORAGE_KEY`
  - hydration from an existing `app.homeStop.v1` payload
  - migration from legacy `homeStop` data embedded in `app.settings.v1`
  - not persisting duplicate stale copies after migration completes
- If `StopCard` gains long-press props or accessibility state, extend [tests/shared/ui-components.test.tsx](/home/jyrki/projects/DigiTransit-v2/tests/shared/ui-components.test.tsx) so the pinned badge and accessible labeling remain intact. Existing tests already assert the home-pinned visual state. [Source: tests/shared/ui-components.test.tsx]

### Previous Story Intelligence

- Story 2.4 deliberately kept `StopCard` generic while already exposing `isPinned`. That is the intended reuse seam for this story; pinning should be an interaction and state-layer addition, not a component replacement. [Source: _bmad-output/implementation-artifacts/2-4-nearby-stops-list.md], [Source: src/shared/components/stop-card.tsx]
- Story 2.4 also established that the Stops screen should remain focused on nearby-stop data and user state handling. Keep pinning responsive and local to the existing list rather than forcing query invalidation or a screen reload to show the badge. [Source: _bmad-output/implementation-artifacts/2-4-nearby-stops-list.md], [Source: src/features/stops/stops-screen.tsx]
- The current tests already exercise Stops screen rendering, navigation callback behavior, and settings-store persistence. Extend those patterns instead of adding brittle end-to-end router coverage for this story. [Source: tests/features/stops/stops-screen.test.tsx], [Source: tests/core/settings.store.test.ts]

### Git Intelligence

- Recent Epic 2 commits show incremental, feature-local delivery:
  - `7149fb2 feat(ui): Story 2-4 nearby stops list`
  - `b64d813 feat(ui): Story 2-3 nearby stop markers on map`
  - `5f7db00 feat(ui): Story 2-2 map view with dark tile style`
- That pattern matters here: keep Story 2.5 scoped to the Stops feature and store boundary, with no architecture churn outside the home-stop persistence seam.

### Latest Technical Information

- React Native `Pressable` remains the right primitive for this interaction and supports built-in `onLongPress` timing without extra gesture dependencies. [Source: https://reactnative.dev/docs/pressable]
- Zustand persist continues to support versioned migrations and partial persistence, which is the correct tool for moving legacy embedded `homeStop` data to the dedicated storage key without breaking older installs. [Source: https://zustand.docs.pmnd.rs/integrations/persisting-store-data]

### Project Structure Notes

- Current repo reality:
  - `src/features/stops/stops-screen.tsx` renders the Stops list and is the right orchestration point for pinned-state selection + confirmation presentation
  - `src/shared/components/stop-card.tsx` already renders the home badge via `isPinned`
  - `src/core/store/settings.store.ts` already owns `homeStop` in state
  - `src/core/store/storage-keys.ts` already defines `HOME_STOP_STORAGE_KEY`
  - no dedicated home-stop persistence helper exists yet
- No `project-context.md` file was found in the workspace, so the authoritative context is the Epic 2 story, PRD, architecture, UX spec, existing Stops implementation, and current store tests.

### References

- Story requirements: [Source: _bmad-output/planning-artifacts/epics.md#story-25-home-stop-pinning]
- PRD requirements: [Source: _bmad-output/planning-artifacts/prd.md#5-home-stop--push-notifications]
- Architecture guidance: [Source: _bmad-output/planning-artifacts/architecture.md]
- UX interaction guidance: [Source: _bmad-output/planning-artifacts/ux-design-specification.md#home-stop-pin]
- Previous story context: [Source: _bmad-output/implementation-artifacts/2-4-nearby-stops-list.md]
- Current source files: [Source: src/app/stops.tsx], [Source: src/features/stops/stops-screen.tsx], [Source: src/shared/components/stop-card.tsx], [Source: src/features/stops/hooks/use-nearby-stops.ts], [Source: src/core/store/settings.store.ts], [Source: src/core/store/storage-keys.ts], [Source: src/core/store/migrations.ts], [Source: src/features/settings/schema/settings.schema.ts]
- Current tests: [Source: tests/features/stops/stops-screen.test.tsx], [Source: tests/core/settings.store.test.ts], [Source: tests/shared/ui-components.test.tsx]
- External docs: [Source: https://reactnative.dev/docs/pressable], [Source: https://zustand.docs.pmnd.rs/integrations/persisting-store-data]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Parsed user-selected Story 2.5 and matched it to sprint key `2-5-home-stop-pinning`
- Loaded Epic 2 story context, PRD, architecture, UX specification, and the completed Story 2.4 artifact
- Inspected the current Stops screen, `StopCard`, nearby-stops hook, settings store, storage keys, migrations, and existing tests
- Confirmed there is no `project-context.md` file in the workspace
- Verified official docs for React Native `Pressable` and Zustand persist migration behavior
- Added Story 2.5 interaction tests first, then implemented long-press home-stop confirmation in `StopsScreen` and `StopCard`
- Added a dedicated `home-stop-storage` wrapper so Zustand still owns `homeStop` in memory while canonical persistence moves to `app.homeStop.v1`
- Ran focused Jest suites for `stops-screen`, `settings.store`, and shared UI components; then ran `pnpm check`
- Fixed the location permission request path so launch-time permission can still be requested when Expo reports `denied` with `canAskAgain: true`
- Added a test-only reset for the singleton device-location hook state and covered the permission regression in the hook tests
- Added a permission retry fallback from the denied-state UI so first-launch misses can still trigger the OS prompt
- Adjusted the denied-state layout so its CTA clears the bottom tab bar instead of overlapping it
- Verified the final behavior with a clean reinstall: the app now requests location permission correctly on first launch

### Implementation Plan

- Add long-press confirmation to the Stops list while preserving normal press navigation
- Keep `homeStop` as a single shared store value, but migrate canonical persistence to `app.homeStop.v1`
- Update pinned-state rendering and focused tests around screen interaction and persistence migration

### Completion Notes List

- Implemented long-press pinning with a feature-local confirmation surface that preserves normal stop-card press navigation
- Wired pinned badge rendering directly to the shared settings store so replacing the home stop updates the list immediately
- Moved canonical persisted home-stop storage to `app.homeStop.v1` while still hydrating legacy embedded `homeStop` data from `app.settings.v1`
- Added focused tests for long-press interaction, pinned badge replacement, canonical home-stop persistence, and `StopCard` long-press support
- Fixed the launch-time location permission regression and validated the full repo with `pnpm check`
- Added a denied-state permission retry path for Map and Stops, and fixed the denied-state card spacing above the tab bar
- Confirmed on-device after reinstall that first-launch location permission now works as expected

### File List

- _bmad-output/implementation-artifacts/2-5-home-stop-pinning.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- src/core/store/home-stop-storage.ts
- src/core/store/settings.store.ts
- src/features/map/components/location-denied-state.tsx
- src/features/map/map-screen.tsx
- src/features/map/hooks/use-device-location.ts
- src/features/stops/components/home-stop-button.tsx
- src/features/stops/stops-screen.tsx
- src/shared/components/stop-card.tsx
- tests/app/navigation-routes.test.tsx
- tests/core/settings.store.test.ts
- tests/features/map-screen.test.tsx
- tests/features/use-device-location.test.tsx
- tests/features/stops/stops-screen.test.tsx
- tests/shared/ui-components.test.tsx
