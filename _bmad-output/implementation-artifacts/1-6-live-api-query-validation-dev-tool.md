# Story 1.6: Live API Query Validation (Dev Tool)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want a dev-only live query validation view that runs the actual GraphQL queries against the DigiTransit varely API with hardcoded Finnish coordinates,
so that I can verify the full stack - API key, endpoint, schema, and data shape - is working correctly before wiring queries into feature screens.

## Acceptance Criteria

1. **Given** the Showcase screen is open (dev mode only)
   **When** the "Live API" section renders
   **Then** it automatically runs `StopsNearbyQuery` with hardcoded coordinates (`lat: 60.6310`, `lon: 24.8610`, `radius: 500`) for Hyvinkaa city centre
   **And** displays a loading state followed by results or a clear error with no user interaction required

2. **Given** the query completes successfully
   **When** results are displayed
   **Then** at least one stop is returned with a non-empty `name`, a valid `gtfsId`, a recognised `vehicleType`, and a numeric `distance` in metres
   **And** the field shapes confirm the v2 GTFS schema matches expectations, surfacing mismatches from the v1 Kotlin query assumptions

3. **Given** a stop from the results
   **When** its `gtfsId` is used to run `StopDeparturesQuery`
   **Then** at least one departure is returned containing `scheduledDeparture`, `serviceDay`, `realtimeState`, `trip.route.shortName`, and `headsign`
   **And** the computed departure time (`serviceDay + scheduledDeparture`, formatted as `HH:MM`) is displayed and shows a plausible clock time

4. **Given** the API key is missing or invalid
   **When** the query runs
   **Then** the validation view displays a clear error identifying the authentication failure and does not crash generically

5. **Given** the app is in production mode
   **When** the Showcase is inaccessible
   **Then** the live query validation and all hardcoded coordinates are also inaccessible and no dev tooling is exposed to production users

## Tasks / Subtasks

- [x] **Task 1: Add a dev-only live validation section to the existing Showcase feature** (AC: 1, 5)
  - [x] Extend `src/features/showcase/showcase-screen.tsx` with a labeled `Live API` section rather than a separate route or tab
  - [x] Keep the live validation implementation inside `src/features/showcase/` so `DEV_COORDS` never leaks into production feature modules
  - [x] Reuse the existing Showcase dev-only access path from `src/app/showcase.tsx`, `src/app/settings.tsx`, and `src/components/app-tabs.tsx`
  - [x] Ensure the live section only mounts in development builds and does not execute network requests in production code paths

- [x] **Task 2: Wire the real `StopsNearbyQuery` request using the existing GraphQL client and generated documents** (AC: 1, 2)
  - [x] Use the generated `StopsNearbyQuery` document from `src/generated/gql.ts` / `src/generated/graphql.ts` together with `requestGraphql` from `src/core/api/graphql-client.ts`
  - [x] Run the query automatically on section mount with `DEV_COORDS = { lat: 60.6310, lon: 24.8610, radius: 500 }`
  - [x] Render an explicit loading state, a success summary, and a failure summary inside the Showcase section
  - [x] Display the first returned stop's key fields (`name`, `gtfsId`, `vehicleType`, `distance`, optional route pattern summary) so schema drift is visible immediately

- [x] **Task 3: Chain a `StopDeparturesQuery` validation from the first valid stop result** (AC: 3)
  - [x] Select the first stop with a non-empty `gtfsId` from the nearby stops response and use it to trigger `StopDeparturesQuery`
  - [x] Render the stop name plus at least one departure row with `scheduledDeparture`, `serviceDay`, `realtimeState`, `trip.route.shortName`, and `headsign`
  - [x] Introduce the shared departure-time formatter in `src/core/utils/date.ts` and use it in the validation UI so Epic 3 can reuse it later
  - [x] Surface a schema mismatch clearly if the departures payload is missing expected fields instead of silently swallowing the issue

- [x] **Task 4: Map auth and schema failures to clear developer-facing diagnostics** (AC: 2, 4)
  - [x] Reuse the existing `AppError` mapping path from `src/core/errors/app-error.ts` and branch the UI messaging for auth, network, GraphQL, and empty-result failures
  - [x] Call out missing `EXPO_PUBLIC_DIGITRANSIT_API_KEY`, 401/403-style auth failures, and empty data separately from generic unknown errors
  - [x] Include the resolved API base URL from `src/core/config/env.ts` and the executed coordinates in the validation output so configuration mistakes are obvious
  - [x] Treat deprecated or unexpected schema fields, especially `vehicleType`, as validation warnings the developer can act on before Epic 2

