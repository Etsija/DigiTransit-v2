# Story 1.5: Dev Showcase Screen

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want a dev-only Showcase screen that renders all UI components with mock data,
so that the design system can be visually verified and iterated before real API data is wired up.

## Acceptance Criteria

1. **Given** the app is running in development mode
   **When** the user taps the version number in Settings 5 times
   **Then** the Showcase screen opens

2. **Given** the Showcase screen
   **When** it renders
   **Then** it displays all component variants with hardcoded mock data:
   - `GlassCard`
   - `CoordinatesBar` (normal + location-unavailable)
   - `StopCard` (all 5 transport types x home-pinned/unpinned states)
   - `DepartureCard` (realtime green, estimated amber, notification-scheduled clock badge)
   - `StopHeaderCard`
   - `MapMarker` (all 5 transport types x normal/tapped)
   - `ErrorBanner`
   - `EmptyState` (GPS-denied and no-stops-in-radius variants)
   - `DepartureNotificationDialog`

3. **Given** a design token is changed in `theme.ts`
   **When** the app hot-reloads
   **Then** all Showcase components reflect the change simultaneously

4. **Given** the Showcase screen
   **When** the user navigates back
   **Then** they return to the Settings tab with no navigation side effects

5. **Given** the app is in production mode
   **When** the Settings version number is tapped
   **Then** nothing happens and the Showcase is inaccessible in production builds

## Tasks / Subtasks

- [x] **Task 1: Add a dev-only Showcase route and module without changing tab semantics** (AC: 1, 4, 5)
  - [x] Create a push route entry such as `src/app/showcase.tsx`; do not add Showcase as a tab
  - [x] Add a dedicated Showcase module under a deliberate location such as `src/features/showcase/` for the screen implementation and mock data
  - [x] Keep navigation stack behavior aligned with the current Expo Router shell so `router.back()` returns to `Settings`
  - [x] Guard the route itself with `__DEV__` and redirect or no-op out to `/settings` when not in development mode

- [x] **Task 2: Add the hidden Settings entrypoint using the real app version value** (AC: 1, 5)
  - [x] Replace the current Settings stub with a plain functional layout that includes an app version row or footer
  - [x] Read the visible version string from Expo config via `expo-constants` instead of hardcoding it
  - [x] Track the 5-tap gesture locally in the Settings screen and trigger `router.push('/showcase')` only when `__DEV__ === true`
  - [x] Ensure taps have no visible or navigation side effect in production mode

- [x] **Task 3: Render all Story 1.4 component variants with hardcoded mock data** (AC: 2, 3)
  - [x] Build deterministic mock datasets for all 5 transport modes and both departure states
  - [x] Render `GlassCard`, `CoordinatesBar`, `StopCard`, `StopHeaderCard`, `DepartureCard`, `MapMarker`, `ErrorBanner`, `EmptyState`, and `DepartureNotificationDialog`
  - [x] Add the story-required state variants: pinned/unpinned stop cards, location unavailable, GPS denied, no stops in radius, realtime, scheduled, notification scheduled, and tapped marker state
  - [x] Keep all mock data local to the Showcase feature; do not import network code, stores, or generated GraphQL types into this story

- [x] **Task 4: Make the Showcase useful for design iteration rather than a dump of components** (AC: 2, 3)
  - [x] Organize the screen into labeled sections so developers can scan components quickly on mobile and web
  - [x] Use the existing dark visual language and token-driven spacing from `src/shared/theme/theme.ts`
  - [x] Include representative compositions, not only isolated atoms, so token changes are visible in realistic combinations
  - [x] Keep the screen scrollable and stable on iOS, Android, and web within the current centered-content layout conventions

- [x] **Task 5: Cover the dev-only contract and key variants with targeted tests** (AC: 1, 2, 4, 5)
  - [x] Add a test that 5 taps on the Settings version affordance navigate to Showcase in development mode
  - [x] Add a test that the same taps do nothing when `__DEV__` is false
  - [x] Add focused Showcase tests asserting the required variant labels or accessibility output render
  - [x] Add a navigation test that back from Showcase returns to Settings and does not surface an extra tab destination

## Dev Notes

### Story Foundation

- Story 1.5 is the first consumer of the Story 1.4 design-system components.
- The purpose is visual verification and iteration speed, not feature delivery. Keep all data mocked and local.
- Story 1.6 builds directly on this work by embedding the live API validation tool inside the dev-only Showcase surface, so the route and module boundaries chosen here should be reusable.

### Technical Requirements

