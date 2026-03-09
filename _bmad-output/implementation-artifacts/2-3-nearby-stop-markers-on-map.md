# Story 2.3: Nearby Stop Markers on Map

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to see nearby transit stops displayed as colour-coded, proximity-sized markers on the map,
so that I can immediately identify the nearest stop and its transport type at a glance (FR7, FR8, FR9).

## Acceptance Criteria

1. **Given** GPS coordinates are available
   **When** the `StopsNearbyQuery` completes
   **Then** stop markers appear on the map within the configured search radius (default 250m) (FR7)

2. **Given** a stop marker renders
   **When** inspected visually
   **Then** its fill colour matches the transport type token: bus `#3B82F6`, tram `#22C55E`, train `#A855F7`, metro `#F97316`, ferry `#06B6D4` (FR8)
   **And** each colour meets a minimum WCAG 3:1 contrast ratio against the dark map background (NFR11)

3. **Given** multiple stops are within the search radius
   **When** markers render
   **Then** the closest stop has the largest marker (up to `layout.markerSizeNear` 44px) and more distant stops have proportionally smaller markers (down to `layout.markerSizeBase` 28px) (FR9)

4. **Given** GPS coordinates change or the polling interval elapses
   **When** the `StopsNearbyQuery` re-runs
   **Then** markers update without a full re-render and the UI remains interactive
   **And** no blocking spinner appears (FR16, NFR3)

## Tasks / Subtasks

- [x] **Task 1: Build the reusable nearby-stops query path for map markers** (AC: 1, 4)
  - [x] Create a shared nearby-stops hook under `src/features/stops/hooks/` or an equivalent feature-owned location so Story 2.4 can reuse the same query instead of duplicating it
  - [x] Reuse `StopsNearbyQueryDocument` from `src/features/stops/queries/stops-nearby.graphql` and `queryKeys.stops.nearby(...)` from `src/core/api/query-keys.ts`
  - [x] Read `searchRadiusMeters` and `stopsPollingIntervalSeconds` from `useSettingsStore()` so the query is driven by persisted app settings rather than constants
  - [x] Normalize the GraphQL response into a stable nearby-stop shape that preserves `gtfsId`, stop identity fields, distance, and resolved transport mode for later map and list stories

- [x] **Task 2: Derive a marker view model without duplicating transport logic** (AC: 2, 3, 4)
  - [x] Reuse `mapGraphqlModeToTransportMode()` and `mapGraphqlTransitModeToTransportMode()` from `src/core/utils/transport-mode.ts` instead of introducing a second transport-mode mapper
  - [x] Add a map-specific transform that converts nearby stops into marker models with `id`, coordinates, transport mode, accessibility label, and a size value clamped between `theme.layout.markerSizeBase` and `theme.layout.markerSizeNear`
  - [x] Ensure the nearest stop resolves to the largest marker and farther stops scale down proportionally by distance instead of the current binary `base | near` sizing contract
  - [x] Keep the marker model forward-compatible with Story 2.6 by allowing an optional press handler / stop identifier handoff even if full tap navigation is implemented later

- [x] **Task 3: Render marker overlays through the shared platform map boundary** (AC: 1, 2, 3)
  - [x] Extend `src/core/platform/maps/types.ts` so the platform adapter can receive the marker data the feature actually needs (`transportMode`, visual size, accessibility label, optional interaction metadata)
  - [x] Update `src/core/platform/maps/map-view.native.tsx` to render custom marker views for nearby stops while preserving Story 2.2's dark map style, imperative recentering, and user-location dot behavior
  - [x] Reuse `src/shared/components/map-marker.tsx` for native marker visuals instead of rebuilding marker styling inside the adapter
  - [x] Update `src/core/platform/maps/map-view.web.tsx` to render Mapbox markers for nearby stops; use Mapbox marker elements for this small-radius MVP dataset rather than introducing a heavier style-layer pipeline prematurely

- [x] **Task 4: Integrate markers into `MapScreen` without regressing Story 2.1 / 2.2 behavior** (AC: 1, 4)
  - [x] Keep `src/features/map/map-screen.tsx` thin: it should assemble location + nearby-stops data and pass marker props into `PlatformMapView`, not own platform-specific marker rendering
  - [x] Do not run the nearby-stops query when location permission is denied and coordinates are unavailable beyond the Helsinki fallback-only state
  - [x] Keep the map visible during initial loading and background refresh; use existing map shell + overlays rather than blocking loaders
  - [x] Preserve Story 2.1 location flow and Story 2.2 map visibility timing instrumentation

