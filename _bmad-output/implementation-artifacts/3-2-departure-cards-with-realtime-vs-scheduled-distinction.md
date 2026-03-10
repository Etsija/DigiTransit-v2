# Story 3.2: Departure Cards with Realtime vs. Scheduled Distinction

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to see a list of upcoming departures with an unmistakable visual distinction between live GPS data and timetable estimates,
so that I can trust the departure time I am acting on.

## Acceptance Criteria

1. **Given** the `StopDeparturesQuery` completes
   **When** departures render
   **Then** each departure shows route short name, headsign, and departure time formatted as `HH:MM` computed from `serviceDay + scheduledDeparture`
   **And** each card shows a secondary "time to departure" counter beneath the departure time that updates while the screen is open

2. **Given** a departure has `realtime: true`
   **When** the `DepartureCard` renders
   **Then** it shows the realtime departure time from `realtimeDeparture`
   **And** it uses a green border `#4ADE80`, bold time typography, and a `● Live GPS` label

3. **Given** a departure has `realtime: false`
   **When** the `DepartureCard` renders
   **Then** it shows the scheduled departure time
   **And** it uses an amber border `#FBBF24`, regular weight typography, and a `~ Scheduled` label

4. **Given** the departure list renders
   **When** inspected for accessibility
   **Then** each `DepartureCard` has an `accessibilityLabel` in the format `[HH:MM], route [shortName] to [headsign], [Live GPS | Scheduled]`
   **And** all text respects the system font scale setting

## Tasks / Subtasks

- [x] Task 1: Extend the departures view model so the screen can render card-ready data without duplicating formatting logic in the UI (AC: 1, 2, 3, 4)
  - [x] Keep `StopDeparturesQuery` as the single data source; do not introduce a parallel query or local mock-only model
  - [x] Extend `src/features/departures/hooks/use-stop-departures.ts` to derive per-departure display fields from the existing GraphQL payload
  - [x] Reuse `formatServiceDayDepartureTime` from `src/core/utils/date.ts` for both scheduled and realtime display times
  - [x] Normalize route short name, headsign, status label, and accessibility label defensively so incomplete API rows are skipped instead of crashing the screen

- [x] Task 2: Extend the existing shared `DepartureCard` presentation to support live departure data and the time-to-departure counter (AC: 1, 2, 3, 4)
  - [x] Extend the existing shared component in `src/shared/components/departure-card.tsx`; do not create a duplicate feature-local `DepartureCard`
  - [x] Use the existing theme tokens from `src/shared/theme/theme.ts`, specifically `theme.colors.status.realtime` and `theme.colors.status.estimated`
  - [x] Add a secondary time-to-departure label beneath the main `HH:MM` time and keep it updating while the departures screen is visible
  - [x] Keep text scalable; do not disable font scaling on `Text`
  - [x] Set an explicit `accessibilityLabel` on the card root matching the acceptance-criteria sentence format

- [x] Task 3: Render the departures list in the existing screen shell without regressing Story 3.1 behavior (AC: 1, 2, 3)
  - [x] Update `src/features/departures/departures-screen.tsx` to render the list beneath `StopHeaderCard`
  - [x] Preserve the current static backdrop, `CoordinatesBar`, back button, and shared error handling
  - [x] Keep the stop identity header pinned above the list content and avoid introducing a live map surface, tab-route changes, or modal navigation
  - [x] Keep empty/error/loading handling compatible with Story 3.3 by avoiding blocking refresh-specific UX changes here

- [x] Task 4: Add focused test coverage for departure-card semantics and screen integration (AC: 1, 2, 3, 4)
  - [x] Extend hook normalization tests for scheduled vs realtime rows, formatted times, and skipped malformed rows
  - [x] Update the shared-component tests for `DepartureCard` visual/status text behavior and accessibility labels
  - [x] Update departures screen tests to assert list rendering beneath the existing header without breaking static-backdrop behavior
  - [x] Keep scope out of Story 3.3 auto-refresh behavior and Story 5.2 notification gestures

## Dev Notes

### Story Foundation

- Epic 3 is the app's core trust flow: tap a stop and immediately understand whether the shown departure is live or timetable-based.
- Story 3.1 already delivered the route shell, stop header, static backdrop, and back-navigation contract.
- Story 3.2 is intentionally about card rendering and trust signals only. Auto-refresh, skeleton refresh UX, and cached-data persistence during retries belong to Story 3.3.
- FR18-FR21 and NFR12 are the controlling requirements here: route short name, headsign, correctly formatted times, unmistakable status distinction, and scalable text.
- The repo already contains the designed shared `DepartureCard`. This story must wire real departure data into that component and evolve it where needed, not replace it with a new feature-local card.

### Technical Requirements

