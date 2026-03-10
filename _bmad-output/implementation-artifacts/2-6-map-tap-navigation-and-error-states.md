# Story 2.6: Map Tap Navigation & Error States

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to tap a stop marker on the map to navigate to its departures, and see clear error states when the API or GPS is unavailable,
so that the critical path is navigable and failures are informative rather than alarming (FR11, FR38-FR42).

## Acceptance Criteria

1. **Given** a stop marker is tapped on the map
   **When** the navigation event fires
   **Then** the app navigates to `stop/[stopId]` with the correct `gtfsId` passed as the route param (FR11)

2. **Given** the DigiTransit API is unavailable
   **When** the stops query fails
   **Then** the map continues to render because map tiles are independent of the API (FR39)
   **And** an `ErrorBanner` slides in below the `CoordinatesBar` with the text `DigiTransit API unavailable` (FR38)
   **And** no crash, freeze, or blank screen occurs (FR42)

3. **Given** the API recovers
   **When** TanStack Query retries successfully
   **Then** the `ErrorBanner` auto-hides and stop data loads without user intervention (NFR10)
   **And** the `ErrorBanner` is announced via `accessibilityLiveRegion="polite"` for screen readers

4. **Given** location permission is denied
   **When** the Stops tab renders
   **Then** an `EmptyState` is shown with the message `Enable location access to see nearby stops`
   **And** a CTA links to device Settings (FR40)

5. **Given** no stops exist within the search radius
   **When** the query returns an empty result
   **Then** an `EmptyState` is shown with the message `No stops within [radius]m - try increasing search radius in Settings` (FR41)

## Tasks / Subtasks

- [x] **Task 1: Wire map marker presses into the existing Expo Router departures route** (AC: 1)
  - [x] Keep route ownership in `src/app/map.tsx` and pass a stop-selection callback into `MapScreen`, matching the existing `StopsScreen` route pattern
  - [x] Reuse `buildStopHref(stopId)` from `src/types/navigation.ts`; do not construct ad-hoc string routes in the feature layer
  - [x] Pass `onSelectStop` into `createMapStopMarkers()` so each `PlatformMapMarker` gets a stable `onPress`
  - [x] Preserve current cross-platform marker behavior: native `Marker.onPress` and web `MapMarker` button presses must both reach the same callback

- [x] **Task 2: Add map-level API failure feedback without hiding the live map surface** (AC: 2, 3)
  - [x] Render `ErrorBanner` directly below `CoordinatesBar` in `MapScreen` when `useNearbyStops()` is in an error state
  - [x] Use the exact copy `DigiTransit API unavailable`
  - [x] Keep `PlatformMapView` mounted regardless of nearby-stops query failure so the map remains visible during outages
  - [x] Let the banner disappear purely from query recovery state; do not add manual dismiss timers or duplicate error state
  - [x] If cached stop data exists during a failed refresh, keep markers visible while the banner is shown

- [x] **Task 3: Align Stops empty/error states to the story copy and reuse existing permission UI** (AC: 4, 5)
  - [x] Reuse `LocationDeniedState` for the denied-permission path instead of inventing a second settings-link component
  - [x] Update the denied-state copy so the Stops experience clearly says nearby stops require location access
  - [x] Interpolate the current `searchRadiusMeters` value into the no-results empty state message
  - [x] Keep location-service failures, API failures, and true empty results distinct so users are not shown the wrong guidance

- [x] **Task 4: Cover route wiring and failure-state behavior with focused tests** (AC: 1, 2, 3, 4, 5)
  - [x] Extend `tests/features/map-screen.test.tsx` to assert error-banner rendering, banner removal on recovery, and marker payload `onPress` wiring
  - [x] Extend `tests/app/navigation-routes.test.tsx` or add a focused route test proving the Map route pushes `buildStopHref(stopId)` when a marker is selected
  - [x] Extend `tests/features/stops/stops-screen.test.tsx` to assert the denied-state wording and dynamic `[radius]m` empty-state copy
  - [x] Update `tests/core/platform/map-view.native.test.tsx` and `tests/core/platform/map-view.web.test.tsx` only if needed to lock in marker press propagation through both adapters

