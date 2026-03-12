# Story 5.4: UI Styling Consistency Cleanup with NativeWind

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want the app's screen and component layout styling to consistently prefer NativeWind utility classes for view-level spacing, sizing, and alignment,
so that UI iteration is faster, styling intent is easier to read, and the codebase avoids unnecessary `StyleSheet` churn for simple layout changes.

## Acceptance Criteria

1. **Given** screen-level and component-level layout code in the current app shell
   **When** styling is reviewed
   **Then** view/layout-only concerns such as padding, margin, flex alignment, row/column flow, sizing, and gap usage are migrated to `className`-based NativeWind utilities where that is already supported cleanly
   **And** `StyleSheet` remains only for cases that materially need it, such as dynamic token-driven values, absolute overlays, animated values, or APIs that do not map cleanly to NativeWind

2. **Given** the departures, stops, settings, and shared card surfaces are revisited
   **When** simple spacing or alignment adjustments are needed
   **Then** those changes can be made by editing NativeWind utility classes instead of threading additional one-off `StyleSheet` rules through the component

3. **Given** a component mixes NativeWind and `StyleSheet`
   **When** the code is reviewed
   **Then** the split is intentional and easy to explain: NativeWind for static layout primitives, `StyleSheet` for dynamic, animated, overlay, absolute-fill, or platform-specific styling

4. **Given** the migration is complete for the targeted surfaces
   **When** the affected screens and Showcase components are tested
   **Then** there are no visual regressions in touch target size, spacing rhythm, card hierarchy, or typography alignment across the map-adjacent shared components, stops, departures, and settings flows
   **And** the existing Showcase reference screenshots under `docs/showcase-reference/` still match the implemented UI closely enough for regression review

5. **Given** this is a cleanup story with an explicit maintainability goal
   **When** the implementation is measured on the targeted files
   **Then** the total LOC across the touched UI files is lower after the refactor than before it
   **And** the story completion notes record the before/after LOC counts plus the net reduction

## Tasks / Subtasks

- [x] Task 1: Establish the cleanup scope and LOC baseline before changing UI code (AC: 4, 5)
  - [x] Use the existing story target as the migration boundary: `src/features/departures/`, `src/features/stops/`, `src/features/settings/settings-screen.tsx`, and layout-heavy shared UI under `src/shared/components/`
  - [x] Record a before-state LOC snapshot for the targeted files with a reproducible command such as `find ... | xargs wc -l`
  - [x] Use `docs/showcase-reference/CoordinatesBar.png`, `DepartureCard.png`, `DepartureNotificationDialog.png`, `ErrorBanner.png`, `GlassCard.png`, `MapMarker.png`, `StopCard.png`, and `StopHeaderCard.png` as the visual regression reference set
  - [x] Keep the scope to styling/layout cleanup only; do not add new product behavior, redesign components, or alter data flows

- [x] Task 2: Migrate high-churn screens from layout `StyleSheet` rules to NativeWind utilities where support is already clean (AC: 1, 2, 3)
  - [x] Refactor layout-heavy static wrappers in `src/features/departures/departures-screen.tsx` to prefer `className` for flex, spacing, sizing, and alignment
  - [x] Refactor equivalent layout containers in `src/features/stops/stops-screen.tsx`
  - [x] Refactor equivalent layout containers in `src/features/settings/settings-screen.tsx`, prioritizing repetitive row/section spacing and alignment rules
  - [x] Preserve `StyleSheet` for animated values, `StyleSheet.absoluteFillObject`, token-driven colors, and any constructs that become less clear or less reliable when forced into utilities

- [x] Task 3: Migrate shared presentational components only where NativeWind reduces layout noise without weakening the design token system (AC: 1, 2, 3, 5)
  - [x] Audit `src/shared/components/departure-card.tsx`, `stop-card.tsx`, `stop-header-card.tsx`, `coordinates-bar.tsx`, `departure-notification-dialog.tsx`, `empty-state.tsx`, `error-banner.tsx`, `loading-state.tsx`, `glass-card.tsx`, and `map-marker.tsx`
  - [x] Convert static layout primitives like row/column flow, item alignment, padding, margin, width/height, and gaps to NativeWind utilities where they map directly
  - [x] Keep dynamic color math, blur/gradient overlays, transport-mode tint generation, animation setup, and absolute overlay layers in `StyleSheet` or inline style objects when those are clearer
  - [x] Do not duplicate token values into arbitrary Tailwind literals when a component already depends on `theme` for semantic color, typography, blur, border, or glass-effect styling

