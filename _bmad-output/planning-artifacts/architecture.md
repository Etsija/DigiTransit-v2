---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments:
  - '/home/jyrki/projects/DigiTransit-v2/_bmad-output/planning-artifacts/prd.md'
workflowType: 'architecture'
lastStep: 8
status: 'complete'
completedAt: '2026-03-04'
project_name: 'DigiTransit-v2'
user_name: 'Jyrki'
date: '2026-03-04T00:00:00+02:00'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
The PRD defines 42 FRs across seven capability areas:
1) Location & Geolocation (FR1–FR5): permission flow, coordinate acquisition, live location updates, fallback behavior when denied.
2) Map View (FR6–FR11): GPS-centered map, typed stop markers, proximity-weighted marker sizing, pan/zoom exploration, tap-through to departures.
3) Stop Discovery (FR12–FR16): nearby stop list sorted by distance, rich stop metadata, home-stop pinning entrypoint, auto-refresh.
4) Departure Information (FR17–FR23): upcoming departures, scheduled vs realtime distinction, headsign visibility, refresh cadence, navigation continuity.
5) Home Stop & Notifications (FR24–FR30): single pinned home stop, local notification toggle/lead-time config, permission-gated delivery.
6) Settings & Preferences (FR31–FR37): seven configurable values with persistence and defaults.
7) Error & Edge Handling (FR38–FR42): API outage tolerance, location-denied UX, empty-result handling, crash resistance.

Architecturally, these imply modular feature boundaries (Map, Stops, Departures, Settings, Notifications), centralized domain models for stop/departure/location data, and robust client-side state orchestration.

**Non-Functional Requirements:**
16 NFRs strongly shape architecture:
- Performance (NFR1–NFR4): low-latency initial render, responsive UI under background fetching, battery-aware polling.
- Privacy (NFR5–NFR7): no persistent location history, no non-DigiTransit data egress, local-only preference storage.
- Reliability (NFR8–NFR10): no crash/freeze on API/network failures, automatic recovery behavior.
- Accessibility (NFR11–NFR13): marker contrast, scalable typography, touch-target minimums.
- Integration (NFR14–NFR16): query deduplication, graceful throttling handling, centralized API base config.

These NFRs require explicit architectural decisions for caching, retry/backoff, degraded-mode rendering, and platform-consistent accessibility behavior.

**Scale & Complexity:**
This is a medium-complexity cross-platform client with real-time-ish UX and background capabilities, but no backend ownership.
- Primary domain: Cross-platform transit client application (mobile + web)
- Complexity level: Medium
- Estimated architectural components: 10

### Technical Constraints & Dependencies

- Mandatory stack direction from PRD: React Native + Expo + TanStack Query.
- External API dependency: DigiTransit GraphQL availability and schema stability.
- Platform-specific dependency risk: map implementation divergence on web vs native.
- Background execution constraints: iOS background fetch reliability can limit notification timing guarantees.
- No backend allowed in MVP scope; all notification logic remains client-side/local.
- App-store compliance concerns deferred for current phase, but permission text/flows still affect implementation quality.

### Cross-Cutting Concerns Identified

- Query strategy: centralized query keys, deduplication, polling policy, retry/backoff, throttling handling.
- Error-state architecture: preserve map shell while data APIs fail; consistent banner/empty-state patterns.
- Permission orchestration: location + notifications lifecycle and state synchronization across tabs/settings.
- Local persistence and config propagation: validated settings schema, defaults, runtime updates without app restart.
- Platform abstraction: shared domain/use-case layer with adapter boundaries for maps, background tasks, notifications.
- Accessibility and outdoor usability: contrast-safe color system, scalable text, touch-target sizing.
- Observability-light operation: enough client logging/debug hooks for troubleshooting without analytics backend.

## Starter Template Evaluation

### Primary Technology Domain

Mobile app (iOS/Android) with web target, based on project requirements and existing repository setup.

### Starter Options Considered

1. Expo official default starter (`create-expo-app` default)
- Includes Expo Router + TypeScript and current Expo conventions.
- Best fit because repository is already initialized this way.

2. Expo `blank-typescript`
- Leaner but requires rebuilding navigation/routing conventions manually.
- Not preferred since project already has router structure.

3. Expo `tabs`
- Useful for rapid scaffold, but overlapping with existing setup and less value now.

### Selected Starter: Expo Official Default Starter (existing repository baseline)

