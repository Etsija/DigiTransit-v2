---
title: 'Map Tab Detached Mode Refinements'
slug: 'map-tab-detached-mode-refinements'
created: '2026-03-20T16:25:12+02:00'
status: 'closed'
stepsCompleted: [1, 2, 3, 4, 5]
tech_stack:
  - 'Expo Router'
  - 'React Native'
  - 'TypeScript'
  - '@tanstack/react-query'
  - 'zustand'
  - 'react-native-maps'
  - 'mapbox-gl'
  - '@testing-library/react-native'
  - 'jest'
files_to_modify:
  - 'src/features/map/map-screen.tsx'
  - 'src/features/stops/store/nearby-stops-source.store.ts'
  - 'src/core/platform/maps/types.ts'
  - 'src/core/platform/maps/map-view.native.tsx'
  - 'src/core/platform/maps/map-view.web.tsx'
  - 'tests/features/map-screen.test.tsx'
  - 'tests/core/platform/map-view.native.test.tsx'
  - 'tests/core/platform/map-view.web.test.tsx'
code_patterns:
  - 'Feature screens orchestrate query-source selection and pass a thin shared contract into platform map adapters.'
  - 'Detached preview state and confirmed detached query state are intentionally modeled as separate coordinates in a shared Zustand store.'
  - 'Nearby-stop data flow is driven through a single React Query hook with explicit coordinates and enabled guards rather than imperative fetch calls.'
  - 'Native and web gesture semantics stay behind platform adapters; screen code consumes normalized callbacks instead of platform-specific events.'
  - 'Map overlays such as detached center indicators are rendered in the adapter layer while floating controls remain in the map screen overlay.'
test_patterns:
  - 'Map screen tests mock the shared PlatformMapView adapter and assert state transitions through prop callbacks and visible controls.'
  - 'Native adapter tests simulate react-native-maps callbacks like onPanDrag and onRegionChangeComplete to verify gesture filtering and imperative recenter behavior.'
  - 'Web adapter tests verify Mapbox event binding and marker helper behavior in isolation, with fallback behavior covered when the token is missing.'
---

# Tech-Spec: Map Tab Detached Mode Refinements

**Created:** 2026-03-20T16:25:12+02:00

## Overview

### Problem Statement

The Map tab currently enters detached mode too aggressively during two-finger zoom while in live-location mode, which makes ordinary zooming feel like an unintended mode switch. Once detached mode begins, the existing live nearby-stops results disappear because detached querying is disabled until the user presses `Query here`. The map also does not show any visual indication of the active query radius in either live or detached mode.

### Solution

Refine the map interaction state machine so live mode stays active during pinch/two-finger zoom whenever the native platform can distinguish zooming from intentional detach gestures. Preserve the currently active live-query stop markers while detached until the user explicitly presses `Query here`, and render a subtle radius circle that previews the current query area in both live and detached modes.

### Scope

**In Scope:**
- Reduce or eliminate unintended detached-mode entry during two-finger zoom while in live-location mode, prioritizing native behavior.
- Keep showing stop markers from the live nearby-stops query after entering detached mode until the user presses `Query here`.
- Allow those live-query markers to continue updating in the background from live location while detached and before an explicit detached query is confirmed.
- Keep detached querying explicit so detached results are only refreshed when `Query here` is pressed.
- Render a non-obtrusive query-radius circle on the map in both live and detached mode.
- Make the detached-mode radius circle follow the current detached map center as a preview of where the next query would run.
- Cover the required map screen, shared adapter, and test updates needed for the above behavior.

**Out of Scope:**
- Backend or DigiTransit API contract changes.
- Broader redesign of the Map tab beyond detached/live behavior, query persistence, and radius visualization.
- Perfect native/web parity if platform gesture APIs differ; native correctness takes priority.

## Context for Development

### Codebase Patterns

