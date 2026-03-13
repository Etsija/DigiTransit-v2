---
project_name: 'DigiTransit-v2'
user_name: 'Jyrki'
date: '2026-03-13T00:00:00+02:00'
sections_completed: ['technology_stack', 'language_rules', 'framework_rules', 'testing_rules', 'quality_rules', 'workflow_rules', 'anti_patterns']
status: 'complete'
rule_count: 80
optimized_for_llm: true
existing_patterns_found: 8
---

# Project Context for AI Agents

_This file contains critical rules and patterns that AI agents must follow when implementing code in this project. Focus on unobvious details that agents might otherwise miss._

---

## Technology Stack & Versions

- Expo app using `expo ~55.0.3`, `expo-router ~55.0.3`, `react 19.2.0`, and `react-native 0.83.2`.
- TypeScript uses `strict: true`; preserve strict typing and the `@/*` and `@/assets/*` path aliases from `tsconfig.json`.
- Server-state data fetching uses `@tanstack/react-query ^5.90.21`; shared query keys live in `src/core/api/query-keys.ts`.
- Client-side persisted state uses `zustand ^5.0.11` with `zustand/vanilla` stores and middleware shims under `src/core/store/`.
- Runtime validation and sanitization use `zod ^4.3.6`; settings and persisted payloads should be normalized through schema helpers rather than ad hoc parsing.
- GraphQL access uses `graphql-request ^7.4.0`; GraphQL types are generated with `@graphql-codegen/cli ^6.1.3` into `src/generated/`.
- Native map rendering uses `react-native-maps 1.26.20`; web map rendering uses `mapbox-gl ^3.19.1` through platform adapters.
- Styling uses NativeWind `^4.2.2`, Tailwind CSS `^3.4.19`, and shared theme tokens/components under `src/shared/`.
- Tests run on `jest ~29.7.0` with `jest-expo ~55.0.9`; generated files under `src/generated/` are excluded from tests.
- Linting/formatting uses `eslint ^9.39.4`, `eslint-config-expo ~55.0.0`, `prettier ^3.8.1`, `@ianvs/prettier-plugin-sort-imports ^4.7.1`, and `prettier-plugin-tailwindcss ^0.7.2`.

Version-sensitive constraints:
- Keep Expo, Expo Router, React, and React Native versions aligned with the current Expo SDK 55 stack unless the whole SDK is intentionally upgraded.
- After editing any `.graphql` file, run codegen so `src/generated/` stays in sync.
- Public runtime configuration is expected through Expo public env vars such as `EXPO_PUBLIC_DIGITRANSIT_API_KEY`, `EXPO_PUBLIC_DIGITRANSIT_API_URL`, and `EXPO_PUBLIC_MAPBOX_PUBLIC_TOKEN`.

## Critical Implementation Rules

### Language-Specific Rules

- Preserve strict TypeScript compatibility at all times; do not add `any`, weaken types, or bypass nullability without a concrete runtime reason.
- Use the configured path aliases (`@/*`, `@/assets/*`) instead of deep relative imports for app code.
- Prefer named exports for reusable helpers, hooks, types, and store utilities unless the file is a route/component entry point that already uses a default export convention.
- Model external and persisted data defensively: validate or sanitize GraphQL payloads, storage payloads, and user-entered values before they become app state.
- Follow the existing normalization pattern: convert nullable/partial API payloads into app-safe domain objects and skip malformed rows instead of returning partial data.
- Keep transport/domain types narrow and explicit; reuse existing unions such as `TransportMode` instead of introducing loose string types.
- Use `null` intentionally where the codebase expects it for "known empty" values; do not silently swap between `undefined` and `null` in persisted/domain models.
- For persisted settings updates, route changes through schema-backed helpers such as `sanitizeSettingsPatch` rather than mutating store state with unchecked values.
- Keep async APIs promise-based and use `async`/`await` for clarity; match the current style of returning typed promises from data and platform helpers.
- Convert thrown infrastructure errors into typed app-level errors at the boundary layer, following the `requestGraphql` and `mapToAppError` pattern.
- Preserve generated-code boundaries: do not hand-edit files under `src/generated/`, and treat generated GraphQL types/documents as source of truth after codegen.

### Framework-Specific Rules