- [x] **Task 5: Lock in accessibility, performance, and regression coverage** (AC: 2, 3, 4)
  - [x] Add unit coverage for the nearby-stop normalization / marker-sizing transform, including nearest-stop sizing and transport-mode fallback behavior
  - [x] Extend native and web platform-map tests to verify marker data is accepted and rendered through each adapter
  - [x] Add `MapScreen` regression tests proving marker props are passed through without breaking the denied-location flow or map-ready instrumentation
  - [x] Verify marker touch targets stay at or above 44x44pt and marker refreshes do not introduce a blocking spinner or controlled-region churn

## Dev Notes

### Story Foundation

- Story 2.3 is the first data-driven overlay story on top of the shared platform map adapter created in Story 2.2. The map shell exists already; this story wires live nearby-stop data into it rather than changing the base map implementation again. [Source: _bmad-output/implementation-artifacts/2-2-map-view-with-dark-tile-style.md]
- Epic 2 treats the map and nearby-stops list as two views over the same nearby-stop dataset. Story 2.3 should create a reusable query/transform path that Story 2.4 can consume directly, so the app reaches the shared-cache requirement instead of building separate fetching paths. [Source: _bmad-output/planning-artifacts/epics.md#story-23-nearby-stop-markers-on-map]
- The product value is "launch -> nearest stop is obvious -> tap -> departures". Marker hierarchy is not decorative; it is the primary spatial affordance that makes the nearest stop obvious without reading text. [Source: _bmad-output/planning-artifacts/prd.md], [Source: _bmad-output/planning-artifacts/ux-design-specification.md]

### Technical Requirements

- Reuse the existing GraphQL operation `StopsNearbyQuery` in `src/features/stops/queries/stops-nearby.graphql`; do not create a second nearby-stops operation for the map. Generated types already exist in `src/generated/graphql.ts`. [Source: src/features/stops/queries/stops-nearby.graphql], [Source: src/generated/graphql.ts]
- Reuse `queryKeys.stops.nearby({ lat, lon, radius })` so Story 2.4 can share the same TanStack Query cache entry. [Source: src/core/api/query-keys.ts]
- Drive the query from live device coordinates plus settings-store values:
  - `searchRadiusMeters`
  - `stopsPollingIntervalSeconds`
  - no persisted location history beyond the active session. [Source: src/core/store/settings.store.ts], [Source: src/features/settings/schema/settings.schema.ts], [Source: _bmad-output/planning-artifacts/prd.md]
- Reuse the existing transport-mode mapping helpers in `src/core/utils/transport-mode.ts`; GraphQL `vehicleMode` is primary and route mode is the fallback. [Source: src/core/utils/transport-mode.ts], [Source: src/features/showcase/use-live-api-validation.ts]
- The existing `MapMarker` component already encodes transport colours, 44x44 touch target minimum, and marker-size tokens. Extend it or its caller for proportional sizing rather than introducing a separate visual system for map markers. [Source: src/shared/components/map-marker.tsx], [Source: src/shared/theme/theme.ts]
- Keep marker refresh non-blocking. Initial load may have no markers yet, but once data has rendered, background refresh must keep the map interactive and avoid full-screen spinners. [Source: _bmad-output/planning-artifacts/prd.md], [Source: _bmad-output/planning-artifacts/ux-design-specification.md]

### Architecture Compliance

- Preserve the platform abstraction introduced in Story 2.2:
  - feature code prepares marker data
  - `src/core/platform/maps/` renders it per platform
  - `MapScreen` stays platform-agnostic. [Source: _bmad-output/planning-artifacts/architecture.md#frontend-architecture], [Source: _bmad-output/implementation-artifacts/2-2-map-view-with-dark-tile-style.md]
- Keep remote state in TanStack Query and client preferences in Zustand. Do not move nearby-stop API state into local component state or the settings store. [Source: _bmad-output/planning-artifacts/architecture.md#frontend-architecture]
- Keep generated GraphQL artifacts read-only. Any schema-field change belongs in `.graphql` documents, not `src/generated/`. [Source: _bmad-output/planning-artifacts/architecture.md#implementation-patterns--consistency-rules]
- Do not persist stop markers or location snapshots to AsyncStorage. Nearby stop data is remote/ephemeral session state. [Source: _bmad-output/planning-artifacts/architecture.md#data-architecture], [Source: _bmad-output/planning-artifacts/prd.md]

### Library / Framework Requirements

- Expo's current `react-native-maps` documentation for SDK 55 lists bundled version `1.26.20` and documents `PROVIDER_GOOGLE` for Google-backed Android/iOS map rendering. Story 2.3 should continue using the existing Expo-managed `react-native-maps` path on native rather than introducing a second native map SDK. [Source: https://docs.expo.dev/versions/latest/sdk/map-view/]
- The `react-native-maps` project README documents that markers are declared as `MapView` children and that custom marker views are supported, but notes performance implications for custom views. Keep the custom marker tree minimal and scoped to nearby stops only. This is an inference from the official README guidance. [Source: https://github.com/react-native-maps/react-native-maps]
- Mapbox GL JS marker docs state that DOM markers are appropriate for interactive point markers and are less efficient for large datasets (100+ markers). For Story 2.3's small-radius nearby-stop set, DOM markers are an appropriate MVP choice on web. This is an inference from Mapbox's official marker guidance. [Source: https://docs.mapbox.com/mapbox-gl-js/ja/guides/add-your-data/markers/]
- Mapbox marker interactivity on web is driven by DOM event listeners on marker elements, not by `map.on('click', ...)` feature events. Keep the web adapter marker contract ready for Story 2.6 tap navigation. [Source: https://docs.mapbox.com/mapbox-gl-js/example/marker-event-listeners/]

### File Structure Requirements

- Update:
  - `src/features/map/map-screen.tsx`
  - `src/core/platform/maps/types.ts`
  - `src/core/platform/maps/map-view.native.tsx`
  - `src/core/platform/maps/map-view.web.tsx`
  - `src/shared/components/map-marker.tsx` if proportional sizing support is added there
- Create likely new files:
  - `src/features/stops/hooks/use-nearby-stops.ts`
  - `src/features/map/hooks/use-map-stop-markers.ts` or equivalent map-specific view-model helper if a second thin transform layer is useful
  - `tests/features/stops/use-nearby-stops.test.ts` or similar
- Update tests:
  - `tests/core/platform/map-view.native.test.tsx`
  - `tests/core/platform/map-view.web.test.tsx`
  - `tests/features/map-screen.test.tsx`
- Do not create:
  - a second nearby-stops GraphQL query
  - a second transport-mode token source
  - a feature-owned platform map implementation outside `src/core/platform/maps/`

### Testing Requirements

- Cover the nearby-stop normalization path with cases for:
  - valid stop nodes
  - missing / partial nodes filtered safely
  - `vehicleMode` primary mapping and route-mode fallback
  - distance-to-size clamping between 28 and 44
- Cover native adapter behavior:
  - markers are rendered as map children
  - existing user-location and recenter behavior remains intact
  - marker rendering does not require turning the map into a controlled `region`
- Cover web adapter behavior:
  - markers are attached when a Mapbox token exists
  - missing token still shows the fallback surface cleanly
  - marker cleanup occurs when the component unmounts or marker sets change
- Cover screen behavior:
  - no nearby-stops query runs when coordinates are unavailable due to denied permission
  - marker props are passed through when coordinates exist
  - map-ready timing instrumentation still fires exactly once

### Previous Story Intelligence

- Story 2.2 already widened the platform map contract with optional `camera`, `markers`, and `onMapReady`. Story 2.3 should build on that contract rather than bypassing it from feature code. [Source: _bmad-output/implementation-artifacts/2-2-map-view-with-dark-tile-style.md], [Source: src/core/platform/maps/types.ts]
- Story 2.2 deliberately preserved imperative recentering and avoided a controlled `region` prop because controlled-region churn hurts interaction. Story 2.3 must not regress that decision while adding markers. [Source: _bmad-output/implementation-artifacts/2-2-map-view-with-dark-tile-style.md], [Source: src/core/platform/maps/map-view.native.tsx]
- Story 2.2 left marker support as scaffolding only:
  - native adapter currently renders simple `Marker pinColor`
  - web adapter currently renders no markers
  - `MapScreen` currently passes no marker data at all.
  Story 2.3 owns completing that scaffolding. [Source: src/core/platform/maps/map-view.native.tsx], [Source: src/core/platform/maps/map-view.web.tsx], [Source: src/features/map/map-screen.tsx]

### Git Intelligence

- Recent commits show the repo moved directly from Story 2.1 into Story 2.2 and then into review fixes:
  - `dc40420 feat(ui): Story 2-1`
  - `3f64583 build: Setup Google Maps API support and local Android building`
  - `36b6a77 feat(ui): Story 2-2`
- That means Story 2.3 should assume:
  - Android Google Maps setup is already in place
  - the shared platform map boundary exists and should be extended, not replaced
  - current Epic 2 work is already centered in the map feature and associated tests. [Source: git log --oneline -5]

### Latest Technical Information

- Expo SDK 55 docs currently list bundled `react-native-maps` version `1.26.20`. [Source: https://docs.expo.dev/versions/latest/sdk/map-view/]
- The Mapbox GL JS guides currently describe markers as DOM elements positioned above the map and recommend them for interactive location markers, with style layers preferred for larger datasets. [Source: https://docs.mapbox.com/mapbox-gl-js/ja/guides/add-your-data/markers/]
- The Mapbox marker event docs currently state that marker interactions use DOM event listeners on the marker element itself. [Source: https://docs.mapbox.com/mapbox-gl-js/example/marker-event-listeners/]

### Project Structure Notes

- Current repo reality matters more than target-tree theory:
  - there is no `src/features/stops/hooks/` directory yet
  - there is a nearby-stops GraphQL document already
  - there is already a `MapMarker` design-system component ready to reuse
  - the native map adapter already accepts `markers`, but only as plain `pinColor` markers
  - the web adapter still only handles base map rendering / fallback
- No `project-context.md` file was found in the workspace, so this story relies on the PRD, architecture, UX spec, epics file, Story 2.2, and current source tree as the authoritative context set.

### References

- Story 2.3 requirements: [Source: _bmad-output/planning-artifacts/epics.md#story-23-nearby-stop-markers-on-map]
- Epic 2 scope: [Source: _bmad-output/planning-artifacts/epics.md#epic-2-map-view-gps--nearby-stop-discovery]
- Product and NFR context: [Source: _bmad-output/planning-artifacts/prd.md]
- Architecture map/query/state rules: [Source: _bmad-output/planning-artifacts/architecture.md]
- UX marker hierarchy and token rules: [Source: _bmad-output/planning-artifacts/ux-design-specification.md]
- Previous story context: [Source: _bmad-output/implementation-artifacts/2-2-map-view-with-dark-tile-style.md]
- Current source files: [Source: src/features/map/map-screen.tsx], [Source: src/core/platform/maps/map-view.native.tsx], [Source: src/core/platform/maps/map-view.web.tsx], [Source: src/core/platform/maps/types.ts], [Source: src/shared/components/map-marker.tsx], [Source: src/shared/theme/theme.ts], [Source: src/core/api/query-keys.ts], [Source: src/core/utils/transport-mode.ts], [Source: src/features/stops/queries/stops-nearby.graphql], [Source: src/core/store/settings.store.ts]
- External docs: [Source: https://docs.expo.dev/versions/latest/sdk/map-view/], [Source: https://github.com/react-native-maps/react-native-maps], [Source: https://docs.mapbox.com/mapbox-gl-js/ja/guides/add-your-data/markers/], [Source: https://docs.mapbox.com/mapbox-gl-js/example/marker-event-listeners/]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Parsed user-selected Story 2.3 directly from sprint status and Epic 2 in `_bmad-output/planning-artifacts/epics.md`
- Loaded full context from PRD, architecture, UX specification, sprint status, and Story 2.2
- Inspected current map adapter, theme, query-key, settings-store, transport-mode, and nearby-query source files
- Verified current official map-stack guidance from Expo and Mapbox docs for marker implementation guardrails
- Confirmed no `project-context.md` file exists in the workspace
- Added lat/lon to the shared nearby-stops GraphQL document and regenerated generated client artifacts
- Ran focused marker/query regression tests plus full `pnpm test:ci`, `pnpm typecheck`, and `pnpm lint`
- Corrected Android native marker rendering by removing nested marker press handling, centering the marker anchor, and allowing custom marker view tracking so bus icons render cleanly on-device
- Fixed the web adapter so marker syncing reruns when the Mapbox instance becomes available, preventing initial nearby-stop markers from being dropped on first render
- Aligned marker sizing with the configured nearby-stop search radius instead of scaling against only the farthest returned stop
- Limited native custom marker view tracking to the brief post-render window needed for stable snapshots, avoiding continuous view-change tracking during polling refreshes

### Implementation Plan

- Build a reusable nearby-stops hook backed by the shared GraphQL operation, query key contract, and persisted settings
- Derive a platform-agnostic marker view model that preserves stop identity, transport mode resolution, and proportional sizing
- Extend native and web map adapters to render the shared marker contract without regressing Story 2.2 map behavior
- Keep `MapScreen` thin by composing location state, nearby-stop data, and marker props at the feature boundary
- Lock behavior with hook, adapter, screen, and route-entry regression tests before moving the story to review

### Completion Notes List

- Implemented `useNearbyStops` and `createMapStopMarkers` so Stories 2.3 and 2.4 can share the same normalized nearby-stop query path and TanStack Query cache entry
- Extended the platform map contract with transport mode, visual size, accessibility label, and optional stop handoff metadata, then rendered custom markers on native and Mapbox DOM markers on web
- Updated `MapScreen` to compose live location + nearby stops without blocking the map during refresh and without querying against denied-permission fallback-only state
- Expanded regression coverage for nearby-stop normalization, proportional marker sizing, native/web adapter marker rendering, `MapScreen`, and the map route entry point
- Validation completed successfully: `pnpm test:ci`, `pnpm typecheck`, and `pnpm lint`
- Follow-up device validation confirmed the native marker rendering issue is fixed after simplifying the custom marker snapshot path in `src/core/platform/maps/map-view.native.tsx`
- Senior review fixes now keep web marker rendering, marker-size semantics, and native marker refresh performance aligned with the story acceptance criteria

### File List

- `_bmad-output/implementation-artifacts/2-3-nearby-stop-markers-on-map.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `src/core/platform/maps/map-view.native.tsx`
- `src/core/platform/maps/map-view.web.tsx`
- `src/core/platform/maps/types.ts`
- `src/features/map/hooks/use-map-stop-markers.ts`
- `src/features/map/map-screen.tsx`
- `src/features/stops/hooks/use-nearby-stops.ts`
- `src/features/stops/queries/stops-nearby.graphql`
- `src/shared/components/map-marker.tsx`
- `src/types/react-dom-client.d.ts`
- `tests/app/navigation-routes.test.tsx`
- `tests/core/platform/map-view.native.test.tsx`
- `tests/core/platform/map-view.web.test.tsx`
- `tests/features/map-screen.test.tsx`
- `tests/features/map/use-map-stop-markers.test.ts`
- `tests/features/stops/use-nearby-stops.test.tsx`
- `tsconfig.json`

## Change Log

- 2026-03-09: Implemented shared nearby-stop marker data flow, native/web marker rendering, and regression coverage for Story 2.3; story moved to `review`
- 2026-03-09: Adjusted Android native marker rendering to fix malformed custom bus-stop icons seen on-device
- 2026-03-09: Applied senior review fixes for web marker lifecycle, search-radius-aware sizing, native marker tracking, and implementation record accuracy; marked Story 2.3 done

## Senior Developer Review (AI)

### Reviewer

Jyrki

### Date

2026-03-09

### Outcome

Approved after fixes

### Findings Resolved

- Fixed the web adapter so initial nearby-stop markers are rendered once the Mapbox instance is created instead of being dropped when marker data arrives first
- Updated the map marker transform to scale against the configured nearby-stop search radius so proximity sizing matches the story semantics instead of the current result set only
- Limited native `react-native-maps` custom-marker view tracking to the short post-render window needed for stable snapshots, reducing continuous redraw overhead during polling refreshes
- Corrected the story File List and completion record so the modified sprint tracker and resolved review work are documented accurately

### Verification

- `pnpm test -- --runInBand tests/features/map/use-map-stop-markers.test.ts tests/core/platform/map-view.native.test.tsx tests/features/map-screen.test.tsx tests/app/navigation-routes.test.tsx tests/core/platform/map-view.web.test.tsx`
- `pnpm typecheck`
- `pnpm lint`
