# Story 2.1: GPS Location Acquisition & Permission Flow

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want the app to acquire my GPS location and handle the permission flow gracefully,
so that the map can centre on where I actually am, and the app works even if I decline (FR1, FR2, FR4, FR5).

## Acceptance Criteria

1. **Given** the app launches for the first time
   **When** the Map tab appears
   **Then** the OS location permission prompt is shown before any map interaction is required (FR1)

2. **Given** the user grants location permission
   **When** GPS coordinates are acquired
   **Then** the map centres on the user's position and a location dot is rendered (FR2, FR3)

3. **Given** the user's position changes while the app is open
   **When** the configured location update interval elapses
   **Then** the map position and location dot update to reflect the new coordinates (FR4)

4. **Given** the user denies location permission
   **When** the Map tab renders
   **Then** the map loads at the default fallback position and the `CoordinatesBar` shows `Location unavailable` (FR5)
   **And** no crash or broken state occurs

5. **Given** location access is denied or revoked after first launch
   **When** the user opens the app again or returns to the Map tab
   **Then** the app reflects the denied state without re-prompt loops
   **And** provides a path to the device settings from the denied empty state

6. **Given** the app is using live location
   **When** implementation is reviewed
   **Then** no location samples are persisted to AsyncStorage or any other device storage (NFR5)
   **And** no location data is transmitted anywhere except the DigiTransit API queries that depend on the current coordinates (NFR6)

## Tasks / Subtasks

- [x] **Task 1: Add the foreground location capability and permission copy** (AC: 1, 4, 5)
  - [x] Install `expo-location` with the Expo-managed version expected by SDK 55
  - [x] Update `app.json` to add the `expo-location` config plugin with explicit foreground permission copy for iOS
  - [x] Keep this story scoped to foreground location only; do not request background permissions or add task-manager/background configuration
  - [x] Confirm the permission copy remains utility-focused and consistent with the app's tone

- [x] **Task 2: Introduce a map-focused location controller for the Map tab** (AC: 1, 2, 3, 4, 5)
  - [x] Create a location hook/module under the new `src/features/map/` boundary rather than embedding permission logic directly in `src/app/map.tsx`
  - [x] Request foreground permission on first Map-tab entry and cache the permission result in component state for the current session
  - [x] Use `getLastKnownPositionAsync(...)` first for a fast initial centre when available, then acquire a fresh fix
  - [x] Start foreground-only position updates with the interval derived from `locationUpdateIntervalSeconds` in the settings store
  - [x] Clean up the subscription on unmount or screen blur so no dangling watcher survives outside the active screen

- [x] **Task 3: Replace the Map tab stub with the first real GPS-aware map shell** (AC: 1, 2, 4)
  - [x] Replace the placeholder copy in `src/app/map.tsx` with a feature screen entry point
  - [x] Render a minimal real map surface that can accept an initial region/camera and show the user location indicator
  - [x] Use a central fallback coordinate for Helsinki when permission is denied or a location fix is unavailable
  - [x] Keep dark-style details and stop markers out of scope for this story except for the minimum map surface needed to prove centring and the location dot

- [x] **Task 4: Wire `CoordinatesBar` and denied-state UX to the live permission state** (AC: 2, 4, 5)
  - [x] Feed live latitude/longitude into `src/shared/components/coordinates-bar.tsx`
  - [x] Keep the existing `Location unavailable` treatment when coordinates are absent
  - [x] Add a denied/blocked empty-state CTA that opens app settings using React Native's `Linking.openSettings()`
  - [x] Ensure the denied state does not block the map itself from rendering at the fallback centre

- [x] **Task 5: Preserve the architecture contracts around settings, privacy, and future map work** (AC: 3, 6)
  - [x] Read the location update interval from `useSettingsStore(...)`; do not add a second settings source
  - [x] Do not persist raw coordinates, derived addresses, or permission timestamps into the Zustand persisted store
  - [x] Keep all GPS state ephemeral and screen/session scoped
  - [x] Shape the map API so Story 2.2 can layer dark-tile styling on top without reworking the location flow

