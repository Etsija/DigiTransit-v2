# Story 1.1: GraphQL Codegen Pipeline & Core API Infrastructure

Status: done

## Story

As a developer,
I want a type-safe GraphQL codegen pipeline and TanStack Query client configured against the DigiTransit Seutu+ (varely) v2 endpoint with API key authentication,
so that all API data fetching is typed at compile time, authenticated, deduplicated, and resilient to transient failures.

## Acceptance Criteria

1. **Given** a valid `EXPO_PUBLIC_DIGITRANSIT_API_KEY` is set in `.env`
   **When** `pnpm codegen` is run
   **Then** `src/generated/graphql.ts` and `src/generated/gql.ts` are generated from the DigiTransit varely v2 GTFS schema
   **And** the generated files contain fully typed operation result and variable types

2. **Given** the app launches
   **When** any component mounts
   **Then** a `QueryClient` is available via React context (`QueryClientProvider` wraps the app root in `src/app/_layout.tsx`)

3. **Given** the `graphql-request` client is initialised
   **When** any API request is made
   **Then** the `digitransit-subscription-key` header is included on every request using the key from `EXPO_PUBLIC_DIGITRANSIT_API_KEY`
   **And** the key is never hardcoded in source — only read from env config

4. **Given** a GraphQL request fails with a network error
   **When** TanStack Query retries
   **Then** exponential backoff is applied, max 3 retries before the error surfaces (NFR9)
   **And** no duplicate concurrent requests are issued for the same query key (NFR14)

5. **Given** the API returns a rate-limit (403) response
   **When** TanStack Query handles it
   **Then** retry is delayed a minimum of 30 seconds, max 3 retries per polling cycle (NFR15)

6. **Given** any API request throws
   **When** caught at the query boundary
   **Then** normalised into `AppError { kind, message, retryable, cause? }` with kind `network | graphql | permission | empty | unknown` (NFR8)

7. **Given** the CI pipeline runs
   **When** generated files are stale (`.graphql` files changed but codegen not re-run)
   **Then** `pnpm codegen:check` fails the build

8. **Given** `.env` is gitignored
   **When** the repo is cloned fresh
   **Then** `.env.example` exists with `EXPO_PUBLIC_DIGITRANSIT_API_KEY=` as a placeholder and setup instructions

## Tasks / Subtasks

- [x] **Task 1: Install dependencies** (AC: 1, 2, 4)
  - [x] Install runtime deps: `@tanstack/react-query`, `graphql-request`, `graphql`
  - [x] Install dev deps: `@graphql-codegen/cli`, `@graphql-codegen/client-preset`, `@parcel/watcher`
  - [x] Verify no peer-dependency conflicts with Expo 55 / React 19

- [x] **Task 2: Environment & API config** (AC: 3, 8)
  - [x] Create `.env` (gitignored) with `EXPO_PUBLIC_DIGITRANSIT_API_KEY=<your-key>`
  - [x] Create `.env.example` with `EXPO_PUBLIC_DIGITRANSIT_API_KEY=` and a comment pointing to the DigiTransit portal
  - [x] Create `src/core/config/env.ts` — export `DIGITRANSIT_API_URL` and `DIGITRANSIT_API_KEY` from `process.env`
  - [x] Add README instructions for the env setup

- [x] **Task 3: Error model** (AC: 6)
  - [x] Create `src/core/errors/app-error.ts` — `AppError` type + `mapToAppError()` normaliser
  - [x] Create `src/core/errors/map-error.ts` — re-export + helper for mapping GraphQL error arrays

- [x] **Task 4: GraphQL client** (AC: 3)
  - [x] Create `src/core/api/graphql-client.ts` — `GraphQLClient` instance with `digitransit-subscription-key` header

- [x] **Task 5: TanStack Query client** (AC: 2, 4, 5)
  - [x] Create `src/core/api/query-client.ts` — `QueryClient` with retry/backoff policy (3 retries, exponential backoff, 30s min for 403)
  - [x] Create `src/core/api/query-keys.ts` — typed tuple key factory for `stops.nearby` and `departures.stop`

- [x] **Task 6: Wire QueryClientProvider** (AC: 2)
  - [x] Update `src/app/_layout.tsx` to wrap with `<QueryClientProvider client={queryClient}>`

