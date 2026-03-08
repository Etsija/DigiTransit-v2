# Story 1.2: Settings Store & App Configuration Foundation

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want a type-safe settings store with AsyncStorage persistence and sensible defaults,
so that all user preferences are available app-wide from first launch with no configuration required.

## Acceptance Criteria

1. **Given** the app is launched for the first time
   **When** the settings store is accessed
   **Then** all 7 settings return defaults: search radius 250m, location update interval 20s, stops polling interval 20s, departures polling interval 10s, home stop null, push notifications off, notification lead time 10min

2. **Given** a user changed a setting in a previous session
   **When** the app launches again
   **Then** the changed value is restored correctly from AsyncStorage

3. **Given** a corrupted or outdated settings entry exists in AsyncStorage
   **When** the app loads settings
   **Then** it migrates or resets to defaults without crashing, using the `settingsVersion` field

4. **Given** any setting value is read from the store
   **When** it is used in a feature
   **Then** it has been validated against the Zod schema and falls back to the default if invalid

## Tasks / Subtasks

- [x] **Task 1: Add settings persistence dependencies and constants** (AC: 1, 2, 3, 4)
  - [x] Add runtime dependencies for `zustand`, `@react-native-async-storage/async-storage`, and `zod`
  - [x] Create shared storage constants for `app.settings.v1` and `app.homeStop.v1`
  - [x] Verify the dependency choices fit the Expo 55 / React 19 setup already in the repo

- [x] **Task 2: Define the validated settings model** (AC: 1, 4)
  - [x] Create `src/features/settings/schema/settings.schema.ts`
  - [x] Define the full settings schema with defaults for all 7 persisted values
  - [x] Export inferred TypeScript types and a default settings object from the schema module

- [x] **Task 3: Implement persistence versioning and migration helpers** (AC: 2, 3, 4)
  - [x] Create `src/core/store/migrations.ts`
  - [x] Add a `settingsVersion` strategy for persisted state upgrades
  - [x] Implement migration/reset behavior for corrupted or incompatible persisted payloads

- [x] **Task 4: Implement the Zustand settings store** (AC: 1, 2, 3, 4)
  - [x] Create `src/core/store/settings.store.ts`
  - [x] Use Zustand `persist` middleware with AsyncStorage-backed JSON storage
  - [x] Expose validated state, update actions, reset action, and hydration status needed by later stories
  - [x] Ensure persisted payloads are validated through the Zod schema before entering app state

- [x] **Task 5: Add automated tests for defaults, rehydration, and invalid persisted state** (AC: 1, 2, 3, 4)
  - [x] Add tests for first-launch default values
  - [x] Add tests for successful rehydration from persisted settings
  - [x] Add tests for corrupted payload fallback / migration behavior
  - [x] Add tests proving invalid per-field values fall back to defaults instead of crashing

## Dev Notes

### Story Foundation

- Story 1.2 establishes the app-wide persisted settings layer for later polling, home-stop, and notification stories.
- The epic explicitly requires a type-safe settings store with AsyncStorage persistence, sensible defaults, schema validation, and versioned migration behavior.
- The architecture document already chooses Zustand for client state, AsyncStorage for local persistence, and Zod for boundary validation. This story is where those decisions become the first real store implementation.

### Technical Requirements

- Persist exactly these 7 values in the settings domain:
  - `searchRadiusMeters`: default `250`
  - `locationUpdateIntervalSeconds`: default `20`
  - `stopsPollingIntervalSeconds`: default `20`
  - `departuresPollingIntervalSeconds`: default `10`
  - `homeStop`: default `null`
  - `pushNotificationsEnabled`: default `false`
  - `notificationLeadTimeMinutes`: default `10`
- Persisted state must include a `settingsVersion` field so incompatible stored payloads can be migrated or discarded safely.
- Store reads must never trust AsyncStorage blindly. Hydrated data must be parsed through the Zod schema and fall back to defaults when invalid.
- The story’s technical notes call out these target files explicitly:
  - `src/core/store/settings.store.ts`
  - `src/core/store/migrations.ts`
  - `src/features/settings/schema/settings.schema.ts`
- Storage keys are explicitly reserved:
  - `app.settings.v1`
  - `app.homeStop.v1`

### Architecture Compliance

- Use **Zustand with `persist` middleware** for client preferences state. Do not introduce Redux, Context reducers, or another state library for this story.
- Use **AsyncStorage** for persisted client state. Do not add a backend, SQLite schema, or cloud sync path here.
- Use **Zod** for persisted settings validation and runtime guards at the storage boundary.
- Keep the code inside the existing feature-first structure:
  - `src/core/store` for persistence/store plumbing
  - `src/features/settings/schema` for the schema definition
- Privacy requirements still apply: no location history or user analytics persistence. Persist only settings and the home-stop reference required by the story.

### File Structure Requirements

- Create:
  - `src/core/store/settings.store.ts`
  - `src/core/store/migrations.ts`
  - `src/features/settings/schema/settings.schema.ts`
  - `tests/core/settings.store.test.ts`
- Likely update:
  - `package.json`
  - `pnpm-lock.yaml`
