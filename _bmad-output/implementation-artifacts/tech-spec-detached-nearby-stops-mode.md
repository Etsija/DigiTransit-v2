---
title: 'Detached Nearby Stops Mode for Map'
slug: 'detached-nearby-stops-mode'
created: '2026-03-13T00:00:00+02:00'
status: 'Completed'
stepsCompleted: [1, 2, 3, 4]
tech_stack:
  - 'Expo Router'
  - 'React Native'
  - 'TypeScript'
  - '@tanstack/react-query'
  - 'react-native-maps'
  - 'mapbox-gl'
  - 'expo-location'
  - '@testing-library/react-native'
files_to_modify:
  - 'src/features/map/map-screen.tsx'
  - 'src/core/platform/maps/types.ts'
  - 'src/core/platform/maps/map-view.native.tsx'
  - 'src/core/platform/maps/map-view.web.tsx'
  - 'src/features/stops/stops-screen.tsx'
  - 'src/features/stops/store/nearby-stops-source.store.ts'
  - 'tests/features/map-screen.test.tsx'
  - 'tests/core/platform/map-view.native.test.tsx'
  - 'tests/core/platform/map-view.web.test.tsx'
  - 'tests/features/stops/stops-screen.test.tsx'
code_patterns:
  - 'Feature screens orchestrate state and delegate map rendering through shared platform adapter props.'
  - 'Remote queries use React Query with stable shared query keys and explicit enabled guards.'
  - 'Location and address display are derived from a coordinate source passed into thin presentational components and hooks.'
  - 'Platform differences stay behind native/web map adapter files instead of screen-level conditionals.'
  - 'Floating map controls live in the map screen overlay and are verified via adapter-prop assertions in tests.'
test_patterns:
  - 'Map screen tests mock platform adapters and assert prop wiring, button visibility, and permission states.'
  - 'Native/web adapter tests validate imperative map behavior and marker contracts in isolation.'
  - 'Hook tests use renderHook or QueryClient harnesses to assert throttling, enablement, polling, and cache deduplication.'
---

# Tech-Spec: Detached Nearby Stops Mode for Map

**Created:** 2026-03-13T00:00:00+02:00

## Overview

### Problem Statement

The map currently stays tied to live device coordinates for both centering and nearby-stops queries. That makes it hard to inspect, test, and develop transit behavior for other areas because moving the map does not create an explicit detached query target.

### Solution

Keep the default experience unchanged while the map remains centered on the live device location, but switch into a detached state as soon as the user pans away. In that detached state, show a distinct center marker for the candidate query point, reveal a dedicated "query here" action beside recenter, and only run the nearby-stops query when that button is pressed. The top coordinates and address bar should reflect the detached target, while live device tracking continues in the background if feasible.

### Scope

**In Scope:**
- Default state keeps the map centered on live location, with the live location dot rendered in green and no detached query button visible.
- Detect when the user moves the map away from the live location.
- On detach, change the center marker visually and reveal a dedicated query button beside recenter.
- Keep live device tracking running in the background if practical.
- Run nearby-stops only after explicit user action in detached mode.
- Switch the coordinates and address bar to the detached center while detached.
- Preserve recenter behavior to return to live-location mode.

**Out of Scope:**
- Geographic blocking outside Finland and Estonia.
- Backend or API contract changes.
- Broader stops or departures UX redesign beyond this map-driven flow.

## Context for Development

### Codebase Patterns