- [x] **Task 5: Add focused tests around the live-validation behavior without hitting the network** (AC: 1, 3, 4, 5)
  - [x] Add Showcase tests that mock `requestGraphql` and verify the automatic query chain and rendered states
  - [x] Add a test that a missing or invalid API key error produces explicit auth messaging
  - [x] Add a test that production gating keeps the live validation inaccessible through the existing Showcase route protections
  - [x] Add a test for the new `src/core/utils/date.ts` helper covering `serviceDay + scheduledDeparture` formatting boundaries

## Dev Notes

### Story Foundation

- Story 1.6 is the bridge from Story 1.1's GraphQL/codegen foundation to Epic 2's real stop-discovery screens.
- The purpose is not user-facing functionality. It is a developer safety rail that proves the live DigiTransit endpoint, API key, schema shape, and generated documents still work in this repo before feature wiring starts.
- The story should stay inside the existing dev-only Showcase surface created in Story 1.5. Do not create another diagnostics screen, tab, or persistent tool entrypoint.

### Technical Requirements

- Use the existing GraphQL boundary instead of ad hoc fetch logic:
  - `src/core/api/graphql-client.ts` exposes `requestGraphql(...)` and already normalizes failures into `AppError`
  - `src/core/config/env.ts` centralizes `DIGITRANSIT_API_URL` and `DIGITRANSIT_API_KEY`
  - `src/core/api/query-keys.ts` already defines the canonical tuple keys for nearby stops and stop departures
- Use the real operation documents already present in the repo:
  - `src/features/stops/queries/stops-nearby.graphql`
  - `src/features/departures/queries/stop-departures.graphql`
  - Generated types exist in `src/generated/graphql.ts` as `StopsNearbyQueryQuery` / `StopDeparturesQueryQuery`
- `DEV_COORDS` must remain feature-local to `src/features/showcase/` and must not be imported by map, stops, or departures production modules.
- The implementation should prefer TanStack Query for orchestration because the architecture explicitly reserves remote state for Query. A dedicated developer-facing hook under `src/features/showcase/` is acceptable if it uses the existing query client rather than hand-managed `useEffect` request state.
- `src/core/utils/date.ts` does not exist yet. This story is expected to introduce it for the `serviceDay + scheduledDeparture` formatter called out in the epic technical notes.
- Treat empty data as a diagnostic signal, not success. A "request succeeded but no stops/departures came back" path must remain visible in the UI.

### Architecture Compliance

- Preserve the architecture's state split:
  - server state and request lifecycle in TanStack Query
  - no new persisted state
  - no settings-store coupling for this dev tool
- Keep generated artifacts under `src/generated/` read-only. Any schema mismatch discovered in this story should be resolved by editing `.graphql` operations or surrounding code, then rerunning codegen, not by editing generated files.
- Maintain feature-first structure:
  - Showcase-specific hooks, sections, and constants in `src/features/showcase/`
  - shared formatter in `src/core/utils/date.ts`
  - no leakage of dev-only concerns into production feature entrypoints
- Keep the tab shell unchanged. `Live API` is content inside Showcase, not a new route in `TAB_ROUTES`.

### Library / Framework Requirements

- Use the repo's current stack versions and patterns:
  - `@tanstack/react-query` `^5.90.21`
  - `graphql-request` `^7.4.0`
  - `expo-router` `~55.0.3`
  - `react-native` `0.83.2`
