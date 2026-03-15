---
title: 'Live stop-progress expansion for departure cards'
slug: 'live-stop-progress-expansion-for-departure-cards'
created: '2026-03-14T17:45:21+02:00'
status: 'Implementation Complete'
stepsCompleted: [1, 2, 3, 4]
tech_stack:
  - 'TypeScript'
  - 'React 19'
  - 'React Native 0.83'
  - 'Expo Router'
  - '@tanstack/react-query'
  - 'graphql-request'
  - 'GraphQL Code Generator'
  - 'Jest'
  - '@testing-library/react-native'
files_to_modify:
  - 'src/features/departures/departures-screen.tsx'
  - 'src/features/departures/hooks/use-stop-departures.ts'
  - 'src/features/departures/queries/stop-departures.graphql'
  - 'src/shared/components/departure-card.tsx'
  - 'src/shared/components/stop-progress-row.tsx'
  - 'src/core/api/query-keys.ts'
  - 'src/features/showcase/showcase-screen.tsx'
  - 'tests/features/departures/departures-screen.test.tsx'
  - 'tests/features/departures/use-stop-departures.test.tsx'
code_patterns:
  - 'feature-oriented structure under src/features'
  - 'React Query hooks normalize GraphQL payloads before UI consumption'
  - 'shared query keys defined in src/core/api/query-keys.ts'
  - 'strict defensive normalization that skips malformed GraphQL rows'
  - 'thin reusable presentation components in src/shared/components'
  - 'feature screen state held locally with useState and simple disclosure patterns'
  - 'polling intervals sourced from Zustand settings store'
  - 'GraphQL documents authored in feature folders and generated into src/generated'
test_patterns:
  - 'screen behavior tested in tests/features/departures/departures-screen.test.tsx'
  - 'hook normalization tested in tests/features/departures/use-stop-departures.test.tsx'
  - 'Jest mocks for GraphQL client, settings store, and feature hooks'
  - 'behavior-focused assertions over snapshots'
  - 'fake timers for time-sensitive departure behavior'
  - 'cached-data and refresh-state coverage for React Query screens'
---

# Tech-Spec: Live stop-progress expansion for departure cards

**Created:** 2026-03-14T17:45:21+02:00

## Overview

### Problem Statement

Users can see upcoming departures for a stop, but they cannot tell where a vehicle currently is relative to the stop where they are waiting. The departures view needs a way to show trip progress so riders can estimate how many stops away the selected vehicle is.

### Solution

Extend the departures flow to fetch trip stop-sequence data and live progress data from DigiTransit GraphQL when a departure card is expanded. Render an accordion-style inline stop-progress list beneath the tapped departure card, reuse the existing departures polling interval, and fall back to scheduled stop progression when realtime position/progress data is unavailable.

### Scope

**In Scope:**
- Tap a departure card to expand inline stop-progress details.
- Keep only one departure card expanded at a time.
- Show slim one-line stop rows using the format `[stop-code stop-name]`.
- Use tinting consistent with the departure card language:
- `upcoming` = orange
- `arriving` = green
- `passed` = grey
- Reuse the existing departures polling interval from settings.
- Explore and extend DigiTransit GraphQL queries/types as needed.
- Preserve existing long-press reminder behavior.
- Fall back to scheduled stop progression when realtime data is missing.
- Record a note that exact passed/current-stop precision may need later refinement depending on DigiTransit realtime fidelity.

**Out of Scope:**
- Broader departures screen redesign.
- Changing reminder interactions beyond preserving the existing long-press flow.
- Adding richer stop metadata such as full addresses.
- Introducing a new polling interval separate from the existing departures polling setting.

## Context for Development

### Codebase Patterns