- `src/features/map/map-screen.tsx` is the orchestration layer for live device location, detached/live source state, reverse geocoding, nearby-stops query selection, and floating controls.
- Detached/live nearby-stop source state is shared through `src/features/stops/store/nearby-stops-source.store.ts`, not local-only map screen state, so behavior changes may affect both map rendering and the Stops tab.
- The current implementation already separates `detachedCenter` from `detachedQueryCoordinates`, which is the right shape for preserving one coordinate as a moving preview center and another as the confirmed query target.
- The current map screen switches query inputs between live coordinates and detached query coordinates before calling `useNearbyStops`, so preserving live results during detached preview is likely an explicit source-selection refinement rather than a hook rewrite.
- Platform map behavior stays behind `src/core/platform/maps/types.ts` plus native/web adapter files. Gesture semantics should remain adapter-driven instead of introducing platform checks into `map-screen.tsx`.
- `useNearbyStops` already supports this refinement because it only depends on `coordinates` and `enabled`; it does not encode detached/live semantics internally.
- The native adapter currently enters detached mode on `onPanDrag`, which is the direct cause of false detach during two-finger zoom on native. Any zoom-safe solution likely starts by refining which native gesture callbacks trigger `onUserInteractionStart`.
- The web adapter only binds `dragstart` and `dragend`, so it currently avoids some zoom-specific false positives but also has less gesture detail available. This supports the native-first priority without requiring a large web redesign.
- Circle or overlay visualization belongs in the adapter layer because both native and web already render detached-center overlays there, while query radius size comes from screen/store state driven by settings.
- Existing tests for the map screen mock the shared map adapter and assert prop wiring, screen state transitions, and query-hook inputs rather than using real gesture simulation.

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `src/features/map/map-screen.tsx` | Main state machine for live mode, detached mode, reverse-geocoded center, nearby-stop query source selection, and floating map controls. |
| `src/features/stops/store/nearby-stops-source.store.ts` | Shared detached/live source state that currently stores detached preview center and confirmed detached query coordinates. |
| `src/features/stops/hooks/use-nearby-stops.ts` | Query entry point whose enabled/coordinate inputs determine whether live or detached stops remain visible. |
| `src/core/platform/maps/types.ts` | Shared adapter contract that may need additional gesture metadata and circle-overlay inputs. |
| `src/core/platform/maps/map-view.native.tsx` | Native map adapter where current detached entry starts from user interaction events and where native-first zoom-vs-pan behavior must be handled. |
| `src/core/platform/maps/map-view.web.tsx` | Web map adapter that may receive a reduced or best-effort version of the refined gesture contract. |
| `src/features/stops/hooks/use-nearby-stops.ts` | Nearby-stop React Query hook; confirms that preserving live markers in detached preview can be done by choosing different coordinates/enabled inputs without changing API shape. |
| `tests/features/map-screen.test.tsx` | Primary tests for detached/live screen behavior and nearby-stop query source selection. |
| `tests/core/platform/map-view.native.test.tsx` | Native adapter tests for gesture handling, recenter behavior, and future radius-circle rendering. |
| `tests/core/platform/map-view.web.test.tsx` | Web adapter tests for any shared contract changes that remain supported. |

### Technical Decisions

- Native behavior is the priority for distinguishing pinch/two-finger zoom from intentional detach gestures.
- The target behavior is “do not detach on zoom if at all possible,” but the final implementation may still include a documented fallback if the native map APIs cannot distinguish certain mixed gestures reliably enough.
- Detached mode should no longer blank out map stop markers before `Query here`; instead, it should continue showing the live nearby-stops result set.
- While detached and before `Query here`, those visible stop markers should continue updating from live location in the background rather than freezing to the last successful live query.
- `Query here` remains the only action that switches the visible stop markers to a detached query result set.
- The simplest query-source rule is likely:
  - live mode: use live coordinates
  - detached mode before first `Query here`: still use live coordinates
  - detached mode after `Query here`: use confirmed detached query coordinates until another explicit query or recenter
- The query-radius circle should be subtle enough not to obscure the map and should exist in both live mode and detached mode.
- In live mode, the radius circle should be centered on the live query coordinates.
- In detached mode, the radius circle should follow the current detached map center as a preview of where the next query would execute, even if the currently visible stop markers still come from live results or from an earlier detached query.
- Because detached preview circle center and active stop-result source can intentionally diverge, implementation naming must keep `preview`, `live`, and `confirmed query` coordinate concepts distinct to avoid regressions.
- The shared map adapter contract will likely need radius-circle inputs such as center coordinates and radius in meters, and may need richer interaction signaling on native so pinch zoom can avoid calling the detach-start callback.
- Because the radius circle in detached mode is a preview rather than a guarantee of what current results represent, the UI copy and interactions should avoid implying that panning alone has already refreshed the stop results.