- The current Settings screen at `src/app/settings.tsx` is still a stub and has no version affordance. This story must add the hidden entry interaction there.
- The app already exposes a root stack in `src/components/app-tabs.tsx` and `src/components/app-tabs.web.tsx`; Showcase must be another pushed screen, not a primary destination.
- The route should be implemented in a way that preserves the current shell:
  - `src/app/index.tsx` remains the redirect to `/map`
  - visible tabs remain exactly `Map`, `Stops`, `Settings`
  - `Showcase` is never added to `TAB_ROUTES`
- Read the app version from Expo config using `expo-constants` (`Constants.expoConfig`) so the visible version matches `app.json` / app config instead of drifting.
- Use `__DEV__` to gate both the hidden tap handler and the Showcase screen itself. Production builds must not expose the Showcase through taps or direct route access.
- Keep the screen implementation driven by the existing component props already established in Story 1.4:
  - `CoordinatesBar` accepts `latitude` and `longitude`
  - `StopCard` accepts `name`, `code`, `transportMode`, `distanceLabel`, and `onPress`
  - `StopHeaderCard` accepts `name`, `code`, `transportMode`, and optional `distanceLabel`
  - `DepartureCard` accepts `routeShortName`, `headsign`, `departureTime`, and `status`
  - `MapMarker` accepts `transportMode`, `label`, `size`, and optional `onPress`
  - `DepartureNotificationDialog` currently supports `idle` and `cancel` modes; the notification-scheduled Showcase variant should be expressed using the current dialog/card APIs without inventing unrelated production behavior
- Keep all mock data isolated to the Showcase feature. Do not wire TanStack Query, the settings store, or GraphQL documents into this story.

### Architecture Compliance

- Follow the architecture’s Expo Router approach and keep route ownership in `src/app/`.
- Prefer a feature-local implementation module for Showcase content rather than bloating the route file with mock data and section composition.
- Preserve the architecture’s state split:
  - no remote state in this story
  - no persisted state beyond the ephemeral tap counter needed to unlock Showcase
- Reuse the shared icon wrappers and shared theme tokens from Story 1.4; do not introduce alternate icon imports or ad hoc design values.

### Library / Framework Requirements