- `src/features/map/map-screen.tsx` is the orchestration layer: it reads settings, subscribes to live device location, feeds the shared map adapter, resolves reverse geocoding, and owns floating controls and detached-screen-level decisions.
- `src/features/stops/hooks/use-nearby-stops.ts` is already shaped for explicit execution control: queries are disabled when coordinates are missing or `enabled` is false, and cache identity is anchored to `queryKeys.stops.nearby({ lat, lon, radius })`.
- Map rendering is intentionally abstracted behind `PlatformMapViewProps` in `src/core/platform/maps/types.ts`; both native and web adapters currently accept center coordinates and markers, but neither exposes user-pan callbacks or a dedicated center-marker overlay yet.
- Native map behavior is imperative rather than controlled-region based: `map-view.native.tsx` uses `animateToRegion` when center props or `recenterRequestKey` change, which is important for adding detached-map transitions without introducing full controlled map state.
- Web map behavior follows the same adapter contract using `mapbox-gl` `setCenter`, so detached behavior must preserve parity across both adapters even if visuals differ internally.
- Reverse geocoding is already tolerant of moving coordinates: `useReverseGeocode` throttles by distance and time, which makes it suitable for detached center updates if the coordinate source changes from live position to map center.
- Existing tests prefer prop-boundary assertions over end-to-end map gestures: map screen tests mock the shared map adapter, while native/web adapter tests isolate imperative map methods and marker behavior.

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `src/features/map/map-screen.tsx` | Primary state coordinator for live coordinates, detached state, reverse geocoding source, markers, and floating actions. |
| `src/core/platform/maps/types.ts` | Shared adapter contract that must expand to report user-driven map center changes and render detached center affordances. |
| `src/core/platform/maps/map-view.native.tsx` | Native map implementation; current imperative recenter behavior and user-location rendering constraints live here. |
| `src/core/platform/maps/map-view.web.tsx` | Web Mapbox implementation; needs matching detached-center semantics and overlay support. |
| `src/core/platform/maps/map-view.tsx` | Thin platform selection boundary that should stay unchanged unless the shared prop contract changes. |
| `src/features/stops/hooks/use-nearby-stops.ts` | Query enablement, polling contract, and cache-key behavior for live versus detached querying. |
| `src/features/map/hooks/use-reverse-geocode.ts` | Detached center should be able to reuse this hook without over-triggering reverse geocoding. |
| `tests/features/map-screen.test.tsx` | Primary behavior tests for screen-level detached state transitions, button visibility, and query wiring. |
| `tests/core/platform/map-view.native.test.tsx` | Native adapter tests for camera changes, user-location presentation, and any new center-change callback behavior. |
| `tests/core/platform/map-view.web.test.tsx` | Web adapter tests for detached center synchronization and marker contract parity. |
| `tests/features/map/use-reverse-geocode.test.ts` | Reverse-geocode throttling tests relevant to detached center movement. |
| `tests/features/stops/use-nearby-stops.test.tsx` | Query enablement, cache deduplication, and coordinate-driven fetch behavior. |
| `tests/features/stops/use-nearby-stops-options.test.tsx` | Polling option assertions that may need to account for detached manual-query behavior. |

### Technical Decisions

- Detached mode begins from user-driven map movement, not from a separate settings toggle.
- The dedicated detached query action should be hidden in live-follow mode and shown only after the map is moved away from live center.
- Detached nearby-stops querying should be manual-only to avoid unnecessary API or bandwidth usage.
- The live device location should continue updating in the background if that can be preserved without adding meaningful device cost.
- The live map dot should use green to align with the green location indicator in the coordinates bar.
- Detached mode should use a separate, clearly visible center marker color to indicate the candidate query target before the user presses the query button.
- The detached map center becomes the source for the coordinates bar and reverse geocoding while detached.
- Recenter should act as the escape hatch from detached mode by snapping back to the latest live coordinates and hiding the detached query affordance again.
- Detached-query execution likely needs its own persisted-in-screen coordinate state separate from the continuously moving map center, so panning alone does not trigger network requests.
- Shared adapter props should carry map-center change events and detached-center visualization inputs rather than leaking platform-specific gesture logic into `map-screen.tsx`.

## Implementation Plan

### Tasks

- [x] Task 1: Extend the shared map adapter contract to report detached-center state and render center-target affordances
  - File: `src/core/platform/maps/types.ts`
  - Action: Add shared props for user-driven center changes, detached/live presentation mode, and any explicit center-marker visibility or color configuration needed by both native and web adapters.
  - Notes: Keep the contract screen-driven so `map-screen.tsx` remains the source of truth for detached state while the adapters remain platform-specific renderers.

- [x] Task 2: Implement native map center tracking and detached marker support
  - File: `src/core/platform/maps/map-view.native.tsx`
  - Action: Wire `react-native-maps` region or camera change callbacks into the new shared prop contract, distinguish user-driven movement from imperative recenter animations, and render the detached center indicator on top of the map.
  - Notes: Preserve the current imperative `animateToRegion` behavior for recentering. Update the user-location tint or marker presentation so live location appears green instead of blue without breaking `showsUserLocation`.

