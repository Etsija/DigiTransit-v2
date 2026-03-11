# Story 4.2: Home Stop Display & Clearing in Settings

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to see my pinned home stop in Settings and be able to clear it,
so that I can manage my home stop designation from a central place.

## Acceptance Criteria

1. **Given** a home stop has been pinned via the Stops screen
   **When** the Settings screen renders
   **Then** a read-only row displays the home stop name and transport type
   **And** a `Clear` action is available next to the home stop name

2. **Given** the user taps `Clear`
   **When** the action completes
   **Then** the home stop is removed from the Zustand settings store
   **And** `app.homeStop.v1` is removed from AsyncStorage
   **And** the Settings row reverts to showing `No home stop set`

3. **Given** no home stop is set
   **When** the Settings screen renders
   **Then** the home stop row shows `No home stop set — long-press a stop in the Stops list to pin one`

4. **Given** the home stop row is shown with or without a pinned stop
   **When** system font scale is increased or a screen reader reads the Settings screen
   **Then** the row content, transport-type cue, and `Clear` action remain readable, accessible, and do not regress the plain functional Settings layout

## Tasks / Subtasks

- [x] Task 1: Replace the temporary Settings home-stop placeholder with the real read-only row and empty-state guidance (AC: 1, 3, 4)
  - [x] Update `src/features/settings/settings-screen.tsx` so the existing `Home stop` row no longer says Story 4.2 is pending
  - [x] Display the pinned stop name from `useSettingsStore((state) => state.homeStop)`
  - [x] Show the transport type alongside the stop name using existing transport-mode terminology already used in Stops and shared UI
  - [x] When no home stop exists, render the exact guidance copy from the story acceptance criteria
  - [x] Keep the row visually read-only apart from the explicit `Clear` action and preserve the plain utility-first Settings styling

- [x] Task 2: Wire the `Clear` action through the existing settings store and persistence adapter without adding a parallel storage path (AC: 2)
  - [x] Reuse `updateSettings({ homeStop: null })` from `src/core/store/settings.store.ts`
  - [x] Do not call AsyncStorage directly from the Settings screen; let the existing persistence layer in `src/core/store/home-stop-storage.ts` remove `app.homeStop.v1`
  - [x] Ensure the Settings row updates immediately after clearing without requiring app restart or manual refresh
  - [x] Preserve the current storage contract where `homeStop` is not duplicated in `app.settings.v1`

- [x] Task 3: Reuse existing transport and pinning patterns instead of inventing new home-stop models or styling (AC: 1, 4)
  - [x] Keep the home-stop data shape aligned with `homeStopSchema` in `src/features/settings/schema/settings.schema.ts`
  - [x] Reuse existing transport-mode labels/colors/icons where practical so Settings matches the stop card and map marker vocabulary
  - [x] Do not add a second home-stop feature store, route, or confirmation flow
  - [x] Keep the one-home-stop-at-a-time behavior established in the Stops screen

- [x] Task 4: Add focused regression tests for Settings rendering, clearing behavior, and storage invariants (AC: 1, 2, 3, 4)
  - [x] Extend `tests/features/settings/settings-screen.test.tsx` to cover populated and empty home-stop states
  - [x] Assert the Settings screen shows the pinned stop name, transport type, and `Clear` action when `homeStop` exists
  - [x] Assert tapping `Clear` calls `updateSettings({ homeStop: null })` and the UI falls back to the empty-state guidance
  - [x] Add or update store persistence coverage in `tests/core/settings.store.test.ts` if needed so the canonical `app.homeStop.v1` removal path stays protected

## Dev Notes

### Story Foundation

- Epic 4 owns the Settings and personalization surface. Story 4.1 already built the real Settings screen shell and left `Home stop` as a read-only placeholder specifically for this story.
- Story 4.2 is intentionally narrow: surface the already-pinned home stop in Settings and provide a clear path to remove it.
- Pinning already exists in Epic 2 Story 2.5 through the Stops screen long-press flow. This story must build on that implementation instead of recreating pin/unpin behavior elsewhere.

### Technical Requirements

- **Use the existing settings store.** `homeStop` already lives in `src/core/store/settings.store.ts` and is exposed through `useSettingsStore`.
- **Use the existing persistence adapter.** `src/core/store/home-stop-storage.ts` already strips `homeStop` out of the persisted settings payload, writes the canonical value to `HOME_STOP_STORAGE_KEY`, and removes that key when `homeStop` becomes `null`.
- **Do not call AsyncStorage from the screen.** The screen should only dispatch `updateSettings({ homeStop: null })`; persistence side effects belong in the storage adapter.
- **Keep the current schema and shape.** `src/features/settings/schema/settings.schema.ts` defines `homeStop` as `{ gtfsId, name, transportMode } | null` and also handles legacy migration from `vehicleType`.
- **Preserve settings hydration behavior.** Store hydration and migration are already handled by Zustand persist middleware plus the custom storage shim. Do not add bespoke hydration flags or one-off reads for this story.