- Expo Router navigation already defaults to stack behavior, and imperative APIs support `router.push`, `router.back`, and `router.replace`. Use the existing router patterns in this repo rather than introducing another navigator layer. [Source: https://docs.expo.dev/router/basics/navigation/]
- React Native documents `__DEV__` as a pseudo-global for development-only code, and notes that guarded blocks are stripped from minified production builds. Use it as the primary build-mode gate for hidden developer tooling. [Source: https://reactnative.dev/docs/global-__DEV__]
- Expo Constants exposes `Constants.expoConfig`, which reflects the standard Expo config defined in `app.json` / `app.config.js`, and `debugMode`, which maps to `__DEV__`. Use `expoConfig.version` as the version display source instead of duplicating the version string. [Source: https://docs.expo.dev/versions/latest/sdk/constants/]

### File Structure Requirements

- Create:
  - `src/app/showcase.tsx`
  - `src/features/showcase/` screen and mock-data files
  - Showcase-focused tests under `tests/app/` or `tests/features/`
- Update:
  - `src/app/settings.tsx`
  - `src/components/app-tabs.tsx` if an explicit `Stack.Screen` registration is needed for the new route
  - `src/components/app-tabs.web.tsx` if an explicit `Stack.Screen` registration is needed for the new route
  - `src/types/navigation.ts` if adding a typed href helper for Showcase improves consistency
- Do not change:
  - `src/generated/`
  - GraphQL queries or query client configuration
  - settings persistence contracts from Story 1.2

### Testing Requirements

- Use the existing Jest + `jest-expo` + React Native Testing Library stack.
- Minimum useful coverage for this story:
  - dev-mode 5-tap unlock works
  - production-mode taps do nothing
  - Showcase renders the required component sections/variants
  - back navigation returns to Settings
  - Showcase does not appear as a visible tab route
- Keep tests focused on behavior and developer-tooling guarantees, not on brittle full-screen snapshots.

### Previous Story Intelligence

- Story 1.4 already created the component inventory this story needs:
  - token source of truth in `src/shared/theme/theme.ts`
  - shared icon wrappers in `src/shared/icons/`
  - UI components in `src/shared/components/`
- Story 1.4 review fixes matter here:
  - `MapMarker` now has a 44x44 hit target when interactive, so Showcase should demonstrate interactive marker states rather than bypassing the real component contract
  - accessibility labels and polite live-region behavior were tightened in `StopCard`, `StopHeaderCard`, `DepartureCard`, and `ErrorBanner`; Showcase tests should preserve those contracts
- Story 1.3 established the route shell and typed navigation helpers. Reuse those patterns instead of embedding navigation logic ad hoc inside the Showcase implementation.

### Git Intelligence

- Recent commit pattern:
  - `630d449 feat(ui): Story 1-4`
  - `537ed7e feat(ui): Story 1-3`
  - `d4f8adc feat(ui): Story 1-2`
  - `361ab72 feat(ui): Story 1-1`
- Current source reality:
  - `src/app/settings.tsx` is still a centered stub and is the obvious place to add the hidden version affordance
  - `src/components/app-tabs.tsx` and `.web.tsx` already own the root `Stack` registration; if Showcase is added as a route, keep the change there rather than splitting route ownership
  - `src/types/navigation.ts` currently centralizes tab routes and the stop-detail helper; a Showcase helper can follow that pattern if it improves consistency
- The safest implementation path is:
  - add the pushed Showcase route
  - add the version-tap unlock in Settings
  - compose the existing 1.4 components with local mock data
  - add focused tests around the dev-only gate and route behavior

### Latest Technical Information

- Expo Router’s current navigation docs state that apps default to stack navigation and that `router.push` explicitly pushes while `router.back` pops the current route. That matches the required Showcase-to-Settings back behavior. [Source: https://docs.expo.dev/router/basics/navigation/]
- React Native’s current `__DEV__` docs state that development-only guarded blocks are stripped in minified production builds, making `if (__DEV__)` the right primary gate for hidden tooling. [Source: https://reactnative.dev/docs/global-__DEV__]
- Expo Constants current docs for SDK 55 document `Constants.expoConfig` as the app-config source and `debugMode` as reflecting `__DEV__`. That is sufficient for displaying the app version and for avoiding duplicated version constants. [Source: https://docs.expo.dev/versions/latest/sdk/constants/]

### Project Structure Notes

- The planning artifacts refer to the Showcase as a "screen", not a tab. In the current app architecture, that maps best to a pushed route such as `src/app/showcase.tsx`.
- The current Settings screen uses old compatibility tokens from `src/constants/theme.ts`, while Story 1.4’s canonical tokens live in `src/shared/theme/theme.ts`. Story 1.5 should prefer the new shared tokens and only keep compatibility bridges where needed.
- No `project-context.md` file exists in the repo. The authoritative context remains the epic breakdown, architecture document, UX specification, and completed Stories 1.3 and 1.4.

### References

- Story 1.5 requirements: [Source: _bmad-output/planning-artifacts/epics.md#Story-15-dev-showcase-screen]
- Showcase intent and dev-only access pattern: [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Design-Review--Showcase-Screen]
- Current route shell and push navigation baseline: [Source: src/components/app-tabs.tsx], [Source: src/components/app-tabs.web.tsx], [Source: src/types/navigation.ts]
- Current Settings entry point needing the hidden version tap: [Source: src/app/settings.tsx]
- Shared component APIs to render in Showcase: [Source: src/shared/components/coordinates-bar.tsx], [Source: src/shared/components/stop-card.tsx], [Source: src/shared/components/stop-header-card.tsx], [Source: src/shared/components/departure-card.tsx], [Source: src/shared/components/map-marker.tsx], [Source: src/shared/components/error-banner.tsx], [Source: src/shared/components/empty-state.tsx], [Source: src/shared/components/departure-notification-dialog.tsx]
- Design tokens and shared visual language: [Source: src/shared/theme/theme.ts]
- Expo Router navigation docs: [Source: https://docs.expo.dev/router/basics/navigation/]
- React Native `__DEV__` docs: [Source: https://reactnative.dev/docs/global-__DEV__]
- Expo Constants docs: [Source: https://docs.expo.dev/versions/latest/sdk/constants/]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Story context created from sprint status, epic breakdown, architecture, UX specification, completed Stories 1.3 and 1.4, current app shell files, current shared component APIs, and latest Expo/React Native docs for route navigation, `__DEV__`, and app config version access
- Confirmed that Story 1.4 is complete in `_bmad-output/implementation-artifacts/1-4-design-system-tokens-and-component-library.md` and that Story 1.5 is the next backlog item in `sprint-status.yaml`
- Confirmed the current Settings screen is still a stub and that the root stack is owned by `src/components/app-tabs.tsx` and `src/components/app-tabs.web.tsx`
- Added a guarded `/showcase` route, registered it in the existing stack shell, and kept `TAB_ROUTES` unchanged so Showcase remains a pushed screen only
- Replaced the Settings stub with a version-driven unlock using `Constants.expoConfig.version` and a local five-tap counter gated by `__DEV__`
- Built a feature-local Showcase screen with deterministic mock data and labeled sections for every required Story 1.4 component variant
- Validated the implementation with `pnpm test --runInBand`, `pnpm typecheck`, and `pnpm lint`

### Implementation Plan

- Add the dev-only Showcase route and keep it outside primary tab navigation
- Replace the Settings stub with the hidden version unlock using Expo Constants
- Build a feature-local Showcase screen and deterministic mock datasets using existing Story 1.4 component contracts
- Add focused navigation and Showcase tests, then run full repo validation

### Completion Notes List

- Implemented a dev-only `/showcase` push route with a production redirect back to `/settings` and explicit stack registration on native and web shells
- Replaced the Settings stub with a token-aligned layout that reads `Constants.expoConfig.version` and unlocks Showcase after five taps only in development builds
- Added feature-local mock datasets and a scrollable Showcase surface covering GlassCard, CoordinatesBar, StopCard, StopHeaderCard, DepartureCard, MapMarker, ErrorBanner, EmptyState, and DepartureNotificationDialog variants
- Corrected `CoordinatesBar` to use the intended HUD treatment with fix indicator, resolved address, and coordinate sublabel instead of a plain single-line strip
- Corrected `StopCard` and `StopHeaderCard` to use layered dark-surface gradients plus transport tint overlays for the intended C+D hybrid visual treatment
- Corrected the Showcase notification-scheduled `DepartureCard` variant to use a real clock badge and less ambiguous mock route data
- Refined the stop-card transport tint again to remove the hard top/bottom split and replace it with a softer ambient highlight closer to proposal C
- Replaced the stop-card tint simulation with a real `expo-linear-gradient` implementation so the surface no longer depends on clipped overlay tricks
- Added targeted route and feature tests for the dev-only unlock, production no-op behavior, Showcase rendering, back navigation, and hidden-tab contract
- Verified the repo with `pnpm test --runInBand`, `pnpm typecheck`, and `pnpm lint`
- Fixed code-review findings by making the version row inert in production, adding a real pinned `StopCard` state, and making Showcase exit navigation deterministic to `/settings`

### File List

- _bmad-output/implementation-artifacts/1-5-dev-showcase-screen.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- app.json
- package.json
- pnpm-lock.yaml
- plugins/withAsyncStorageAndroidRepo.js
- src/app/settings.tsx
- src/app/showcase.tsx
- src/components/app-tabs.tsx
- src/components/app-tabs.web.tsx
- src/features/showcase/mock-data.ts
- src/features/showcase/showcase-screen.tsx
- src/shared/components/coordinates-bar.tsx
- src/shared/components/departure-card.tsx
- src/shared/components/safe-linear-gradient.tsx
- src/shared/components/stop-card.tsx
- src/shared/components/stop-header-card.tsx
- src/types/navigation.ts
- tests/app/navigation-routes.test.tsx
- tests/features/showcase-screen.test.tsx
- tests/shared/ui-components.test.tsx

## Senior Developer Review (AI)

### Reviewer

Jyrki

### Date

2026-03-09

### Outcome

Approved after fixes.

### Findings And Resolution

- Fixed the production Settings version row so it is no longer interactive or visually pressable outside development builds.
- Fixed the Showcase `StopCard` variants so pinned stops now render a real home-pinned badge instead of only wrapper text.
- Fixed the Showcase back action so it deterministically returns to `/settings` even when no router history exists.
- Fixed the test gap by asserting the Showcase exit path replaces to `/settings` and by adding coverage for the pinned stop variant.
- Corrected the story file list to include all implementation files that git shows as part of this story’s changes.

## Change Log

- 2026-03-09: Implemented the dev-only Showcase route, Settings unlock gesture, feature-local mock Showcase screen, and validation coverage for Story 1.5.
- 2026-03-09: Corrected Showcase visual fidelity by restoring the intended CoordinatesBar HUD layout and the StopCard/StopHeaderCard C+D tinted gradient treatment.
- 2026-03-09: Corrected the notification-scheduled DepartureCard badge and refined the stop-card tint layering to a lighter-top, darker-bottom surface.
- 2026-03-09: Replaced the overly hard stop-card tint split with a softer ambient highlight so the surface reads as a subtle tint rather than a two-band fill.
- 2026-03-09: Added `expo-linear-gradient` and switched StopCard/StopHeaderCard to a real diagonal gradient surface to remove visible tint edges.
- 2026-03-09: Code review fixes applied for Story 1.5 and the story was approved.