- [x] Task 3: Implement web map center tracking and detached marker support
  - File: `src/core/platform/maps/map-view.web.tsx`
  - Action: Mirror the shared detached-center contract using Mapbox center-change events and render a detached center overlay that stays visually anchored to the map center while detached.
  - Notes: Preserve current fallback behavior when the Mapbox token is missing. Keep marker syncing isolated from detached center overlay logic.

- [x] Task 4: Refactor the map screen to manage live mode, detached mode, and explicit detached querying
  - File: `src/features/map/map-screen.tsx`
  - Action: Introduce screen state for current live coordinates, current map center, detached-query target, and detached/live mode detection. Use live coordinates for the default state, switch to detached mode once the user pans away from live center, and reveal a new query action beside recenter only in detached mode.
  - Notes: Recenter must reset detached mode, recenter to the latest live coordinates, and hide the detached query button again. The detached query action should store the selected map center as the active nearby-stops query source without triggering requests during plain panning.

- [x] Task 5: Route reverse geocoding and coordinate display through the active center source
  - File: `src/features/map/map-screen.tsx`
  - File: `src/features/stops/stops-screen.tsx`
  - Action: Feed `useReverseGeocode` and `CoordinatesBar` with live coordinates in live mode and detached center coordinates in detached mode.
  - Notes: Reused the existing `useReverseGeocode` hook unchanged and moved the active-coordinate selection into the screen layer.

- [x] Task 6: Align nearby-stops querying with explicit detached execution
  - File: `src/features/map/map-screen.tsx`
  - File: `src/features/stops/stops-screen.tsx`
  - File: `src/features/stops/store/nearby-stops-source.store.ts`
  - Action: Keep the existing query hook API if possible, but change the map screen so the query coordinates come from the active live source by default and from an explicitly confirmed detached target after the user presses the new query button.
  - Notes: The query hook API remained unchanged. Detached/live source selection moved into shared screen/store state so the Stops tab also follows the confirmed detached query target.

- [x] Task 7: Add map screen tests for detached mode transitions and query behavior
  - File: `tests/features/map-screen.test.tsx`
  - Action: Extend mocked adapter-prop tests to cover default live mode, hidden detached-query button in live mode, detached-mode entry after map movement, detached center used for coordinates/address, explicit detached query triggering, and recenter returning to live mode.
  - Notes: Continue using the shared adapter mock and assert prop wiring and button visibility rather than real gesture simulation.

- [x] Task 8: Add adapter-level tests for new shared map behavior
  - File: `tests/core/platform/map-view.native.test.tsx`
  - File: `tests/core/platform/map-view.web.test.tsx`
  - Action: Cover any new center-change callback props, detached center overlay rendering, and protection against user-driven center updates firing during imperative recenter flows.
  - Notes: Keep native tests focused on imperative map methods plus callback behavior, and keep web tests focused on Mapbox event wiring plus fallback safety.

- [x] Task 9: Update hook tests for detached query and geocoding contracts where behavior changes
  - File: `tests/features/map-screen.test.tsx`
  - File: `tests/features/stops/stops-screen.test.tsx`
  - Action: Add or adjust tests only where the detached flow changes contract-level behavior, such as explicit query enablement or the coordinate source passed into reverse geocoding.
  - Notes: Hook signatures stayed unchanged, so coverage was added at the screen level where detached-state orchestration now lives.

### Acceptance Criteria

