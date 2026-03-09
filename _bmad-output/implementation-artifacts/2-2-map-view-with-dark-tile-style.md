# Story 2.2: Map View with Dark Tile Style

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to see a dark-styled map centred on my GPS location,
so that I have a spatial context that pairs correctly with the glassmorphism UI (FR6, FR10).

## Acceptance Criteria

1. **Given** the map screen loads
   **When** map tiles render
   **Then** a dark tile style is used (Mapbox `dark-v11` on web, equivalent dark style on native)
   **And** the map is visible within 3 seconds of app launch at the 95th percentile on a normal mobile connection (NFR1)
   **And** Story 2.2 keeps live map rendering exclusive to the Map tab; later Stops and Departures views must use static map imagery if they need a spatial backdrop

2. **Given** the map is rendered
   **When** the user pans or zooms
   **Then** the map responds fluidly without blocking the UI thread
   **And** touch response does not exceed 100ms (NFR3, FR10)

3. **Given** the platform is iOS or Android
   **When** the map renders
   **Then** `react-native-maps` is used via the platform adapter in `src/core/platform/maps/map-view.native.tsx`

4. **Given** the platform is web
   **When** the map renders
   **Then** the Mapbox GL JS adapter in `src/core/platform/maps/map-view.web.tsx` is used
   **And** the Mapbox public token is read from env config, not hardcoded

## Tasks / Subtasks

- [x] **Task 1: Introduce the shared platform map adapter boundary** (AC: 3, 4)
  - [x] Move the current map implementation behind `src/core/platform/maps/` instead of keeping platform branching inside `src/features/map/components/`
  - [x] Create a shared adapter contract that accepts camera/region props, user-location visibility, and future marker overlay support without reworking Story 2.3
  - [x] Keep `src/features/map/map-screen.tsx` thin: it should consume the shared adapter, not import `react-native-maps` or web map libraries directly
  - [x] Preserve the Story 2.1 location flow and `CoordinatesBar` behavior while refactoring the map surface boundary

- [x] **Task 2: Add a true dark map implementation for native** (AC: 1, 2, 3)
  - [x] Continue using `react-native-maps` on iOS/Android, as already added in the repo
  - [x] Apply an equivalent dark native map style rather than the current default map appearance
  - [x] Ensure the map still recentres to live coordinates from `useDeviceLocation()` without snapping back on unrelated rerenders
  - [x] Keep panning/zooming interactive and avoid introducing controlled-region churn that would block gesture handling

- [x] **Task 3: Add the web dark-map adapter with tokenized Mapbox configuration** (AC: 1, 4)
  - [x] Add a web-only Mapbox GL JS adapter in `src/core/platform/maps/map-view.web.tsx`
  - [x] Read the Mapbox public token from env/config and fail gracefully to a clear local-dev fallback when the token is missing
  - [x] Use the `dark-v11` style on web to match the planned visual direction
  - [x] Keep the web adapter isolated from native bundles so Android/iOS builds do not pull in web-only map code paths

- [x] **Task 4: Extend app configuration for cross-platform map provider setup** (AC: 1, 3, 4)
  - [x] Extend `src/core/config/env.ts` and `.env.example` with the public web map token
  - [x] Keep Android Google Maps API key handling in `app.config.js` intact
  - [x] Add the iOS Google Maps config path if needed for parity with the native dark-style strategy, but keep all keys env-driven
  - [x] Update README local-setup notes so developers know which map keys are required for Android and web

- [x] **Task 5: Align the map visuals with the current design system** (AC: 1, 2)
  - [x] Ensure the dark map tone supports the existing glass card surfaces, `CoordinatesBar`, and dark background tokens from `src/shared/theme/theme.ts`
  - [x] Keep the map visible beneath overlays; do not regress to a blank or opaque placeholder while loading
  - [x] Preserve the existing `LocationDeniedState` overlay behavior introduced in Story 2.1
  - [x] Avoid introducing stop markers in this story beyond any minimal scaffolding needed for Story 2.3

- [x] **Task 6: Add focused tests and verification for platform behavior** (AC: 1, 2, 3, 4)
  - [x] Add native tests that verify the map screen renders through the shared adapter and still shows user location when permission is granted
  - [x] Add web adapter tests for token handling, dark style selection, and graceful fallback behavior when the token is missing
  - [x] Verify the refactor does not break Story 2.1 behaviors: fallback Helsinki centre, denied state, and `CoordinatesBar` updates
  - [x] Verify the map surface remains interactive and does not regress into a fully controlled region implementation

## Dev Notes

### Story Foundation

