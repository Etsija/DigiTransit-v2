# Story 1.3: App Navigation Shell & Route Architecture

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want the app to launch with three main tabs (Map, Stops, Settings) and a push-navigable departures route,
so that the core navigation structure is in place and all screens exist as workable stubs.

## Acceptance Criteria

1. **Given** the app launches
   **When** the tab bar renders
   **Then** three tabs are visible: Map (leftmost), Stops, Settings
   **And** Departures is NOT a tab — it is a push route accessed from Map or Stops

2. **Given** the user taps each tab
   **When** the tab activates
   **Then** the corresponding stub screen renders without crashing on iOS, Android, and web

3. **Given** a `stopId` is passed to the departures route `stop/[stopId]`
   **When** the screen renders
   **Then** a stub departures screen shows the `stopId` param and a back button returns to the previous screen

4. **Given** the migration from the scaffold structure
   **When** it is complete
   **Then** `src/app/` contains: `_layout.tsx`, `map.tsx`, `stops.tsx`, `settings.tsx`, `stop/[stopId].tsx`
   **And** old scaffold routes (`index.tsx`, `explore.tsx`) are removed

## Tasks / Subtasks

- [x] **Task 1: Replace the starter route scaffold with the app route shell** (AC: 1, 2, 4)
  - [x] Remove the starter routes `src/app/index.tsx` and `src/app/explore.tsx`
  - [x] Create route stubs `src/app/map.tsx`, `src/app/stops.tsx`, and `src/app/settings.tsx`
  - [x] Keep `src/app/_layout.tsx` as the root provider/layout entry and preserve the existing `QueryClientProvider`, `ThemeProvider`, and `AnimatedSplashOverlay`

- [x] **Task 2: Rework the tab shell to match the product navigation** (AC: 1, 2)
  - [x] Update `src/components/app-tabs.tsx` so native platforms expose exactly three tabs: Map, Stops, Settings
  - [x] Update `src/components/app-tabs.web.tsx` so web exposes the same three routes and labels
  - [x] Ensure Map is the leftmost/default tab and that the tab shell does not expose a Departures tab

- [x] **Task 3: Add the departures push route stub and typed navigation helpers** (AC: 1, 3, 4)
  - [x] Create `src/app/stop/[stopId].tsx`
  - [x] Create `src/types/navigation.ts` for route-param helpers/types around `stopId`
  - [x] Ensure the departures stub reads the typed `stopId` route param and exposes a back affordance using Expo Router navigation

- [x] **Task 4: Hide tab UI on the departures push route without introducing feature logic** (AC: 1, 3)
  - [x] Ensure the tab bar is visible on Map, Stops, and Settings only
  - [x] Ensure the departures route behaves as a pushed detail screen, not a tab destination
  - [x] Keep this story limited to navigation shell and stub content only; do not add real stop/departure data fetching

- [x] **Task 5: Add smoke coverage for the new route shell** (AC: 2, 3)
  - [x] Add tests for the three stub screens rendering without crashing
  - [x] Add a test for the departures stub showing a `stopId` from route params
  - [x] Add a small test around navigation helpers/types if needed, but avoid brittle full-router integration tests

## Dev Notes

### Story Foundation

- Story 1.3 is the bridge between the Expo starter scaffold and the real app information architecture.
- The output of this story is still intentionally stubbed. The goal is route correctness, platform-safe rendering, and future-proof navigation, not feature UI or live data.
- Story 1.4 replaces the visual tab shell with the design-system version. Story 1.3 should therefore establish the route structure and tab semantics cleanly without overbuilding the visuals.

### Technical Requirements

- The route contract for this story is:
  - `src/app/map.tsx`
  - `src/app/stops.tsx`
  - `src/app/settings.tsx`
  - `src/app/stop/[stopId].tsx`
- `src/app/_layout.tsx` must remain the root layout entry. Preserve the providers already wired in Story 1.1 and the splash overlay already present in the repo.
- `stop/[stopId]` is the departures detail route for now. Do not add a separate `departures.tsx` route in this story.
- `src/types/navigation.ts` should centralize the route param shape and any typed href helper for stop navigation so later stories do not duplicate pathname strings.
- The stub departures screen must:
  - read `stopId`
  - render it visibly
  - offer a back action
  - avoid fetching real data
