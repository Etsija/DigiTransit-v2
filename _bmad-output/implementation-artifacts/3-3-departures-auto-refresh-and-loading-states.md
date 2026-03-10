# Story 3.3: Departures Auto-Refresh & Loading States

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want departure times to refresh automatically in the background without interrupting my reading,
so that the information stays current without any manual action on my part.

## Acceptance Criteria

1. **Given** the departures screen is open
   **When** the configured departures polling interval elapses (default 10s)
   **Then** `StopDeparturesQuery` re-fetches and the list updates silently — last known data remains visible during the refresh (FR22)
   **And** no blocking spinner appears during auto-refresh (NFR3)

2. **Given** the departures screen opens for the first time for a given stop
   **When** data is loading
   **Then** a skeleton shimmer loading state is shown — not a blank screen or a full-screen ActivityIndicator

3. **Given** the departures query fails during a background refresh
   **When** the error is caught
   **Then** an `ErrorBanner` appears with "DigiTransit API unavailable", the last known departure list remains visible if cached, and TanStack Query retries automatically (NFR9)

4. **Given** the API recovers
   **When** the next retry succeeds
   **Then** the `ErrorBanner` auto-hides and the departure list refreshes without user intervention (NFR10)

## Tasks / Subtasks

- [x] Task 1: Replace the full-screen `LoadingState` with a skeleton shimmer for initial departure loading (AC: 2)
  - [x] Create a `DeparturesSkeleton` component in `src/features/departures/components/departures-skeleton.tsx` that renders 3-4 placeholder card shapes matching `DepartureCard` dimensions
  - [x] Use React Native `Animated` API for a horizontal shimmer effect on the placeholder shapes — no new animation library
  - [x] Replace `showInitialLoader ? <LoadingState ... />` in `departures-screen.tsx` with the skeleton when `!header && isPending`
  - [x] Ensure the skeleton renders inside the existing `ScrollView` panel beneath the back button / title area, matching card spacing from `styles.departuresList`

- [x] Task 2: Add a subtle background-refresh indicator visible during polling re-fetches (AC: 1)
  - [x] Expose `isFetching` from the `useStopDepartures` hook return value (TanStack Query already provides it — just destructure and forward)
  - [x] Add a small, non-blocking refresh indicator in the departures screen — a thin animated bar or a subtle `ActivityIndicator` near the departures list header — visible only when `isFetching && !isPending` (background refresh, not initial load)
  - [x] The indicator must not shift layout, block interaction, or obscure departure cards (NFR3: touch response < 100ms, no blocking spinners)
  - [x] The indicator should disappear when `isFetching` becomes false

- [x] Task 3: Handle error-during-refresh with cached data preservation (AC: 3, 4)
  - [x] Adjust the departures screen error handling so that when `isError` is true but cached data exists (`header` and `departures` are still available from the previous successful fetch), the `ErrorBanner` shows **above** the existing departure list instead of replacing it
  - [x] Keep the current `ErrorBanner` behavior for the case where the initial fetch fails (no cached data) — show error + empty state as before
  - [x] Verify that TanStack Query's built-in retry with exponential backoff (already configured in `query-client.ts`: 3 retries, `min(1000 * 2^attempt, 30000ms)` delay) handles automatic recovery
  - [x] When recovery succeeds, the `ErrorBanner` auto-hides because `isError` becomes false and `data` refreshes — no manual state management needed

- [x] Task 4: Add focused tests for auto-refresh, skeleton, and error-recovery behavior (AC: 1, 2, 3, 4)
  - [x] Test: skeleton shimmer renders when `isPending` and no cached data exists
  - [x] Test: skeleton is replaced by departure cards once data arrives
  - [x] Test: background refresh indicator is visible when `isFetching && !isPending`
  - [x] Test: background refresh indicator is hidden when not fetching
  - [x] Test: cached departure cards remain visible when a background refetch errors
  - [x] Test: `ErrorBanner` appears alongside cached cards on background error
  - [x] Test: `ErrorBanner` disappears when data recovery succeeds
  - [x] Test: no blocking spinner or `LoadingState` appears during background refresh

## Dev Notes

### Story Foundation

- This is the final story in Epic 3, completing the departures feature's core behavior.
- Story 3.1 built the route shell, stop header, static backdrop, and navigation contract.
- Story 3.2 added departure card rendering with realtime/scheduled distinction and the ticking time-to-departure counter.
- Story 3.3 adds the polish layer: skeleton initial loading, non-blocking background refresh, and resilient error handling with cached data.
- FR22 (auto-refresh at configured interval) and NFR3 (UI remains interactive during background fetch) are the controlling requirements.
- NFR9 (auto-retry with exponential backoff, max 3 retries) and NFR10 (auto-recovery when API restores) govern the error resilience behavior.