- Reuse the existing `StopDeparturesQuery` in `src/features/departures/queries/stop-departures.graphql`. The current query already returns the fields needed for this story:
  - `scheduledDeparture`
  - `realtimeDeparture`
  - `realtime`
  - `realtimeState`
  - `serviceDay`
  - `headsign`
  - `trip.route.shortName`
- Do not create handwritten GraphQL types or duplicate departure interfaces outside the existing hook/model boundary.
- Reuse `formatServiceDayDepartureTime` from `src/core/utils/date.ts` for `HH:MM` rendering. Epic 1 explicitly established this utility for `serviceDay + scheduledDeparture`, and it already has dedicated unit coverage.
- Add a derived "time to departure" label for each card. This is separate from query refetch cadence:
  - it should be computed from the chosen display departure time versus current time
  - it should update locally while the screen is open
  - it should remain scoped to card presentation and not take over Story 3.3's polling/loading responsibilities
- Preserve the existing query-key contract `queryKeys.departures.stop(stopId)` in `src/core/api/query-keys.ts`.
- Prefer a normalized view model that gives the screen/component exactly what it needs:
  - `displayTime`
  - `status: 'realtime' | 'estimated'`
  - `statusLabel: 'Live GPS' | 'Scheduled'`
  - `accessibilityLabel`
  - retained raw fields if future stories need them
- Skip malformed stoptime rows rather than rendering placeholder cards with broken data. The existing hook already follows this pattern for missing numeric fields.
- Keep the card list rendering inside the current `ScrollView` unless a real performance problem appears. Do not pre-emptively swap to `FlatList` in this story; the current screen shell is simple and already tested.

### Architecture Compliance

- Follow the feature-first structure already used in the repo:
  - route entry in `src/app/stop/[stopId].tsx`
  - screen orchestration in `src/features/departures/departures-screen.tsx`
  - query/model logic in `src/features/departures/hooks/use-stop-departures.ts`
  - feature-local UI in `src/features/departures/components/`
- Keep server state in TanStack Query. Do not move departure data into Zustand or a new local cache.
- Treat generated GraphQL files in `src/generated/` as read-only. If the query document changes later, regenerate types instead of editing generated output.
- Do not regress Story 3.1's navigation shell:
  - `src/app/stop/[stopId].tsx` stays the route entry
  - back navigation remains `router.back()`
  - the departures route remains a pushed detail route, not a tab
- Keep shared concerns shared:
  - `CoordinatesBar`, `ErrorBanner`, `LoadingState`, and `EmptyState` remain the screen-shell primitives
  - `DepartureCard` already lives in `src/shared/components/` and should stay there

### Library / Framework Requirements

- Stay on the current repo stack and do not add new UI libraries for this story.
- Use theme tokens already present in `src/shared/theme/theme.ts`:
  - realtime: `theme.colors.status.realtime` (`#4ADE80`)
  - estimated: `theme.colors.status.estimated` (`#FBBF24`)
- React Native's `Text` supports `allowFontScaling`, and the default remains `true`; do not disable it for the departure time, headsign, or status label.
- React Native accessibility guidance still expects explicit `accessibilityLabel` values on accessible views when the spoken sentence matters. This story requires the exact departure summary string, so set it explicitly on the card root.
- TanStack Query v5 remains the project's server-state layer. Keep the single `useStopDepartures` query as the source of truth and let the screen subscribe to that query instead of performing manual fetch orchestration.
- Expo Router typed routes are still documented as beta. That does not affect Story 3.2 directly, but it means the current `stop/[stopId]` route contract should be preserved rather than replaced with ad hoc string routing.
- The shared `DepartureCard` already supports the realtime/scheduled visual language and accessibility sentence shape. Extend that component carefully instead of splitting behavior across multiple card implementations.

### File Structure Requirements

- Update:
  - `src/features/departures/departures-screen.tsx`
  - `src/features/departures/hooks/use-stop-departures.ts`
  - `src/shared/components/departure-card.tsx`
  - `tests/shared/ui-components.test.tsx`
  - `tests/features/departures/departures-screen.test.tsx`
  - `tests/features/departures/use-stop-departures.test.tsx`
- Reuse:
  - `src/core/utils/date.ts`
  - `src/core/api/query-keys.ts`
  - `src/shared/theme/theme.ts`
  - `src/shared/components/departure-card.tsx`
  - `src/shared/components/stop-header-card.tsx`
- Do not create:
  - a new route
  - a new query document
  - a duplicate departure-card component
  - notification scheduling UI
  - auto-refresh UX beyond what the current hook already does

### Testing Requirements