**Rationale for Selection:**
- Already installed in repo and aligned with current Expo guidance.
- Minimizes churn and preserves momentum.
- Provides stable cross-platform baseline for adding TanStack Query + GraphQL codegen + map adapters.

**Initialization Command:**

```bash
npx create-expo-app@latest DigiTransit-v2 --template default
```

**Architectural Decisions Provided by Starter:**

**Language & Runtime:**
- TypeScript-enabled React Native/Expo project.

**Styling Solution:**
- Baseline React Native styling primitives (no forced design system dependency).

**Build Tooling:**
- Expo-managed workflow with platform scripts (`ios`, `android`, `web`) and Metro integration.

**Testing Framework:**
- No heavy testing stack forced by starter; allows deliberate later selection.

**Code Organization:**
- Expo Router-centric app structure suitable for tabbed navigation and feature-module layering.

**Development Experience:**
- Fast local iteration, Expo dev tooling, and straightforward dependency onboarding.

### Mapping Direction (Web vs Native)

- Native (iOS/Android): `react-native-maps` via Expo-supported path.
- Web: prefer **Mapbox GL JS** for richer map styling and overlay flexibility for transit UX.
- Note: Avoid RN Mapbox SDK for MVP because Expo Go compatibility is limited (requires custom native builds).

### GraphQL Type-Safety Direction

- TanStack Query query orchestration with GraphQL request functions.
- GraphQL Code Generator client preset for typed operations/documents.
- This becomes part of the first implementation stories after starter baseline.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- No backend DB/auth in MVP; all persistence is local-only.
- GraphQL integration is Codegen-first typed documents + TanStack Query orchestration.
- Shared map abstraction with split implementation: native (`react-native-maps`) vs web (`mapbox-gl`).
- Background notification behavior is best-effort on iOS and non-blocking for MVP.

**Important Decisions (Shape Architecture):**
- Settings/home-stop persistence with AsyncStorage.
- Boundary validation with Zod (settings/runtime guards).
- Unified app error model for API, permissions, empty states.
- Keep architecture simple: no extra domain-model layer unless a concrete mismatch appears.

**Deferred Decisions (Post-MVP):**
- Multi-city architecture.
- Web push notifications.
- Analytics stack.

### Data Architecture

- Remote persistence/database: **None (MVP)**.
- Local persistence: `@react-native-async-storage/async-storage`.
- Data modeling: use GraphQL Codegen generated types directly for API input/output entities.
- Mapping policy: only minimal UI shaping/select transforms where required; avoid redundant dual model layers.
- Validation: Zod for persisted settings and critical runtime boundaries.
- Caching: TanStack Query v5 with configurable polling and bounded retries.
- Migration: versioned settings schema (`settingsVersion`).

### Authentication & Security

- Authentication: **None (MVP scope)**.
- Authorization: not applicable.
- API security approach:
  - Public DigiTransit GraphQL endpoint consumption only.
  - Do not embed sensitive secrets in app bundle.
  - Map provider public token managed via Expo env config.
- Data protection:
  - No location history persistence.
  - Store only necessary preferences/home stop locally.

### API & Communication Patterns

- API style: GraphQL over HTTP.
- Client execution:
  - Typed documents generated via `@graphql-codegen/client-preset`.
  - Query functions executed through `graphql-request`.
  - TanStack Query handles cache lifecycle/polling/retries.
- Error handling standard:
  - Normalize transport, GraphQL, and domain-empty states into a shared error envelope.
  - UI policy: map shell remains available even when transit API fails.
- Rate limiting/throttling:
  - Avoid tight retry loops; bounded retries and jittered retry delay.
  - Polling intervals user-configurable with sane minimum clamps.

### Frontend Architecture

- App structure: Expo Router tabs + feature-first modules:
  - `features/map`
  - `features/stops`
  - `features/departures`
  - `features/settings`
  - `features/notifications`
  - `core/api`, `core/platform`
- State management:
  - Server state: TanStack Query only.
  - Client UI/preferences state: Zustand store (persist middleware) for settings/home-stop/UI flags.
- Routing strategy: Expo Router with typed route params for stop/departure flows.
- Performance strategy:
  - Memoized marker/list transforms
  - query `select` for derived data
  - avoid over-render with granular store selectors
- Bundle strategy:
  - Keep map provider code isolated by platform adapters.
  - Defer non-critical screens/components where practical.

### Infrastructure & Deployment