- Keep the tab labels user-facing and product-aligned: `Map`, `Stops`, `Settings`.

### Architecture Compliance

- Follow the architecture’s Expo Router direction and keep route files under `src/app/`.
- Follow the architecture’s routing strategy: typed route params for stop/departure flows.
- Preserve the feature-first code organization already established:
  - route entry files in `src/app/`
  - reusable tab shell in `src/components/`
  - route helper types in `src/types/`
- Do not move settings-store code or API code from Stories 1.1 and 1.2.
- Do not start implementing map, stops, departures, or settings feature logic here. This story is navigation shell only.

### Library / Framework Requirements

- The repo already uses Expo Router with `experiments.typedRoutes: true` in `app.json`. Use Expo Router APIs, not React Navigation route definitions by hand. [Source: app.json]
- Native tabs in Expo Router are still alpha and the API may change. Keep the current `AppTabs` abstraction instead of scattering navigator setup through multiple screens so Story 1.4 can replace the visuals cleanly. [Source: https://docs.expo.dev/router/advanced/native-tabs/]
- Expo’s typed routes docs support typed imperative navigation and typed `useLocalSearchParams` generics. Use that capability for the `stopId` route instead of untyped string access. [Source: https://docs.expo.dev/router/reference/typed-routes/]
- Do not model Departures as a hidden native tab. Expo’s native tabs docs note that hidden tabs cannot be navigated to, which conflicts with the required push-route behavior. [Source: https://docs.expo.dev/versions/latest/sdk/router-native-tabs]

### File Structure Requirements

- Create:
  - `src/app/map.tsx`
  - `src/app/stops.tsx`
  - `src/app/settings.tsx`
  - `src/app/stop/[stopId].tsx`
  - `src/types/navigation.ts`
- Update:
  - `src/app/_layout.tsx`
  - `src/components/app-tabs.tsx`
  - `src/components/app-tabs.web.tsx`
- Remove:
  - `src/app/index.tsx`
  - `src/app/explore.tsx`
- Reuse the existing `AppTabs` abstraction instead of replacing it with a totally different navigation entrypoint in this story. The current root layout already imports it, and Story 1.4 is planned to upgrade that shell visually.

### Testing Requirements

- Use the existing Jest + `jest-expo` + React Native Testing Library setup.
- Keep tests pragmatic:
  - render each stub route component directly
  - mock Expo Router hooks where necessary
  - verify `stopId` rendering and back-button intent on the departures stub
- Avoid brittle end-to-end navigator snapshots or trying to boot the full router tree in Jest unless the repo already has a stable pattern for it.
- Minimum test coverage for this story:
  - Map stub renders
  - Stops stub renders
  - Settings stub renders
  - Departures stub renders a provided `stopId`
  - Navigation helper/type usage remains correct at compile time or through a focused unit test

### Previous Story Intelligence

- Story 1.2 established a production-usable persisted settings store in `src/core/store/settings.store.ts`. Leave that implementation untouched and simply preserve provider wiring that may consume it in later stories.
- Story 1.2 review fixes reinforced two important habits that apply here as well:
  - centralize cross-cutting contracts instead of scattering literals
  - add targeted executable tests for the real failure paths, not just happy-path shape assertions
- Story 1.1 already established:
  - `QueryClientProvider` at the app root
  - Expo Router-based app shell
  - passing `pnpm check`/`pnpm test:ci`/`pnpm typecheck`/`pnpm lint`/`pnpm codegen:check`
- Reuse those standards. The navigation refactor must leave all existing validations green.

### Git Intelligence

- Recent implementation pattern:
  - `723899b feat(ui): Story 1-2`
  - `745f1a5 fix(ui): Fix review issues for 1-1`
  - `ac379a5 test(ui): Wire up app testing`
  - `8c5dd60 feat(ui): Story 1-1`
- Current app shell files are still starter-oriented:
  - `src/app/_layout.tsx` wires providers and renders `AppTabs`
  - `src/components/app-tabs.tsx` exposes `Home` and `Explore` on native
  - `src/components/app-tabs.web.tsx` exposes `home` and `explore` on web
- That means the cleanest migration path is to keep the shell abstraction, swap its route names/content, and replace the starter screens with product routes.

### Latest Technical Information

- Expo Router native tabs are currently documented as an alpha feature in SDK 54+ and should be treated as an API that may still shift. Favor minimal, local abstractions over deep coupling to unstable API surface. [Source: https://docs.expo.dev/router/advanced/native-tabs/]
- Expo Router typed routes support typed `router.push()` and typed `useLocalSearchParams()` usage, and typed routes are enabled in this repo already through `app.json`. That is the right path for the `stop/[stopId]` stub. [Source: https://docs.expo.dev/router/reference/typed-routes/]
- Expo’s native tabs API documents `hidden`, but also states hidden tabs cannot be navigated to. That matters here because Departures must be a push route, not a suppressed tab. [Source: https://docs.expo.dev/versions/latest/sdk/router-native-tabs]

### Project Structure Notes

- The architecture document’s long-term target tree mentions both `src/app/stop/[stopId].tsx` and a broader departures feature module. For this story, the route file is the source of truth and feature logic stays stubbed.
- The UX spec contains one inconsistency early on referencing a four-tab structure, but the explicit navigation section later clarifies the intended shell: visible tabs with Departures as push navigation and the tab bar hidden on the Departures view. Follow the explicit navigation section for this story.
- No `project-context.md` file exists in the repo. The authoritative local context is the epic, architecture, UX spec, and completed Stories 1.1 and 1.2.

### References

- Story 1.3 requirements: [Source: _bmad-output/planning-artifacts/epics.md#Story-13-app-navigation-shell--route-architecture]
- App structure and typed route direction: [Source: _bmad-output/planning-artifacts/architecture.md]
- Navigation behavior and tab-bar visibility expectations: [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Navigation-Patterns]
- Current root layout and starter tab shell: [Source: src/app/_layout.tsx], [Source: src/components/app-tabs.tsx], [Source: src/components/app-tabs.web.tsx]
- Typed routes reference: [Source: https://docs.expo.dev/router/reference/typed-routes/]
- Native tabs behavior and limitations: [Source: https://docs.expo.dev/router/advanced/native-tabs/], [Source: https://docs.expo.dev/versions/latest/sdk/router-native-tabs]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Story context created from epic, architecture, UX, current app shell, previous stories, recent commits, and latest Expo Router docs
- Replaced the starter `Home` and `Explore` route scaffold with `map`, `stops`, `settings`, and `stop/[stopId]`, while keeping `src/app/index.tsx` as a redirect entry so launch resolves to `/map`
- Validated the story with `pnpm check`; `codegen:check` required network access because the sandbox could not resolve `api.digitransit.fi`

### Completion Notes List

- Reworked `AppTabs` on native and web into a stack-backed shell that keeps only three visible tabs and hides tab UI on `stop/[stopId]`
- Added route stubs for Map, Stops, Settings, and Departures, with Map and Stops exposing sample push navigation into the typed departures detail route
- Centralized navigation contracts in `src/types/navigation.ts`, including the typed stop href helper and primary tab path guards
- Added direct smoke tests for all stub screens, the typed `stopId` render/back-action path on the departures screen, and native/web tab-shell visibility rules
- Full validation passed with `pnpm check`

### File List

- _bmad-output/implementation-artifacts/sprint-status.yaml
- _bmad-output/implementation-artifacts/1-3-app-navigation-shell-and-route-architecture.md
- src/app/explore.tsx (deleted)
- src/app/index.tsx
- src/app/map.tsx
- src/app/settings.tsx
- src/app/stop/[stopId].tsx
- src/app/stops.tsx
- src/components/app-tabs.tsx
- src/components/app-tabs.web.tsx
- src/types/navigation.ts
- tests/app/navigation-routes.test.tsx

### Change Log

- 2026-03-08: Replaced the starter route scaffold with the Story 1.3 navigation shell, added the typed departures push route, kept `src/app/index.tsx` as a redirect entry to `/map`, and passed `pnpm check`
