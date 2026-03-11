# Story 4.1: Settings Screen & Configurable Polling/Radius Values

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want a Settings screen where I can configure search radius and all polling intervals,
so that I can tune the app to match my connection speed and battery preferences.

## Acceptance Criteria

1. **Given** the user taps the Settings tab
   **When** the screen renders
   **Then** it displays a plain functional layout (no glassmorphism) with labelled rows for all 7 configurable values
   **And** the existing `Build diagnostics` card remains visible on the page as a utility section placed at the bottom
   **And** a normal `Showcase` button is also visible in that bottom utility area

2. **Given** the user changes the search radius
   **When** the new value is saved
   **Then** the next nearby-stops query uses the updated radius
   **And** the value persists across app restarts

3. **Given** the user changes the location update interval, stops polling interval, or departures polling interval
   **When** the new value is saved
   **Then** the corresponding runtime behavior updates immediately without requiring an app restart
   **And** all values persist across sessions

4. **Given** any editable settings input
   **When** an invalid value is entered
   **Then** inline validation feedback appears before save
   **And** the save action is only active when a value has actually changed

5. **Given** the user is on any build type
   **When** they tap the `Showcase` button
   **Then** the app navigates directly to the Showcase screen with a single tap
   **And** no hidden multi-tap gesture, `__DEV__` restriction, or production redirect blocks access

6. **Given** all text in the Settings screen
   **When** system font scale is increased
   **Then** all labels, values, diagnostics content, and the Showcase button scale correctly with no clipping

## Tasks / Subtasks

- [x] Task 1: Build the real Settings form shell on top of the current route while preserving the existing utility content (AC: 1, 6)
  - [x] Replace the placeholder copy in `src/app/settings.tsx` with the actual settings screen layout for the seven persisted values already defined in the settings schema
  - [x] Keep the screen visually plain and functional, matching the UX requirement that Settings is utility-first and not glass-treated
  - [x] Move the existing `Build diagnostics` card to the bottom section of the page instead of removing it
  - [x] Add the Showcase entry in the same bottom utility section so both utility items appear after the main settings controls

- [x] Task 2: Wire editable settings fields to the existing Zustand settings store with inline validation and changed-state save behavior (AC: 2, 3, 4, 6)
  - [x] Reuse `useSettingsStore` from `src/core/store/settings.store.ts` rather than creating any parallel local persistence path
  - [x] Use the bounds already defined in `src/features/settings/schema/settings.schema.ts` for validation and clamping behavior
  - [x] Ensure unsaved edits are compared against the persisted/current store values so the save action is disabled until something actually changes
  - [x] Apply changes through `updateSettings` so query hooks depending on settings react immediately

- [x] Task 3: Make Showcase a normal always-available route from Settings (AC: 1, 5, 6)
  - [x] Remove the five-tap version unlock logic from `src/app/settings.tsx`
  - [x] Replace the current version press target with a normal `Showcase` button or row that calls `router.push(buildShowcaseHref())` directly
  - [x] Keep the app version visible as plain informational text if still useful, but it must no longer gate access to Showcase
  - [x] Remove the `__DEV__` redirect restriction from `src/app/showcase.tsx` so `/showcase` remains accessible in all builds

- [x] Task 4: Preserve diagnostics and route behavior through focused regression tests (AC: 1, 5, 6)
  - [x] Update `tests/app/navigation-routes.test.tsx` to assert the Settings screen still renders diagnostics content and a normal Showcase action
  - [x] Replace the hidden five-tap tests with direct single-tap navigation expectations that work in both development and production scenarios
  - [x] Update the Showcase route test to reflect that production no longer redirects to Settings
  - [x] Add or update assertions covering the bottom utility placement and accessible labels for diagnostics/version/showcase controls

- [x] Task 5: Add focused form tests for editable settings behavior (AC: 2, 3, 4, 6)
  - [x] Test that search radius and polling interval fields initialize from the persisted settings store defaults/current values
  - [x] Test that invalid values surface inline validation feedback before save
  - [x] Test that the save action stays disabled when nothing changed and becomes enabled after a valid edit
  - [x] Test that saving calls `updateSettings` with sanitized values and that store-driven runtime consumers can react immediately

## Dev Notes

### Story Foundation

- Epic 4 is the settings and personalization epic. Story 4.1 is the first story in that epic and establishes the full Settings screen shell that later stories 4.2 and 4.3 will extend.
- The planning docs originally described Settings as a seven-row utility form. Your new request explicitly changes that scope by preserving two already-built utility features on the page:
  - the existing `Build diagnostics` card
  - the existing path to `Showcase`
- Those two items should remain, but they belong at the bottom as secondary utilities rather than in the primary settings form area.
- The current code already contains a temporary Settings route, a diagnostics card, and a Showcase route. This story should evolve that existing shell rather than replacing it with a new screen architecture.

### Technical Requirements