- The departures screen lives in `src/features/departures/departures-screen.tsx` and already renders one `DepartureCard` per normalized departure row.
- `DepartureCard` already supports `onPress` and `onLongPress`; tap is currently unused while long-press is used for native reminder booking.
- Existing departures data is normalized in `src/features/departures/hooks/use-stop-departures.ts` from `src/features/departures/queries/stop-departures.graphql`.
- The generated DigiTransit GraphQL schema available in `src/generated/graphql.ts` exposes richer fields than the current query uses, including `Trip.stoptimesForDate`, `Trip.pattern`, `Stoptime.stop`, `Stoptime.stopPosition`, `Stoptime.stopPositionInPattern`, `Pattern.stops`, `Pattern.vehiclePositions`, and `VehiclePosition.stopRelationship`.
- Existing UX already uses colored status accents for departure rows (`realtime`/green and `scheduled`/orange); the expanded stop rows should reuse that visual language for consistency.
- React Query query keys are centralized in `src/core/api/query-keys.ts`, and polling cadence is sourced from the settings store.
- The current hook returns a single normalized model for the whole stop. The new stop-progress requirement will likely fit best as either an extension of each normalized departure row with trip-progress data fetched in the same query, or a dedicated feature-local hook/query keyed by departure identity for the expanded accordion content.
- Current screen interaction patterns already include simple press-driven disclosure (`Patterns via this stop`) and local `useState` state, which is a good fit for single-open accordion state.
- The codebase prefers defensive, app-safe transformation of GraphQL payloads before rendering. Missing or malformed rows should be skipped or downgraded to a controlled fallback rather than partially rendered.

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `src/features/departures/departures-screen.tsx` | Existing departures UI, card rendering, long-press reminder behavior, and polling-driven screen state |
| `src/shared/components/departure-card.tsx` | Existing interactive departure card surface and current status accent treatment |
| `src/features/departures/hooks/use-stop-departures.ts` | Current stop departures query, normalization, and React Query integration |
| `src/features/departures/queries/stop-departures.graphql` | Current DigiTransit stop departures GraphQL query |
| `src/core/api/query-keys.ts` | Shared query key patterns for new or extended departure-progress queries |
| `src/core/api/graphql-client.ts` | Shared DigiTransit GraphQL request boundary used by departures hooks |
| `src/generated/graphql.ts` | Generated schema/types confirming available DigiTransit trip, stoptime, and vehicle-position fields |
| `tests/features/departures/departures-screen.test.tsx` | Existing departures screen behavior tests to extend with expansion/accordion coverage |
| `tests/features/departures/use-stop-departures.test.tsx` | Existing normalization/query tests that likely need extension for richer departure-progress data |
| `src/features/departures/components/departures-skeleton.tsx` | Existing feature-local component location and naming pattern to mirror for any new stop-progress UI component |

### Technical Decisions

- Prefer a slim inline accordion beneath the tapped departure card rather than a separate modal or route.
- Reuse `DepartureCard.onPress` for expansion while preserving `onLongPress` for reminder booking on supported platforms.
- Use stop rows formatted as `[stop-code stop-name]`.
- Use state tinting aligned with the existing departures language:
- orange for upcoming
- green for arriving
- grey for passed
- Match the existing departure-card accent style specifically: dark row surface with a thin colored left-edge accent, rather than full-row color fills.
- Reuse the existing departures polling interval instead of introducing separate live-progress polling.
- Treat scheduled stop progression as the fallback when realtime progress data is absent.
- Keep an explicit implementation note that the exact algorithm for mapping realtime vehicle position to passed/current/upcoming stop states may need adjustment after deeper DigiTransit query validation.
- The stop-progress row is a shared component (`src/shared/components/stop-progress-row.tsx`), consistent with the project pattern of placing thin reusable presentation components in `src/shared/components`.
- The Showcase screen must include a section demonstrating all three visual states (`upcoming`/`arriving`/`passed`) of `StopProgressRow`.
- Stop-progress normalization/hooks remain feature-local under `src/features/departures/` — only the presentational row component is shared.
- Likely file plan:
- modify `src/features/departures/departures-screen.tsx` for accordion state and inline rendering
- modify `src/shared/components/departure-card.tsx` only if needed to preserve combined tap and long-press affordances/accessibility cleanly
- add `src/shared/components/stop-progress-row.tsx` as the new shared presentational component
- modify or extend `src/features/departures/hooks/use-stop-departures.ts` if stop-progress data is fetched in the existing stop departures query
- modify `src/features/departures/queries/stop-departures.graphql` if the existing query can safely inline trip progress fields
- add a new feature-local query/hook trio if a dedicated expanded-row query is cleaner, likely under `src/features/departures/queries/` and `src/features/departures/hooks/`
- modify `src/core/api/query-keys.ts` if a new departure-progress query key is introduced
- modify `src/features/showcase/showcase-screen.tsx` to add a `StopProgressRow` demonstration section
- extend the existing departures screen and hook tests; add a new test file if stop-progress normalization is split into a dedicated module

## Implementation Plan

### Tasks

- [x] Task 1: Define the departure-progress query contract and cache key
  - File: `src/core/api/query-keys.ts`
  - Action: Add a stable query key builder for expanded departure progress keyed by stop id plus departure identity values needed to uniquely identify the selected trip instance.
  - Notes: The key should be precise enough to separate two departures on the same route/headsign at different times while staying serializable and aligned with existing `queryKeys.departures.*` naming.