### Architecture Compliance

- Client persisted state belongs in Zustand + AsyncStorage under `src/core/store`; keep this story inside that boundary.
- FR25-FR26 map across `features/settings` and `core/store`. Notification features remain out of scope until Story 4.3 and Epic 5.
- Settings changes should propagate through selectors and persistence, not through route reloads or manual storage syncing.
- Keep the Settings route structure established by Story 4.1:
  - route wrapper: `src/app/settings.tsx`
  - main screen implementation: `src/features/settings/settings-screen.tsx`

### Library / Framework Requirements

- Continue using React Native `Pressable` for the clear affordance. Official React Native 0.84 docs still document `Pressable` as the core component for handling `onPress`, `onLongPress`, and expanded touch regions via `hitSlop`; that remains compatible with the repo's React Native `0.83.2` baseline.
- Continue using the existing Zustand persist approach. Current Zustand persist documentation still supports the exact options already used in this repo: `partialize`, `onRehydrateStorage`, `version`, `migrate`, and `merge`.
- Continue using AsyncStorage through the existing adapter. Current AsyncStorage API docs still define `getItem`, `setItem`, and `removeItem` as promise-based primitives, which matches the adapter implementation in `src/core/store/home-stop-storage.ts`.
- No new dependency is justified for this story.

### File Structure Requirements

- Update:
  - `src/features/settings/settings-screen.tsx`
  - `tests/features/settings/settings-screen.test.tsx`
- Likely verify or extend:
  - `tests/core/settings.store.test.ts`
- Reuse as-is:
  - `src/core/store/settings.store.ts`
  - `src/core/store/home-stop-storage.ts`
  - `src/features/settings/schema/settings.schema.ts`
  - `src/features/stops/stops-screen.tsx`
  - `src/features/stops/components/home-stop-button.tsx`
  - `src/shared/components/stop-card.tsx`
- Do not create:
  - a second home-stop storage key
  - direct AsyncStorage calls in the Settings UI
  - a dedicated home-stop management screen
  - a confirmation modal unless implementation reveals an accessibility need not covered by the existing explicit `Clear` action

### Testing Requirements

- Extend Settings UI tests to cover both populated and empty home-stop states.
- Keep store-level guarantees around canonical persistence:
  - `homeStop` writes to `app.homeStop.v1`
  - `homeStop` is not duplicated inside `app.settings.v1`
  - clearing `homeStop` removes `app.homeStop.v1`
- Preserve accessibility expectations:
  - stable labels for the home-stop row and clear action
  - touch target at least 44x44
  - readable text under increased font scale
- Avoid brittle tests that inspect AsyncStorage from the component layer; verify persistence at the store layer and UI behavior at the screen layer.

### Previous Story Intelligence

- Story 4.1 already established the Settings route structure, bottom utility section, save-footer behavior, and placeholder read-only rows for `Home stop`, `Push notifications`, and `Notification lead time`.
- Story 4.2 should make a surgical change inside the existing Settings screen rather than restructuring the screen or revisiting 4.1's editable numeric controls.
- Because 4.1 deliberately deferred this behavior, the main regression risk is leaving outdated placeholder copy or introducing a second interaction pattern that conflicts with the Stops-screen pinning flow.

### Git Intelligence

- `but status` shows Epic 4 already contains commit `800eaa3 feat(ui): Story 4-1 settings screen and configurable polling radius`.
- That commit added `src/features/settings/settings-screen.tsx`, updated the route wrapper, and introduced focused Settings tests. Follow that incremental pattern: extend the existing feature screen and tests instead of moving files again.

### Latest Tech Information

- React Native docs updated February 20, 2026 still document `Pressable` with `onPress`, `onLongPress`, `hitSlop`, and `pressRetentionOffset`. For this story, that confirms the existing repo pattern for button-like affordances remains current. Source: https://reactnative.dev/docs/pressable
- AsyncStorage docs still define `getItem` returning a stored string or `null`, and `removeItem` as the supported targeted deletion API. That aligns with keeping `app.homeStop.v1` cleanup inside the storage adapter rather than inventing a custom deletion mechanism. Source: https://react-native-async-storage.github.io/async-storage/docs/api
- Zustand persist docs still document `partialize`, `onRehydrateStorage`, `version`, `migrate`, and `merge`. That confirms the current `createSettingsStore` persistence strategy remains the correct integration point for home-stop cleanup and migration behavior. Source: https://zustand.docs.pmnd.rs/integrations/persisting-store-data

### Implementation Notes

- Recommended implementation order:
  1. Replace the placeholder Home stop row with a real populated/empty row presentation
  2. Add the `Clear` action wired to `updateSettings({ homeStop: null })`
  3. Refine accessibility labels and transport-type copy
  4. Add Settings screen tests for populated and cleared states
  5. Add or tighten store persistence tests for home-stop removal if current coverage is insufficient