### Technical Requirements

- **Auto-refresh is already working.** The `useStopDepartures` hook at `src/features/departures/hooks/use-stop-departures.ts` already configures `refetchInterval: departuresPollingIntervalSeconds * 1000` (default 10s, range 5-300s from settings store). TanStack Query handles continuous polling automatically. This story does NOT need to add polling infrastructure — it needs to make the UI respond correctly to the states that polling creates.
- **TanStack Query v5 state flags to use:**
  - `isPending` = true when no cached data exists and the query is fetching (initial load). Use this to show the skeleton.
  - `isFetching` = true whenever any request is in-flight, including background refetches. Use `isFetching && !isPending` for the background refresh indicator.
  - `isError` = true when the most recent fetch failed. Cached data from a previous successful fetch remains available in `data` even when `isError` is true — this is key to AC 3.
  - `data` = the last successful result. It persists across refetch errors because TanStack Query keeps the previous data until a new successful response replaces it.
- **Do not add manual fetch orchestration.** No `queryClient.fetchQuery()`, no custom retry loops, no `useEffect` polling. Let TanStack Query's `refetchInterval` + built-in retry handle everything.
- **Query client retry config** (already in `src/core/api/query-client.ts`):
  - `retry: 3`
  - `retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30000)` (1s, 2s, 4s)
  - Rate-limit awareness for 403 responses
  - These satisfy NFR9 without any changes.
- **Settings store reactivity** is already wired. When `departuresPollingIntervalSeconds` changes in Zustand, the hook re-evaluates and TanStack Query picks up the new interval. No additional wiring needed for Story 4.1 compatibility.
- Preserve the existing query-key contract `queryKeys.departures.stop(stopId)` in `src/core/api/query-keys.ts`.
- Keep using `normalizeStopDepartures` as the `select` function — do not add a separate normalization layer.

### Architecture Compliance

- Follow the feature-first structure:
  - New skeleton component goes in `src/features/departures/components/departures-skeleton.tsx` (this is the first file in this directory — the architecture planned for it)
  - Screen changes remain in `src/features/departures/departures-screen.tsx`
  - Hook changes (if any) remain in `src/features/departures/hooks/use-stop-departures.ts`
- Keep server state exclusively in TanStack Query. Do not introduce Zustand state for refresh/error tracking — use query status flags directly.
- Do not regress Story 3.1 or 3.2 behavior:
  - Static `expo-image` backdrop stays
  - `CoordinatesBar` stays
  - Stop header stays pinned above departures
  - Back navigation stays one-tap via `router.back()`
  - Departure cards retain their realtime/scheduled visual distinction and ticking countdown
  - The departures route remains a push route, not a tab
- The shared `ErrorBanner` at `src/shared/components/error-banner.tsx` already handles animated entrance and `accessibilityLiveRegion="polite"`. Reuse it as-is for the error-during-refresh case.
- Treat generated GraphQL files in `src/generated/` as read-only. No query changes are needed for this story.

### Library / Framework Requirements

- Stay on the current repo stack. No new dependencies for this story.
- **Skeleton shimmer:** Use React Native `Animated` API (already available, no import needed beyond `react-native`). Create a horizontal shimmer using `Animated.loop` + `Animated.timing` with a translated opacity gradient. Do NOT add `react-native-skeleton-placeholder`, `react-content-loader`, or any third-party skeleton library.
- **Background refresh indicator:** Use a small `ActivityIndicator` (from `react-native`) or a thin animated bar. Keep it minimal and non-blocking. The UX spec says "subtle indicator only" for background refresh.
- Use theme tokens from `src/shared/theme/theme.ts` for all colors, spacing, and radii. The skeleton cards should use `theme.colors.card.bg` or similar dark token for the placeholder shapes.
- Do not disable font scaling or accessibility features.
- TanStack Query v5 `useQuery` return already includes `isPending`, `isFetching`, `isError`, `data`, `error`. No version upgrade needed.

### File Structure Requirements

- Create:
  - `src/features/departures/components/departures-skeleton.tsx` (new — skeleton shimmer component)
  - Tests in `tests/features/departures/` for skeleton and refresh behavior
- Update:
  - `src/features/departures/departures-screen.tsx` (replace LoadingState with skeleton, add refresh indicator, adjust error handling for cached data)
- Reuse (do not modify):
  - `src/features/departures/hooks/use-stop-departures.ts` (hook already returns all needed state flags from TanStack Query — just destructure `isFetching` in the screen)
  - `src/shared/components/error-banner.tsx`
  - `src/shared/components/departure-card.tsx`
  - `src/shared/components/stop-header-card.tsx`
  - `src/shared/components/coordinates-bar.tsx`
  - `src/core/api/query-client.ts`
  - `src/shared/theme/theme.ts`