- [x] Task 2: Author the DigiTransit GraphQL query for expanded departure progress
  - File: `src/features/departures/queries/`
  - Action: Add a new feature-local GraphQL document for the expanded accordion payload, likely centered on the selected departure row’s trip and stoptimes for date.
  - Notes: The query should request only the fields required to derive `[stop-code stop-name]` rows and progress states, prioritizing `trip`, `stoptimesForDate` or equivalent stop-sequence fields, and realtime relationship data such as `pattern.vehiclePositions.stopRelationship` when available.

- [x] Task 3: Generate and wire typed GraphQL artifacts for the new query
  - File: `src/generated/`
  - Action: Regenerate GraphQL code so the new departure-progress document has typed document and result definitions.
  - Notes: Do not hand-edit generated files. The authored source of truth remains the new `.graphql` document.

- [x] Task 4: Implement departure-progress normalization and fallback mapping
  - File: `src/features/departures/hooks/`
  - Action: Add a dedicated hook or normalization module that fetches the expanded departure-progress payload and converts it into app-safe stop rows.
  - Notes: Normalize to a narrow feature model such as `ExpandedDepartureStopRow[]` with `stopCode`, `stopName`, `state`, `stateSource`, and sequence metadata. Prefer realtime mapping when `stopRelationship` is available, otherwise derive ordered scheduled rows up to the waiting stop. Skip malformed rows rather than partially rendering them.

- [x] Task 5: Extend the existing departures hook only as needed for departure identity
  - File: `src/features/departures/hooks/use-stop-departures.ts`
  - Action: Add whatever stable departure identity fields the screen needs to request expanded progress for a selected card.
  - Notes: Keep the base departures list lightweight. Only add fields required to identify the selected departure query, not the full expanded stop-progress payload.

- [x] Task 6: Build the slim inline stop-progress row UI as a shared component
  - File: `src/shared/components/stop-progress-row.tsx`
  - Action: Add a shared presentational component (`StopProgressRow`) for rendering a single expanded stop row. Accepts `stopCode`, `stopName`, and `state: 'upcoming' | 'arriving' | 'passed'` as props.
  - Notes: Match the existing departure-card language: dark row surface, thin left-edge accent, one-line height, `[stop-code stop-name]` text, and color mapping of orange `upcoming`, green `arriving`, grey `passed`. Component is purely presentational — no data fetching.

- [x] Task 6b: Add StopProgressRow to the Showcase screen
  - File: `src/features/showcase/showcase-screen.tsx`
  - Action: Add a dedicated section in the Showcase that renders `StopProgressRow` in all three states: `upcoming`, `arriving`, and `passed`, with representative stop code and name values.
  - Notes: Follow the existing Showcase section pattern. This ensures all visual states are visible for design review and regression checking without needing live data.

- [x] Task 7: Add accordion state and expanded-row rendering to the departures screen
  - File: `src/features/departures/departures-screen.tsx`
  - Action: Track the one open departure at a time, toggle expansion on card press, keep long-press reminder behavior intact, and render the expanded stop-progress component under the selected card.
  - Notes: Preserve current refresh/error/cached-data behavior. The expanded panel should remain stable through background refreshes and should close or reset appropriately when the parent stop changes.

- [x] Task 8: Update shared card interactivity only if required by the combined gesture contract
  - File: `src/shared/components/departure-card.tsx`
  - Action: Adjust accessibility role/labels or press handling only if necessary to support both tap-to-expand and long-press reminders without regressions.
  - Notes: Avoid changing the visual design of the main departure card beyond what is needed for the new tap affordance.

- [x] Task 9: Add normalization and query tests for departure-progress data
  - File: `tests/features/departures/`
  - Action: Add or extend tests around the new departure-progress normalization logic, including realtime mapping, scheduled fallback, malformed data handling, and stable query-key usage.
  - Notes: Follow the existing pattern of testing normalized feature models directly with deterministic fixtures.

- [x] Task 10: Extend screen tests for accordion behavior and inline stop-progress rendering
  - File: `tests/features/departures/departures-screen.test.tsx`
  - Action: Add screen-level tests covering tap-to-expand, tap-to-collapse, single-open accordion behavior, rendering of `[stop-code stop-name]` rows, realtime/scheduled/passed color-state behavior, and preservation of long-press reminder flows.
  - Notes: Also cover background refresh and fallback behavior so expanded content does not regress the screen’s current cached-data UX.

### Acceptance Criteria