- [x] **Task 6: Add focused tests for permission branches and subscription cleanup** (AC: 1, 3, 4, 5, 6)
  - [x] Add unit/integration tests that mock `expo-location` for granted, denied, and revoked flows
  - [x] Verify the Map tab requests foreground permission exactly once per entry path and does not loop prompts after denial
  - [x] Verify the fallback Helsinki region is used when no live location is available
  - [x] Verify the watcher subscription is removed during cleanup
  - [x] Verify no persistence path writes location data into the settings store or AsyncStorage payloads

## Dev Notes

### Story Foundation

- Story 2.1 starts Epic 2 and is the handoff from the foundation work in Epic 1 to the first user-visible transit behavior.
- The repo still has a navigation-shell placeholder in `src/app/map.tsx`; this story is where the Map tab stops being a stub and becomes location-aware.
- This story deliberately covers the GPS/permission layer and the minimum map shell needed to prove centring and fallback behavior. Dark map styling, stop markers, and nearby-stop data layering are still owned by Stories 2.2 and 2.3.
- Epic 2 depends on Story 1.6's validated GraphQL/query pipeline, but Story 2.1 itself should not start nearby-stop fetching yet. Keep the scope on device location, permission state, and the map shell.

### Technical Requirements

- Add `expo-location` for foreground permission and device position access. Expo's current location docs for SDK 55 show `npx expo install expo-location`, foreground permission APIs, and the config plugin-based app config path. [Source: https://docs.expo.dev/versions/latest/sdk/location/]
- Prefer a fast-first acquisition path:
  - `getLastKnownPositionAsync(...)` is faster but may be stale; use it for immediate map centring if present.
  - follow with `getCurrentPositionAsync(...)` or a `watchPositionAsync(...)` subscription for the real fix/update stream.
  - Expo documents that `getCurrentPositionAsync(...)` can take several seconds, especially indoors, and explicitly suggests `getLastKnownPositionAsync(...)` when a quick response is acceptable. [Source: https://docs.expo.dev/versions/latest/sdk/location/]
- Use `watchPositionAsync(...)` for this story's ongoing updates. Expo documents that this subscription updates only while the app is in the foreground, which matches the MVP requirement and avoids background-permission scope creep. [Source: https://docs.expo.dev/versions/latest/sdk/location/]
- Read the polling cadence from `locationUpdateIntervalSeconds` in `src/core/store/settings.store.ts`; the validated schema already clamps the value to `5..300` seconds in `src/features/settings/schema/settings.schema.ts`.
- Use a single fallback coordinate constant for central Helsinki. Keep it in the map feature layer, not in `src/core/config/env.ts`, because it is a product UX fallback rather than environment configuration.
- The denied-state CTA should use `Linking.openSettings()`. React Native's current docs define that method as opening the app's custom settings screen. [Source: https://reactnative.dev/docs/linking#opensettings]
- The map surface in this story should be the thinnest implementation that proves camera centring and user-location display:
  - native path should align with the architecture choice of `react-native-maps`
  - web may keep a simpler fallback path until Story 2.2 introduces the full Mapbox adapter
  - do not let Story 2.1 turn into full map-provider integration work
- Treat reverse geocoding as optional in this story. `CoordinatesBar` already supports a `resolvedAddress`, but Story 2.1 only requires coordinates or `Location unavailable`. Avoid unnecessary geocoding requests now.

### Architecture Compliance

- Preserve the architecture's state split:
  - device/server state does not belong in Zustand persistence
  - settings remain in `src/core/store/settings.store.ts`
  - ephemeral map/location UI state stays in the map feature
- Keep generated GraphQL code untouched in this story; GPS handling should not require changes under `src/generated/`.
- Introduce the missing `src/features/map/` feature boundary now so later Epic 2 stories have a stable home for map-specific hooks/components.
- Keep route-level files in `src/app/` thin. `src/app/map.tsx` should delegate to a feature screen rather than accumulating permission logic, map config, and UX branches inline.
- Do not introduce background location, TaskManager tasks, analytics, or any coordinate persistence. Those directly violate current scope and privacy requirements.

### Library / Framework Requirements

- Current repo versions to honor:
  - `expo` `~55.0.3`
  - `react-native` `0.83.2`
  - `expo-router` `~55.0.3`
  - `zustand` `^5.0.11`
  - `@tanstack/react-query` `^5.90.21`
- Add:
  - `expo-location` via Expo install so the native version matches SDK 55 expectations. [Source: https://docs.expo.dev/versions/latest/sdk/location/]
- Continue using the current design-system primitives already in the repo:
  - `GlassView` from `expo-glass-effect` is the actual shipped surface primitive here, even though the original planning docs referenced `expo-blur`
  - `CoordinatesBar` already exists in `src/shared/components/coordinates-bar.tsx`; reuse it rather than rebuilding a separate top HUD
- Keep navigation in Expo Router and the existing tab shell. No new route is needed for this story.

### File Structure Requirements

- Update:
  - `app.json`
  - `package.json`
  - `src/app/map.tsx`
  - `src/shared/components/coordinates-bar.tsx` only if a small prop/API adjustment is required
- Create likely new files:
  - `src/features/map/map-screen.tsx`
  - `src/features/map/hooks/use-device-location.ts`
  - `src/features/map/constants.ts`
  - `src/features/map/components/location-denied-state.tsx`
  - `tests/features/map-screen.test.tsx`
  - `tests/features/use-device-location.test.ts`
- Reuse without broad rewrites:
  - `src/core/store/settings.store.ts`
  - `src/features/settings/schema/settings.schema.ts`
  - `src/components/app-tabs.tsx`
  - `src/types/navigation.ts`
- Defer to later stories:
  - full `react-native-maps`/web adapter hardening
  - stop-marker rendering
  - nearby stops GraphQL wiring

### Testing Requirements

- Mock `expo-location` completely in tests; do not rely on simulator/device GPS.
- Cover at minimum:
  - first-launch granted permission flow
  - denied permission flow with fallback Helsinki region
  - watcher update pushes new coordinates into the rendered `CoordinatesBar`
  - watcher cleanup unsubscribes on unmount
  - CTA path calls `Linking.openSettings()`
  - no state persistence includes raw coordinates
- If a map component proves difficult to assert in Jest, push assertions down to the feature hook props/output and keep the screen test focused on permission branches and visible copy.

### Previous Story Intelligence

- Story 1.6 validated the live DigiTransit query path and confirmed the repo already has working env config, typed GraphQL documents, and query-key conventions. Story 2.1 should not re-solve any of that.
- Story 1.5 and Story 1.6 both kept route files thin and pushed implementation details into feature modules. Follow that same pattern here by moving Map-tab logic into `src/features/map/`.
- Epic 1 already established the design system primitives the map feature should reuse:
  - `CoordinatesBar`
  - `GlassCard`
  - `EmptyState`
  - `ErrorBanner`
- The current `src/app/map.tsx` and `src/app/stops.tsx` are still shell stubs from Story 1.3, so this story should replace only the Map tab's placeholder and leave the Stops tab for later Epic 2 stories.

### Git Intelligence

- Recent workspace history shows Epic 1 landed as story-scoped UI and infrastructure commits, ending with Story 1.6 on March 9, 2026.
- The current GitButler state has `epic-2` applied with no commits and no unstaged changes, so Story 2.1 is the correct next branch-scoped artifact to prepare.
- The current source tree already contains `src/core/store`, `src/shared/components`, and `src/features/{showcase,settings,stops,departures}` but no `src/features/map/`. Creating that boundary now is consistent with both the architecture doc and the actual repo.

### Latest Technical Information

- Expo Location is currently documented in Expo's latest SDK reference as bundled version `~55.1.2`, with foreground permission APIs and config-plugin support for app config. [Source: https://docs.expo.dev/versions/latest/sdk/location/]
- Expo documents `requestForegroundPermissionsAsync()` as the foreground permission request API and `useForegroundPermissions()` as the hook wrapper, but for this repo a dedicated feature hook keeps the flow explicit and testable. [Source: https://docs.expo.dev/versions/latest/sdk/location/]
- Expo documents `watchPositionAsync(...)` as foreground-only and `getLastKnownPositionAsync(...)` as a faster, possibly stale path than `getCurrentPositionAsync(...)`; that combination is the right fit for this story's fast initial centring requirement. [Source: https://docs.expo.dev/versions/latest/sdk/location/]
- React Native's current Linking docs define `Linking.openSettings()` for taking users to the app's settings screen, which is preferable to custom platform URL handling for the denied-permission CTA. [Source: https://reactnative.dev/docs/linking#opensettings]
- Expo's current `react-native-maps` reference still lists the library as the supported Expo-integrated native map option, which keeps the architecture choice for native intact going into Story 2.2. [Source: https://docs.expo.dev/versions/latest/sdk/map-view/]

### Project Structure Notes

- Current reality differs slightly from the original architecture target:
  - `src/app/map.tsx` is still a stub route file
  - `src/shared/components/coordinates-bar.tsx` already exists and uses `expo-glass-effect`
  - `src/core/utils/` already exists, but no location-specific utility module exists yet
  - there is no `src/features/map/` directory yet
- `package.json` does not currently include `expo-location` or `react-native-maps`, so Story 2.1 must either add the minimum required dependency itself or clearly prepare the dependency path for Story 2.2. Because AC 2 requires a location dot on a real map surface, adding the minimum map dependency in this story is reasonable if kept narrowly scoped.
- No `project-context.md` file exists in the workspace. The authoritative context for this story is the epic breakdown, architecture, UX specification, sprint status, current repo files, and the completed Epic 1 story artifacts.

### References

- Story 2.1 requirements: [Source: _bmad-output/planning-artifacts/epics.md#story-21-gps-location-acquisition--permission-flow]
- Sprint tracking and story key: [Source: _bmad-output/implementation-artifacts/sprint-status.yaml]
- Epic 2 scope and FR/NFR mapping: [Source: _bmad-output/planning-artifacts/epics.md#epic-2-map-view-gps--nearby-stop-discovery]
- Architecture decisions: feature-first structure, map adapters, settings store, privacy constraints: [Source: _bmad-output/planning-artifacts/architecture.md]
- UX requirements: CoordinatesBar, denied-state tone, persistent map, no blocking loaders: [Source: _bmad-output/planning-artifacts/ux-design-specification.md]
- Current repo files: [Source: src/app/map.tsx], [Source: src/core/store/settings.store.ts], [Source: src/features/settings/schema/settings.schema.ts], [Source: src/shared/components/coordinates-bar.tsx], [Source: app.json], [Source: package.json]
- External docs: [Source: https://docs.expo.dev/versions/latest/sdk/location/], [Source: https://reactnative.dev/docs/linking#opensettings], [Source: https://docs.expo.dev/versions/latest/sdk/map-view/]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Created this story from the Epic 2 definition in `epics.md`, the architecture document, the UX specification, sprint tracking, the completed Epic 1 implementation artifacts, the current repo structure, and current official Expo / React Native documentation for location permissions and settings deep-linking
- Confirmed the story key in sprint tracking is `2-1-gps-location-acquisition-and-permission-flow`
- Confirmed Epic 2 has not started yet and Story 2.1 is the first story in the epic
- Confirmed the current Map tab is still a stub route and the repo does not yet include `expo-location`
- Confirmed the settings store already contains `locationUpdateIntervalSeconds` and should remain the only source for the location update cadence
- Added `expo-location` and `react-native-maps`, plus the `expo-location` config plugin copy in `app.json`
- Implemented a new `src/features/map/` boundary with a session-scoped location hook, Helsinki fallback constants, and a denied-state settings CTA
- Replaced the stub map route with a thin `useIsFocused()` handoff to the feature screen so watcher cleanup happens on blur/unmount
- Validated with `pnpm check`, including Jest coverage for granted, denied, cleanup, navigation-route, and no-persistence regression paths
- Fixed code-review findings by switching the map surface to `initialRegion` plus imperative recentering, preserving a valid fix when watcher startup fails, and adding revoked/fallback/rendered-coordinate coverage

### Implementation Plan

- Add the foreground location dependency and permission copy without introducing background location scope
- Build the map feature boundary around a focused location hook and a thin route-level screen handoff
- Keep location state ephemeral, derive watcher cadence from the settings store, and render a minimal fallback-capable map shell
- Prove the permission branches, cleanup behavior, settings CTA, and persistence constraints with automated tests

### Completion Notes List

- Added the Story 2.1 implementation guide with explicit GPS permission, fallback-map, privacy, and cleanup requirements
- Scoped the story to foreground location plus the minimum real map shell needed for centring and user-location rendering
- Directed the implementation toward a new `src/features/map/` boundary to match the architecture and current route patterns
- Captured the existing repo deviations that matter to implementation, especially the current `CoordinatesBar` and the lack of location/map dependencies
- Included current official doc references for Expo Location, React Native settings linking, and Expo's `react-native-maps` guidance
- Added a GPS-aware `MapScreen` feature with Helsinki fallback centring, native `react-native-maps` rendering, and a web-safe fallback surface
- Implemented `useDeviceLocation()` with fast last-known centring, fresh fixes, foreground-only watcher updates, and cleanup on blur/unmount
- Added a denied-permission empty state that opens device settings while keeping the map rendered at the fallback centre
- Added focused hook, screen, settings-store, and navigation-route tests and verified the full repo with `pnpm check`
- Closed the remaining review gaps around fallback-region verification, revoked-permission behavior, and rendered `CoordinatesBar` update coverage

### Change Log

- 2026-03-09: Created the Story 2.1 context file and advanced Epic 2 / Story 2.1 sprint tracking to ready-for-dev
- 2026-03-09: Implemented foreground GPS permission flow, live map centring, denied-state settings CTA, and regression coverage; advanced Story 2.1 to review
- 2026-03-09: Fixed review findings, expanded the GPS regression suite, and advanced Story 2.1 to done

### File List

- _bmad-output/implementation-artifacts/2-1-gps-location-acquisition-and-permission-flow.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- app.json
- package.json
- pnpm-lock.yaml
- src/app/map.tsx
- src/features/map/components/location-denied-state.tsx
- src/features/map/constants.ts
- src/features/map/hooks/use-device-location.ts
- src/features/map/map-screen.tsx
- tests/app/navigation-routes.test.tsx
- tests/core/settings.store.test.ts
- tests/features/map-screen.test.tsx
- tests/features/use-device-location.test.tsx

## Senior Developer Review (AI)

### Reviewer

Jyrki

### Date

2026-03-09

### Outcome

Approved

### Notes

- Replaced the fully controlled map `region` with `initialRegion` plus imperative recentering so the map no longer snaps back on unrelated rerenders while still following live location changes.
- Updated `useDeviceLocation()` to keep the last successful coordinates if continuous watcher startup fails after a valid fix has already been acquired.
- Added regression coverage for the revoked-permission return path, explicit Helsinki fallback-region assertions, and visible `CoordinatesBar` updates driven by location changes.
- Verified the full repository with `pnpm check`.
