# Story 2.4: Nearby Stops List

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to see a sorted list of nearby stops with full metadata,
so that I can browse and compare stops beyond what is immediately visible on the map (FR12, FR13).

## Acceptance Criteria

1. **Given** GPS coordinates are available
   **When** the Stops tab renders
   **Then** a list of nearby stops is displayed sorted by distance from current location (FR12)
   **And** any map-like background behind the list is a static image only, not a live interactive map surface

2. **Given** each stop in the list
   **When** rendered as a `StopCard`
   **Then** it displays: stop name, code, transport type (C+D icon badge), zone, distance in metres, and patterns (route names via the stop) (FR13)
   **And** the `StopCard` tap target is at minimum 44x44pt (NFR13)

3. **Given** the stops polling interval elapses
   **When** new data arrives
   **Then** the list updates silently
   **And** last known data remains visible during refresh with only a subtle indicator (NFR3)

4. **Given** both the Map markers and the Stops list are mounted
   **When** data is fetched
   **Then** only one API request is issued
   **And** the TanStack Query cache serves both consumers (NFR14)

## Tasks / Subtasks

- [x] **Task 1: Replace the Stops route stub with the real nearby-stops screen shell** (AC: 1, 3)
  - [x] Replace the stub content in `src/app/stops.tsx` with a focused route entry that renders a feature-owned Stops screen instead of placeholder copy
  - [x] Keep route-level responsibility limited to focus/navigation wiring, following the same pattern as `src/app/map.tsx`
  - [x] Add a static backdrop treatment for the Stops screen using a non-interactive image layer or equivalent visual asset; do not mount `PlatformMapView` behind the list
  - [x] Keep the shared tab shell behavior intact and preserve push navigation into `stop/[stopId]`

- [x] **Task 2: Extend the shared nearby-stops data model for list rendering without breaking Story 2.3** (AC: 1, 2, 4)
  - [x] Expand `normalizeNearbyStops()` in `src/features/stops/hooks/use-nearby-stops.ts` to preserve list metadata already available in `StopsNearbyQuery`: zone, parent-station name, and route/pattern details needed by the list
  - [x] Keep `queryKeys.stops.nearby({ lat, lon, radius })` unchanged so Map and Stops continue to share one cache entry
  - [x] Preserve the existing distance sort contract and avoid introducing a second nearby-stops hook or a separate GraphQL operation
  - [x] Add any small presentational formatter helpers needed for distance/pattern labels in feature-local code rather than mutating generated GraphQL types

- [x] **Task 3: Build the nearby-stops list UI from existing design-system primitives** (AC: 1, 2, 3)
  - [x] Create a feature-owned screen component under `src/features/stops/` that composes `CoordinatesBar`, loading/refresh state, empty state, and the nearby stops list
  - [x] Reuse and extend `src/shared/components/stop-card.tsx` so each card can display the full Story 2.4 metadata set: stop name, code badge, transport icon badge, zone, distance, and route patterns
  - [x] Keep the glassmorphism card treatment and transport tint consistent with the existing design tokens in `src/shared/theme/theme.ts`
  - [x] Show last known stop data during background refresh and expose only a subtle refresh indicator instead of replacing the list with a blocking loader

- [x] **Task 4: Wire stop selection and state handling for real list behavior** (AC: 1, 2, 3)
  - [x] Navigate to the departures route with `buildStopHref(stop.gtfsId)` when a `StopCard` is pressed
  - [x] Reuse `useDeviceLocation()` and `useNearbyStops()` so the Stops screen reflects the same coordinates and nearby-stop dataset as the Map screen
  - [x] Handle the key user states explicitly:
    - [x] location denied: show a clear empty state with guidance to enable location in device settings
    - [x] no stops in radius: show a specific empty state suggesting a larger search radius
    - [x] API failure with cached/previous data: keep visible data on screen and show a calm inline failure message
    - [x] API failure with no prior data: show a non-crashing empty/error state, not a blank screen