- [x] AC 1: Given the departures screen shows upcoming departures for a stop, when the user taps a departure card, then that card expands inline and shows slim stop rows formatted as `[stop-code stop-name]`.
- [x] AC 2: Given one departure card is already expanded, when the user taps a different departure card, then the first card collapses and only the newly tapped card remains expanded.
- [x] AC 3: Given an expanded departure has realtime vehicle progress available, when the inline stop rows render, then the rows use the departure-card accent language with green for `arriving`, orange for `upcoming`, and grey for `passed`.
- [x] AC 4: Given the DigiTransit realtime relationship data is unavailable for an expanded departure, when the inline stop rows render, then the app still shows the scheduled stop sequence toward the selected waiting stop without failing the screen.
- [x] AC 5: Given the expanded departure-progress payload contains malformed or incomplete stop rows, when the app normalizes that payload, then invalid rows are skipped or the panel degrades safely instead of rendering partial broken content or crashing.
- [x] AC 6: Given the user long-presses a departure card on a supported platform, when the reminder interaction opens, then the existing reminder booking and cancellation behavior still works as before.
- [x] AC 7: Given the departures screen is performing a background refresh while a departure card is expanded, when cached departure data is still present, then the expanded section does not collapse or blank unnecessarily during the refresh.
- [x] AC 8: Given the user navigates to a different stop, when the departures screen reloads for that stop, then any previously expanded departure state from the old stop is reset.
- [x] AC 9: Given two departures share a route short name and headsign but occur at different times, when the user expands one of them, then the app resolves and caches the correct stop-progress data for that specific departure instance.
- [x] AC 10: Given the feature tests run, when the new hook and screen behavior are exercised, then the suite covers realtime mapping, scheduled fallback, accordion behavior, and interaction compatibility with reminders.

## Senior Developer Review (AI)

**Reviewer:** Codex  
**Date:** 2026-03-20  
**Outcome:** Approved after fixes

### Review Notes

- Reviewed implementation against this tech spec and commit `84de284c7712615ce8077aff26c555a3cffbd068`.
- Verified accordion expansion, single-open behavior, realtime coloring, scheduled fallback, malformed-row handling, reminder long-press behavior, background refresh stability, stop-change reset, and departure-instance-specific caching.
- Fixed a stale-data issue where switching expanded departures could briefly show the previous departure's progress rows.
- Fixed repeated-stop handling so loop or out-and-back trips resolve against the selected departure instance rather than the first matching stop id.
- Fixed `serviceDate` derivation to use the DigiTransit service timezone (`Europe/Helsinki`) instead of the device/test-runner local timezone.
- Bracketed stop-row formatting was treated as implemented per the current accepted requirements change during implementation.

### Verification

- `pnpm test -- --runTestsByPath tests/features/departures/use-departure-progress.test.tsx tests/features/departures/departures-screen.test.tsx tests/features/departures/use-stop-departures.test.tsx`
- Result: `41/41` tests passed.

## Additional Context

### Dependencies

- DigiTransit GraphQL schema fields for trip stoptimes, stop sequence, and realtime vehicle relationship data
- GraphQL code generation after adding the new query document
- React Query for caching and polling
- Existing departures settings store for polling interval
- Existing departure-card interaction surface and reminder store behavior

### Testing Strategy

- Add normalization-level tests for the new departure-progress model with deterministic realtime and scheduled fixtures.
- Extend the existing departures hook tests if additional identity fields are added to base departure normalization.
- Extend departures screen tests to cover tap-to-expand, tap-to-collapse, single-open accordion behavior, inline `[stop-code stop-name]` rendering, and preservation of long-press reminder flows.
- Add screen tests covering scheduled fallback when realtime stop-relationship data is missing.
- Add screen tests confirming expanded content remains stable during background refreshes and resets when the parent stop changes.
- Manual verification:
- open the departures screen for a stop with live vehicles
- expand a realtime departure and confirm the inline stop rows and color accents
- expand a second departure and confirm the first collapses
- long-press a departure and confirm reminders still work
- verify a scheduled-only case still renders stop progress without live relationship data

### Notes

- The preferred implementation direction is a dedicated expanded-row query rather than inflating the base stop-departures query for every listed departure.
- Exact realtime mapping precision is a known risk. If DigiTransit `stopRelationship` semantics prove insufficient to distinguish “just passed” from “approaching next” with the desired granularity, the initial implementation should favor predictable rider-facing states over overclaiming precision.
- Stop rows should remain intentionally slim. Address-level detail is excluded unless later query investigation reveals a compelling low-cost source for it.
- The color treatment should mirror the existing departure-card left-edge accent style shown in the reference image, not introduce a new full-row state styling system.