## Implementation Plan

### Tasks

- [x] Task 1: Extend the shared map adapter contract for radius-circle rendering and richer user-interaction signaling
  - File: `src/core/platform/maps/types.ts`
  - Action: Add shared props for query-radius circle center/radius presentation and any normalized interaction metadata needed so adapters can tell the screen when a gesture should start detached mode.
  - Notes: Keep the contract screen-driven. The screen should remain the source of truth for detached/live/query-preview state, while adapters only report normalized interactions and render overlays.

- [x] Task 2: Refine native gesture handling so pinch/two-finger zoom does not detach live mode when avoidable
  - File: `src/core/platform/maps/map-view.native.tsx`
  - Action: Replace or narrow the current `onPanDrag`-based detach trigger with gesture logic that favors true drag/pan intent and ignores pinch/two-finger zoom when the native callback data allows that distinction.
  - Notes: Preserve imperative recenter behavior and the existing suppression of programmatic region changes. If native APIs cannot distinguish every mixed gesture, document the exact fallback behavior in code comments or notes.

- [x] Task 3: Add radius-circle rendering support to the native adapter
  - File: `src/core/platform/maps/map-view.native.tsx`
  - Action: Render a subtle query-radius circle anchored to the supplied center coordinates and sized from the configured radius, alongside the existing live-location marker and detached center target.
  - Notes: The circle should remain visually unobtrusive and must not replace the detached center target; both overlays may need to coexist in detached mode.

- [x] Task 4: Add best-effort radius-circle and interaction contract parity to the web adapter
  - File: `src/core/platform/maps/map-view.web.tsx`
  - Action: Extend the web adapter to accept the new shared overlay props and render a matching detached/live preview circle with whatever interaction granularity is practical on web.
  - Notes: Native correctness is the priority. Web can remain best-effort if Mapbox gesture APIs do not support equivalent zoom-vs-pan discrimination cleanly.

- [x] Task 5: Refine detached/live query-source selection in the shared nearby-stops source store
  - File: `src/features/stops/store/nearby-stops-source.store.ts`
  - Action: Expand the shared state shape if needed so the screen can distinguish detached preview mode from confirmed detached-query mode without losing the currently displayed live result source.
  - Notes: Keep naming explicit enough to separate live source, detached preview center, and confirmed detached query center. Avoid collapsing these concepts into a single coordinate field.

- [x] Task 6: Update the map screen state machine to preserve live-query results during detached preview and feed the query-radius circle
  - File: `src/features/map/map-screen.tsx`
  - Action: Change nearby-stop input selection so detached preview continues querying with live coordinates until `Query here` is pressed, while detached confirmed mode uses confirmed detached coordinates. Pass the correct circle center/radius props into the shared map adapter for live and detached preview modes.
  - Notes: The likely source-selection rule is:
    live mode uses live coordinates;
    detached preview uses live coordinates for stop results but detached center for the radius preview;
    detached confirmed uses confirmed detached query coordinates for stop results while the radius preview keeps following the current detached center.

- [x] Task 7: Update screen-level tests for refined detached behavior and radius preview wiring
  - File: `tests/features/map-screen.test.tsx`
  - Action: Replace assumptions that detached preview disables nearby-stop querying with assertions that live-query coordinates remain active until `Query here`, and add assertions for the radius-circle props passed to `PlatformMapView`.
  - Notes: Add coverage for background live-location updates while detached preview is active so the visible stop results continue to track live location until a detached query is confirmed.

- [x] Task 8: Update native adapter tests for zoom-safe detach and radius-circle rendering
  - File: `tests/core/platform/map-view.native.test.tsx`
  - Action: Add tests for the new native interaction filtering so pinch/two-finger zoom does not call the detach-start callback when avoidable, and add assertions for the radius-circle overlay contract.
  - Notes: Keep recenter and programmatic-region suppression coverage intact while extending the interaction tests.

- [x] Task 9: Update web adapter tests for the shared overlay contract
  - File: `tests/core/platform/map-view.web.test.tsx`
  - Action: Cover radius-circle rendering props and any changed shared event-binding contract that remains supported on web.
  - Notes: Keep fallback-surface behavior unchanged when the Mapbox token is missing.

### Acceptance Criteria

