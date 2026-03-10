# Story 3.1: Departures Screen & Stop Header

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to see a departures screen when I tap a stop, with the stop's identity clearly presented at the top,
so that I always know which stop I'm looking at and can trust I tapped the right one.

## Acceptance Criteria

1. **Given** the user taps a stop marker on the map or a `StopCard` in the Stops list
   **When** navigation to `stop/[stopId]` completes
   **Then** the departures screen renders with a `StopHeaderCard` at the top showing stop name, code, transport type (C+D tint + icon badge), and zone
   **And** the screen renders within 2 seconds at the 95th percentile on a normal connection

2. **Given** the departures screen is open
   **When** the user taps the back button
   **Then** they return to the previous screen (Map or Stops list) with one tap and no dead ends

3. **Given** the departures screen is open
   **When** the tab bar is checked
   **Then** the tab bar is hidden because this is a push route, not a tab
   **And** any spatial backdrop on this screen is a static image only, not a live interactive map surface

## Tasks / Subtasks

- [x] Task 1: Replace the departures stub with the real route shell and top-of-screen structure (AC: 1, 2, 3)
  - [x] Update `src/app/stop/[stopId].tsx` to render the real departures route entry instead of stub text
  - [x] Create `src/features/departures/departures-screen.tsx` as the screen-level component for Story 3.1
  - [x] Keep back navigation on the pushed route and do not expose Departures as a primary tab

- [x] Task 2: Add stop-header data loading and normalization for the selected stop (AC: 1)
  - [x] Create `src/features/departures/hooks/use-stop-departures.ts`
  - [x] Reuse `src/features/departures/queries/stop-departures.graphql` and generated GraphQL types instead of authoring parallel interfaces
  - [x] Normalize query data into a screen-friendly model that includes stop name, code, zone, transport mode, and route-pattern summary for the header
  - [x] Use query keys from `src/core/api/query-keys.ts` with the `['departures', 'stop', stopId]` convention

- [x] Task 3: Expand the shared stop header presentation to match the UX requirement (AC: 1, 3)
  - [x] Extend `src/shared/components/stop-header-card.tsx` to support the Departures header requirements: zone label and optional route-pattern context
  - [x] Keep the existing transport tint, icon badge, and token-driven styling from `StopCard`
  - [x] Ensure the stop header remains visually aligned with the Nearby Stops card identity rather than introducing a separate visual language

- [x] Task 4: Build the static-backdrop departures layout with existing shared components (AC: 1, 3)
  - [x] Reuse `CoordinatesBar` at the top of the screen
  - [x] Reuse `ErrorBanner` for API failures if the initial stop fetch fails
  - [x] Use a static `expo-image` backdrop layer for spatial context; do not mount `PlatformMapView` or any live map provider on this route
  - [x] Preserve minimum touch targets and system font scaling

- [x] Task 5: Add focused tests for the departures shell and stop header behavior (AC: 1, 2, 3)
  - [x] Add route-level tests for `src/app/stop/[stopId].tsx`
  - [x] Add component/screen tests for the rendered stop header and back-navigation affordance
  - [x] Add hook normalization tests for the stop-departures query mapping, including missing-field guards
  - [x] Verify the tab bar stays hidden on the departures route and that the screen uses a static backdrop instead of the live map component

## Dev Notes

### Story Foundation

- Story 3.1 is the first implementation story in Epic 3 and converts the existing pushed `stop/[stopId]` route from a stub into the real departures screen shell.
- This story is intentionally limited to the route shell, stop identity header, and navigation/backdrop behavior. The detailed departure cards and auto-refresh states belong to Stories 3.2 and 3.3.
- The critical UX promise is the app's two-tap path: launch, select stop, see departures quickly. This story must preserve that path by making the selected stop immediately obvious at the top of the screen.

### Technical Requirements

- Continue to use Expo Router push navigation through `buildStopHref(stopId)` in `src/types/navigation.ts`. Do not introduce a separate departures tab or alternate route path.
- The route entry remains `src/app/stop/[stopId].tsx`; the feature implementation belongs in `src/features/departures/`.
- Use the existing GraphQL operation `StopDeparturesQuery` from `src/features/departures/queries/stop-departures.graphql`.
- Do not handwrite duplicate GraphQL types. Use generated artifacts from `src/generated/`.
- The departures query currently returns:
  - `stop.name`
  - `stoptimesWithoutPatterns[]`
  - no `code`, `zone`, or route-pattern data yet