- Keep Expo Router route files under `src/app/`; route entry points should stay thin and delegate real UI/logic to `src/features/...` screens or hooks.
- Preserve the root provider pattern in `src/app/_layout.tsx`: app-wide providers such as `QueryClientProvider` and theming belong at the layout boundary, not scattered through feature screens.
- Follow the feature-oriented structure already in use:
  - `src/app` for routes
  - `src/features` for screen logic, hooks, queries, and feature-local components
  - `src/core` for cross-cutting infrastructure
  - `src/shared` for reusable UI primitives, icons, and theme tokens
- Use React Query for remote/server state and network lifecycles; do not replace query-driven data with ad hoc `useEffect` + local state fetch flows.
- Build stable query keys through `src/core/api/query-keys.ts`; avoid inline array keys that drift from the shared cache contract.
- Read user-configurable polling/radius behavior from the settings store instead of hardcoding fetch intervals or search distances inside hooks.
- Use Zustand vanilla stores plus selector hooks for persisted client state; preserve singleton store access patterns like `getSettingsStore()` / `useSettingsStore(...)`.
- Keep platform divergence behind dedicated adapters (`*.native.tsx`, `*.web.tsx`) or platform modules in `src/core/platform/`; avoid scattering platform checks across screen components unless there is no cleaner boundary.
- Reuse shared presentation primitives from `src/shared/components` and `src/shared/theme` before creating new one-off UI patterns.
- For GraphQL, add or update `.graphql` documents inside feature folders, then consume the generated document/types from `@/generated/graphql` instead of handwritten query strings.
- Keep screen hooks focused on data normalization and state orchestration; keep rendering concerns in components/screens rather than burying JSX inside infrastructure helpers.
- Match existing React style: plain function components, hook composition, and direct readable logic over premature memoization or abstraction.

### Testing Rules

- Put tests under `tests/` and mirror the runtime area they cover (`tests/app`, `tests/features`, `tests/core`, `tests/shared`, `tests/components`).
- Name test files with the `*.test.ts` or `*.test.tsx` convention already used across the repo.
- Prefer behavior-focused tests with explicit assertions over snapshots; this codebase verifies rendered content, accessibility labels, state transitions, query behavior, and edge cases directly.
- Test both happy-path and failure-path normalization for API-derived data; malformed or incomplete GraphQL rows should be skipped or fail safely, not crash.
- When testing React Query hooks/components, use `QueryClientProvider` test wrappers and assert against shared query-key and polling contracts where relevant.
- When testing Zustand-backed state, exercise hydration, migration, persistence boundaries, and invalid persisted payload handling rather than only in-memory updates.
- Mock platform/infrastructure boundaries at the edge:
  - AsyncStorage in shared Jest setup
  - Expo/location/notifications adapters in feature or core tests as needed
  - React Query hooks only when testing query-option construction rather than end-to-end hook behavior
- Preserve platform split coverage where behavior differs between native and web, especially for maps and notifications adapters.
- Validate accessibility and interaction contracts explicitly for shared UI components, including labels, live regions, long-press behavior, and minimum touch targets.
- Keep generated code out of tests; `src/generated/` is excluded and should be exercised through consuming hooks/helpers instead of direct generated-file tests.
- For route tests, verify canonical navigation behavior and typed href contracts rather than only rendering route stubs.
- Prefer deterministic fixtures and fixed dates/times for departure, notification, and formatting logic so tests do not depend on wall-clock timing.

### Code Quality & Style Rules

- Follow existing file naming conventions:
  - kebab-case for most files (`settings-screen.tsx`, `use-nearby-stops.ts`)
  - framework/platform suffixes where needed (`map-view.web.tsx`, `map-view.native.tsx`)
  - dynamic Expo Router route files in bracket syntax (`[stopId].tsx`)
- Use PascalCase for React component names, `use...` for hooks, and clear noun/verb naming for utilities and store helpers.
- Keep files in the architectural layer they belong to; do not move feature logic into `src/app` or shared infrastructure into feature folders without a strong reason.
- Reuse design tokens, icons, and shared UI primitives from `src/shared/` before adding new visual constants or duplicate component shells.
- Keep comments sparse and high-value; prefer self-explanatory code and only add comments where the intent or constraint would otherwise be hard to infer.
- Respect generated/source boundaries:
  - never hand-edit `src/generated/`
  - keep authored GraphQL operations in feature-local `.graphql` files
  - keep platform shims/adapters in `src/core/platform` or `src/core/store`