- Mobile build/deploy: EAS Build profiles (`development`, `preview`, `production`).
- OTA: Expo Updates channels aligned to profiles.
- Web deployment: **no hosting target**; web is used for local testing only (`expo start --web` on localhost).
- CI/CD baseline: typecheck, lint, codegen validation, test gates.
- Monitoring/logging: lightweight client logging and error boundaries.

### Decision Impact Analysis

**Implementation Sequence:**
1. Add baseline code quality tooling: Prettier config + scripts (with lint/typecheck alignment).
2. Establish GraphQL codegen pipeline and typed operation boundary.
3. Implement core API layer + TanStack Query defaults.
4. Implement settings store + persistence + schema migration.
5. Build map adapters and nearby-stops flow.
6. Build departures flow.
7. Add notifications with platform capability guards.
8. Finalize EAS build/release profiles.

**Cross-Component Dependencies:**
- Query key conventions affect map/stops/departures synchronization.
- Settings store impacts polling behavior globally.
- Map adapter contract affects marker rendering and navigation handoff to departures.
- Notification logic depends on settings + home stop + departures query behavior.

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

**Critical Conflict Points Identified:**
6 areas where AI agents could make different choices and create integration friction.

### Naming Patterns

**Database Naming Conventions:**
- No backend database in MVP; this section is intentionally not applicable.
- Local persistence keys use stable camelCase names with version prefix, e.g. `app.settings.v1`, `app.homeStop.v1`.

**API Naming Conventions:**
- GraphQL operation names: `FeatureActionTarget` PascalCase, unique globally.
  - Examples: `StopsNearbyQuery`, `StopDeparturesQuery`, `SetHomeStopMutation`.
- GraphQL fragments: `FeatureEntityFragment`.
- Query params/internal inputs in code: `camelCase`.
- Route params in Expo Router: `[stopId].tsx` with param key `stopId`.

**Code Naming Conventions:**
- Types/interfaces/enums/components: PascalCase.
- Functions/variables/hooks: camelCase.
- Constants: UPPER_SNAKE_CASE only for true constants.
- Files:
  - Components/screens: kebab-case (`stop-marker-card.tsx`)
  - Hooks: `use-*.ts`
  - Stores: `*.store.ts`
  - API ops: `*.graphql`
  - Generated artifacts: under dedicated `src/generated/` (read-only by convention).

### Structure Patterns

**Project Organization:**
- Feature-first structure:
  - `src/features/map`
  - `src/features/stops`
  - `src/features/departures`
  - `src/features/settings`
  - `src/features/notifications`
- Shared layers:
  - `src/core/api`
  - `src/core/platform`
  - `src/core/errors`
  - `src/core/config`
- Tests co-located with source as `*.test.ts(x)` for tight ownership.

**File Structure Patterns:**
- GraphQL documents in feature folders (`queries/*.graphql`, `mutations/*.graphql`).
- Generated code only in `src/generated/`.
- Config:
  - `codegen.ts`
  - `prettier.config.cjs`
  - ESLint config at project root.
- No ad-hoc utils dumping; shared helpers go to explicit `src/core/*` modules.

### Format Patterns

**API Response Formats:**
- Use generated GraphQL result/variables types directly.
- No custom global API wrapper object unless endpoint constraints require it.
- Normalize app-level errors via a shared `AppError` shape:
  - `{ kind, message, retryable, cause? }`
  - `kind` values: `network | graphql | permission | empty | unknown`

**Data Exchange Formats:**
- JSON field naming in app code: camelCase.
- Date/time:
  - Keep API-provided time fields as strings at boundary.
  - Parse/format only at view-model/UI boundary.
- Booleans: strict true/false.
- Null handling:
  - Prefer explicit null checks and fallback mappers in query `select`.

### Communication Patterns

**Event System Patterns:**
- No global event bus for MVP.
- Cross-feature communication via:
  - TanStack Query cache updates/invalidation
  - Shared Zustand settings store
  - Router params for navigation handoff

**State Management Patterns:**
- Server state only in TanStack Query.
- Client state only in Zustand (settings/home-stop/UI flags).
- Query keys use tuple factory pattern:
  - `['stops', 'nearby', { lat, lon, radius }]`
  - `['departures', 'stop', stopId]`
- Never mix local component state and global store for same concern.

### Process Patterns