- [x] **Task 7: Codegen setup** (AC: 1, 7)
  - [x] Create `codegen.ts` at project root pointing at varely v2 endpoint with auth header
  - [x] Create stub `.graphql` files (see Dev Notes for v1-reference field shapes):
    - `src/features/stops/queries/stops-nearby.graphql` — `StopsNearbyQuery`
    - `src/features/departures/queries/stop-departures.graphql` — `StopDeparturesQuery`
  - [x] Run `pnpm codegen` — resolve any v2 field-name mismatches until it succeeds
  - [x] Verify `src/generated/graphql.ts` and `src/generated/gql.ts` are produced
  - [x] Add `pnpm codegen` and `pnpm codegen:check` scripts to `package.json`
  - [x] Add `src/generated/` to `.gitignore`

- [x] **Task 8: CI — codegen gate** (AC: 7)
  - [x] Add a `codegen:check` step to `.github/workflows/ci.yml` after typecheck

- [x] **Task 9: Tests** (AC: 4, 6)
  - [x] `tests/core/query-keys.test.ts` — verify key factory shapes
  - [x] `tests/core/error-mapping.test.ts` — verify `mapToAppError` classifies network / graphql / unknown errors correctly

## Dev Notes

### Current Repo State (IMPORTANT — don't reinvent what exists)

The repo is the **Expo default starter** with these extras already in place:

| Already done | Detail |
|---|---|
| Expo SDK 55, React 19, RN 0.83.2 | `package.json` |
| pnpm 10.29.3 | package manager — always use `pnpm`, never `npm` or `yarn` |
| NativeWind v4 + Tailwind v3 | babel.config.js already has `nativewind/babel` preset; `global.css` exists |
| TypeScript strict mode | `tsconfig.json` with `@/*` → `./src/*` path alias |
| ESLint + Prettier + CI | `eslint.config.js`, `prettier.config.cjs` (check root), CI at `.github/workflows/ci.yml` |
| react-native-gesture-handler, react-native-reanimated | already in `package.json` |
| expo-glass-effect | already installed |
| `src/app/_layout.tsx` | **currently** wraps `<AnimatedSplashOverlay>` and `<AppTabs>` — you must keep both and ADD `<QueryClientProvider>` around/inside |
| `src/constants/theme.ts` | basic Colors/Fonts/Spacing tokens — **do NOT rename/move this file** in this story (that belongs to Story 1.4) |
| `src/app/index.tsx`, `src/app/explore.tsx` | still the scaffold screens — **leave them as-is** (Story 1.3 migrates navigation) |
| `src/components/app-tabs.tsx` | uses `NativeTabs` from `expo-router/unstable-native-tabs` — leave as-is |

**Files that do NOT yet exist** (create them in this story):
- `codegen.ts`
- `.env` / `.env.example`
- `src/core/` directory tree (entirely new)
- `src/generated/` directory (codegen will create it)
- `src/features/stops/queries/` and `src/features/departures/queries/` (create only the `.graphql` files; the rest of those feature folders will be populated in later stories)
- `tests/core/`

---

### GraphQL Codegen Setup

**`codegen.ts` structure:**

```ts
import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: {
    'https://api.digitransit.fi/routing/v2/varely/gtfs/v1': {
      headers: {
        'digitransit-subscription-key': process.env.EXPO_PUBLIC_DIGITRANSIT_API_KEY ?? '',
      },
    },
  },
  documents: ['src/**/*.graphql'],
  generates: {
    'src/generated/': {
      preset: 'client',
      presetConfig: {
        gqlTagName: 'gql',
      },
    },
  },
};

export default config;
```

**`pnpm codegen:check`** should use the `--check` flag: `graphql-codegen --check`

**`src/generated/` must be in `.gitignore`** — generated files are never committed.

---

### V1 Reference Query Shapes (draft `.graphql` files)

These are the **v1 Kotlin app query shapes** for reference. Use them as a starting point, then adjust based on what the v2 GTFS schema actually accepts (codegen will fail with type errors on invalid fields — fix them).

**`src/features/stops/queries/stops-nearby.graphql`** (start from v1 StopsByRadius):

```graphql
query StopsNearbyQuery($lat: Float!, $lon: Float!, $radius: Int!) {
  stopsByRadius(lat: $lat, lon: $lon, radius: $radius) {
    edges {
      node {
        distance
        stop {
          gtfsId
          name
          code
          zoneId
          vehicleType
          parentStation {
            name
          }
          patterns {
            name
            directionId
            stops {
              gtfsId
              code
              name
            }
          }
        }
      }
    }
  }
}
```

**`src/features/departures/queries/stop-departures.graphql`** (start from v1 StopArrDep):