- Do not create:
  - A new query or query document
  - A new route
  - Notification scheduling UI (Epic 5)
  - A pull-to-refresh gesture (not in scope for this story)
  - Manual polling/timer logic

### Testing Requirements

- Use the existing Jest + `jest-expo` + React Native Testing Library setup.
- Minimum required coverage:
  - **Skeleton:** Renders when hook returns `isPending: true` and no data; disappears when data arrives
  - **Background refresh indicator:** Visible when `isFetching: true` and `isPending: false`; hidden otherwise
  - **Cached data on error:** Departure cards remain visible when `isError: true` but `data` still holds cached content
  - **ErrorBanner on refresh error:** Shows alongside cached cards, not replacing them
  - **ErrorBanner auto-hide:** Disappears when error clears (simulate recovery by updating mock)
  - **No blocking spinner:** Assert `LoadingState` component is NOT rendered during background refresh (only skeleton for initial load)
- Mock the `useStopDepartures` hook in screen tests to control `isPending`, `isFetching`, `isError`, and `data` independently.
- Keep Story 5.x notification concerns out of this test scope.

### Previous Story Intelligence

- **Story 3.2 completion notes** confirm that the shared `DepartureCard` now supports the full visual language (realtime/scheduled border, time-to-departure countdown, accessibility labels). No changes needed to the card itself.
- **Story 3.2 file list** confirms these are the exact files touched: `departures-screen.tsx`, `use-stop-departures.ts`, `departure-card.tsx`, plus tests. Story 3.3 touches the screen but should not need to modify the hook or card.
- **Story 3.2 noted** that `pnpm format:check` had pre-existing formatting issues in `src/app/stop/[stopId].tsx`, `src/shared/components/stop-header-card.tsx`, and `tests/app/stop-route.test.tsx`. If you encounter these, fix them only if they are in files you are already modifying.
- **Story 3.1 established** that the screen uses `showInitialLoader = !header && departuresQuery.isPending` for the initial loading check. This is the exact condition to replace with the skeleton.
- **Earlier stories consistently used:**
  - Token-driven styling from `theme.ts`
  - Co-located feature components in `src/features/*/components/`
  - Shared primitives from `src/shared/components/`
  - Direct hook-level state flags for UI branching (no intermediate state management)

### Git Intelligence

- Recent commits confirm incremental UI-first progression:
  - `19851f7 feat(ui): Story 3-2 departure cards`
  - `6efc622 feat(ui): Story 3-1 departures screen & stop header`
  - `a49ab05 fix(ui): Also use the blurred map background for Stops view`
- The departures screen is stable from 3.1 + 3.2. This story makes surgical additions (skeleton, refresh indicator, error handling adjustment) without restructuring the screen.
- The highest failure risk is overcomplicating the error handling by introducing manual state management instead of leveraging TanStack Query's built-in cached-data-on-error behavior.

### Latest Technical Information

- TanStack Query v5 `useQuery` provides `isPending` (no cached data, fetching) and `isFetching` (any in-flight request including background refetch) as distinct boolean flags. Using `isFetching && !isPending` is the documented pattern for background refresh indicators. [Source: TanStack Query v5 docs]
- TanStack Query v5 preserves the last successful `data` even when a subsequent refetch fails. This means `isError` can be true while `data` still holds the previous result — the exact behavior needed for AC 3. [Source: TanStack Query v5 docs]
- React Native `Animated.loop` + `Animated.timing` is the standard approach for shimmer/skeleton animations without third-party libraries. [Source: React Native Animated docs]
- `expo-blur` / `expo-glass-effect` and `expo-image` are already in use on this screen. No additional Expo SDK modules are needed.

### Project Structure Notes

- `src/features/departures/components/` does not exist yet. Creating `departures-skeleton.tsx` there follows the architecture plan and establishes the feature component directory for this module.
- The current `LoadingState` component at `src/shared/components/loading-state.tsx` is a full-screen `ActivityIndicator` — not suitable for the skeleton requirement. It should be left as-is for other screens that may need a generic loader. The new `DeparturesSkeleton` is purpose-built for the departures context.
- No changes to `src/core/api/query-client.ts` are needed. The retry config already satisfies NFR9.
- No changes to the GraphQL query document are needed. The same `StopDeparturesQuery` used since Story 3.1 covers all data requirements.

### Implementation Notes

- Recommended implementation order:
  1. Create `DeparturesSkeleton` component with shimmer animation
  2. Replace `LoadingState` usage in `departures-screen.tsx` with `DeparturesSkeleton`
  3. Destructure `isFetching` from `departuresQuery` and add the subtle refresh indicator
  4. Adjust error handling logic to preserve cached cards when `isError && data`
  5. Add tests for all four acceptance criteria