- Use the current Jest + `jest-expo` + React Native Testing Library setup.
- Minimum required coverage for this story:
  - hook normalization test for realtime rows using `realtimeDeparture`
  - hook normalization test for scheduled rows using `scheduledDeparture`
  - guard test proving malformed rows are skipped
  - shared `DepartureCard` test for green realtime treatment and `● Live GPS` copy
  - shared `DepartureCard` test for amber scheduled treatment and `~ Scheduled` copy
  - shared `DepartureCard` test for the secondary time-to-departure line updating correctly
  - accessibility-label test with the exact sentence format
  - screen integration test proving departure cards render beneath the existing stop header without removing the static backdrop
- Keep Story 3.3 concerns out of this test scope:
  - no polling timing assertions
  - no silent refresh UX assertions
  - no skeleton refresh-state assertions beyond the existing initial loading shell

### Previous Story Intelligence

- Story 3.1 established the departures screen shell and intentionally left the list area empty. Extend that shell; do not replace it.
- Story 3.1 also established several non-negotiable constraints:
  - static map screenshot backdrop only
  - stop header remains visually aligned with earlier stop identity components
  - back navigation is one tap
  - route instrumentation for the 2-second visibility budget stays intact
- Earlier stories consistently reused shared theme tokens and shared shell primitives instead of introducing feature-specific one-off styling systems.
- Story 1.4 already established `DepartureCard` as a shared UI component and the showcase screen already renders its variants. Extend that existing contract rather than creating a parallel implementation.
- Epic 1.6 already added the date utility needed for this story. Reusing it is safer than re-implementing time formatting inside the departure card.

### Git Intelligence

- Recent commits confirm the intended extension path:
  - `6efc622 feat(ui): Story 3-1 departures screen & stop header`
  - `a49ab05 fix(ui): Also use the blurred map background for Stops view`
  - `ab55141 feat(ui): Story 2-6 map tap navigation and error states`
- Inference from those commits and the existing shared component library: the highest-value path is incremental enhancement of the current screen and shared `DepartureCard`, not structural rework. The likely failure mode is duplicating the card in the wrong place.

### Latest Technical Information