- **Use the existing settings store.** `src/core/store/settings.store.ts` already persists all seven settings fields through Zustand persistence. Do not create a second persistence mechanism, screen-local AsyncStorage logic, or a separate feature store.
- **Use the existing schema as the source of truth.** `src/features/settings/schema/settings.schema.ts` already defines the field names, defaults, and valid ranges:
  - `searchRadiusMeters`: 50-5000, default 250
  - `locationUpdateIntervalSeconds`: 5-300, default 20
  - `stopsPollingIntervalSeconds`: 5-300, default 20
  - `departuresPollingIntervalSeconds`: 5-300, default 10
  - `homeStop`
  - `pushNotificationsEnabled`
  - `notificationLeadTimeMinutes`: 1-120, default 10
- **Story 4.1 scope remains focused.** The editable scope here is search radius and polling intervals. Home stop display/clearing belongs to Story 4.2, and notification preferences belong to Story 4.3. The screen can show placeholders or prepared rows for those later sections if needed, but do not implement their full behavior in this story unless it is necessary for coherent layout.
- **Immediate runtime propagation is already an architectural requirement.** The settings store feeds runtime hooks. Story 3.3 already documented that the departures polling interval reacts without restart. Apply the same principle here: save through the store and let existing selectors/hooks re-evaluate.
- **Preserve `Build diagnostics`.** The diagnostics card in `src/app/settings.tsx` is useful and should remain on the page. Reposition it to the bottom utility area rather than deleting it.
- **Showcase must become a first-class navigation action.** The current hidden unlock behavior uses a five-tap version press gated by `__DEV__`. Remove that behavior entirely. Showcase access must be explicit, single-tap, and available in all builds.
- **Do not break route contracts.** Keep using `buildShowcaseHref()` from `src/types/navigation.ts`. The canonical Showcase href stays `/showcase`.
- **Version display is optional informational UI, not a control gate.** If you keep the app version visible, it should be rendered as plain text or non-secret metadata. It must not require five taps and must not be the entry point to Showcase.

### Architecture Compliance

- Follow the existing project structure rather than inventing a new screen module unless the refactor clearly improves reuse:
  - current route entry point: `src/app/settings.tsx`
  - showcase route: `src/app/showcase.tsx`
  - store: `src/core/store/settings.store.ts`
  - schema: `src/features/settings/schema/settings.schema.ts`
- The architecture document places settings work under `src/features/settings`, but the current implementation is still route-local. For this story, either of these approaches is acceptable:
  - keep the main screen in `src/app/settings.tsx` and extract small reusable form sections/components under `src/features/settings/`
  - or move the screen body into a feature component and keep the route file as a thin wrapper
- Do not create a second route or a dev-only route alias for Showcase.
- Keep server state in TanStack Query and client preferences in Zustand. This story is entirely on the client-preferences side.
- Persistence keys and migration boundaries are already established. Do not rename storage keys or change versioning just to support the UI.

### Library / Framework Requirements

- Stay on the current repo stack. No new form library is required for this story unless the repo already uses one elsewhere.
- Use React Native primitives and the existing theme tokens from `src/shared/theme/theme.ts`.
- Continue using Expo Router navigation through `useRouter`.
- Continue using the existing typed navigation helpers in `src/types/navigation.ts`.
- Use Zod-derived constraints from the existing schema for validation behavior. Do not duplicate numeric bounds in multiple places without centralization.

### File Structure Requirements

- Update:
  - `src/app/settings.tsx`
  - `src/app/showcase.tsx`
  - `tests/app/navigation-routes.test.tsx`
- Likely create or update:
  - one or more components under `src/features/settings/` if extracting form rows or screen sections improves clarity
  - tests under `tests/features/settings/` or `tests/app/` for form interaction
- Reuse:
  - `src/core/store/settings.store.ts`
  - `src/features/settings/schema/settings.schema.ts`
  - `src/types/navigation.ts`
- Do not create:
  - a second settings persistence layer
  - a dev-only Showcase route
  - a hidden-tap unlock mechanism
  - a separate diagnostics screen

### Testing Requirements

- Update existing route tests because current expectations are intentionally changing:
  - remove the test that expects five version taps to open Showcase
  - remove the test that expects production mode to hide or disable Showcase access
  - remove the test that expects `/showcase` to redirect to `/settings` outside development mode
- Add focused Settings tests for:
  - diagnostics card remains rendered
  - Showcase action is visible and works with a single tap
  - Showcase action remains available in production mode
  - version information, if retained, is informational only
  - form fields initialize from the settings store
  - inline validation appears before save
  - save button enable/disable state is driven by actual unsaved changes
- Preserve accessibility coverage:
  - touch targets at least 44x44
  - labels remain readable under font scaling
  - buttons/rows have stable accessibility labels

### Previous Story Intelligence

- Story 3.3 established an important cross-story dependency: `departuresPollingIntervalSeconds` already propagates through the settings store into the departures query behavior. Story 4.1 must preserve that mechanism rather than replacing it.
- Story 3.3 also reinforced the project pattern of making surgical changes instead of restructuring stable flows. Apply that here:
  - keep existing diagnostics functionality
  - keep the existing Showcase destination
  - remove only the hidden-gating logic around it