- TanStack Query v5 supports dependent queries through `enabled`, which fits the required "run departures only after a valid nearby stop exists" flow. [Source: https://tanstack.com/query/latest/docs/framework/react/guides/dependent-queries]
- Expo Router remains stack-based, and Story 1.5 already uses the guarded Showcase route. Keep this story within that surface rather than introducing new navigation. [Source: https://docs.expo.dev/router/basics/navigation/]
- DigiTransit's public API products require subscription-key based access through the Digitransit developer portal, which aligns with the existing `digitransit-subscription-key` header setup in `src/core/api/graphql-client.ts`. [Source: https://digitransit.fi/en/developers/apis/1-routing-api/]
- The OpenTripPlanner GraphQL GTFS reference documents `stop(id: ...)` and `stoptimesWithoutPatterns`, which matches the current departures query shape. [Source: https://docs.opentripplanner.org/api/dev-2.x/graphql-gtfs/queries/stop] [Source: https://docs.opentripplanner.org/api/dev-2.x/graphql-gtfs/types/Stop]
- The same OTP GraphQL reference marks `vehicleType` as deprecated/non-functional in favor of newer transport fields. The repo's generated schema still includes `vehicleType`, so this story should surface any mismatch explicitly instead of assuming parity forever. [Source: https://docs.opentripplanner.org/api/dev-2.x/graphql-gtfs/types/Stop]

### File Structure Requirements

- Update:
  - `src/features/showcase/showcase-screen.tsx`
  - `src/features/showcase/mock-data.ts` only if new local labels/layout helpers are needed
  - `tests/features/showcase-screen.test.tsx`
- Create likely new files:
  - `src/features/showcase/live-api-section.tsx`
  - `src/features/showcase/use-live-api-validation.ts`
  - `src/core/utils/date.ts`
  - `tests/core/date-utils.test.ts`
- Reuse without structural changes:
  - `src/app/showcase.tsx`
  - `src/app/settings.tsx`
  - `src/components/app-tabs.tsx`
  - `src/components/app-tabs.web.tsx`
  - `src/types/navigation.ts`
- Do not edit generated code directly under `src/generated/`.

### Testing Requirements

- Mock network behavior at the `requestGraphql` boundary or via React Query test setup. Do not hit the live DigiTransit API in Jest.
- Minimum useful coverage:
  - nearby stops query auto-starts on render in development Showcase
  - departures query starts only after a valid stop id is available
  - auth failure message is explicit and distinct from generic network failure
  - empty nearby-stop response remains visible as a validation failure
  - formatted departure time is derived correctly from `serviceDay + scheduledDeparture`
  - production route gating still prevents access to the live validation tool
- Keep tests behavioral and diagnostic-oriented. Avoid brittle snapshots of large Showcase markup.

### Previous Story Intelligence

- Story 1.5 established the non-tab Showcase route, deterministic back navigation to Settings, and focused Showcase tests. Build inside that path instead of inventing a second dev-tooling entrypoint.
- Story 1.5 kept all mock datasets feature-local in `src/features/showcase/`; follow that same module boundary for `DEV_COORDS` and any live-validation hook or section component.
- Story 1.1 already created the GraphQL client, env config, generated operation pipeline, and query-key conventions. Reuse those pieces directly to avoid duplicate API abstractions.
- Story 1.5's review tightened production gating. Preserve that discipline so the new live API section is unreachable when `__DEV__` is false.

### Git Intelligence

- Recent workspace history is linear and story-scoped:
  - `2fdf09f feat(ui): Story 1-5 dev showcase screen`
  - `ed6e987 feat(ui): Story 1-4 design system tokens and component library`
  - `90e9fd5 feat(ui): Story 1-3 app navigation shell and route architecture`
  - `c27bebf feat(ui): Story 1-2 settings store & app configuration foundation`
- Current repo reality favors a low-churn implementation:
  - the Showcase route and tests already exist
  - the GraphQL client and generated operations already exist
  - only the live diagnostic layer and shared date utility are missing
- The safest path is to add a small Showcase-local query module, reuse `requestGraphql`, and keep diagnostics visible in the existing scrollable Showcase surface.

### Latest Technical Information

- TanStack Query's current v5 docs recommend dependent queries via `enabled`, which cleanly matches the required "nearby stop first, departures second" validation chain. [Source: https://tanstack.com/query/latest/docs/framework/react/guides/dependent-queries]
- Expo Router's current docs still define stack-style `push` and `back` behavior, so the existing Story 1.5 Showcase navigation pattern remains valid as of March 9, 2026. [Source: https://docs.expo.dev/router/basics/navigation/]
- Digitransit's current Routing API docs route developers through the subscription-key based platform, which confirms the repo's env-driven header approach is still the right authentication contract as of March 9, 2026. [Source: https://digitransit.fi/en/developers/apis/1-routing-api/]
- The OTP GraphQL GTFS reference currently documents `stoptimesWithoutPatterns` on `Stop`, while also flagging `vehicleType` as deprecated/non-functional. This is the main schema-risk hotspot for this story and should be made visible in the developer diagnostics. [Source: https://docs.opentripplanner.org/api/dev-2.x/graphql-gtfs/types/Stop]

### Project Structure Notes

- The current app shell already treats Showcase as a pushed route:
  - `src/app/showcase.tsx`
  - `src/components/app-tabs.tsx`
  - `src/components/app-tabs.web.tsx`
  - `src/types/navigation.ts`
- The current Settings screen (`src/app/settings.tsx`) exposes the dev-only 5-tap unlock and should remain the only entry path for this tool.
- There is no existing `src/core/utils/` directory in the repo today. Creating `src/core/utils/date.ts` in this story is consistent with the architecture's `src/core/*` shared-utility pattern.
- No `project-context.md` file exists in this workspace. The authoritative planning context for this story is the epic breakdown, architecture document, UX specification, sprint status, and completed Story 1.5 artifact.

### References

- Story 1.6 requirements: [Source: _bmad-output/planning-artifacts/epics.md#story-16-live-api-query-validation-dev-tool]
- Sprint tracking and story key: [Source: _bmad-output/implementation-artifacts/sprint-status.yaml]
- Previous story context: [Source: _bmad-output/implementation-artifacts/1-5-dev-showcase-screen.md]
- Architecture: GraphQL client, Query, feature structure, generated artifacts: [Source: _bmad-output/planning-artifacts/architecture.md]
- UX: Showcase remains a dev-only review surface: [Source: _bmad-output/planning-artifacts/ux-design-specification.md#design-review--showcase-screen]
- Existing route shell: [Source: src/app/showcase.tsx], [Source: src/app/settings.tsx], [Source: src/components/app-tabs.tsx], [Source: src/components/app-tabs.web.tsx], [Source: src/types/navigation.ts]
- Existing API/query assets: [Source: src/core/api/graphql-client.ts], [Source: src/core/config/env.ts], [Source: src/core/api/query-keys.ts], [Source: src/features/stops/queries/stops-nearby.graphql], [Source: src/features/departures/queries/stop-departures.graphql], [Source: src/generated/graphql.ts]
- External docs: [Source: https://tanstack.com/query/latest/docs/framework/react/guides/dependent-queries], [Source: https://docs.expo.dev/router/basics/navigation/], [Source: https://digitransit.fi/en/developers/apis/1-routing-api/], [Source: https://docs.opentripplanner.org/api/dev-2.x/graphql-gtfs/types/Stop], [Source: https://docs.opentripplanner.org/api/dev-2.x/graphql-gtfs/queries/stop]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Story context created from `epics.md`, `architecture.md`, `ux-design-specification.md`, `sprint-status.yaml`, the completed Story 1.5 artifact, current Showcase/navigation files, GraphQL query documents, generated GraphQL types, and current official docs for TanStack Query, Expo Router, DigiTransit Routing API access, and OTP GraphQL GTFS schema behavior
- Confirmed the story key in sprint tracking is `1-6-live-api-query-validation-dev-tool`
- Confirmed the current repo already had the GraphQL client, generated query types, and Showcase route, then added a Showcase-local live validation hook and section plus `src/core/utils/date.ts`
- Implemented the live validation with TanStack Query dependent queries: nearby stops runs first on mount, departures runs only after the first valid `gtfsId` is available
- Added developer-facing diagnostics for missing API key, permission failures, GraphQL/network failures, empty nearby-stop results, missing departures, resolved API URL, and fixed dev coordinates
- Added schema-watch output for `vehicleType` so the Showcase makes the upstream deprecation risk visible before Epic 2 work starts
- Validated the implementation with targeted `pnpm test:ci` coverage and `pnpm typecheck`

### Completion Notes List

- Added a dev-only `Live API` section to Showcase that runs the real nearby-stop and departures queries against fixed Hyvinkaa coordinates
- Added `src/features/showcase/use-live-api-validation.ts` to orchestrate the dependent live queries with the existing GraphQL client and query-key patterns
- Added `src/core/utils/date.ts` with the reusable `serviceDay + scheduledDeparture` formatter and surfaced formatted departure output in the validator
- Added explicit diagnostics for missing API key, auth rejection, network/GraphQL failures, empty nearby-stop results, missing departures, and the `vehicleType` deprecation watch
- Added focused tests for the live validator flow and formatter while keeping production gating covered through the existing Showcase route tests
- Tightened the validator after review so success requires a fully valid nearby stop and a departure row containing all required AC fields

### Change Log

- 2026-03-09: Implemented the dev-only live DigiTransit validator in Showcase, added the shared departure-time formatter, and covered the new flow with unit/integration tests
- 2026-03-09: Fixed code review findings by mapping 401 auth failures explicitly, failing validation on incomplete nearby-stop/departure payloads, and expanding regression coverage

### File List

- _bmad-output/implementation-artifacts/1-6-live-api-query-validation-dev-tool.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- src/core/utils/date.ts
- src/features/showcase/live-api-section.tsx
- src/features/showcase/showcase-screen.tsx
- src/features/showcase/use-live-api-validation.ts
- tests/core/date-utils.test.ts
- tests/core/app-error.test.ts
- tests/features/live-api-section.test.tsx
- tests/features/showcase-screen.test.tsx

## Senior Developer Review (AI)

### Reviewer

Jyrki

### Date

2026-03-09

### Outcome

Approved after fixes

### Notes

- Fixed auth classification so both 401 and 403 DigiTransit failures surface as explicit authentication diagnostics.
- Tightened nearby-stop validation so the validator only proceeds when the live stop includes `gtfsId`, non-empty `name`, recognized `vehicleType`, and numeric `distance`.
- Tightened departure validation so empty or schema-incomplete departures fail the validator instead of rendering a false success state.
- Added regression tests for 401 auth mapping, empty nearby-stop validation, incomplete departure payloads, and empty departures payloads.
- Re-verified the implementation with targeted `pnpm test:ci` and `pnpm typecheck`.