**Error Handling Patterns:**
- Every async boundary maps thrown errors to `AppError`.
- UI rules:
  - Map shell remains visible on transit API failure.
  - Empty-state and permission-denied states are explicit components.
- Logging:
  - `console.error` in development; structured logger adapter for production readiness.

**Loading State Patterns:**
- Query-driven loading:
  - `isLoading` for initial load
  - `isFetching` for background refresh indicator
- Avoid full-screen blocking loaders after first successful render.
- Pull-to-refresh/manual refresh should call query refetch, not bespoke fetch functions.

### Enforcement Guidelines

**All AI Agents MUST:**
- Run formatting and linting before finalizing changes (`prettier`, `eslint`, typecheck).
- Use generated GraphQL artifacts; do not handwrite parallel API types.
- Follow query key factory conventions and shared `AppError` model.

**Pattern Enforcement:**
- Add CI checks for `prettier --check`, lint, and typecheck.
- Treat generated files as owned by codegen; edits must be made at source `.graphql` documents/config.
- Document pattern exceptions in architecture decisions before introducing divergence.

### Pattern Examples

**Good Examples:**
- `src/features/stops/queries/stops-nearby.graphql`
- `src/features/stops/hooks/use-nearby-stops.ts`
- `src/features/departures/hooks/use-stop-departures.ts`
- `src/features/settings/settings.store.ts`
- Query key: `['stops', 'nearby', { lat, lon, radius }]`

**Anti-Patterns:**
- Hand-authored duplicate TS interfaces for GraphQL payloads already code-generated.
- Inconsistent keys like `['nearbyStops']` in one feature and `['stops']` in another.
- Mixing snake_case and camelCase in app-level models without clear boundary mapping.
- Writing generated GraphQL files manually.

## Project Structure & Boundaries

### Complete Project Directory Structure

```text
DigiTransit-v2/
├── README.md
├── package.json
├── tsconfig.json
├── app.json
├── babel.config.js
├── metro.config.js
├── .gitignore
├── .env
├── .env.example
├── prettier.config.cjs
├── eslint.config.js
├── codegen.ts
├── graphql.config.yml
├── assets/
│   ├── icons/
│   ├── images/
│   └── fonts/
├── src/
│   ├── app/
│   │   ├── _layout.tsx
│   │   ├── map.tsx
│   │   ├── stops.tsx
│   │   ├── departures.tsx
│   │   ├── settings.tsx
│   │   └── stop/
│   │       └── [stopId].tsx
│   ├── core/
│   │   ├── api/
│   │   │   ├── graphql-client.ts
│   │   │   ├── query-client.ts
│   │   │   ├── query-keys.ts
│   │   │   └── request.ts
│   │   ├── config/
│   │   │   ├── env.ts
│   │   │   ├── polling.ts
│   │   │   └── constants.ts
│   │   ├── errors/
│   │   │   ├── app-error.ts
│   │   │   └── map-error.ts
│   │   ├── platform/
│   │   │   ├── maps/
│   │   │   │   ├── map-view.native.tsx
│   │   │   │   ├── map-view.web.tsx
│   │   │   │   └── map-types.ts
│   │   │   └── notifications/
│   │   │       ├── notifications.native.ts
│   │   │       ├── notifications.web.ts
│   │   │       └── scheduler.ts
│   │   ├── store/
│   │   │   ├── settings.store.ts
│   │   │   ├── ui.store.ts
│   │   │   └── migrations.ts
│   │   └── utils/
│   │       ├── date.ts
│   │       ├── distance.ts
│   │       └── guards.ts
│   ├── features/
│   │   ├── map/
│   │   │   ├── components/
│   │   │   │   ├── stop-marker.tsx
│   │   │   │   └── map-shell.tsx
│   │   │   ├── hooks/
│   │   │   │   └── use-map-stops.ts
│   │   │   ├── queries/
│   │   │   │   └── stops-nearby.graphql
│   │   │   └── map-screen.tsx
│   │   ├── stops/
│   │   │   ├── components/
│   │   │   │   ├── stops-list-item.tsx
│   │   │   │   └── home-stop-button.tsx
│   │   │   ├── hooks/
│   │   │   │   └── use-nearby-stops.ts
│   │   │   ├── queries/
│   │   │   │   └── stops-nearby.graphql
│   │   │   └── stops-screen.tsx
│   │   ├── departures/
│   │   │   ├── components/
│   │   │   │   ├── departure-card.tsx
│   │   │   │   └── departures-list.tsx
│   │   │   ├── hooks/
│   │   │   │   └── use-stop-departures.ts
│   │   │   ├── queries/
│   │   │   │   └── stop-departures.graphql
│   │   │   └── departures-screen.tsx
│   │   ├── settings/
│   │   │   ├── components/
│   │   │   │   ├── settings-form.tsx
│   │   │   │   └── polling-settings.tsx
│   │   │   ├── schema/
│   │   │   │   └── settings.schema.ts
│   │   │   └── settings-screen.tsx
│   │   └── notifications/
│   │       ├── hooks/
│   │       │   └── use-home-stop-notifications.ts
│   │       ├── services/
│   │       │   └── check-next-departure.ts
│   │       └── notifications-settings.tsx
│   ├── generated/
│   │   ├── graphql.ts
│   │   └── gql.ts
│   ├── shared/
│   │   ├── components/
│   │   │   ├── loading-state.tsx
│   │   │   ├── error-banner.tsx
│   │   │   └── empty-state.tsx
│   │   └── theme/
│   │       ├── colors.ts
│   │       ├── spacing.ts
│   │       └── typography.ts
│   └── types/
│       └── navigation.ts
├── scripts/
│   ├── codegen.sh
│   └── verify-env.ts
├── tests/
│   ├── setup/
│   │   └── test-setup.ts
│   ├── features/
│   │   ├── stops/
│   │   └── departures/
│   └── core/
│       ├── query-keys.test.ts
│       └── error-mapping.test.ts
└── .github/
    └── workflows/
        ├── ci.yml
        └── codegen-check.yml
```