- [x] AC 1: Given the map screen opens with a granted live location fix, when the user has not moved the map, then the map remains centered on the live position, the live location indicator is green, and no detached query button is visible.
- [x] AC 2: Given the map is in live mode with a valid location fix, when the user pans the map away from the live center, then the screen enters detached mode, shows a distinct center target marker, and reveals the dedicated detached query button beside recenter.
- [x] AC 3: Given the screen is in detached mode, when the user continues panning without pressing the detached query button, then no new nearby-stops request is issued for the moving map center.
- [x] AC 4: Given the screen is in detached mode, when the user presses the detached query button, then the nearby-stops query runs using the current detached center coordinates and the resulting markers reflect that detached query target.
- [x] AC 5: Given the screen is in detached mode, when the detached center changes, then the top coordinates bar and reverse-geocoded address reflect the detached center rather than the live device location.
- [x] AC 6: Given the user has entered detached mode and live device tracking continues in the background, when the live device location updates, then the app preserves the detached screen state and does not snap the map back to the live center until recenter is pressed.
- [x] AC 7: Given the screen is in detached mode with or without a previously confirmed detached query, when the user presses recenter, then the map snaps to the latest live location, detached mode ends, and the detached query button disappears.
- [x] AC 8: Given live location permission is denied or live coordinates are unavailable, when the map falls back to the existing Helsinki default region, then the detached-mode additions do not force nearby-stops queries against fallback-only coordinates.
- [ ] AC 9: Given the app runs on native or web, when detached mode is entered, then the shared map adapter contract supports the same detached/live behavior semantics on both platforms even if the visual implementation differs.
  Review note: native behavior is implemented and tested; web parity is currently deferred because web support is planned for removal.
- [x] AC 10: Given a detached query has already been executed, when the user pans to another detached center without pressing the button again, then the active nearby-stops results remain tied to the last confirmed detached query until a new explicit detached query is triggered or recenter returns to live mode.

## Additional Context

### Dependencies

- Existing DigiTransit nearby-stops GraphQL query and query key infrastructure.
- Existing device location store and permission flow.
- Existing native and web platform map adapters.
- Expo Location reverse-geocoding and live permission APIs already used by the map feature.
- Existing shared marker creation pipeline in `createMapStopMarkers`, which should continue to consume only the active nearby-stops query result set.

### Testing Strategy

- Unit and component tests:
  - Extend `tests/features/map-screen.test.tsx` to assert the new detached-mode state machine through mocked adapter callbacks and UI controls.
  - Extend `tests/core/platform/map-view.native.test.tsx` and `tests/core/platform/map-view.web.test.tsx` to validate the shared center-change callback contract and detached center affordances.
  - Update `tests/features/stops/use-nearby-stops.test.tsx` and `tests/features/stops/use-nearby-stops-options.test.tsx` only if query enablement or polling behavior changes at the hook boundary.
  - Update `tests/features/map/use-reverse-geocode.test.ts` only if detached mode changes how coordinate updates are fed into the hook.
- Manual verification:
  - Confirm default live mode shows no detached-query control and still follows the live device position on first load.
  - Pan away from the live center and verify the detached marker and query button appear without firing a network request.
  - Press the detached query button and verify nearby stops refresh for the detached center, then keep panning and confirm results do not update until the button is pressed again.
  - Press recenter and verify the map returns to live mode, the detached query control disappears, and the coordinates/address bar switch back to the live location.
  - Verify denied-permission and fallback-region states still avoid nearby-stops requests with missing live coordinates.

### Notes

- Highest-risk implementation area is separating user-driven map movement from imperative recenter animations; if that boundary is not handled carefully, recenter may incorrectly retrigger detached mode.
- Native live-location color customization may depend on `react-native-maps` platform capabilities; if the built-in user-location dot cannot be recolored directly, the implementation may need a custom live-location marker while preserving accessibility and location accuracy semantics.
- Detached mode introduces two coordinate concepts on the same screen: the continuously updating live device location and the user-controlled map center. The implementation should keep these explicit in naming and state shape to avoid accidental query or UI regressions.
- Implementation diverged from the initial file-level plan: detached query source state was centralized in a shared store and consumed by both the Map and Stops screens because a map-only implementation caused recentering issues and left the Stops tab bound to live-location results.
- Planning and implementation artifact folders did not exist before this spec was initialized, so this file starts a fresh quick-spec workflow state.

## Review Notes

- Adversarial review completed
- Findings: 4 total, 1 fixed, 3 dispositioned
- Resolution approach: mixed
- Fixed: detached mode no longer keeps polling the live-location nearby-stops query before the user confirms `Query here`.
- Accepted product decision: detached mode begins immediately on drag start; this behavior is intentional.
- Bookkeeping update: initial task/file bookkeeping was corrected to reflect the actual implementation in `stops-screen.tsx` and `nearby-stops-source.store.ts`.
- Deferred: web adapter parity concerns were acknowledged but intentionally deprioritized because web support is planned for removal.