- Because the Story 3.1 header requires stop name, code, transport type, and zone, this story will likely need to extend `stop-departures.graphql` to fetch the additional stop metadata needed by the header. Make that change at the `.graphql` document, then rely on regenerated types.
- Keep query orchestration inside TanStack Query and follow the project query-key convention for departures: `['departures', 'stop', stopId]`.
- Preserve the current root navigation behavior in `src/components/app-tabs.tsx` and `src/components/app-tabs.web.tsx`; the tab bar is already hidden on non-primary routes and must stay that way.

### Architecture Compliance

- Follow the feature-first project structure from the architecture:
  - route files in `src/app/`
  - feature code in `src/features/departures/`
  - shared UI in `src/shared/components/`
  - API/query infrastructure in `src/core/api/`
- Reuse the shared error model and query infrastructure already established in earlier stories.
- Keep server state in TanStack Query and client state in Zustand only when truly client-owned. Story 3.1 should not add global store state for selected-stop data.
- Avoid introducing live map dependencies on the Departures screen. The UX and epic docs are explicit that Stops and Departures retain spatial mood via static imagery only.
- Treat generated GraphQL files as read-only. Changes must happen in `.graphql` source plus codegen.

### Library / Framework Requirements

- Use Expo Router stack/push navigation patterns already present in the repo. The official docs describe stack navigation as the correct model for pushed detail routes. [Source: https://docs.expo.dev/router/advanced/stack/]
- Use typed routes with `useLocalSearchParams` and typed `Href` objects rather than raw string concatenation. Expo documents typed routes as the supported approach when `experiments.typedRoutes` is enabled. [Source: https://docs.expo.dev/router/reference/typed-routes/]
- For the static spatial backdrop, continue using `expo-image`, which supports local `require()` sources and transition configuration on Expo SDK 55. [Source: https://docs.expo.dev/versions/latest/sdk/image]
- Stay within the currently installed repo versions unless there is a separately approved dependency change:
  - `expo` `~55.0.3`
  - `expo-router` `~55.0.3`
  - `@tanstack/react-query` `^5.90.21`
  - `graphql-request` `^7.4.0`
  - `react-native` `0.83.2`
- Do not add a third-party UI library. The UX spec and current codebase standardize on token-driven shared components plus `expo-glass-effect`, `expo-image`, and React Native primitives.

### File Structure Requirements

- Update:
  - `src/app/stop/[stopId].tsx`
  - `src/shared/components/stop-header-card.tsx`
  - `src/features/departures/queries/stop-departures.graphql`
- Create:
  - `src/features/departures/departures-screen.tsx`
  - `src/features/departures/hooks/use-stop-departures.ts`
  - tests under `tests/features/departures/` for hook normalization and screen behavior
- Reuse if possible:
  - `src/shared/components/coordinates-bar.tsx`
  - `src/shared/components/error-banner.tsx`
  - `src/shared/components/stop-card.tsx` as the visual and semantic reference for the header treatment
  - `src/types/navigation.ts`
- Do not create a live-map departures component or a new tab entry for departures.

### Testing Requirements

- Use the existing Jest + `jest-expo` + React Native Testing Library setup.
- Add targeted tests, not broad router snapshots.
- Minimum coverage for this story:
  - a route/screen test proving `stop/[stopId]` renders the departures screen instead of the stub
  - a test that the stop header shows the selected stop identity fields available from the query model
  - a back-navigation test
  - a test that the departures route does not render the primary tab bar
  - a hook normalization test covering incomplete GraphQL payloads so the screen fails safely instead of crashing
- Avoid testing Story 3.2 and 3.3 behavior here. No realtime/scheduled card distinction and no polling UX beyond what is needed for initial shell rendering.

### Previous Story Intelligence

- Story 1.3 already established the navigation contract: Map and Stops push to `stop/[stopId]`, and the tab bar hides on that route. Story 3.1 should extend that route, not replace its navigation model.
- Story 2.4 established the Nearby Stops list and `StopCard` as the current stop identity component. The stop header should feel like the same stop rendered in an expanded format, not a new component family.
- Story 2.6 established the static-backdrop panel pattern on non-map views and the use of `CoordinatesBar` plus error/empty-state handling. Reuse that screen composition rather than inventing a separate departures shell.
- Earlier stories consistently favored:
  - shared component reuse over one-off UI
  - token-driven styling from `src/shared/theme/theme.ts`
  - direct hook-level normalization tests for data contracts

### Git Intelligence

- Recent commits show a UI-first feature progression:
  - `ab55141 feat(ui): Story 2-6 map tap navigation and error states`
  - `2a5a6fd feat(ui): Story 2-5 home stop pinning`
  - `ff8159f feat(ui): Story 2-4 nearby stops list`
  - `6b6ef10 feat(ui): Story 2-3 nearby stop markers on map`
- The current codebase already contains the exact primitives this story should extend:
  - `src/app/stop/[stopId].tsx` as the route entry
  - `src/shared/components/stop-header-card.tsx`
  - `src/shared/components/coordinates-bar.tsx`
  - `src/shared/components/error-banner.tsx`
  - `src/features/departures/queries/stop-departures.graphql`
- The main implementation risk is not missing UI primitives; it is failing to extend the GraphQL document and normalization layer enough to supply the header data required by the epic.

### Latest Technical Information

- Expo Router typed routes are still documented as beta. The docs explicitly require object-form hrefs for dynamic routes and typed `useLocalSearchParams` for strongly typed route params. That matches the repo's current `buildStopHref()` pattern and should be preserved. [Source: https://docs.expo.dev/router/reference/typed-routes/]
- Expo Router stack navigation remains the correct model for pushed detail screens. The docs describe a route like `[id].tsx` as being pushed on top of the source route in a stack and popped via back navigation. That aligns with the current `stop/[stopId]` flow. [Source: https://docs.expo.dev/router/advanced/stack/]
- Expo Image on the current docs supports local static sources and transition behavior on SDK 55, which is appropriate for the non-interactive backdrop requirement on the Departures screen. [Source: https://docs.expo.dev/versions/latest/sdk/image]

### Project Structure Notes

- The architecture document lists a long-term `src/features/departures/components/` structure, but the current repo has not created those files yet. Story 3.1 should start with the screen and hook, and only add extra component files if they materially improve clarity.
- The current `StopHeaderCard` component only accepts `name`, `code`, `transportMode`, and optional `distanceLabel`. Story 3.1 requires zone and likely route-pattern context, so extending this component is expected.
- The current `StopDeparturesQuery` does not yet fetch enough stop metadata for the Story 3.1 header. Extending the query document is part of the intended implementation, not a deviation.
- No `project-context.md` file exists in this repository, so the authoritative sources are the epic breakdown, architecture document, UX design spec, previous story files, and the live codebase.

### Implementation Notes

- Alignment with the planned architecture is good: the route already exists at `src/app/stop/[stopId].tsx`, and the departures feature folder already contains the GraphQL query source.
- Detected variance: the architecture draft mentions a richer departures module structure than the current repo. Favor incremental additions that match the current codebase rather than creating the full future tree upfront.
- Detected variance: the UX and epic require a richer stop header than the existing GraphQL document currently supports. The implementation should close that gap by extending the query source and regenerating types.

### References

- Epic and story requirements: [Source: _bmad-output/planning-artifacts/epics.md#Story-31-departures-screen--stop-header]
- Product requirements and performance target: [Source: _bmad-output/planning-artifacts/prd.md]
- Departures module boundaries and query-key conventions: [Source: _bmad-output/planning-artifacts/architecture.md]
- Departures-view UX, static backdrop, tab behavior, and stop-header visual identity: [Source: _bmad-output/planning-artifacts/ux-design-specification.md]
- Existing route and navigation contracts: [Source: src/app/stop/[stopId].tsx], [Source: src/types/navigation.ts], [Source: src/components/app-tabs.tsx], [Source: src/components/app-tabs.web.tsx]
- Existing reusable components: [Source: src/shared/components/stop-card.tsx], [Source: src/shared/components/stop-header-card.tsx], [Source: src/shared/components/coordinates-bar.tsx], [Source: src/shared/components/error-banner.tsx]
- Existing departures query source: [Source: src/features/departures/queries/stop-departures.graphql]
- Expo Router typed routes: [Source: https://docs.expo.dev/router/reference/typed-routes/]
- Expo Router stack navigation: [Source: https://docs.expo.dev/router/advanced/stack/]
- Expo Image docs: [Source: https://docs.expo.dev/versions/latest/sdk/image]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Loaded and analyzed workflow core, create-story workflow config, template, and checklist
- Loaded sprint tracking, epic/story breakdown, architecture, PRD, UX design specification, previous Story 1.3 context, recent git history, and current departures-related source files
- Verified official Expo documentation for typed routes, stack navigation, and `expo-image` to avoid stale implementation guidance
- No `project-context.md` file was present in the repo; story guidance is based on the available planning artifacts and codebase
- Added failing route, screen, and hook tests for the departures shell before implementation, then regenerated GraphQL artifacts after extending the query source
- Validated the completed story with `pnpm test:ci`, `pnpm lint`, `pnpm typecheck`, and `pnpm codegen:check`

### Completion Notes List

- Created the full Story 3.1 implementation context with concrete tasks, architecture constraints, reuse guidance, and testing scope
- Identified a likely implementation requirement to extend `stop-departures.graphql` so the stop header can display code, zone, and transport metadata from typed GraphQL results
- Kept scope bounded to the departures route shell and stop identity header, leaving departure-card behavior and auto-refresh to Stories 3.2 and 3.3
- Entered YOLO mode after the initial checkpoint per user instruction and completed the remainder of the document without additional prompts
- Replaced the `stop/[stopId]` stub with a real departures screen shell that reuses `CoordinatesBar`, `ErrorBanner`, and a static `expo-image` backdrop while preserving one-tap back navigation
- Added `use-stop-departures` with TanStack Query, generated GraphQL types, `['departures', 'stop', stopId]` keys, and defensive header normalization for missing fields
- Extended `StopHeaderCard` to render zone and route context, and updated showcase data plus route tests to match the richer header contract
- Addressed code review findings by replacing inferred route labels with real stop `direction` and `patterns` data, compacting the stop header layout, making the route scrollable for long stop metadata, and swapping the placeholder backdrop for a static local map screenshot
- Added dev-time departures render timing instrumentation to align with the story's 2-second visibility budget and removed user-facing story placeholder copy from the route
- Verified all acceptance-criteria coverage with focused departures tests plus the full repo validation suite

### File List

- _bmad-output/implementation-artifacts/3-1-departures-screen-and-stop-header.md
- assets/images/map-backdrop.png
- src/app/stop/[stopId].tsx
- src/features/departures/departures-screen.tsx
- src/features/departures/hooks/use-stop-departures.ts
- src/features/departures/queries/stop-departures.graphql
- src/generated/gql.ts
- src/generated/graphql.ts
- src/features/showcase/mock-data.ts
- src/shared/components/stop-header-card.tsx
- tests/app/navigation-routes.test.tsx
- tests/app/stop-route.test.tsx
- tests/features/departures/departures-screen.test.tsx
- tests/features/departures/use-stop-departures.test.tsx
- tests/features/showcase-screen.test.tsx

## Senior Developer Review (AI)

- Review outcome: approved after fixes
- Resolved issues:
  - stop header now uses real stop `direction` and `patterns` data instead of inferring route context from imminent departures
  - departures header layout was compacted and the screen now scrolls correctly for long stop metadata
  - user-facing placeholder story copy was removed from the route
  - static backdrop now uses a local map screenshot instead of a placeholder graphic
  - departures screen includes dev-time visibility timing instrumentation for the 2-second render budget
- Residual caveat: the backdrop asset is now a suitable static map screenshot, but any future polish to crop/export the asset itself can be done without changing the route logic

## Change Log

- 2026-03-10: Implemented the departures route shell, stop-header query normalization, shared header expansion, and focused test coverage for Story 3.1; validated with full test, lint, typecheck, and codegen gates
- 2026-03-10: Resolved code review findings, updated story status to done, and approved Story 3.1 for completion