- Story 2.2 is the immediate follow-on to Story 2.1 and should build on the now-working GPS-aware map shell rather than replacing it.
- The current repo already renders a native `react-native-maps` map from `src/features/map/components/map-surface.native.tsx`, but it still uses the default map presentation and does not yet follow the planned shared adapter path under `src/core/platform/maps/`.
- Web is still a placeholder `View` in `src/features/map/components/map-surface.tsx`; Story 2.2 is where the real dark-styled web map adapter is introduced.
- This story is still map-surface-only. Nearby stop markers, stop fetching, and map marker interactions remain owned by Stories 2.3 and 2.6.
- The live map provider introduced here is only for the Map tab. If Stops or Departures later need a blurred/background spatial treatment, they must use a static image or screenshot-like asset rather than mounting a live Google Maps or Mapbox instance for visual effect.

### Technical Requirements

- Keep the existing `react-native-maps` dependency and Expo config-plugin path. Expo's current docs list bundled `react-native-maps` version `1.26.20` and document using the config plugin plus `PROVIDER_GOOGLE` when Google maps configuration is needed. [Source: https://docs.expo.dev/versions/latest/sdk/map-view/]
- The native adapter should avoid a fully controlled `region` prop unless there is a hard requirement for it. Story 2.1 already corrected a snap-back problem by using `initialRegion` plus imperative recentering; Story 2.2 must preserve that responsiveness.
- The web adapter should use Mapbox GL JS with a public access token supplied from environment config. Mapbox's current docs show Mapbox GL JS as a client-side web map library and require an access token to initialize `mapboxgl.Map`. [Source: https://docs.mapbox.com/mapbox-gl-js/guides/]
- Use the web dark style specified in the epic: `mapbox://styles/mapbox/dark-v11`.
- Keep map initialization resilient when the web token is absent in local development. A calm fallback surface with explanatory copy is acceptable; a crash or blank screen is not.
- Do not couple this story to stop data fetching, marker rendering, reverse geocoding, or new location-permission logic.
- Do not generalize this adapter into a shared decorative backdrop for Stops or Departures; those views are intentionally constrained to static map imagery if a map-like background is needed later.

### Architecture Compliance

- Follow the architecture's platform abstraction direction:
  - native map implementation behind `src/core/platform/maps/map-view.native.tsx`
  - web map implementation behind `src/core/platform/maps/map-view.web.tsx`
  - feature code in `src/features/map/` should consume the abstraction, not own platform-specific library imports
- Preserve the state split established in architecture and Story 2.1:
  - live map/location state remains ephemeral
  - settings continue to come from `src/core/store/settings.store.ts`
  - no map provider tokens or map style data are persisted to AsyncStorage
- Keep route files thin and leave `src/app/map.tsx` as a handoff to the map feature screen.
- Do not touch generated GraphQL code in `src/generated/` for this story.

### Library / Framework Requirements

- Honor the current repo versions already present:
  - `expo` `~55.0.3`
  - `react-native` `0.83.2`
  - `react-native-maps` `1.26.20`
  - `expo-router` `~55.0.3`