### Architectural Boundaries

**API Boundaries:**
- External: DigiTransit GraphQL endpoint via `src/core/api/graphql-client.ts`.
- No internal backend API in MVP.
- All GraphQL operations authored in `src/features/**/queries/*.graphql`.
- Generated artifacts consumed from `src/generated/*` only.

**Component Boundaries:**
- Route-level UI in `src/app/` and feature `*-screen.tsx`.
- Reusable feature components remain inside feature folders.
- Cross-feature reusable UI only in `src/shared/components`.

**Service Boundaries:**
- API execution and query client setup centralized under `src/core/api`.
- Notification scheduling and platform behavior isolated under `src/core/platform/notifications`.
- No feature may instantiate ad-hoc GraphQL clients.

**Data Boundaries:**
- Server state: TanStack Query cache.
- Client persisted state: Zustand + AsyncStorage via `src/core/store`.
- Settings schema and migration boundaries enforced in settings schema + migrations files.

### Requirements to Structure Mapping

**Feature/FR Mapping:**
- FR1–FR11 (location/map interactions): `features/map`, `core/platform/maps`.
- FR12–FR16 (nearby stops list + home stop pin): `features/stops`, `core/store`.
- FR17–FR23 (departures): `features/departures`.
- FR24–FR30 (home stop notifications): `features/notifications`, `core/platform/notifications`.
- FR31–FR37 (settings persistence/config): `features/settings`, `core/store`, `core/config`.
- FR38–FR42 (error/edge handling): `core/errors`, `shared/components/error-banner.tsx`, `shared/components/empty-state.tsx`.

**Cross-Cutting Concerns:**
- Query policies and keys: `core/api/query-client.ts`, `core/api/query-keys.ts`.
- Error normalization: `core/errors/*`.
- Formatting/lint/codegen consistency: root config files + CI workflows.

### Integration Points

**Internal Communication:**
- Feature hooks use `core/api` request/query helpers.
- Navigation handoff through typed route params (`stopId`).
- Settings changes propagate via store selectors and query invalidation.

**External Integrations:**
- DigiTransit GraphQL via `graphql-request`.
- Native maps via `react-native-maps`; web map via `mapbox-gl`.
- Local notifications via Expo notifications/task APIs (native only meaningful in MVP).

**Data Flow:**
1. UI triggers feature hook.
2. Hook executes typed GraphQL op through query client.
3. Query result transformed minimally for render.
4. UI consumes loading/error/data via shared state components.
5. Settings updates persist to AsyncStorage and update query/polling behavior.

### File Organization Patterns

**Configuration Files:**
- All root-level tool configs (`prettier`, `eslint`, `codegen`, env examples) are authoritative single sources.

**Source Organization:**
- Feature-first modules with strict shared/core boundaries.
- Generated code never manually edited.