- [x] **Task 5: Lock in shared-cache, rendering, and regression coverage** (AC: 2, 3, 4)
  - [x] Add or extend hook tests proving the normalized nearby-stop shape now includes the list metadata while retaining stable sorting and transport-mode resolution
  - [x] Add screen/component tests for the Stops experience: rendered list items, silent refresh behavior, empty states, and press navigation
  - [x] Add a cache-sharing regression test proving the Map and Stops consumers reuse the same query key rather than issuing duplicate requests
  - [x] Keep testing at the existing repo level of pragmatism: focused hook/component/screen tests, not brittle full-router integration

## Dev Notes

### Story Foundation

- Story 2.4 is the list-view counterpart to Story 2.3's map markers. Both views must read from the same nearby-stops query so the user can move between Map and Stops without duplicate network work or diverging stop data. [Source: _bmad-output/planning-artifacts/epics.md#story-24-nearby-stops-list], [Source: _bmad-output/implementation-artifacts/2-3-nearby-stop-markers-on-map.md]
- The current repo already has the shared data path started:
  - `src/features/stops/hooks/use-nearby-stops.ts` fetches and sorts nearby stops
  - `src/features/stops/queries/stops-nearby.graphql` already includes the pattern data the list needs
  - `MapScreen` already consumes that hook for markers
  Story 2.4 should extend this path, not replace it. [Source: src/features/stops/hooks/use-nearby-stops.ts], [Source: src/features/stops/queries/stops-nearby.graphql], [Source: src/features/map/map-screen.tsx]
- The Stops tab is currently still a navigation-shell stub. This story owns turning it into the real list screen while preserving the existing push route into `stop/[stopId]`. [Source: src/app/stops.tsx], [Source: src/types/navigation.ts]

### Technical Requirements

- Reuse `StopsNearbyQuery` from `src/features/stops/queries/stops-nearby.graphql`; do not create a list-specific duplicate operation. The existing query already returns:
  - `distance`
  - `stop.gtfsId`
  - `stop.name`
  - `stop.code`
  - `stop.zoneId`
  - `stop.vehicleMode`
  - `stop.parentStation.name`
  - `stop.patterns[].route.{shortName,longName,mode}`
  - `stop.patterns[].stops[]`
  These are sufficient for Story 2.4 if the normalized view model preserves them. [Source: src/features/stops/queries/stops-nearby.graphql]
- Extend `NearbyStop` in `src/features/stops/hooks/use-nearby-stops.ts` instead of introducing a parallel list type. At minimum, preserve:
  - `zoneId`
  - `parentStationName`
  - route/pattern names for display
  - enough stop identity to support later home-stop pinning in Story 2.5
- Keep sorting by ascending `distanceMeters` in the shared normalization layer so all consumers see the same canonical order. [Source: src/features/stops/hooks/use-nearby-stops.ts]
- The Stops screen should use:
  - `useDeviceLocation()` for live coordinates and permission state
  - `useNearbyStops()` for remote nearby-stop data
  - `buildStopHref(stop.gtfsId)` for detail navigation
  Do not reimplement location polling or route building in the screen. [Source: src/features/map/hooks/use-device-location.ts], [Source: src/types/navigation.ts]