- **Skeleton dimensions:** Match `DepartureCard` approximate height (~80-90px) and use `theme.layout.cardListGap` (12px) between placeholder cards. Use 3-4 skeleton cards to fill the visible area.
- **Refresh indicator placement:** Below the stop header, above the departure cards list. A small `ActivityIndicator` with `size="small"` or a thin animated line works. It should be absolutely positioned or in a fixed-height container to avoid layout shifts.
- **Error handling adjustment is minimal:** The current code shows `ErrorBanner` only when `isError` is true. The change is to also render the departure list when `isError && header && departures.length > 0` — i.e., show both the error banner AND the cached cards simultaneously.

### References

- Epic requirements and story scope: [Source: _bmad-output/planning-artifacts/epics.md#Story-33-departures-auto-refresh--loading-states]
- Product requirements FR22, NFR3, NFR9, NFR10: [Source: _bmad-output/planning-artifacts/prd.md]
- Architecture rules for feature structure, query keys, and TanStack Query usage: [Source: _bmad-output/planning-artifacts/architecture.md]
- UX requirements for loading states, skeleton shimmer, and background refresh: [Source: _bmad-output/planning-artifacts/ux-design-specification.md#loading-states]
- Existing departures screen implementation: [Source: src/features/departures/departures-screen.tsx]
- Existing departures hook with refetchInterval: [Source: src/features/departures/hooks/use-stop-departures.ts]
- Existing query client retry config: [Source: src/core/api/query-client.ts]
- Existing shared error banner: [Source: src/shared/components/error-banner.tsx]
- Existing shared loading state: [Source: src/shared/components/loading-state.tsx]
- Existing theme tokens: [Source: src/shared/theme/theme.ts]
- Previous story (3.2) implementation: [Source: _bmad-output/implementation-artifacts/3-2-departure-cards-with-realtime-vs-scheduled-distinction.md]
- TanStack Query v5 background fetching indicators: [Source: https://tanstack.com/query/v5/docs/framework/react/guides/queries]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `pnpm test -- --runInBand tests/features/departures/departures-screen.test.tsx`
- `pnpm test:ci`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm codegen:check`
- `pnpm format:check`
- `pnpm check`

### Completion Notes List

- Add a departures-specific skeleton component with Animated shimmer and no new dependencies.
- Keep polling behavior in TanStack Query and react only to `isPending`, `isFetching`, and `isError` in the screen.
- Preserve cached departures during refetch errors, then prove the state transitions through screen-level tests.

- Added `DeparturesSkeleton` and replaced the previous full-screen loading state with an in-panel skeleton beneath the screen header.
- Added a non-blocking refresh indicator that appears only during background fetching while cached departures remain visible.
- Moved the error banner into the scroll content so background refresh failures show alongside cached data, while initial failures still show the empty state.
- Expanded departures screen tests to cover skeleton load, silent refresh UI, cached-error preservation, and automatic recovery.
- Updated the showcase screen test to match the current `StopHeaderCard` accessibility contract so the full regression suite passes cleanly.
- Review follow-up: restored the initial-load error banner to the fixed slot beneath `CoordinatesBar` while keeping cached-data errors inline above the departures list.
- Review follow-up: moved the background refresh indicator into a reserved header slot so it never overlays the first departure card.
- Review follow-up: replaced the flat skeleton overlay with a tokenized gradient shimmer and removed hardcoded skeleton colors.

### File List

- src/features/departures/components/departures-skeleton.tsx
- src/features/departures/departures-screen.tsx
- src/shared/theme/theme.ts
- tests/features/departures/departures-screen.test.tsx
- tests/features/showcase-screen.test.tsx

## Senior Developer Review (AI)

### Reviewer

Jyrki

### Date

2026-03-10

### Outcome

Approve

### Findings Addressed

- Restored the initial API error banner to the fixed position beneath `CoordinatesBar` so the original failure behavior remains intact.
- Moved the background refresh affordance into a reserved slot above the list to avoid obscuring departure-card content on narrow screens.
- Reworked the skeleton shimmer to use a moving gradient and theme-backed color tokens instead of hardcoded overlay values.
- Updated focused tests to cover the reviewed behaviors and kept the showcase regression passing.

## Change Log

- 2026-03-10: Implemented Story 3.3 loading-state, background-refresh, and cached-error UI behavior; added focused screen tests; aligned showcase coverage with the current stop-header accessibility label.
- 2026-03-10: Senior developer review fixes applied; initial error placement restored, refresh indicator no longer overlays cards, and skeleton shimmer now uses tokenized gradient styling.