- Avoid changing app routes, theme tokens, GraphQL setup, or scaffold screens in this story. Those belong to later stories.

### Testing Requirements

- The repo now has a working Jest + `jest-expo` + React Native Testing Library setup from Story 1.1. Use it instead of placeholder tests.
- Test the store as real logic, not as snapshots or shape-only assertions.
- Minimum coverage for this story:
  - first-launch defaults
  - successful persisted rehydration
  - invalid persisted payload reset/fallback
  - version mismatch migration behavior
  - field-level invalid value fallback through schema validation

### Previous Story Intelligence

- Story 1.1 already established:
  - app-wide QueryClient wiring
  - a typed GraphQL boundary
  - a passing Jest test setup
  - `pnpm check`, `pnpm test:ci`, `pnpm typecheck`, `pnpm lint`, and `pnpm codegen:check` as working validations
- Reuse the same standards:
  - keep new modules under `src/core` / `src/features`
  - prefer direct, typed utility modules over ad hoc helpers
  - add executable tests for new core behavior

### Latest Technical Information

- Zustand’s official persist docs support `version` and `migrate`, and state that persisted data can be upgraded with a migration function when the stored version differs from the current one. Use that mechanism instead of manual out-of-band version checks. [Source: https://zustand.docs.pmnd.rs/integrations/persisting-store-data]
- AsyncStorage’s official docs confirm it is asynchronous persistent key-value storage and stores string values, so persisted objects should be serialized JSON and parsed on load. [Source: https://react-native-async-storage.github.io/async-storage/docs/usage/]
- Expo’s docs currently recommend installing AsyncStorage with `npx expo install @react-native-async-storage/async-storage`, which should be preferred for SDK compatibility. [Source: https://docs.expo.dev/versions/v52.0.0/sdk/async-storage/]
- Zod 4 is stable per the official docs, and schema parsing should be the authoritative validation path for untrusted persisted data. Prefer `safeParse` at hydration boundaries so invalid payloads can fall back cleanly instead of throwing into app startup. [Source: https://zod.dev/]

### Project Structure Notes

- No `project-context.md` file is present in the repo, so architecture and previous story files are the authoritative local context.
- The current app still uses the Expo scaffold route structure under `src/app/`; do not migrate routes as part of this story.
- `src/core/store` does not exist yet. This story is the correct place to introduce it.

### References

- Story 1.2 requirements and technical notes: [Source: _bmad-output/planning-artifacts/epics.md#Story-12-settings-store--app-configuration-foundation]
- State management, persistence, validation, and migration direction: [Source: _bmad-output/planning-artifacts/architecture.md]
- UX context for persisted home-stop and notification defaults: [Source: _bmad-output/planning-artifacts/ux-design-specification.md]
- Prior implementation patterns and working test/tooling baseline: [Source: _bmad-output/implementation-artifacts/1-1-graphql-codegen-pipeline-and-core-api-infrastructure.md]
- Recent repo history for implementation continuity:
  - `745f1a5 fix(ui): Fix review issues for 1-1`
  - `ac379a5 test(ui): Wire up app testing`
  - `8c5dd60 feat(ui): Story 1-1`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Story context created from epic, architecture, UX, prior story, and current sprint tracking artifacts
- `pnpm add zustand zod @react-native-async-storage/async-storage`
- `pnpm test -- --runInBand tests/core/settings.store.test.ts`
- `pnpm check`
- `pnpm codegen:check`

### Completion Notes List

- Added persisted settings dependencies and shared storage key/version constants
- Implemented a Zod-backed settings schema with defaults, inferred types, and field-level sanitizers
- Added versioned migration helpers and a Zustand persist store with hydration state, update actions, and reset behavior
- Added automated coverage for defaults, rehydration, corrupted payload fallback, version migration, and invalid field fallback
- Fixed code-review findings by enforcing the persisted `settingsVersion` field during hydration, preserving current values on invalid partial updates, and expanding store action coverage
- Validation passed with `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm test:ci`, and `pnpm codegen:check`

### File List

- _bmad-output/implementation-artifacts/1-2-settings-store-and-app-configuration-foundation.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- codegen.ts
- package.json
- pnpm-lock.yaml
- src/core/api/graphql-client.ts
- src/core/store/migrations.ts
- src/core/store/settings.store.ts
- src/core/store/storage-keys.ts
- src/features/settings/schema/settings.schema.ts
- tests/core/settings.store.test.ts

### Senior Developer Review (AI)

- 2026-03-08: Changes requested and fixed.
- Verified that hydration now respects the persisted `settingsVersion` field instead of relying only on Zustand's outer wrapper version.
- Verified invalid partial updates preserve the current valid store value instead of silently resetting to schema defaults.
- Added executable coverage for inner `settingsVersion` migration/reset behavior plus `updateSettings` and `resetSettings`.

### Change Log

- 2026-03-08: Added the persisted settings foundation with Zod validation, Zustand + AsyncStorage persistence, migration helpers, and automated store tests.
- 2026-03-08: Fixed review findings for persisted `settingsVersion` handling, invalid patch preservation, and missing store action coverage.