- Maintain import hygiene consistent with Prettier/import-sorting automation; avoid manual reordering churn that conflicts with formatter output.
- Keep modules focused: hooks handle orchestration, utilities handle pure transforms, screens/components handle presentation.
- Prefer extending existing theme and component contracts over introducing one-off inline styles, magic numbers, or duplicate transport/status mappings.
- Preserve explicit accessibility-oriented props and labels in UI code; they are part of the quality bar, not optional polish.
- When adding new settings, storage fields, or persisted records, update schemas, migration helpers, storage keys, and tests together so the persistence contract stays coherent.

### Development Workflow Rules

- Treat `gitbutler/workspace` as the working branch context and use `but` only for read-only inspection such as branch status, commit information, and diffs.
- Do not use `but` for write operations such as branching, staging, committing, rebasing-equivalent history edits, or pushing; the user handles commit workflows manually.
- Raw `git` is acceptable for read-only inspection commands such as `git log` or `git blame`, but do not perform write-side git operations unless the user explicitly asks for them.
- Respect the possibility of multiple applied GitButler branches; do not assume all working tree changes belong to a single branch.
- Before handing off GraphQL document changes, regenerate code so generated artifacts match authored operations.
- The main verification workflow is centered on:
  - `pnpm lint`
  - `pnpm format:check`
  - `pnpm typecheck`
  - `pnpm test:ci`
  - `pnpm codegen:check`
  - or the aggregate `pnpm check`
- When environment-dependent features are touched, preserve the README-documented env contract (`.env`, EAS public variables, map tokens/API keys) and avoid introducing hidden configuration requirements.
- For Android/iOS native-map key changes or config-plugin-sensitive env updates, expect rebuild requirements rather than assuming hot reload will pick them up.
- Keep route, GraphQL, persistence, and adapter changes synchronized with their tests; this codebase relies on contract tests to catch regressions at those boundaries.

### Critical Don't-Miss Rules

- Do not issue nearby-stop or departure queries when required inputs are missing; this codebase prefers explicit disabled queries and safe fallback keys over "best effort" requests with invalid params.
- Do not treat fallback or placeholder coordinates as real live device coordinates for network requests; permission-denied map fallback state must stay visually usable without silently driving live nearby-stop fetching.
- Never trust GraphQL payload completeness; required fields may be missing and malformed rows must be skipped or surfaced as controlled validation failures.
- Do not hand-edit `src/generated/`; change the source `.graphql` documents and rerun codegen instead.
- Do not bypass schema sanitization or migration logic when touching persisted settings, home-stop state, or reminder records; invalid persisted data must fail closed safely.
- Keep the canonical storage split intact:
  - settings persist through the settings store contract
  - home-stop canonical storage uses its dedicated helpers and keys
  - reminder persistence follows its own store contract
- Do not silently degrade typed transport or status mappings into arbitrary strings or numbers; reuse the shared mapping helpers so badges, icons, and accessibility text stay consistent.
- Do not break the web/native adapter boundary for maps and notifications; unsupported web behavior is often a deliberate hard no-op or fallback surface, not a missing implementation.
- Missing public env configuration must produce explicit, factual UX or fallback behavior rather than hidden runtime failure.
- Preserve the accessibility contract:
  - keep minimum touch-target behavior
  - keep explicit labels and live regions
  - do not remove long-press semantics that distinguish pinning or reminder actions from normal navigation
- Keep previous visible data on background refresh failures where the existing screens do so; avoid regressing into full-screen empty or error flicker when stale-but-valid data can remain on screen.
- When adding settings or feature flags that affect polling, reminders, or permissions, ensure both UI state and runtime side effects stay synchronized across hydration, permission changes, and app relaunch.

---

## Usage Guidelines

**For AI Agents:**

- Read this file before implementing any code.
- Follow all rules exactly as documented.
- When in doubt, prefer the more restrictive option.
- Update this file if new project-specific patterns emerge.

**For Humans:**

- Keep this file lean and focused on agent needs.
- Update it when the stack, architecture, or workflow rules change.
- Remove rules that become obsolete or too obvious to be useful.

Last Updated: 2026-03-13