- [x] Task 4: Prevent regressions and prove the cleanup improved maintainability rather than only moving syntax around (AC: 3, 4, 5)
  - [x] Update or add tests for affected shared components and screens only where rendered structure or accessibility queries change because of the refactor
  - [x] Verify that all interactive controls still satisfy the existing 44x44 minimum touch target expectation from the UX spec
  - [x] Compare the resulting Showcase component output against the reference screenshots in `docs/showcase-reference/`
  - [x] Record the after-state LOC count for the same targeted file set and include the net reduction in the story completion notes

## Dev Notes

### Story Foundation

- Epic 5's first three stories completed the local-notification feature set. Story 5.4 is intentionally different: it is a cleanup and consistency pass on the UI layer, not a new capability.
- The business value is delivery speed and future safety:
  - faster visual iteration on high-churn screens
  - more readable view layout intent
  - less `StyleSheet` bloat in files where spacing/alignment dominates
- This story must not become a redesign. Existing glassmorphism, transport tinting, typography hierarchy, and spacing rhythm remain the product contract.
- The user supplied a dedicated Showcase screenshot reference set in `docs/showcase-reference/`; treat those files as the baseline for component-level UI regression review during implementation.
- A required output of this story is measurable UI code reduction. "Cleaner" is not sufficient unless the touched UI file set also shows a net LOC decrease.

### Technical Requirements

- Use NativeWind only for static, view-level layout primitives that already map well to `className`:
  - `flex`, `flex-row`, `flex-col`
  - alignment and justification
  - padding and margin
  - width/height sizing
  - gap/spacing
  - simple border radius or overflow helpers when they do not obscure token intent
- Keep `StyleSheet` or inline style objects for cases that are materially better outside NativeWind:
  - `StyleSheet.absoluteFillObject`
  - animated values and interpolated styles
  - theme-token-driven colors, gradients, blur, shadows, and glass surfaces
  - dynamic transport-mode tint composition
  - platform conditionals or runtime-calculated values
- Do not replace `theme` as the source of truth for semantic visual values. This story is about moving static layout semantics to utilities, not hardcoding design tokens into arbitrary Tailwind values throughout the codebase.
- When a component mixes `className` and `style`, the boundary must be obvious on inspection:
  - `className` handles static layout scaffolding
  - `style` handles dynamic or token-derived presentation
- Prefer small, reviewable refactors within existing components over extracting new wrappers or utility abstractions just to "support" the migration.
- Avoid churn in data logic, navigation logic, query hooks, or notification behavior while touching these files.

### Architecture Compliance

- Stay inside the established feature-first structure from the architecture:
  - route/screen orchestration in feature `*-screen.tsx`
  - cross-feature reusable UI in `src/shared/components`
  - state and API logic remain in existing `core` and feature modules
- This story is UI-layer only. Do not introduce new stores, hooks, routes, GraphQL operations, or platform adapters.
- Preserve current error/loading behavior:
  - map-adjacent screens remain non-blocking after first render
  - error states stay explicit
  - background-refresh indicators keep working
- Preserve UX-critical constraints from the PRD/UX spec:
  - map remains visible when API data fails
  - departures remain quick to scan
  - settings remains a plain utility layout rather than a glassy redesign
  - touch targets stay at or above 44x44

### Library / Framework Requirements

- Use the currently installed stack, not speculative upgrades:
  - `nativewind ^4.2.2`
  - `tailwindcss ^3.4.19`
  - `expo ~55.0.3`
  - `react-native 0.83.2`
- The architecture already chose NativeWind as the styling direction for utility-class RN authoring. Story 5.4 should deepen consistency within that existing decision rather than changing libraries or upgrading to a different NativeWind major.
- Keep using React Native styling primitives alongside NativeWind where they remain the right tool. This is a mixed-mode cleanup, not a purity migration.

### File Structure Requirements

- Highest-priority screen files:
  - `src/features/departures/departures-screen.tsx`
  - `src/features/stops/stops-screen.tsx`
  - `src/features/settings/settings-screen.tsx`