- React Native `Text` docs currently state that `allowFontScaling` defaults to `true`. This supports the story requirement to respect system font scale; keep that default intact rather than opting out. [Source: https://reactnative.dev/docs/text]
- React Native accessibility guidance still recommends explicit `accessibilityLabel` values for accessible views when the spoken output needs to be controlled, which applies to the exact departure summary required here. [Source: https://reactnative.dev/docs/0.78/accessibility]
- TanStack Query v5 continues to center queries around a unique `queryKey` and a `queryFn`, with caching and refetch behavior tied to that key. That reinforces keeping all departure-card data derived from the existing `['departures', 'stop', stopId]` query instead of adding secondary fetch paths. [Source: https://tanstack.com/query/v5/docs/framework/react/guides/queries]
- Expo Router typed routes remain documented as beta. Preserve the current typed `stop/[stopId]` route and avoid introducing new untyped navigation patterns while implementing the card list. [Source: https://docs.expo.dev/router/reference/typed-routes/]

### Project Structure Notes

- Correction: the current codebase already has a shared `DepartureCard` at `src/shared/components/departure-card.tsx`; the story should extend and wire that component rather than introducing a new one.
- The current `DeparturesScreen` subtitle still describes the selected stop header and has not yet been updated for list content. Adjust that copy only if it improves clarity, but keep the screen's existing shell behavior and tests stable.
- The current hook already returns `departures`, but the screen does not render them yet. This story should finish that pipeline rather than introducing a second normalization layer elsewhere.
- No `project-context.md` file exists in this repository. The authoritative sources remain the epic breakdown, architecture document, PRD, UX spec, previous story file, and live codebase.

### Implementation Notes

- Recommended implementation order:
  1. Extend the normalized departure model in `use-stop-departures.ts`
  2. Extend the existing shared `DepartureCard` with the time-to-departure line if the current props are insufficient
  3. Render the mapped list in `departures-screen.tsx`
  4. Add/update tests
- Prefer a small helper for the accessibility sentence so tests cover one canonical formatter.
- Prefer a small helper for time-to-departure formatting and ticking so the same logic is not duplicated between the screen and the card.
- Keep visual distinction multi-signal, not color-only:
  - border color
  - status label copy
  - time font weight
- Place the time-to-departure counter directly under the main departure time so the hierarchy stays "absolute time first, relative time second".
- Preserve the existing stop header as the first visible content block. Departure cards should follow it immediately in the same scroll flow.
- Do not add long-press notification scheduling here; PRD FR43/FR45/FR46 belong to Epic 5.

### References

- Epic requirements and story scope: [Source: _bmad-output/planning-artifacts/epics.md#story-32-departure-cards-with-realtime-vs-scheduled-distinction]
- Product requirements FR18-FR21, NFR12, and notification out-of-scope references: [Source: _bmad-output/planning-artifacts/prd.md]
- Architecture rules for feature structure, query keys, generated-code ownership, and TanStack Query usage: [Source: _bmad-output/planning-artifacts/architecture.md]
- UX requirements for trust signaling, dark glass cards, and multi-property realtime distinction: [Source: _bmad-output/planning-artifacts/ux-design-specification.md]
- Existing departures shell and route wiring: [Source: src/app/stop/[stopId].tsx], [Source: src/features/departures/departures-screen.tsx]
- Existing departures data normalization and query source: [Source: src/features/departures/hooks/use-stop-departures.ts], [Source: src/features/departures/queries/stop-departures.graphql]
- Existing theme tokens and showcase departure variants: [Source: src/shared/theme/theme.ts], [Source: src/features/showcase/mock-data.ts]
- Existing shared departure-card implementation and tests: [Source: src/shared/components/departure-card.tsx], [Source: tests/shared/ui-components.test.tsx]
- Existing time-format utility: [Source: src/core/utils/date.ts]
- React Native Text docs: [Source: https://reactnative.dev/docs/text]
- React Native accessibility docs: [Source: https://reactnative.dev/docs/0.78/accessibility]
- TanStack Query v5 queries guide: [Source: https://tanstack.com/query/v5/docs/framework/react/guides/queries]
- Expo Router typed routes docs: [Source: https://docs.expo.dev/router/reference/typed-routes/]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Loaded and executed the BMAD workflow runner and create-story workflow configuration
- Resolved project config and implementation artifact paths from `_bmad/bmm/config.yaml`
- Loaded sprint tracking, epic `3` story definitions, architecture, PRD, UX specification, previous Story `3.1`, recent git history, and the current departures-related source files
- Verified official documentation for React Native accessibility/font scaling, TanStack Query v5 query behavior, and Expo Router typed routes to avoid stale implementation guidance
- Confirmed that no `project-context.md` file exists in this repo
- Ran red-green-refactor cycles for the hook model, shared `DepartureCard`, and departures screen integration tests
- Validated with `pnpm lint`, `pnpm typecheck`, `pnpm test:ci`, `pnpm codegen:check`, and targeted Prettier checks on changed story files

### Implementation Plan

- Normalize stop departures into card-ready data in the query hook, including chosen display epoch/time, status copy, and accessibility strings
- Extend the shared `DepartureCard` to render a local ticking time-to-departure line without changing query ownership or font-scaling defaults
- Render normalized cards in the existing departures screen shell and keep the Story 3.1 backdrop/header/navigation behavior intact
- Expand hook, shared-component, and screen tests to lock the realtime vs. scheduled semantics in place

### Completion Notes List

- Normalized departures in `use-stop-departures.ts` into card-ready records with `displayTime`, `displayDepartureEpochSeconds`, status metadata, and canonical accessibility labels while skipping malformed rows
- Extended the shared `DepartureCard` to show realtime/scheduled treatment, a ticking relative-time line, and explicit root accessibility labels without disabling font scaling
- Rendered the departure list beneath `StopHeaderCard` in the existing static-backdrop screen shell and added a no-departures empty state without changing Story 3.3 refresh behavior
- Updated the showcase screen to satisfy the shared-card prop contract after the countdown field became required
- Added and passed targeted hook, shared-component, screen, and shared date-utility tests plus full-suite validation with lint, typecheck, Jest CI, and codegen checks
- `pnpm format:check` still fails on pre-existing formatting-only issues outside this story in `src/app/stop/[stopId].tsx`, `src/shared/components/stop-header-card.tsx`, and `tests/app/stop-route.test.tsx`

### File List

- _bmad-output/implementation-artifacts/sprint-status.yaml
- _bmad-output/implementation-artifacts/3-2-departure-cards-with-realtime-vs-scheduled-distinction.md
- src/features/departures/departures-screen.tsx
- src/features/departures/hooks/use-stop-departures.ts
- src/features/showcase/showcase-screen.tsx
- src/core/utils/date.ts
- src/shared/components/departure-card.tsx
- src/shared/components/stop-header-card.tsx
- src/app/stop/[stopId].tsx
- tests/app/stop-route.test.tsx
- tests/core/date-utils.test.ts
- tests/features/departures/departures-screen.test.tsx
- tests/features/live-api-section.test.tsx
- tests/features/departures/use-stop-departures.test.tsx
- tests/shared/ui-components.test.tsx

## Change Log

- 2026-03-10: Implemented Story 3.2 departure-card rendering, realtime vs. scheduled semantics, ticking relative-time labels, and focused regression coverage; updated story and sprint tracking to `done`