## Dev Notes

### Story Foundation

- Story 2.6 closes Epic 2's critical-path gap: the map already renders nearby stops, but marker taps are not yet connected to the departures route. This story makes the map path equivalent to the existing Stops-list navigation path and tightens the required outage/empty-state UX. [Source: _bmad-output/planning-artifacts/epics.md#story-26-map-tap-navigation--error-states]
- The UX intent is explicit: errors must be calm and factual, the map must remain visible during API outages, and empty states must explain what the user should do next. [Source: _bmad-output/planning-artifacts/ux-design-specification.md#feedback-patterns], [Source: _bmad-output/planning-artifacts/prd.md#7-error--edge-case-handling]
- Story 2.5 already established the pattern of extending existing stop-discovery surfaces instead of creating parallel flows. Follow that same discipline here: add marker navigation and map banners on top of the current map/stops implementation. [Source: _bmad-output/implementation-artifacts/2-5-home-stop-pinning.md]

### Technical Requirements

- `createMapStopMarkers()` already accepts `onSelectStop` and emits `PlatformMapMarker.onPress`, but `MapScreen` currently calls it without a callback. This is the main missing seam for AC1. Wire it; do not redesign marker data structures. [Source: src/features/map/hooks/use-map-stop-markers.ts], [Source: src/features/map/map-screen.tsx]
- `PlatformMapMarker` already supports `onPress`, and both map adapters already forward marker presses:
  - native: `react-native-maps` `Marker.onPress`
  - web: `MapMarker` rendered as a button inside Mapbox markers
  The story should use those seams rather than introducing gesture wrappers or map-provider-specific navigation logic. [Source: src/core/platform/maps/types.ts], [Source: src/core/platform/maps/map-view.native.tsx], [Source: src/core/platform/maps/map-view.web.tsx]
- Keep route construction centralized through `buildStopHref(stopId)`. The Stops route already uses that helper and the departures stub already reads `stopId` with typed `useLocalSearchParams<StopRouteParams>()`. Mirror that pattern from the Map route. [Source: src/app/stops.tsx], [Source: src/types/navigation.ts], [Source: src/app/stop/[stopId].tsx]
- The map must stay mounted independently of API state. `MapScreen` already renders `PlatformMapView` outside query conditionals, which satisfies FR39 if preserved. Do not move map rendering behind query success branches. [Source: src/features/map/map-screen.tsx]
- Nearby-stop retries, backoff, and recovery already live in the shared TanStack Query client:
  - max 3 retries
  - exponential backoff with a 30s cap
  - 403/rate-limit path backs off for 30s
  Use those shared defaults; do not add a story-local retry loop. [Source: src/core/api/query-client.ts]
- Distinguish these user-facing states clearly:
  - permission denied: settings CTA
  - location services failure: location unavailable guidance
  - API/network failure with no data: outage banner on Map, non-crashing fallback on Stops
  - zero nearby stops: radius guidance
  This separation already exists partially in `StopsScreen`; refine it rather than collapsing everything into one generic empty state. [Source: src/features/stops/stops-screen.tsx]

### Architecture Compliance

- Keep route-layer navigation in `src/app/map.tsx`; keep presentation/query orchestration in `src/features/map/map-screen.tsx`. This matches the existing route split used for Stops. [Source: _bmad-output/planning-artifacts/architecture.md#component-boundaries], [Source: src/app/stops.tsx]
- Keep server-state handling in `useNearbyStops()` + TanStack Query. Do not introduce new fetch helpers, local network state containers, or screen-owned retry logic. [Source: _bmad-output/planning-artifacts/architecture.md#state-management-patterns], [Source: src/features/stops/hooks/use-nearby-stops.ts]
- Reuse shared UI primitives:
  - `CoordinatesBar`
  - `ErrorBanner`
  - `EmptyState`
  - `LocationDeniedState`
  Do not duplicate these components inside feature folders just to tweak copy. [Source: _bmad-output/planning-artifacts/architecture.md#component-boundaries], [Source: src/shared/components/error-banner.tsx], [Source: src/shared/components/empty-state.tsx], [Source: src/features/map/components/location-denied-state.tsx]

### Library / Framework Requirements

- Expo Router continues to support typed object navigation with `router.push({ pathname, params })`, which aligns with the existing `buildStopHref()` helper. Stay on that path instead of switching to manual string interpolation. [Source: https://docs.expo.dev/router/reference/url-parameters/]
- TanStack Query's retry guidance still expects retry and retry-delay behavior to live in query config, not ad-hoc component timers. The repo already centralizes that in `query-client.ts`; preserve that design. [Source: https://tanstack.com/query/latest/docs/framework/react/guides/query-retries]
- React Native documents `accessibilityLiveRegion` for announcing UI changes, but that prop is Android-focused. Keep the existing `accessibilityRole="alert"` + `accessibilityLiveRegion="polite"` combination in `ErrorBanner`, and do not assume iOS-specific announcement behavior from `accessibilityLiveRegion` alone. [Source: https://reactnative.dev/docs/accessibility#accessibilityliveregion], [Inference from source scope]
- React Native `Linking.openSettings()` is the correct OS-settings escape hatch for denied-permission recovery. Reuse the current `LocationDeniedState` CTA instead of custom platform deep links. [Source: https://reactnative.dev/docs/linking#opensettings]

### File Structure Requirements

- Update:
  - `src/app/map.tsx`
  - `src/features/map/map-screen.tsx`
  - `src/features/map/hooks/use-map-stop-markers.ts`
  - `src/features/stops/stops-screen.tsx`
  - `src/features/map/components/location-denied-state.tsx` only if copy or CTA props must be clarified without breaking Map behavior
  - `tests/features/map-screen.test.tsx`
  - `tests/features/stops/stops-screen.test.tsx`
  - `tests/app/navigation-routes.test.tsx`
- Likely no production changes needed in:
  - `src/core/platform/maps/map-view.native.tsx`
  - `src/core/platform/maps/map-view.web.tsx`
  because both adapters already propagate marker presses
- Do not create:
  - a second map-screen route wrapper
  - a feature-local error banner clone
  - custom route string builders outside `src/types/navigation.ts`

### Testing Requirements

- Add a Map route-level assertion that a selected marker pushes `buildStopHref('HSL:...')`.
- Add a `MapScreen` test where `useNearbyStops()` returns `isError: true` and confirm:
  - `live-map-surface` still renders
  - `ErrorBanner` with `DigiTransit API unavailable` renders
  - no blank-state component replaces the map
- Add a recovery test where `MapScreen` rerenders from error to success and the banner disappears.
- Add a Stops empty-state test that uses a non-default radius and verifies the copy includes that exact radius value.
- Keep current non-regression coverage for:
  - denied permission re-request path
  - fallback Helsinki coordinates
  - no nearby query when coordinates are missing
  - no live map mounted in Stops

### Previous Story Intelligence

- Story 2.4 intentionally separated the live map experience from the Stops tab's static backdrop. Maintain that distinction: only the Map tab owns `PlatformMapView`; Stops should continue using static imagery plus list/empty states. [Source: _bmad-output/implementation-artifacts/2-4-nearby-stops-list.md], [Source: src/features/stops/stops-screen.tsx]
- Story 2.5 reused existing seams instead of introducing parallel state. Apply the same principle here: route through existing helpers, shared components, and query state rather than building one-off map error infrastructure. [Source: _bmad-output/implementation-artifacts/2-5-home-stop-pinning.md]
- Story 2.5 also confirmed the repo prefers feature-local delivery with focused tests and no architecture churn. Keep Story 2.6 similarly narrow. [Source: _bmad-output/implementation-artifacts/2-5-home-stop-pinning.md]

### Git Intelligence

- Recent work has progressed in tight Epic 2 increments:
  - `c9ed4dd feat(ui): Story 2-5 home stop pinning`
  - `7149fb2 feat(ui): Story 2-4 nearby stops list`
  - `b64d813 feat(ui): Story 2-3 nearby stop markers on map`
- That commit pattern argues for a focused patch touching route wiring, map/stops feedback UI, and tests only. Avoid mixing in Story 3 departures implementation beyond routing to the existing stub. [Source: git log --oneline -5]

### Latest Technical Information

- Expo Router's current docs still endorse route-param objects for dynamic segments; that matches the repo's typed navigation helper and should remain the implementation path. [Source: https://docs.expo.dev/router/reference/url-parameters/]
- TanStack Query's current retry guidance is consistent with the repo's shared `query-client.ts` implementation: retries and backoff are centralized and feature hooks should inherit them. [Source: https://tanstack.com/query/latest/docs/framework/react/guides/query-retries]
- React Native still documents `Linking.openSettings()` as the supported way to open app settings for denied permissions, which matches the current denied-state CTA. [Source: https://reactnative.dev/docs/linking#opensettings]
- React Native still documents `accessibilityLiveRegion="polite"` for announcing non-interruptive updates; use it for the outage banner, but keep expectations scoped correctly across platforms. [Source: https://reactnative.dev/docs/accessibility#accessibilityliveregion]

### Project Structure Notes

- Current repo reality:
  - `src/app/map.tsx` does not yet inject a stop-selection callback into `MapScreen`
  - `src/features/map/map-screen.tsx` builds markers but never supplies `onSelectStop`
  - both map adapters already support marker press propagation
  - `ErrorBanner` already exists and already sets `accessibilityRole='alert'` plus `accessibilityLiveRegion='polite'`
  - `StopsScreen` already distinguishes denied, location-error, API-error, and no-results states, but its current copy does not fully match Story 2.6 acceptance text
- No `project-context.md` file was found in the workspace; the authoritative sources are the Epic file, PRD, architecture, UX spec, previous Story 2.5 artifact, and the current codebase seams above.

### References

- Story requirements: [Source: _bmad-output/planning-artifacts/epics.md#story-26-map-tap-navigation--error-states]
- PRD requirements: [Source: _bmad-output/planning-artifacts/prd.md#7-error--edge-case-handling]
- Architecture guidance: [Source: _bmad-output/planning-artifacts/architecture.md]
- UX guidance: [Source: _bmad-output/planning-artifacts/ux-design-specification.md#feedback-patterns]
- Previous story context: [Source: _bmad-output/implementation-artifacts/2-5-home-stop-pinning.md]
- Current source files: [Source: src/app/map.tsx], [Source: src/app/stops.tsx], [Source: src/app/stop/[stopId].tsx], [Source: src/types/navigation.ts], [Source: src/features/map/map-screen.tsx], [Source: src/features/map/hooks/use-map-stop-markers.ts], [Source: src/features/map/components/location-denied-state.tsx], [Source: src/features/stops/stops-screen.tsx], [Source: src/features/stops/hooks/use-nearby-stops.ts], [Source: src/core/platform/maps/types.ts], [Source: src/core/platform/maps/map-view.native.tsx], [Source: src/core/platform/maps/map-view.web.tsx], [Source: src/shared/components/error-banner.tsx], [Source: src/shared/components/empty-state.tsx], [Source: src/core/api/query-client.ts]
- Current tests: [Source: tests/features/map-screen.test.tsx], [Source: tests/features/stops/stops-screen.test.tsx], [Source: tests/app/navigation-routes.test.tsx], [Source: tests/core/platform/map-view.native.test.tsx], [Source: tests/core/platform/map-view.web.test.tsx]
- External docs: [Source: https://docs.expo.dev/router/reference/url-parameters/], [Source: https://tanstack.com/query/latest/docs/framework/react/guides/query-retries], [Source: https://reactnative.dev/docs/accessibility#accessibilityliveregion], [Source: https://reactnative.dev/docs/linking#opensettings]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Parsed requested story `2-6` to sprint key `2-6-map-tap-navigation-and-error-states`
- Loaded the full create-story workflow, template, checklist, config, and planning artifacts
- Analyzed Epic 2, PRD, architecture, UX specification, sprint status, and completed Story 2.5
- Inspected current map route, stops route, departures stub, map marker generation, map adapters, error/empty-state components, query client defaults, and existing tests
- Verified current official docs for Expo Router params, TanStack Query retries, React Native accessibility live-region behavior, and `Linking.openSettings()`
- Added red-phase coverage for map outage banners, marker press wiring, map-route navigation, and Stops empty-state copy before implementing the story changes
- Validated the finished implementation with `pnpm lint`, `pnpm typecheck`, targeted Jest coverage, and full `pnpm test:ci`

### Implementation Plan

- Keep route-layer navigation in `src/app/map.tsx`, mirroring the existing Stops route pattern with `buildStopHref(stopId)`
- Extend `MapScreen` with an optional stop-selection callback and render `ErrorBanner` from TanStack Query error state without unmounting `PlatformMapView`
- Reuse `LocationDeniedState` in Stops with story-specific copy and interpolate `searchRadiusMeters` into the no-results empty state
- Prove the behavior with focused route and feature tests, then rerun repo-wide validations

### Completion Notes List

- Wired the Map route to push `buildStopHref(stopId)` and passed `onSelectStop` through `MapScreen` into marker payloads so map taps navigate like the Stops list
- Added `ErrorBanner` handling in `MapScreen` for nearby-stop query failures while keeping the live map mounted and preserving cached markers during refresh failures
- Reused `LocationDeniedState` with Stops-specific copy and updated the no-results message to interpolate the active `searchRadiusMeters` value
- Extended focused Jest coverage for map error recovery, marker callback wiring, route navigation, and Stops denied/empty-state messaging
- Passed `pnpm lint`, `pnpm typecheck`, and `pnpm test:ci` (existing Jest runs still emit pre-existing `act(...)` console warnings in unrelated tests)

### File List

- _bmad-output/implementation-artifacts/2-6-map-tap-navigation-and-error-states.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- src/app/map.tsx
- src/shared/components/error-banner.tsx
- src/features/map/components/location-denied-state.tsx
- src/features/map/map-screen.tsx
- src/features/stops/stops-screen.tsx
- tests/app/navigation-routes.test.tsx
- tests/core/platform/map-view.native.test.tsx
- tests/core/platform/map-view.web.test.tsx
- tests/features/map-screen.test.tsx
- tests/features/stops/stops-screen.test.tsx

## Change Log

- 2026-03-10: Implemented Story 2.6 map marker navigation, map outage feedback, Stops denied/empty-state copy updates, and focused regression coverage
- 2026-03-10: Senior developer AI review recorded 2 high, 2 medium findings; status moved back to in-progress
- 2026-03-10: Review fixes applied for animated outage banner, stable marker callbacks, adapter press coverage, and clean Stops test output; story restored to done
- _bmad-output/implementation-artifacts/2-6-map-tap-navigation-and-error-states.md

## Senior Developer Review (AI)

Reviewer: GPT-5 Codex
Date: 2026-03-10
Outcome: Approved after fixes

### Re-review Summary

- The prior denied-permission review finding was a requirements conflict, not an implementation bug. Story 2.5 explicitly reintroduced the permission retry path to fix first-launch permission regressions, so the current `canRequestAgain` behavior remains intentional and was not changed.
- `ErrorBanner` now animates in on mount, satisfying the slide-in requirement for the map outage state.
- `MapScreen` now memoizes marker generation so marker `onPress` callbacks remain stable across unchanged rerenders.
- Native and web adapter tests now exercise marker press propagation instead of only asserting marker shape.
- The remaining Stops screen warning noise was cleaned up by wrapping timer advancement in `act(...)` and mocking icon rendering in that test file.

### Validation Notes

- Story file loaded and reviewed against the current working tree.
- Story file list matches the actual changed implementation files.
- No `project-context.md` file was present in the workspace.
- Focused regression runs passed:
  - `pnpm test -- --runInBand tests/features/map-screen.test.tsx tests/core/platform/map-view.native.test.tsx tests/core/platform/map-view.web.test.tsx tests/shared/ui-components.test.tsx`
  - `pnpm test -- --runInBand tests/app/navigation-routes.test.tsx tests/features/stops/stops-screen.test.tsx`
- No new findings remain against the reviewed Story 2.6 scope.