- The static background requirement is strict: any map-like visual treatment on the Stops screen must be a static image or static visual layer only. Do not mount `PlatformMapView`, Mapbox, or `react-native-maps` behind the list just to mimic map context. [Source: _bmad-output/planning-artifacts/epics.md#story-24-nearby-stops-list], [Source: _bmad-output/planning-artifacts/ux-design-specification.md]
- The current shared `LoadingState` component is a centered blocking spinner. That is acceptable for an initial no-data load only. Once stop data has rendered at least once, refresh behavior must keep the list visible and use a smaller non-blocking indicator. [Source: src/shared/components/loading-state.tsx], [Source: _bmad-output/planning-artifacts/ux-design-specification.md]

### Architecture Compliance

- Follow the feature-first structure from the architecture:
  - route entry in `src/app/`
  - nearby-stops feature logic/UI in `src/features/stops/`
  - shared design primitives in `src/shared/components/`
  - query keys and API client in `src/core/api/`
  Do not push list-specific UI back into the route file or into `src/core/`. [Source: _bmad-output/planning-artifacts/architecture.md#frontend-architecture]
- Keep remote state in TanStack Query and client preferences in Zustand. Nearby stops remain remote session state, not persisted app state. [Source: _bmad-output/planning-artifacts/architecture.md#data-architecture], [Source: src/core/store/settings.store.ts]
- Generated GraphQL code under `src/generated/` remains read-only. Any shape change happens in the `.graphql` document and codegen, not by editing generated types directly. [Source: _bmad-output/planning-artifacts/architecture.md]
- Preserve the shared query key contract in `src/core/api/query-keys.ts` so Map and Stops deduplicate correctly under TanStack Query. [Source: src/core/api/query-keys.ts]

### Library / Framework Requirements

- The repo is on `@tanstack/react-query` `^5.90.21`. Use the query result state the library already exposes for silent refresh behavior, specifically background-fetch indicators (`isFetching` alongside existing data) rather than resetting the screen to a pending-only experience. [Source: package.json], [Source: https://tanstack.com/query/latest/docs/framework/react/guides/background-fetching-indicators]
- The repo is on React Native `0.83.2`. Use `FlatList` for the nearby-stops list rather than manually mapping a large scroll view, and configure stable `keyExtractor` / rendering behavior appropriate for repeated polling updates. [Source: package.json], [Source: https://reactnative.dev/docs/0.83/flatlist]
- The repo already includes `expo-image` `~55.0.5`. If a static backdrop image is introduced for the Stops screen, prefer `expo-image` over ad hoc alternatives and keep it visually subordinate to the cards. [Source: package.json], [Source: https://docs.expo.dev/versions/latest/sdk/image/]
- Keep navigation on Expo Router with the existing typed helper contract; do not add raw string path construction in the stop cards or screen component. [Source: src/types/navigation.ts]

### File Structure Requirements

- Update:
  - `src/app/stops.tsx`
  - `src/features/stops/hooks/use-nearby-stops.ts`
  - `src/shared/components/stop-card.tsx`
- Create likely new files:
  - `src/features/stops/stops-screen.tsx`
  - `src/features/stops/components/...` for small list-specific presentation helpers if needed
  - `tests/features/stops/stops-screen.test.tsx` or equivalent
- Consider adding:
  - a dedicated static backdrop asset under `assets/images/` only if the current asset set does not already contain a suitable non-interactive background
- Do not create:
  - a second nearby-stops GraphQL query
  - a second nearby-stops hook for the Stops tab
  - a live map component under the Stops tab

### Testing Requirements

- Extend hook coverage in `tests/features/stops/use-nearby-stops.test.tsx` to verify the normalized list model includes zone and pattern data without regressing existing filtering and sorting behavior. [Source: tests/features/stops/use-nearby-stops.test.tsx]
- Add a dedicated Stops screen test covering:
  - initial render with nearby stops sorted by distance
  - background refresh with previous data retained
  - location-denied empty state
  - no-stops-in-radius empty state
  - stop-card press navigation to `buildStopHref(stopId)`
- Add a cache-sharing test or equivalent focused assertion proving the list consumes the same `queryKeys.stops.nearby(...)` contract already used by `MapScreen`. [Source: src/core/api/query-keys.ts], [Source: src/features/map/map-screen.tsx]
- Reuse the repo's current testing style:
  - Jest
  - `@testing-library/react-native`
  - focused module mocks around hooks and router calls
  Avoid booting the full router tree unless a test truly needs it. [Source: tests/features/map-screen.test.tsx], [Source: tests/app/navigation-routes.test.tsx]

### Previous Story Intelligence

- Story 2.3 intentionally created `useNearbyStops()` as a shared hook so Story 2.4 would not need a second fetch path. That is now the primary reuse seam for this story. [Source: _bmad-output/implementation-artifacts/2-3-nearby-stop-markers-on-map.md]
- Story 2.3's normalized `NearbyStop` shape is currently marker-oriented and drops much of the list metadata. Story 2.4 should extend that existing shape instead of bypassing the hook. [Source: src/features/stops/hooks/use-nearby-stops.ts]
- Story 2.3 also established that refresh behavior should remain non-blocking and that the UI should avoid a full-screen spinner once data is already present. Carry that same rule into the Stops list. [Source: _bmad-output/implementation-artifacts/2-3-nearby-stop-markers-on-map.md]
- The most recent Epic 2 implementation files and tests touched:
  - `src/features/stops/hooks/use-nearby-stops.ts`
  - `src/features/map/map-screen.tsx`
  - `tests/features/stops/use-nearby-stops.test.tsx`
  - `tests/features/map-screen.test.tsx`
  Story 2.4 should build adjacent to those patterns, not create a parallel architecture. [Source: git show --stat --oneline ad253d8]

### Git Intelligence

- Recent commits relevant to this story:
  - `ad253d8 feat(ui): Story 2-3`
  - `36b6a77 feat(ui): Story 2-2`
  - `3f64583 build: Setup Google Maps API support and local Android building`
- The codebase trend in Epic 2 is clear:
  - Story 2.2 established the shared map adapter
  - Story 2.3 established the shared nearby-stops query and marker transform
  - Story 2.4 should therefore focus on reusing the shared query and design primitives for the list view, not on infrastructure churn
- The current Stops route is still stubbed, so the main implementation surface for this story is additive and localized rather than a broad refactor. [Source: src/app/stops.tsx]

### Latest Technical Information

- TanStack Query v5 documents background fetching indicators for showing a subtle refresh state while keeping existing data rendered. That matches this story's silent-refresh requirement and is the correct pattern for the Stops list. [Source: https://tanstack.com/query/latest/docs/framework/react/guides/background-fetching-indicators]
- React Native `FlatList` remains the standard performant primitive for repeated list updates with stable keys, which fits a polling nearby-stops list better than a basic `ScrollView`. [Source: https://reactnative.dev/docs/0.83/flatlist]
- Expo's current `expo-image` docs cover static image rendering with `contentFit`, making it the appropriate choice if this story introduces a static visual backdrop on the Stops screen. [Source: https://docs.expo.dev/versions/latest/sdk/image/]

### Project Structure Notes

- Current repo reality:
  - `src/app/stops.tsx` is placeholder UI
  - `src/shared/components/stop-card.tsx` currently shows only name, code, transport mode, distance, and optional pinned state
  - `src/features/stops/hooks/use-nearby-stops.ts` already sorts and normalizes nearby stops
  - there is no dedicated `src/features/stops/stops-screen.tsx` yet
  Story 2.4 should evolve these exact seams. [Source: src/app/stops.tsx], [Source: src/shared/components/stop-card.tsx], [Source: src/features/stops/hooks/use-nearby-stops.ts]
- The UX spec requires the Stops and Departures views to preserve the same visual mood as the Map tab but with static map imagery only, never a second live interactive map surface. [Source: _bmad-output/planning-artifacts/ux-design-specification.md]
- No `project-context.md` file was found in the workspace, so the authoritative context remains the epic, PRD, architecture, UX spec, current source tree, and prior Epic 2 story artifacts.

### References

- Story 2.4 requirements: [Source: _bmad-output/planning-artifacts/epics.md#story-24-nearby-stops-list]
- Epic 2 scope: [Source: _bmad-output/planning-artifacts/epics.md#epic-2-map-view-gps--nearby-stop-discovery]
- Product requirements context: [Source: _bmad-output/planning-artifacts/prd.md]
- Architecture guidance: [Source: _bmad-output/planning-artifacts/architecture.md]
- UX list/static-backdrop guidance: [Source: _bmad-output/planning-artifacts/ux-design-specification.md]
- Previous story context: [Source: _bmad-output/implementation-artifacts/2-3-nearby-stop-markers-on-map.md]
- Current source files: [Source: src/app/stops.tsx], [Source: src/features/stops/hooks/use-nearby-stops.ts], [Source: src/features/stops/queries/stops-nearby.graphql], [Source: src/features/map/map-screen.tsx], [Source: src/shared/components/stop-card.tsx], [Source: src/shared/components/loading-state.tsx], [Source: src/shared/components/empty-state.tsx], [Source: src/shared/components/coordinates-bar.tsx], [Source: src/types/navigation.ts], [Source: src/core/api/query-keys.ts], [Source: src/core/store/settings.store.ts], [Source: src/shared/theme/theme.ts]
- Current tests: [Source: tests/features/stops/use-nearby-stops.test.tsx], [Source: tests/features/map-screen.test.tsx], [Source: tests/app/navigation-routes.test.tsx]
- External docs: [Source: https://tanstack.com/query/latest/docs/framework/react/guides/background-fetching-indicators], [Source: https://reactnative.dev/docs/0.83/flatlist], [Source: https://docs.expo.dev/versions/latest/sdk/image/]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Parsed user-selected Story 2.4 from sprint tracking and Epic 2 in `_bmad-output/planning-artifacts/epics.md`
- Loaded full context from PRD, architecture, UX specification, sprint status, and the completed Story 2.3 artifact
- Inspected the current Stops stub route, shared nearby-stops hook/query, StopCard, MapScreen, query-key contract, settings store, and relevant tests
- Confirmed there is no `project-context.md` file in the workspace
- Verified current official docs for TanStack Query background refresh guidance, React Native `FlatList`, and Expo `expo-image`
- Added red-phase coverage for nearby-stop normalization, the Stops screen states, and shared query-cache deduplication before implementation
- Implemented the feature-owned Stops screen, route wiring, shared stop-card metadata rendering, and non-interactive static backdrop treatment
- Ran `pnpm test:ci`, `pnpm lint`, `pnpm typecheck`, and `pnpm codegen:check` after fixing route-entry, accessibility, and typed-fixture regressions

### Implementation Plan

- Extend the shared nearby-stop view model with list metadata while preserving the existing query key and distance ordering contract
- Replace the Stops tab stub with a feature-owned screen that reuses device location, nearby stops, and typed stop navigation
- Cover silent refresh, empty/error states, and cache sharing with focused tests aligned to existing repo patterns

### Completion Notes List

- Replaced the Stops tab stub with a focused route entry and a feature-owned `StopsScreen` that renders a static backdrop, coordinates bar, and `FlatList` of nearby stops
- Extended `normalizeNearbyStops()` to preserve zone, parent station, and route pattern labels while keeping the existing shared TanStack Query key and sorted result contract
- Expanded `StopCard` to display zone and route metadata without regressing the existing glass/tint treatment or accessibility expectations
- Implemented non-blocking refresh, location-denied, no-results, cached-error, and no-cache-error states for the Stops experience
- Added regression coverage for the expanded nearby-stop model, Stops screen interaction/state handling, route entry behavior, and shared-cache deduplication
- Hardened `useDeviceLocation()` into a shared location source so the Map and Stops views consume one coordinate stream and keep the nearby-stops query deduplicated when both tabs are mounted
- Added an explicit location-services failure state so GPS acquisition errors no longer fall through to the misleading "No nearby stops found" empty state
- Verified the story with `pnpm test:ci`, `pnpm lint`, `pnpm typecheck`, and `pnpm codegen:check`

### File List

- _bmad-output/implementation-artifacts/2-4-nearby-stops-list.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- src/app/stops.tsx
- src/features/stops/components/nearby-stop-formatters.ts
- src/features/stops/hooks/use-nearby-stops.ts
- src/features/stops/stops-screen.tsx
- src/shared/components/stop-card.tsx
- tests/app/navigation-routes.test.tsx
- tests/features/map/use-map-stop-markers.test.ts
- tests/features/stops/stops-screen.test.tsx
- tests/features/stops/use-nearby-stops.test.tsx

## Change Log

- 2026-03-09: Implemented Story 2.4 nearby-stops list UI, shared metadata normalization, silent refresh/error states, and regression coverage
- 2026-03-09: Resolved senior review findings by sharing the location source across tabs, handling location-service failures explicitly, and tightening AC4 regression coverage

## Senior Developer Review (AI)

### Reviewer

Jyrki

### Date

2026-03-09

### Outcome

Approved after fixes

### Findings Resolved

- Shared the `useDeviceLocation()` tracking session across consumers so Map and Stops now derive nearby-stop queries from one live coordinate source instead of racing separate watchers
- Added a dedicated location-services failure state in the Stops screen so GPS acquisition failures no longer render as a misleading no-results empty state
- Strengthened regression coverage to verify nearby stops stay sorted, the Stops screen preserves rendered order, and two mounted consumers reuse one shared location/query path

### Verification

- `pnpm test -- --runInBand tests/features/stops/use-nearby-stops.test.tsx tests/features/stops/stops-screen.test.tsx tests/features/map/use-map-stop-markers.test.ts tests/app/navigation-routes.test.tsx`
- `pnpm typecheck`