- [x] AC 1: Given the map is in live-location mode with a valid device fix, when the user performs a two-finger zoom and the native map APIs can distinguish that gesture from a drag, then the screen remains in live mode and detached mode does not start.
- [x] AC 2: Given the map is in live-location mode with a valid device fix, when the user intentionally pans the map away from the live center, then the screen enters detached mode and shows the existing detached center target plus the detached preview radius circle.
- [x] AC 3: Given the screen has just entered detached mode and `Query here` has not been pressed, when nearby stops are rendered, then the visible stop markers still come from the live nearby-stops query rather than being cleared.
- [x] AC 4: Given the screen is detached and still in preview mode, when the live device location updates in the background, then the visible stop markers continue to refresh from live coordinates until the user presses `Query here` or recenter.
- [x] AC 5: Given the screen is detached and `Query here` has not been pressed, when the user pans the detached map center, then the radius circle follows the current detached center as a preview of the next query area without switching the visible stop markers away from the live query.
- [x] AC 6: Given the screen is detached, when the user presses `Query here`, then nearby stops switch to the current detached center coordinates and the resulting markers reflect that explicitly confirmed detached query.
- [x] AC 7: Given the screen already has a confirmed detached query, when the user keeps panning without pressing `Query here` again, then the visible stop markers remain tied to the last confirmed detached query while the radius circle follows the current detached center preview.
- [x] AC 8: Given the user presses recenter from detached preview or detached confirmed mode, when recenter completes, then the map returns to live mode, the detached query control disappears, and both the visible nearby stops and the radius circle return to live coordinates.
- [x] AC 9: Given the map is in live mode or detached mode with an active query center, when the map renders, then a subtle radius circle is visible and sized according to the configured nearby-stop search radius without obscuring stop markers or the base map excessively.
- [x] AC 10: Given location permission is denied or live coordinates are unavailable, when the map uses fallback coordinates for display, then the refined detached behavior does not cause nearby-stop queries to run against fallback-only coordinates unless an existing explicit query contract already allows it.

## Additional Context

### Dependencies

- Existing device-location permission and live tracking flow.
- Existing nearby-stops query and cache infrastructure.
- Existing detached/live source store.
- Existing native and web map adapters.
- Search radius configuration from the settings store, which should remain the single source of truth for the radius-circle size and nearby-stop query radius.
- Native map gesture callback capabilities in `react-native-maps`, which constrain how reliably zoom can be separated from pan.

### Testing Strategy

- Extend map screen tests to cover the refined source-selection rule:
  - detached preview still calls `useNearbyStops` with live coordinates
  - live-query markers continue updating while detached before `Query here`
  - detached query switches only after explicit confirmation
  - detached radius circle props follow current detached center
- Extend native adapter tests to cover any new gesture-filtering logic that prevents detach on pinch/two-finger zoom while preserving detach on intentional drag/pan.
- Extend native and web adapter tests to cover radius-circle rendering props and detached-center overlay coexistence.
- Keep `useNearbyStops` hook tests unchanged unless the hook signature changes, because current behavior can be implemented by screen-level input selection.
- Manual verification:
  - In live mode, pinch zoom repeatedly on native and confirm detached mode does not trigger during ordinary zoom-only interactions.
  - Pan intentionally away from the live location and confirm detached mode begins, stop markers remain visible, and the detached preview radius circle follows the map center.
  - Stay detached without pressing `Query here`, move in real life or simulate live-location updates, and confirm the visible stop markers still refresh from the live query.
  - Press `Query here`, verify markers switch to the detached area, then pan again and confirm markers remain on the last confirmed detached query until the next explicit query.
  - Press recenter and verify both query results and the radius circle return to live coordinates.

### Notes

- The current codebase already contains a completed spec for detached nearby-stops mode, so this work is a refinement pass on that design rather than a greenfield feature.
- The most likely high-risk area is preventing false detached transitions during zoom without breaking deliberate pan-based detach or recenter flows.
- A second high-risk area is maintaining user trust when visible stop markers and the detached preview circle intentionally refer to different centers before `Query here`; tests and copy should make that distinction explicit.
- If native gesture APIs cannot fully separate pinch zoom from pan in all cases, the implementation should prefer reducing false positives as much as possible instead of overcomplicating the adapter with fragile heuristics.