```graphql
query StopDeparturesQuery($id: String!) {
  stop(id: $id) {
    name
    stoptimesWithoutPatterns {
      scheduledDeparture
      realtimeDeparture
      realtime
      realtimeState
      serviceDay
      headsign
      trip {
        route {
          shortName
        }
      }
    }
  }
}
```

> ⚠️ **V2 GTFS field-name differences to watch for:**
> - `vehicleType` may be `transportMode` or `mode` in the v2 GTFS schema
> - `stoptimesWithoutPatterns` may be `stoptimes` or renamed in v2
> - `zoneId` may be `zoneIds` (array) in v2
> - `patterns[].name` may require accessing via route
> - If a field doesn't exist, check the introspection schema or DigiTransit API playground at `https://api.digitransit.fi/graphiql/varely/v2/gtfs/v1`
> - Document any field substitutions in a comment at the top of the `.graphql` file
> - **Story 1.6 will do live validation with real data** — this story just needs codegen to succeed (schema-valid queries)

---

### `src/core/config/env.ts`

```ts
export const DIGITRANSIT_API_URL =
  'https://api.digitransit.fi/routing/v2/varely/gtfs/v1';

export const DIGITRANSIT_API_KEY =
  process.env.EXPO_PUBLIC_DIGITRANSIT_API_KEY ?? '';
```

Never expose the key anywhere else — all modules must import from here.

---

### `src/core/errors/app-error.ts`

```ts
export type AppErrorKind = 'network' | 'graphql' | 'permission' | 'empty' | 'unknown';

export interface AppError {
  kind: AppErrorKind;
  message: string;
  retryable: boolean;
  cause?: unknown;
}

export function mapToAppError(error: unknown): AppError {
  // Network errors (fetch failed, DNS, etc.)
  // GraphQL errors (response.errors array non-empty)
  // 403 → map to kind 'permission', retryable: false (caller decides on 30s backoff)
  // Empty results → caller maps explicitly to kind 'empty'
  // Everything else → 'unknown'
}
```

---

### `src/core/api/query-client.ts` — Retry / Backoff Policy

Key requirements from NFR9, NFR15:
- Max **3 retries** for network errors (exponential backoff)
- **403 responses**: min 30-second delay, max 3 retries — detect via `ClientError` from `graphql-request` checking `response.status`
- No retry on 4xx other than 403 (they are non-retryable)

```ts
import { QueryClient } from '@tanstack/react-query';

function getRetryDelay(attempt: number, error: unknown): number {
  // If 403 rate-limit → 30_000ms minimum
  // Otherwise → exponential: Math.min(1000 * 2 ** attempt, 30_000)
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: getRetryDelay,
      staleTime: 0,
      refetchOnWindowFocus: false,
    },
  },
});
```

`graphql-request` throws a `ClientError` on HTTP errors — check `error instanceof ClientError && error.response.status === 403`.

---

### `src/core/api/query-keys.ts` — Tuple Factory

```ts
export const queryKeys = {
  stops: {
    nearby: (params: { lat: number; lon: number; radius: number }) =>
      ['stops', 'nearby', params] as const,
  },
  departures: {
    stop: (stopId: string) =>
      ['departures', 'stop', stopId] as const,
  },
} as const;
```

All hooks across the app MUST use this factory — never inline string arrays.

---

### `src/app/_layout.tsx` — QueryClientProvider

Wrap the existing tree. The `queryClient` singleton must be imported from `src/core/api/query-client.ts`. Do not create a new `QueryClient` inline.

```tsx
// Existing imports stay. Add:
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/core/api/query-client';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AnimatedSplashOverlay />
        <AppTabs />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
```

---

### CI Update — Codegen Check

Add to `.github/workflows/ci.yml` after the `Typecheck` step:

```yaml
- name: Codegen check
  run: pnpm codegen:check
  env:
    EXPO_PUBLIC_DIGITRANSIT_API_KEY: ${{ secrets.DIGITRANSIT_API_KEY }}
```

Note: The GitHub Actions secret `DIGITRANSIT_API_KEY` must be set in repo settings for this step to work. Add a comment in the workflow file documenting this requirement.

---

### Package Scripts to Add

```json
"codegen": "graphql-codegen",
"codegen:check": "graphql-codegen --check"
```

---

### Testing Standards