- Add a web map library only in a way that does not disturb native builds. The architecture explicitly prefers Mapbox GL JS on web and avoids the React Native Mapbox SDK for MVP. [Source: _bmad-output/planning-artifacts/architecture.md#mapping-direction-web-vs-native]
- Continue using the existing design-system primitives already in the repo:
  - `CoordinatesBar`
  - `LocationDeniedState`
  - theme tokens from `src/shared/theme/theme.ts`
- Keep Android Google Maps key handling env-driven. The current repo already uses `EXPO_PUBLIC_ANDROID_GOOGLE_MAPS_API_KEY` in `app.config.js`.

### File Structure Requirements

- Update:
  - `src/features/map/map-screen.tsx`
  - `src/core/config/env.ts`
  - `.env.example`
  - `README.md`
  - `app.config.js` if iOS Google Maps env support is added for parity
- Create likely new files:
  - `src/core/platform/maps/map-view.tsx`
  - `src/core/platform/maps/map-view.native.tsx`
  - `src/core/platform/maps/map-view.web.tsx`
  - `src/core/platform/maps/types.ts`
  - `tests/core/platform/map-view.web.test.tsx`
  - `tests/features/map-screen.test.tsx` updates for the adapter boundary
- Remove or collapse current temporary map surface files if the new shared platform boundary replaces them cleanly:
  - `src/features/map/components/map-surface.tsx`
  - `src/features/map/components/map-surface.native.tsx`
- Defer to later stories:
  - stop markers
  - nearby-stop query wiring
  - map tap navigation
  - API error banner behavior
  - any static-image backdrop treatment for Stops or Departures

### Testing Requirements

- Mock native and web map providers in Jest; do not rely on a live browser map or device map SDK in unit tests.
- Cover at minimum:
  - native adapter chosen on iOS/Android
  - web adapter chosen on web
  - dark style configuration applied in each platform-specific path
  - missing web token fallback does not crash the screen
  - Story 2.1 behaviors remain intact after the adapter refactor
- Verify the map component is still interactive and that gesture handling is not broken by over-controlling the camera/region.

### Previous Story Intelligence

- Story 2.1 already established:
  - `src/features/map/` as the feature home
  - a working `MapScreen`
  - Helsinki fallback coordinates
  - a denied-permission overlay that opens device settings
  - a location hook that uses fast last-known coordinates plus foreground watcher updates
- Story 2.2 must not duplicate location-acquisition work or move permission logic into the map adapter layer.
- Story 2.1 also surfaced a concrete native map pitfall: a fully controlled `region` caused bad recentering behavior, and the implementation was deliberately changed to `initialRegion` plus imperative recentering. Do not regress that fix.

### Git Intelligence

- Recent commits show Epic 2 has already moved beyond pure planning:
  - `dc40420 feat(ui): Story 2-1`
  - `3f64583 build: Setup Google Maps API support and local Android building`
- That build commit matters for Story 2.2 because the repo now already has:
  - Android Google Maps plugin wiring in `app.config.js`
  - local Android build scripts in `package.json`
  - validated local Android install flow for physical devices
- Story 2.2 should build on those changes rather than reintroducing ad hoc Android setup.

### Latest Technical Information

- Expo's current `react-native-maps` docs list bundled version `1.26.20` and document config-plugin setup for `androidGoogleMapsApiKey` and `iosGoogleMapsApiKey`, plus `PROVIDER_GOOGLE` for Google-backed native maps. [Source: https://docs.expo.dev/versions/latest/sdk/map-view/]
- Mapbox's current Mapbox GL JS guides page lists current version `v3.19.1` and shows token-based initialization with `mapboxgl.accessToken` before creating a `mapboxgl.Map`. [Source: https://docs.mapbox.com/mapbox-gl-js/guides/]
- The architecture's current guidance remains valid for this repo state: use `react-native-maps` on native and Mapbox GL JS on web, and avoid the RN Mapbox SDK in MVP. [Source: _bmad-output/planning-artifacts/architecture.md#mapping-direction-web-vs-native]

### Project Structure Notes

- Current repo reality differs from the original target structure:
  - native and web map surfaces currently live under `src/features/map/components/`
  - there is no `src/core/platform/maps/` directory yet
  - `src/core/config/env.ts` only exposes DigiTransit API env values today
  - `.env.example` only documents DigiTransit API and Android Google Maps keys today
- The map feature already exists and is working on Android devices, so this story should refactor carefully instead of rebuilding the screen from scratch.
- Android local building is now proven in this repo; this story should preserve that path and avoid destabilizing the newly working `pnpm android:device` / `pnpm android:usb` workflows.

### References

- Story 2.2 requirements: [Source: _bmad-output/planning-artifacts/epics.md#story-22-map-view-with-dark-tile-style]
- Epic 2 scope: [Source: _bmad-output/planning-artifacts/epics.md#epic-2-map-view-gps--nearby-stop-discovery]
- Architecture map-adapter direction: [Source: _bmad-output/planning-artifacts/architecture.md#mapping-direction-web-vs-native]
- UX dark-map requirement and glassmorphism alignment: [Source: _bmad-output/planning-artifacts/ux-design-specification.md]
- Existing Story 2.1 implementation learnings: [Source: _bmad-output/implementation-artifacts/2-1-gps-location-acquisition-and-permission-flow.md]
- Current repo files: [Source: src/features/map/map-screen.tsx], [Source: src/features/map/components/map-surface.native.tsx], [Source: src/features/map/components/map-surface.tsx], [Source: src/core/config/env.ts], [Source: app.config.js], [Source: .env.example], [Source: package.json]
- External docs: [Source: https://docs.expo.dev/versions/latest/sdk/map-view/], [Source: https://docs.mapbox.com/mapbox-gl-js/guides/]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Parsed Story 2.2 directly from Epic 2 in `_bmad-output/planning-artifacts/epics.md`
- Loaded architecture, UX, sprint status, Story 2.1 implementation artifact, current map source files, env config, and recent git history
- Confirmed the repo already contains a working native `react-native-maps` surface, Android Google Maps plugin wiring, and local Android build scripts
- Confirmed web map support is still a placeholder and no shared `src/core/platform/maps/` boundary exists yet
- Added `mapbox-gl` for the web adapter path and created the shared `src/core/platform/maps/` boundary with native, web, and shared contract files
- Replaced the feature-owned map surface imports in `MapScreen` with the platform adapter while preserving Story 2.1 location and denied-state behavior
- Added env/config support for `EXPO_PUBLIC_MAPBOX_PUBLIC_TOKEN` and optional `EXPO_PUBLIC_IOS_GOOGLE_MAPS_API_KEY`, plus updated local setup documentation
- Verified the adapter boundary, native dark-style behavior, and web token fallback with focused Jest coverage, then validated the full repo with `pnpm typecheck`, `pnpm lint`, and `pnpm test:ci`
- Senior code review found a broken shared export for web, an underspecified adapter contract, missing in-app map visibility timing, and stale story metadata
- Fixed the shared map entrypoint so web resolves through the Mapbox adapter path, widened the adapter contract for upcoming marker/camera work, and added map visibility timing instrumentation plus regression coverage
- Corrected README/setup guidance and aligned the story File List with the actual workspace changes after review

### Completion Notes List

- Created the Story 2.2 implementation guide with adapter-boundary, dark-style, env-config, and testing guardrails
- Updated the story to reflect the actual current repo state after Story 2.1 and the Android build/setup work
- Preserved scope boundaries so stop markers, stop fetching, and navigation remain in later Epic 2 stories
- Added a shared `PlatformMapView` abstraction under `src/core/platform/maps/` so the feature layer no longer imports native/web map libraries directly
- Applied a dark native map style with imperative recentering preserved, avoiding a regression back to controlled-region snap-back behavior
- Added the web Mapbox adapter with `dark-v11`, runtime token lookup, and a non-crashing fallback surface when `EXPO_PUBLIC_MAPBOX_PUBLIC_TOKEN` is absent
- Extended app/env documentation and config to cover the web Mapbox token and optional iOS Google Maps key for native dark-map parity
- Locked in the "live map only on Map tab" requirement in the planning and story artifacts so future Stops and Departures work stays on static imagery
- Verified the full repository with `pnpm test -- --runInBand tests/features/map-screen.test.tsx tests/core/platform/map-view.native.test.tsx tests/core/platform/map-view.web.test.tsx`, `pnpm typecheck`, `pnpm lint`, and `pnpm test:ci`
- Added shared adapter scaffolding for future camera and marker props so Story 2.3 can build without breaking the map boundary
- Instrumented first map visibility timing in-app and log when the 3000ms budget is exceeded during development
- Closed review follow-ups by fixing the web adapter barrel path and updating the README away from stale Expo starter guidance

### Change Log

- 2026-03-09: Clarified the product rule that only the Map tab may mount a live map provider; Stops and Departures must use static imagery if they need a map-like backdrop
- 2026-03-09: Implemented the shared map adapter boundary, native dark-map styling, web Mapbox fallback/token flow, env/config updates, and regression coverage; advanced Story 2.2 to review
- 2026-03-09: Applied senior review fixes for the web adapter export path, shared adapter contract, map visibility timing instrumentation, and story/documentation accuracy; marked Story 2.2 done

### File List

- _bmad-output/implementation-artifacts/2-2-map-view-with-dark-tile-style.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- .env.example
- README.md
- app.config.js
- package.json
- pnpm-lock.yaml
- src/core/config/env.ts
- src/core/platform/maps/map-view.native.tsx
- src/core/platform/maps/map-view.tsx
- src/core/platform/maps/map-view.web.tsx
- src/core/platform/maps/types.ts
- src/features/map/components/map-surface.native.tsx
- src/features/map/components/map-surface.tsx
- src/features/map/map-screen.tsx
- tests/core/platform/map-view.native.test.tsx
- tests/core/platform/map-view.web.test.tsx
- tests/features/map-screen.test.tsx

## Senior Developer Review (AI)

### Reviewer

Jyrki

### Date

2026-03-09

### Outcome

Approved after fixes

### Findings Resolved

- Fixed the shared map adapter entrypoint so the web build can resolve to the Mapbox implementation instead of always taking the native path
- Expanded the shared adapter contract with optional camera, marker, and `onMapReady` support to avoid a breaking refactor in Story 2.3
- Added in-app map visibility timing instrumentation and regression tests so Story 2.2 now measures first render timing instead of only claiming it
- Removed stale Expo starter guidance from the README and corrected the story File List to match the actual changed files

### Verification

- `pnpm test -- --runInBand tests/features/map-screen.test.tsx tests/core/platform/map-view.native.test.tsx tests/core/platform/map-view.web.test.tsx`
- `pnpm typecheck`
- `pnpm lint`