- Highest-priority shared UI files:
  - `src/shared/components/departure-card.tsx`
  - `src/shared/components/stop-card.tsx`
  - `src/shared/components/stop-header-card.tsx`
  - `src/shared/components/coordinates-bar.tsx`
  - `src/shared/components/departure-notification-dialog.tsx`
- Secondary shared files to clean only if they clearly benefit:
  - `src/shared/components/empty-state.tsx`
  - `src/shared/components/error-banner.tsx`
  - `src/shared/components/loading-state.tsx`
  - `src/shared/components/glass-card.tsx`
  - `src/shared/components/map-marker.tsx`
- Avoid editing query hooks, stores, or platform adapters unless a test or type fix is strictly required by the refactor.

### Testing Requirements

- Run targeted regression tests for any touched screen/component test files.
- Add or update tests only where the refactor changes rendered structure, accessibility roles/labels, or test selectors.
- Re-run the relevant UI suites at minimum:
  - `tests/shared/ui-components.test.tsx`
  - any screen-specific tests covering stops/departures/settings if touched
- Run the standard quality gates before closing the story:
  - `pnpm lint`
  - `pnpm typecheck`
  - `pnpm format:check`
  - `pnpm check`
- Verify UI parity manually against the Showcase reference screenshots and against the key in-app flows:
  - Stops tab list and home-stop affordance
  - Departures screen header, departure rows, and notification dialog
  - Settings sections and row spacing

### Previous Story Intelligence

- Recent Epic 5 work changed notification behavior, not styling architecture. Story 5.4 should avoid mixing UI cleanup with further reminder-flow edits unless a regression is discovered.
- Story 5.3 touched `departures-screen.tsx` and `departure-notification-dialog.tsx`, so those files are freshly modified and should be refactored carefully rather than broadly rewritten.
- The previous story artifact shows a pattern of narrow, additive changes and preserving route stability. Keep that standard here:
  - no new feature shells
  - no behavior changes hidden inside styling edits
  - fail closed on anything that risks visual or interaction regressions

### Git Intelligence

- Recent history confirms the immediate context:
  - `21adc22 GitButler Workspace Commit`
  - `ca5c99b chore: Add screenshots of Showcase cards`
  - `55be93b feat(ui): Story 5-3 departure notification cancellation`
  - `5ea4340 feat(ui): Story 5-2 per-departure notification scheduling`
  - `23851a2 feat(ui): Story 5-1 on-launch home stop notification`
- The screenshot commit is directly relevant to this story. Use those references instead of recreating a separate visual baseline.
- The recent UI work is concentrated in departures and shared components, which makes those files the most likely to benefit from cleanup and the most likely to regress if the refactor becomes too broad.

### Latest Tech Information

- NativeWind's current v4 documentation continues to position `className` as the RN authoring surface for utility styles, while relying on React Native styles underneath. That matches this story's mixed-mode goal rather than a full removal of `StyleSheet`. Source: https://www.nativewind.dev/
- Expo's current NativeWind guide remains oriented around NativeWind setup as an Expo-compatible styling layer, which supports continuing with the existing installed stack instead of introducing a new styling library for this cleanup. Source: https://docs.expo.dev/guides/tailwind/
- React Native's current `StyleSheet` docs still make `StyleSheet.create` and `absoluteFillObject` the standard primitives for cases such as absolute overlays and RN-native style composition. Keep those where they are the clearest fit. Source: https://reactnative.dev/docs/stylesheet

### Project Structure Notes

- No `project-context.md` file was found in this repository, so the planning artifacts and live code are the authoritative context.
- The current targeted surface is substantial enough to show a measurable cleanup: the combined LOC across `src/features/departures`, `src/features/stops`, `src/features/settings`, and `src/shared/components` is currently about `4206` lines. The story should record a narrower before/after count for the files actually touched.
- Current code inspection shows extensive `StyleSheet` use in the exact components this story targets, including `departures-screen.tsx`, `stops-screen.tsx`, `settings-screen.tsx`, `departure-card.tsx`, `stop-card.tsx`, `stop-header-card.tsx`, `coordinates-bar.tsx`, and `departure-notification-dialog.tsx`.
- Settings is the largest single screen file at over one thousand lines. Prioritize obvious repetitive layout cleanup there, but avoid turning this story into a full settings-screen decomposition unless necessary for readability.