- Test framework: none installed yet — **use `jest` + `@testing-library/react-native`** if the project has tests already; if not, create only the test files and add a TODO comment that test infrastructure setup is part of Epic 6 / Story 6.2. Do NOT block this story on test infrastructure.
- Check `package.json` devDependencies for existing jest setup before attempting to run tests.
- If no test runner is present, create the test files with the correct shape but note they are pending a jest setup.

---

### Project Structure Notes

- This story creates `src/core/` from scratch — the entire directory is new
- Create `src/features/stops/queries/` and `src/features/departures/queries/` with only the `.graphql` files — no other files in those feature folders yet
- `src/generated/` is created by codegen — add it to `.gitignore`
- Path alias `@/core/...` resolves via the existing `tsconfig.json` paths config (`@/*` → `./src/*`)
- The existing `src/components/`, `src/hooks/`, `src/constants/` scaffold structure stays untouched in this story

### References

- Architecture: `_bmad-output/planning-artifacts/architecture.md` — API Patterns, Query Key Factory, AppError model, Project Structure
- Epics: `_bmad-output/planning-artifacts/epics.md` — Story 1.1 AC, v1 query field reference, NFR9/NFR14/NFR15/NFR16
- DigiTransit API playground: `https://api.digitransit.fi/graphiql/varely/v2/gtfs/v1` (use for schema introspection when fixing v2 field names)
- DigiTransit API key registration: `https://portal-api.digitransit.fi`
- TanStack Query v5 docs: retry/backoff configuration
- graphql-request ClientError: used for HTTP status code detection in retry logic

## Dev Agent Record

### Agent Model Used

_To be filled by dev agent_

### Debug Log References

- `pnpm add --store-dir /home/jyrki/.local/share/pnpm/store/v10 @tanstack/react-query graphql-request graphql`
- `pnpm add -D --store-dir /home/jyrki/.local/share/pnpm/store/v10 @graphql-codegen/cli @graphql-codegen/client-preset @parcel/watcher`
- `pnpm add -D --store-dir /home/jyrki/.local/share/pnpm/store/v10 jest-expo@~55.0.9 jest@~29.7.0 @types/jest@29.5.14 @testing-library/react-native`
- `pnpm codegen`
- `pnpm codegen:check`
- `pnpm test:ci`
- `pnpm check`
- `pnpm typecheck`
- `pnpm lint`

### Completion Notes List

- Added env/config plumbing, a shared GraphQL client, AppError normalization, TanStack Query retry policy, and tuple-based query keys.
- Wrapped the app root with `QueryClientProvider` while preserving the existing theme provider, splash overlay, and tabs.
- Added GraphQL Code Generator config and schema-valid stop/departure queries, then generated `src/generated/graphql.ts` and `src/generated/gql.ts` against the provided Finland GTFS endpoint.
- Added CI coverage for stale generated artifacts with `pnpm codegen:check`.
- Added a real Expo/Jest test environment with React Native Testing Library, executable unit tests for error mapping/query keys/query retry policy, and a component test for `ThemedView`.
- Added `pnpm test` / `pnpm test:ci` scripts and included tests in the CI workflow.

### File List

- `.env`
- `.env.example`
- `.github/workflows/ci.yml`
- `.gitignore`
- `README.md`
- `codegen.ts`
- `eslint.config.js`
- `jest.config.cjs`
- `package.json`
- `pnpm-lock.yaml`
- `src/app/_layout.tsx`
- `src/core/api/graphql-client.ts`
- `src/core/api/query-client.ts`
- `src/core/api/query-keys.ts`
- `src/core/config/env.ts`
- `src/core/errors/app-error.ts`
- `src/core/errors/map-error.ts`
- `src/features/departures/queries/stop-departures.graphql`
- `src/features/stops/queries/stops-nearby.graphql`
- `src/generated/fragment-masking.ts`
- `src/generated/gql.ts`
- `src/generated/graphql.ts`
- `src/generated/index.ts`
- `tests/core/error-mapping.test.ts`
- `tests/core/query-client.test.ts`
- `tests/core/query-keys.test.ts`
- `tests/components/themed-view.test.tsx`
- `tests/setup/jest-setup.ts`
- `tests/setup/style-mock.js`
- `tsconfig.json`

## Change Log

- 2026-03-08: Implemented Story 1.1 core API infrastructure, GraphQL codegen pipeline, env wiring, retry/error handling, CI codegen gate, and placeholder tests.
- 2026-03-08: Upgraded placeholder tests to an executable Expo/Jest test environment, added unit/component tests, and added CI test execution.