**Test Organization:**
- Unit/integration tests in `tests/` and co-located `*.test.ts(x)` where useful.

**Asset Organization:**
- Static assets under `assets/` with typed references from feature/shared modules.

### Development Workflow Integration

**Development Server Structure:**
- `expo start` for native targets, `expo start --web` for localhost web validation only.

**Build Process Structure:**
- Pre-build checks: `prettier --check`, lint, typecheck, codegen verification.
- EAS profiles define build variants for mobile distribution/testing.

**Deployment Structure:**
- Mobile-focused build/release structure.
- No production web hosting path in MVP architecture.

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:**
All core decisions are mutually compatible. Expo/TypeScript stack, GraphQL Codegen typed operations, TanStack Query orchestration, platform map split, and NativeWind styling are coherent and implementable without backend dependencies.

**Pattern Consistency:**
Implementation patterns support architecture decisions: generated-type usage, query key conventions, AppError normalization, formatting/lint/typecheck enforcement, and utility-class styling conventions are aligned.

**Structure Alignment:**
Project structure supports feature boundaries and cross-cutting modules. Route placement in `src/app` aligns with current repository convention.

### Requirements Coverage Validation ✅

**Feature Coverage:**
All FR groups (map, stops, departures, settings, notifications, error/edge cases) are mapped to concrete feature/core modules.

**Functional Requirements Coverage:**
All 42 FRs are architecturally supported, including polling, permission handling, home stop pinning, and graceful API failure behavior.

**Non-Functional Requirements Coverage:**
Performance, privacy, reliability, accessibility, and integration NFRs are covered through query strategy, local-only persistence policy, error handling rules, and platform boundary decisions.

### Implementation Readiness Validation ✅

**Decision Completeness:**
Critical and important decisions are documented clearly; deferred scope is explicit.

**Structure Completeness:**
Complete target-state project tree and boundary mapping exist, with clear ownership lines for `src/app`, `features`, `core`, `generated`, and `shared`.

**Pattern Completeness:**
Conflict-prone areas are covered: naming, structure, state, query keys, error/loading behavior, styling conventions, and generated-code ownership.

### Gap Analysis Results

**Critical Gaps:** None.

**Important Gaps (recommended):**
- Add explicit package scripts for formatter/codegen checks.
- Clarify whether shared stops-nearby query is single-source or duplicated by feature intent.
- Mark current-vs-target route files in implementation stories to avoid confusion during migration from starter scaffold.
- Pin NativeWind strategy (stable vs preview) before implementation begins.

**Nice-to-Have Gaps:**
- Add a short “architecture conventions” README in `src/` for quick agent onboarding.
- Add a query key factory reference file with examples for each feature.

### Validation Issues Addressed

- Corrected route root from `app/` to `src/app` to match actual repository.
- Confirmed web deployment is local-only testing scope (no hosting architecture required).
- Added styling architecture decision: NativeWind for Tailwind-style RN/UI authoring.
- Added tooling implication: include Tailwind + NativeWind config files and formatter integration (`prettier-plugin-tailwindcss`).

### Architecture Completeness Checklist

**✅ Requirements Analysis**
- [x] Project context analyzed
- [x] Scale/constraints identified
- [x] Cross-cutting concerns mapped

**✅ Architectural Decisions**
- [x] Critical decisions documented
- [x] Stack and integration patterns defined
- [x] Scope/deferred items explicit

**✅ Implementation Patterns**
- [x] Naming/structure/state/error/loading/style patterns defined
- [x] Enforcement rules documented

**✅ Project Structure**
- [x] Complete target-state tree defined
- [x] Boundaries and integration points mapped
- [x] FR-to-structure mapping completed

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION

**Confidence Level:** High

**Key Strengths:**
- Clear stack and boundaries
- Strong consistency rules for multi-agent implementation
- Explicit scope control and fallback handling

**Areas for Future Enhancement:**
- Multi-city support and web push
- Expanded observability and analytics after MVP stability

### Implementation Handoff

**AI Agent Guidelines:**
- Follow architectural decisions and consistency rules exactly.
- Treat generated GraphQL artifacts as read-only outputs.
- Enforce Prettier/lint/typecheck/codegen checks before merge.
- Follow NativeWind className conventions consistently.

**First Implementation Priority:**
1) Add formatter/codegen scripts and enforcement.
2) Establish codegen pipeline + typed GraphQL query layer.
3) Install and configure NativeWind + Tailwind integration.