### References

- Epic 5 Story 5.4 acceptance criteria and technical notes: [Source: _bmad-output/planning-artifacts/epics.md#Story-54-UI-Styling-Consistency-Cleanup-with-NativeWind]
- Architecture styling direction and feature/shared boundaries: [Source: _bmad-output/planning-artifacts/architecture.md#Frontend-Architecture], [Source: _bmad-output/planning-artifacts/architecture.md#Project-Structure--Boundaries], [Source: _bmad-output/planning-artifacts/architecture.md#Implementation-Handoff]
- UX styling system, spacing rhythm, touch targets, Showcase intent, and settings visual direction: [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Implementation-Roadmap]
- PRD core UX expectations for map, stops, departures, settings, and graceful failure: [Source: _bmad-output/planning-artifacts/prd.md#Functional-Requirements]
- Showcase visual regression references: [Source: docs/showcase-reference/CoordinatesBar.png], [Source: docs/showcase-reference/DepartureCard.png], [Source: docs/showcase-reference/DepartureNotificationDialog.png], [Source: docs/showcase-reference/ErrorBanner.png], [Source: docs/showcase-reference/GlassCard.png], [Source: docs/showcase-reference/MapMarker.png], [Source: docs/showcase-reference/StopCard.png], [Source: docs/showcase-reference/StopHeaderCard.png]
- Live target files: [Source: src/features/departures/departures-screen.tsx], [Source: src/features/stops/stops-screen.tsx], [Source: src/features/settings/settings-screen.tsx], [Source: src/shared/components/departure-card.tsx], [Source: src/shared/components/stop-card.tsx], [Source: src/shared/components/stop-header-card.tsx], [Source: src/shared/components/coordinates-bar.tsx], [Source: src/shared/components/departure-notification-dialog.tsx]
- Previous story context: [Source: _bmad-output/implementation-artifacts/5-3-departure-notification-cancellation.md]
- NativeWind docs: [Source: https://www.nativewind.dev/]
- Expo Tailwind/NativeWind guide: [Source: https://docs.expo.dev/guides/tailwind/]
- React Native StyleSheet docs: [Source: https://reactnative.dev/docs/stylesheet]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Implementation Plan

- Capture a before-state LOC baseline for the targeted UI file set and use the Showcase reference screenshots as the regression baseline.
- Refactor the highest-churn screens first, replacing static layout `StyleSheet` rules with NativeWind `className` utilities where the mapping is direct and readable.
- Refactor shared cards and HUD/dialog components next, keeping design-token-driven visuals and absolute/animated styles outside NativeWind where appropriate.
- Re-run tests and quality gates, then record the before/after LOC counts and net reduction in the completion notes.
- Treat `pnpm check` as the final quality gate, and run it after `pnpm format:check`.

### Debug Log References

- `cat _bmad/core/tasks/workflow.xml`
- `cat _bmad/bmm/workflows/4-implementation/dev-story/workflow.yaml`
- `cat _bmad/bmm/workflows/4-implementation/dev-story/instructions.xml`
- `cat _bmad/bmm/workflows/4-implementation/dev-story/checklist.md`
- `cat _bmad-output/implementation-artifacts/sprint-status.yaml`
- `sed -n '930,1065p' _bmad-output/planning-artifacts/epics.md`
- `sed -n '1,760p' _bmad-output/planning-artifacts/architecture.md`
- `rg -n "NativeWind|StyleSheet|showcase|departures|stops|settings|map|spacing|layout|card|screen" _bmad-output/planning-artifacts/prd.md _bmad-output/planning-artifacts/ux-design-specification.md`
- `cat _bmad-output/implementation-artifacts/5-3-departure-notification-cancellation.md`
- `git log --oneline -5`
- `rg --files src/features/departures src/features/stops src/features/settings src/shared/components`
- `find src/features/departures src/features/stops src/features/settings src/shared/components -type f \\( -name '*.ts' -o -name '*.tsx' \\) -print0 | xargs -0 wc -l | sort -n`
- `rg -n "StyleSheet\\.create|className=|StyleSheet" src/features/departures src/features/stops src/features/settings src/shared/components`
- `sed -n '1,260p' src/features/departures/departures-screen.tsx`
- `sed -n '1,260p' src/features/stops/stops-screen.tsx`
- `sed -n '1,1180p' src/features/settings/settings-screen.tsx`
- `sed -n '1,260p' src/shared/components/departure-card.tsx`
- `sed -n '1,260p' src/shared/components/stop-card.tsx`
- `sed -n '1,260p' src/shared/components/stop-header-card.tsx`
- `sed -n '1,260p' src/shared/components/coordinates-bar.tsx`
- `sed -n '1,320p' src/shared/components/departure-notification-dialog.tsx`
- `sed -n '1,220p' src/shared/components/empty-state.tsx`
- `sed -n '1,220p' src/shared/components/loading-state.tsx`
- `rg -n "className=|StyleSheet" src/features/departures src/features/stops src/features/settings src/shared/components`
- `pnpm test -- --runInBand tests/shared/ui-components.test.tsx`
- `pnpm test -- --runInBand tests/features/stops/stops-screen.test.tsx`
- `pnpm test -- --runInBand tests/features/departures/departures-screen.test.tsx`
- `pnpm test -- --runInBand tests/features/settings/settings-screen.test.tsx`
- `pnpm exec tsc --noEmit`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm format:check`
- `pnpm check`
- `wc -l src/features/departures/departures-screen.tsx src/features/stops/stops-screen.tsx src/features/settings/settings-screen.tsx src/shared/components/departure-card.tsx src/shared/components/stop-card.tsx src/shared/components/stop-header-card.tsx src/shared/components/coordinates-bar.tsx src/shared/components/departure-notification-dialog.tsx src/shared/components/empty-state.tsx src/shared/components/loading-state.tsx`

### Completion Notes List

- Moved repetitive screen-level layout wrappers in departures, stops, and settings to NativeWind `className` utilities while keeping overlays, token-driven visuals, and animated states in `StyleSheet`.
- Migrated shared card, header, coordinates-bar, dialog, empty-state, and loading-state layout scaffolding to NativeWind utilities without changing data flow or product behavior.
- Preserved the mixed-mode styling boundary explicitly: `className` now handles static flex, spacing, sizing, and alignment; `style` still owns gradients, blur layers, colors, absolute-fill objects, and other dynamic visual treatment.
- Verified touch-target coverage with the existing settings and map-marker tests, including the 44x44 clear-action regression that was caught and fixed during this refactor.
- Re-ran targeted UI suites plus `pnpm lint`, `pnpm typecheck`, `pnpm format:check`, and `pnpm check`; all passed.
- Touched-file LOC reduced from `3064` to `2829` for a net reduction of `235` lines.
- Used `docs/showcase-reference/CoordinatesBar.png`, `DepartureCard.png`, `DepartureNotificationDialog.png`, `ErrorBanner.png`, `GlassCard.png`, `MapMarker.png`, `StopCard.png`, and `StopHeaderCard.png` as the regression reference set while keeping component hierarchy and token usage aligned with the existing Showcase surfaces.
- Post-review follow-up restored centered lead-time chip content in settings and the departure reminder dialog, and manual UI verification was accepted as sufficient for final closure.

### File List

- _bmad-output/implementation-artifacts/5-4-ui-styling-consistency-cleanup-with-nativewind.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- src/features/departures/departures-screen.tsx
- src/features/stops/stops-screen.tsx
- src/features/settings/settings-screen.tsx
- src/shared/components/departure-card.tsx
- src/shared/components/stop-card.tsx
- src/shared/components/stop-header-card.tsx
- src/shared/components/coordinates-bar.tsx
- src/shared/components/departure-notification-dialog.tsx
- src/shared/components/empty-state.tsx
- src/shared/components/loading-state.tsx

## Change Log

- 2026-03-12: Refactored targeted screen and shared-component layout scaffolding to NativeWind utilities, preserved token-driven/dynamic styling in `StyleSheet`, reran UI suites and full quality gates, and recorded a `-235` LOC reduction across touched UI files.
- 2026-03-12: Closed the story after fixing review-found lead-time chip alignment regressions in settings and the reminder dialog, with manual UI verification accepted for final sign-off.