- The most likely failure mode is bypassing the existing persistence adapter with direct AsyncStorage calls from the UI. Avoid that.
- The second likely failure mode is regressing Story 2.5 behavior by introducing conflicting copy or assumptions about how a home stop is created. Creation remains in the Stops screen, not Settings.

### Project Structure Notes

- The live codebase already centralizes home-stop persistence in the settings store even though the actual storage key is separate (`app.homeStop.v1`). Treat that as the canonical contract.
- `StopCard` already exposes pinned-stop accessibility and transport-mode vocabulary. Reuse that language where helpful so Settings stays consistent with the rest of the app.
- No `project-context.md` file was found in the repository, so there are no additional project-context constraints beyond the planning artifacts and current code.

### References

- Epic 4 Story 4.2 definition and acceptance criteria: [Source: _bmad-output/planning-artifacts/epics.md]
- PRD updated Settings table and home-stop requirements: [Source: _bmad-output/planning-artifacts/prd.md]
- UX requirement that Home stop is read-only with a `Clear` action: [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Settings-Form]
- Architecture mapping for settings persistence and home-stop boundaries: [Source: _bmad-output/planning-artifacts/architecture.md]
- Existing Settings screen placeholder rows: [Source: src/features/settings/settings-screen.tsx]
- Existing store persistence flow: [Source: src/core/store/settings.store.ts]
- Canonical home-stop storage adapter and key removal behavior: [Source: src/core/store/home-stop-storage.ts]
- Home-stop schema and transport-mode migration rules: [Source: src/features/settings/schema/settings.schema.ts]
- Existing pin/unpin flow from the Stops screen: [Source: src/features/stops/stops-screen.tsx]
- Existing pin/unpin affordance copy: [Source: src/features/stops/components/home-stop-button.tsx]
- Existing store tests protecting home-stop persistence: [Source: tests/core/settings.store.test.ts]
- Existing Settings screen tests to extend: [Source: tests/features/settings/settings-screen.test.tsx]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `but status`
- `git log --oneline -5`
- `git show --stat --oneline 800eaa3`
- `rg -n "Story 4\\.2|Story 4\\.3|Epic 4" _bmad-output/planning-artifacts/epics.md`
- `rg -n "home stop|Home stop|Settings" _bmad-output/planning-artifacts/prd.md _bmad-output/planning-artifacts/architecture.md _bmad-output/planning-artifacts/ux-design-specification.md`
- `rg -n "homeStop|HOME_STOP_STORAGE_KEY|app\\.homeStop\\.v1|transportMode|Clear|Not set" src tests`
- `pnpm test -- --runInBand tests/features/settings/settings-screen.test.tsx tests/core/settings.store.test.ts`
- `pnpm test -- --runInBand tests/app/navigation-routes.test.tsx tests/features/settings/settings-screen.test.tsx tests/features/stops/stops-screen.test.tsx tests/core/settings.store.test.ts`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test:ci`

### Completion Notes List

- Created the implementation-ready story for surfacing and clearing the pinned home stop from Settings.
- Anchored the story to the existing Zustand store, canonical AsyncStorage adapter, and Stops-screen pinning behavior to prevent duplicate persistence logic.
- Included focused testing guardrails for both screen behavior and store-level storage invariants.
- Included current official-doc checks for React Native `Pressable`, AsyncStorage, and Zustand persist behavior relevant to this story.
- Replaced the temporary Settings home-stop placeholder with a real read-only row that shows the pinned stop name, transport type, and an explicit `Clear` action.
- Wired the clear interaction through `updateSettings({ homeStop: null })`, preserving the existing persistence adapter contract instead of adding UI-level AsyncStorage handling.
- Added Settings screen coverage for empty and populated home-stop states and added a store regression test confirming `app.homeStop.v1` is removed when the home stop is cleared.
- Verified the change with focused tests, relevant route/stops regressions, lint, typecheck, and the full Jest suite.

### File List

- _bmad-output/implementation-artifacts/4-2-home-stop-display-and-clearing-in-settings.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- src/features/settings/settings-screen.tsx
- tests/core/settings.store.test.ts
- tests/features/settings/settings-screen.test.tsx

## Senior Developer Review (AI)

- 2026-03-11: Requested fixes for story/implementation drift before approval.
- Fixed the Settings empty-state copy to match the accepted story text exactly.
- Reworked the home-stop row to reuse the app's existing transport and pinned-home visual vocabulary while preserving the plain Settings layout.
- Added explicit accessibility coverage for the home-stop summary and clear-action minimum touch target.
- Outcome: approved.

### Change Log

- 2026-03-11: Implemented Settings home-stop display and clearing, added UI regression coverage, added canonical storage-key removal coverage, and validated the full test suite before marking the story ready for review.
- 2026-03-11: Applied code-review fixes for exact empty-state copy, home-stop transport/pinned cues, and home-stop accessibility coverage; story approved and marked done.