- The repo currently has no committed work on Epic 4. This story is the start of that epic, so it should set a clean pattern for Stories 4.2 and 4.3.

### Git Intelligence

- `but status` shows `epic-4` exists with no commits yet and the worktree is clean. This story should be contexted as the first Epic 4 implementation unit.
- Recent repository history shows an incremental UI-first pattern, especially around Stories 3.1 to 3.3. Follow that same pattern here: extend the existing Settings route instead of overengineering a new subsystem.

### Project Structure Notes

- The architecture planned dedicated feature files such as `src/features/settings/settings-screen.tsx` and `src/features/settings/components/...`, but the current live code still uses `src/app/settings.tsx` directly. That is not a blocker.
- The practical rule for this story is:
  - keep routing in `src/app/settings.tsx`
  - extract reusable UI into `src/features/settings/` only if it makes the form easier to maintain
- No `project-context.md` file was found in the repository, so there are no extra project-context rules to incorporate beyond the architecture, PRD, UX, and current code.

### Implementation Notes

- Recommended implementation order:
  1. Build the static Settings form layout with the main configurable rows first
  2. Wire editable values to the settings store and validation rules
  3. Add save-state tracking and inline validation behavior
  4. Move diagnostics into a bottom utility section
  5. Add a normal Showcase action in that same bottom utility section
  6. Remove all `__DEV__` / five-tap Showcase gating from both settings and showcase routes
  7. Update route and form tests
- The most likely regression is accidentally deleting useful diagnostics or breaking Showcase access on production builds. Guard against that with tests.
- The second major risk is scope bleed into Stories 4.2 and 4.3. Keep this story focused on shell + polling/radius settings + utility section preservation.

### Project Structure Notes

- Current implementation variance: the live Settings screen is in `src/app/settings.tsx`, while the architecture anticipates more work under `src/features/settings/`.
- This is acceptable for Story 4.1 as long as the code remains organized and any reusable form pieces are extracted cleanly when needed.
- The Showcase route already exists at `src/app/showcase.tsx`; the work here is to remove dev-only gating, not to move the route.

### References

- Epic 4 scope and original Story 4.1 acceptance criteria: [Source: _bmad-output/planning-artifacts/epics.md]
- Product requirements for settings and configurable values: [Source: _bmad-output/planning-artifacts/prd.md]
- UX requirement that Settings uses a plain functional layout: [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Settings-Form]
- Architecture requirements for settings persistence, validation, and module boundaries: [Source: _bmad-output/planning-artifacts/architecture.md]
- Current Settings implementation with diagnostics card and hidden Showcase access: [Source: src/app/settings.tsx]
- Current Showcase route restriction: [Source: src/app/showcase.tsx]
- Typed navigation helper for Showcase: [Source: src/types/navigation.ts]
- Existing settings persistence store: [Source: src/core/store/settings.store.ts]
- Existing settings schema and bounds: [Source: src/features/settings/schema/settings.schema.ts]
- Existing route-level navigation tests that must be updated: [Source: tests/app/navigation-routes.test.tsx]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `but status`
- `pnpm test -- --runInBand tests/app/navigation-routes.test.tsx tests/features/settings/settings-screen.test.tsx`
- `pnpm test -- --runInBand tests/core/settings.store.test.ts tests/features/stops/use-nearby-stops.test.tsx tests/features/departures/use-stop-departures.test.tsx`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test -- --runInBand tests/app/navigation-routes.test.tsx tests/features/settings/settings-screen.test.tsx tests/core/settings.store.test.ts tests/features/stops/use-nearby-stops.test.tsx tests/features/departures/use-stop-departures.test.tsx`

### Completion Notes List

- Built a dedicated `src/features/settings/settings-screen.tsx` screen component and left `src/app/settings.tsx` as a thin route wrapper.
- Added a plain seven-row Settings layout with editable numeric controls for radius and polling intervals, read-only placeholders for home stop and notification preferences, inline validation, and a save button that only enables when valid changes exist.
- Moved `Build diagnostics`, the `Showcase` action, and the informational app version into a bottom utility section, and removed all hidden multi-tap and `__DEV__` gating from settings-to-showcase navigation.
- Centralized numeric settings bounds in the schema export so the UI and Zod validation share the same source of truth.
- Added focused settings screen tests and updated navigation tests, then re-ran store and runtime consumer regression tests plus lint and typecheck.

### File List
- src/app/settings.tsx
- src/app/showcase.tsx
- src/features/settings/schema/settings.schema.ts
- src/features/settings/settings-screen.tsx
- tests/app/navigation-routes.test.tsx
- tests/features/settings/settings-screen.test.tsx

### Change Log
- 2026-03-11: Implemented the real Settings screen shell with persisted radius/polling controls, bottom utility section preservation, always-available Showcase access, and focused regression coverage.
- 2026-03-11: Completed review follow-up fixes for the mobile save footer, save button contrast, diagnostics accessibility hooks, updated Showcase copy, and stronger runtime settings coverage.
