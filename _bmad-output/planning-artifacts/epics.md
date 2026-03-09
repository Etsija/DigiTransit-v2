---
stepsCompleted: ['step-01-validate-prerequisites', 'step-02-design-epics', 'step-03-create-stories', 'step-04-final-validation']
inputDocuments:
  - '_bmad-output/planning-artifacts/prd.md'
  - '_bmad-output/planning-artifacts/architecture.md'
  - '_bmad-output/planning-artifacts/ux-design-specification.md'
  - 'https://github.com/Etsija/DigiTransit/tree/master/app/src/main/graphql/com/etsija/digitransit (v1 GraphQL queries — StopsByRadius.graphql, StopArrDep.graphql)'
---

# DigiTransit-v2 - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for DigiTransit-v2, decomposing the requirements from the PRD, UX Design Specification, and Architecture Decision Document into implementable stories.

## Requirements Inventory

### Functional Requirements

**1. Location & Geolocation**

FR1: User can grant location permission on first app launch
FR2: App can acquire the device's current GPS coordinates
FR3: App can centre the map on the user's current location
FR4: App can update the displayed location as the user moves
FR5: User can use the app without granting location permission (map defaults to a fallback position — central Helsinki)

**2. Map View**

FR6: User can view a map centred on their current GPS location
FR7: User can see transit stops within the configured search radius displayed as markers on the map
FR8: User can distinguish stop type (bus, tram, train, metro, ferry) by marker colour
FR9: User can identify the closest stops by marker size (larger markers = closer stops)
FR10: User can pan and zoom the map to explore stops beyond their immediate vicinity
FR11: User can tap a stop marker on the map to view its departures

**3. Stop Discovery**

FR12: User can view a list of nearby transit stops sorted by distance from current location
FR13: User can see stop name, code, type, zone, distance, patterns, and next stops for each stop in the list
FR14: User can tap a stop in the list to view its departures
FR15: User can pin a stop as their home stop from the stops list (long-press gesture)
FR16: App can automatically refresh the nearby stops list at the configured interval

**4. Departure Information**

FR17: User can view the next departures from a selected stop
FR18: User can see the scheduled departure time for each departure
FR19: User can see a realtime departure estimate when live vehicle tracking data is available
FR20: User can visually distinguish realtime departures from timetable-based estimates (green border + bold + Live GPS label vs amber border + regular weight + Scheduled label)
FR21: User can see the route headsign for each departure
FR22: App can automatically refresh the departures list at the configured interval
FR23: User can navigate back from departures to the previous screen

**5. Home Stop & Push Notifications**

FR24: User can designate one stop as their home stop
FR25: User can view their currently pinned home stop in Settings
FR26: User can remove their home stop designation
FR27: User can enable or disable the home-stop launch notification
FR28: User can configure the default notification lead time (minutes before departure, used as default for departure notification scheduling)
FR29: App can query the home stop's next departure on app launch and immediately fire a local notification showing route, scheduled time, and minutes until departure
FR30: User can grant or deny the notification system permission when enabling push notifications
FR43: User can long-press a departure card to open a notification scheduling dialog for that departure
FR44: User can select a lead time in the notification dialog (5 / 10 / 15 min or the configured default) and confirm to schedule a local notification
FR45: App can fire a local notification at the configured lead time before a user-selected departure's scheduled time, identifying route, headsign, and stop
FR46: User can cancel a previously scheduled departure notification by long-pressing the departure card again

**6. Settings & Preferences**

FR31: User can configure the nearby stops search radius (default: 250m)
FR32: User can configure the location update interval (default: 20s)
FR33: User can configure the stops list polling interval (default: 20s)
FR34: User can configure the departures list polling interval (default: 10s)
FR35: User can configure the push notification lead time (default: 10 min)
FR36: App can persist all settings across sessions
FR37: App can apply default values for all settings on first launch

**7. Error & Edge Case Handling**

FR38: App can display an error banner identifying the DigiTransit API as unavailable when the API cannot be reached
FR39: App can display the map independently when the DigiTransit API is unavailable
FR40: App can display an empty state with guidance when location permission is denied
FR41: App can display an empty state when no stops are found within the search radius
FR42: App can handle API failures without crashing or freezing

### NonFunctional Requirements

**Performance**

NFR1: Map and nearest stop markers are visible within 3 seconds of app launch at the 95th percentile on a normal mobile connection, as measured by in-app timing
NFR2: Departures list renders within 2 seconds of selecting a stop at the 95th percentile, as measured by in-app timing
NFR3: The UI remains interactive during background data fetching — touch response must not exceed 100ms and no blocking spinners must appear on auto-refresh
NFR4: On-launch home stop notification processing must not add more than 50ms to app start time, and must not increase battery consumption beyond what a single API request incurs

**Privacy**

NFR5: No location data is persisted beyond the active session
NFR6: No user data is transmitted to any server other than the DigiTransit public API
NFR7: All user settings and home stop preference are stored locally on the device (no cloud sync, no analytics)

**Reliability**

NFR8: The app must not crash or freeze on API failure, network timeout, or empty API response
NFR9: The app must retry failed API requests automatically with exponential backoff (maximum 3 retries) for transient errors, without user intervention
NFR10: The app must recover automatically when API connectivity is restored after an outage

**Accessibility**

NFR11: Stop type marker colours must meet a minimum WCAG 3:1 contrast ratio against the map background to be distinguishable in direct sunlight on a mobile screen
NFR12: All text must respect the device's system font scale setting (no hardcoded font sizes that prevent scaling)
NFR13: Interactive touch targets (stop markers, list items, buttons) must meet a minimum tap area of 44x44pt to support outdoor one-handed use

**Integration**

NFR14: The app must deduplicate concurrent API requests — no duplicate simultaneous requests to the same endpoint must be issued
NFR15: The app must handle DigiTransit API rate limiting or throttling responses by backing off for a minimum of 30 seconds before retrying, with no more than 3 automatic retries per polling cycle
NFR16: The DigiTransit API base URL must be centralised in a single config location to allow easy endpoint updates

### Additional Requirements

**From v1 GraphQL Queries (reference implementation):**

- `StopsByRadius(lat, lon, radius)` — the exact v1 query shape for nearby stops; fields to carry forward: `distance`, `stop.gtfsId`, `stop.name`, `stop.code`, `stop.zoneId`, `stop.vehicleType`, `stop.parentStation.name`, `stop.patterns[].name`, `stop.patterns[].directionId`, `stop.patterns[].stops[].{gtfsId,code,name}`
- `StopArrDep(id)` — the exact v1 query shape for departures; fields to carry forward: `stoptimesWithoutPatterns[].{scheduledDeparture, realtimeDeparture, realtime, realtimeState, serviceDay, trip.route.shortName, headsign}`; note that actual departure time = `serviceDay + scheduledDeparture` (or `realtimeDeparture` when `realtime === true`)
- `Alerts.graphql` — exists in v1 but alerts are out of scope for v2 MVP; excluded from input documents
- These queries are authored against the DigiTransit Routing API v1 GraphQL schema; the v2 implementation must verify field availability against the live schema during codegen setup

**From Architecture:**

- Repository already initialized with Expo official default starter — no fresh project bootstrap needed; Epic 1 should build on what exists
- GraphQL integration: `@graphql-codegen/client-preset` typed code generation + `graphql-request` execution + TanStack Query orchestration; generated artifacts go to `src/generated/` (read-only)
- Platform-specific map implementations behind a shared interface: `react-native-maps` (iOS/Android) + Mapbox GL JS (web); dark tile style required (Mapbox `dark-v11` or Google Maps Night mode)
- State management split: TanStack Query (all server/remote state) + Zustand with persist middleware (client/settings/home-stop/UI flags); no mixing of concerns
- Local persistence: `@react-native-async-storage/async-storage` with versioned settings schema (`settingsVersion`) and Zod validation; migration path via `migrations.ts`
- Feature-first project structure: `src/features/{map,stops,departures,settings,notifications}`, `src/core/{api,config,errors,platform,store,utils}`, `src/shared/components`, `src/generated/`
- Shared error model: `AppError { kind, message, retryable, cause? }` with `kind` values `network | graphql | permission | empty | unknown`; every async boundary maps to this
- Query key factory tuple convention: `['stops', 'nearby', { lat, lon, radius }]`, `['departures', 'stop', stopId]` — established in `src/core/api/query-keys.ts`
- GraphQL operation naming: `FeatureActionTarget` PascalCase (e.g. `StopsNearbyQuery`, `StopDeparturesQuery`)
- Polling intervals must be user-configurable with sane minimum clamps; settings changes propagate via store selectors + query invalidation without restart
- EAS Build profiles: `development`, `preview`, `production`; CI gates: typecheck, lint, format:check, codegen validation
- Map provider public token managed via Expo env config (`.env` / `.env.example`); no secrets in bundle
- Notification strategy: `expo-notifications` local notifications only; no `expo-task-manager` or background fetch; Pattern 1 = on-launch home stop query fires immediate notification; Pattern 2 = per-departure notification scheduled at `departure time − lead time`
- Web deployment: local testing only (`expo start --web` on localhost); no hosting target in MVP

**From UX Design Specification:**

- Custom design system built on `expo-blur` (BlurView) + React Native StyleSheet + `theme.ts` design token file — no third-party UI component library
- Iconography standard: use the already-included `@expo/vector-icons` package as the sole icon dependency; prefer `Ionicons` for navigation/system icons and `MaterialCommunityIcons` for transport-mode glyphs exposed through a shared icon wrapper
- Glassmorphism aesthetic: frosted glass cards (backdrop blur + semi-transparent dark surface) floating over dark map; glass aesthetic must not be broken by opaque elements
- Transport-type colour tokens (bus `#3B82F6`, tram `#22C55E`, train `#A855F7`, metro `#F97316`, ferry `#06B6D4`) applied consistently across map markers and stop/departure cards
- C+D hybrid card design: surface tint gradient (transport colour at ~11% opacity) as card background + small coloured icon badge (22x22px) in top-left of card body; stop code badge top-right
- Realtime departure treatment: green border (`#4ADE80`) + bold time + `● Live GPS` label; Estimated: amber border (`#FBBF24`) + regular weight + `~ Scheduled` label — distinction must be reinforced by at least two visual properties (colour + weight/icon)
- Status colours reinforced by multiple visual properties; transport types never identified by colour alone (always paired with icon/shape for accessibility)
- Showcase screen: dev-only screen (hidden tap on version number in Settings) rendering all component variants with hardcoded mock data for design iteration before real data wiring
- `CoordinatesBar`: glassy HUD strip (44px height, 12px border-radius) pinned to top of map/stops/departures views showing GPS coordinates + resolved address; shows `Location unavailable` when GPS denied
- Loading states: skeleton shimmer for initial load; last known data shown during auto-refresh with subtle indicator; never blank screen or full-screen blocking spinner
- `ErrorBanner`: slides in below CoordinatesBar on API failure; calm factual language; auto-hides on recovery; announced via `accessibilityLiveRegion="polite"`
- Empty states always explain why + what to do (GPS denied: prompt with link to device Settings; no stops in radius: suggest increasing search radius)
- `accessibilityLabel` on all interactive elements: StopCard (name + type + distance), DepartureCard (time + route + headsign + status), MapMarker (name + type)
- All interactive touch targets >= 44x44px
- System font scaling respected — no hardcoded fontSize values
- Mobile-first; web uses same component tree in `max-width: 480px` centred container
- Map never blocked by loading; data layers appear over already-visible map
- Settings screen: plain functional layout (no glass treatment); save only when values have changed; inline validation
- Tab bar always visible except on Departures view (push navigation, not a tab)
- `DepartureNotificationDialog`: bottom sheet (does not navigate away); pre-selects lead time from Settings; dismiss without confirming is a no-op

### FR Coverage Map

FR1–FR5: Epic 2 — Location & geolocation (GPS acquisition, permission flow, fallback)
FR6–FR11: Epic 2 — Map view (markers, colour coding, proximity sizing, pan/zoom, tap-to-departures)
FR12–FR14: Epic 2 — Stop discovery (nearby list, metadata, tap-to-departures)
FR15: Epic 2 — Home stop pinning gesture (long-press on StopCard)
FR16: Epic 2 — Stops list auto-refresh
FR17–FR23: Epic 3 — Departure times (scheduled, realtime, headsign, auto-refresh, back-nav)
FR24: Epic 2 — Home stop designation (store write)
FR25–FR26: Epic 4 — Home stop in Settings UI (display + clear)
FR27–FR28: Epic 4 — Notification settings (toggle + lead time config)
FR29: Epic 5 — On-launch home stop notification
FR30: Epic 4 (OS permission prompt in Settings toggle) + Epic 5 (usage)
FR31–FR35: Epic 4 — Configurable settings values (search radius, intervals, lead time)
FR36–FR37: Epic 1 — Settings persistence and defaults (settings store foundation)
FR38–FR42: Epic 2 — Error & edge case handling (API error banner, GPS denied, empty states, crash resistance)
FR43–FR46: Epic 5 — Per-departure notification scheduling (long-press, dialog, schedule, cancel)

## Epic List

### Epic 1: App Foundation & Design System

The app launches cleanly on all three platforms with the complete glassmorphism design system visible via a dev-only Showcase screen, a type-safe GraphQL codegen pipeline, TanStack Query client with retry/backoff policies, and a settings store with defaults and AsyncStorage persistence. Closes the gap between current repo state (Expo scaffold, NativeWind, tabs, CI — already done) and a feature-ready foundation.

**FRs covered:** FR36, FR37
**NFRs covered:** NFR8, NFR9, NFR10, NFR14, NFR15, NFR16

---

### Epic 2: Map View, GPS & Nearby Stop Discovery

User opens the app and immediately sees a GPS-centred dark map with colour-coded, proximity-sized stop markers for all nearby stops. User can pan/zoom to explore, browse stops in the sorted Stops list with full metadata, pin a home stop via long-press, and see graceful states when GPS is denied or the API is unavailable.

**FRs covered:** FR1–FR16, FR24, FR38–FR42
**NFRs covered:** NFR1, NFR3, NFR11, NFR12, NFR13

---

### Epic 3: Departure Times

User taps any stop (on map or in list) and immediately sees next departures with an unmistakable realtime vs. scheduled distinction, headsign, and auto-refresh. The core 2-tap path — launch to departure info — is fully operational.

**FRs covered:** FR17–FR23
**NFRs covered:** NFR2, NFR3, NFR12

---

### Epic 4: Settings & Personalization

User configures all 7 app parameters (search radius, location/stops/departures polling intervals, push notifications toggle, notification lead time, home stop display and clearing), with all changes persisting across sessions and immediately affecting behaviour across the app.

**FRs covered:** FR25, FR26, FR27, FR28, FR30, FR31–FR35
**NFRs covered:** NFR7, NFR12

---

### Epic 5: Push Notifications

User receives automatic departure notifications without navigating the app: an on-launch home stop alert fires when the app opens (if home stop is set and notifications enabled), and user can long-press any departure card to schedule a lead-time reminder for a specific departure.

**FRs covered:** FR29, FR30, FR43–FR46
**NFRs covered:** NFR4

---

### Epic 6: Build & Release

The app is buildable and distributable on iOS and Android via EAS Build development, preview, and production profiles, with CI quality gates (typecheck, lint, format:check, codegen validation) enforced on all PRs.

**FRs covered:** (none — delivery infrastructure)
**NFRs covered:** (deployment architecture)

---

## Epic 1: App Foundation & Design System

The app launches cleanly on all three platforms with a type-safe GraphQL codegen pipeline, TanStack Query client with retry/backoff policies, settings store with defaults and AsyncStorage persistence, shared error model, and the complete glassmorphism design system visible via a dev-only Showcase screen. Closes the gap between the current repo state (Expo scaffold, NativeWind, tabs, CI — already done) and a feature-ready foundation.

**FRs covered:** FR36, FR37
**NFRs covered:** NFR8, NFR9, NFR10, NFR14, NFR15, NFR16

---

### Story 1.1: GraphQL Codegen Pipeline & Core API Infrastructure

As a developer,
I want a type-safe GraphQL codegen pipeline and TanStack Query client configured against the DigiTransit Seutu+ (varely) v2 endpoint with API key authentication,
So that all API data fetching is typed at compile time, authenticated, deduplicated, and resilient to transient failures.

**Acceptance Criteria:**

**Given** a valid `EXPO_PUBLIC_DIGITRANSIT_API_KEY` is set in `.env`
**When** `pnpm codegen` is run
**Then** `src/generated/graphql.ts` and `src/generated/gql.ts` are generated from the DigiTransit varely v2 GTFS schema
**And** the generated files contain fully typed operation result and variable types

**Given** the app launches
**When** any component mounts
**Then** a `QueryClient` is available via React context (`QueryClientProvider` wraps the app root in `_layout.tsx`)

**Given** the `graphql-request` client is initialised
**When** any API request is made
**Then** the `digitransit-subscription-key` header is included on every request using the key from `EXPO_PUBLIC_DIGITRANSIT_API_KEY`
**And** the key is never hardcoded in source — only read from env config

**Given** a GraphQL request fails with a network error
**When** TanStack Query retries
**Then** exponential backoff is applied, max 3 retries before the error surfaces (NFR9)
**And** no duplicate concurrent requests are issued for the same query key (NFR14)

**Given** the API returns a rate-limit (403) response
**When** TanStack Query handles it
**Then** retry is delayed a minimum of 30 seconds, max 3 retries per polling cycle (NFR15)

**Given** any API request throws
**When** caught at the query boundary
**Then** normalised into `AppError { kind, message, retryable, cause? }` with kind `network | graphql | permission | empty | unknown` (NFR8)

**Given** the CI pipeline runs
**When** generated files are stale (`.graphql` files changed but codegen not re-run)
**Then** `pnpm codegen:check` fails the build

**Given** `.env` is gitignored
**When** the repo is cloned fresh
**Then** `.env.example` exists with `EXPO_PUBLIC_DIGITRANSIT_API_KEY=` as a placeholder and setup instructions in README

**Technical notes:**
- Endpoint: `https://api.digitransit.fi/routing/v2/varely/gtfs/v1` (centralised in `src/core/config/env.ts` — NFR16)
- API key injected as header `digitransit-subscription-key` in `src/core/api/graphql-client.ts`
- v2 GTFS schema may differ from the v1 Kotlin app queries — codegen will surface any field mismatches as type errors to resolve during this story
- Query keys follow tuple factory pattern in `src/core/api/query-keys.ts`
- Generated artifacts land in `src/generated/` (read-only by convention)

---

### Story 1.2: Settings Store & App Configuration Foundation

As a developer,
I want a type-safe settings store with AsyncStorage persistence and sensible defaults,
So that all user preferences are available app-wide from first launch with no configuration required (FR36, FR37).

**Acceptance Criteria:**

**Given** the app is launched for the first time
**When** the settings store is accessed
**Then** all 7 settings return defaults: search radius 250m, location update interval 20s, stops polling interval 20s, departures polling interval 10s, home stop null, push notifications off, notification lead time 10min (FR37)

**Given** a user changed a setting in a previous session
**When** the app launches again
**Then** the changed value is restored correctly from AsyncStorage (FR36)

**Given** a corrupted or outdated settings entry exists in AsyncStorage
**When** the app loads settings
**Then** it migrates or resets to defaults without crashing, using the `settingsVersion` field (NFR8)

**Given** any setting value is read from the store
**When** it is used in a feature
**Then** it has been validated against the Zod schema and falls back to the default if invalid

**Technical notes:**
- `src/core/store/settings.store.ts` — Zustand store with `persist` middleware (AsyncStorage)
- `src/core/store/migrations.ts` — handles schema version upgrades
- `src/features/settings/schema/settings.schema.ts` — Zod schema for all 7 settings
- Storage keys: `app.settings.v1`, `app.homeStop.v1`

---

### Story 1.3: App Navigation Shell & Route Architecture

As a user,
I want the app to launch with three main tabs (Map, Stops, Settings) and a push-navigable departures route,
So that the core navigation structure is in place and all screens exist as workable stubs.

**Acceptance Criteria:**

**Given** the app launches
**When** the tab bar renders
**Then** three tabs are visible: Map (leftmost), Stops, Settings
**And** Departures is NOT a tab — it is a push route accessed from Map or Stops

**Given** the user taps each tab
**When** the tab activates
**Then** the corresponding stub screen renders without crashing on iOS, Android, and web

**Given** a `stopId` is passed to the departures route `stop/[stopId]`
**When** the screen renders
**Then** a stub departures screen shows the `stopId` param and a back button returns to the previous screen

**Given** the migration from the scaffold structure
**When** it is complete
**Then** `src/app/` contains: `_layout.tsx`, `map.tsx`, `stops.tsx`, `settings.tsx`, `stop/[stopId].tsx`
**And** old scaffold routes (`index.tsx`, `explore.tsx`) are removed

**Technical notes:**
- Expo Router typed params for `stopId` defined in `src/types/navigation.ts`
- Tab bar hidden on the departures push route

---

### Story 1.4: Design System Tokens & Component Library

As a developer,
I want a complete set of design tokens and all custom UI components implemented,
So that all feature screens can be built with a consistent glassmorphism visual language without any hardcoded values.

**Acceptance Criteria:**

**Given** the `theme.ts` design token file
**When** any component references colour, spacing, typography, or radius
**Then** it uses only tokens from `theme.ts` — no hardcoded values appear in component stylesheets

**Given** the `GlassCard` component on iOS and Android
**When** rendered over a dark background
**Then** it displays with native `BlurView` backdrop blur (expo-blur), dark gradient surface, and subtle glass border (`rgba(255,255,255,0.10)`)

**Given** `GlassCard` on web
**When** rendered in a browser
**Then** it uses `backdrop-filter: blur()` CSS with visually equivalent result

**Given** `StopCard` rendered for each of the 5 transport types (bus, tram, train, metro, ferry)
**When** inspected visually
**Then** each renders the correct transport colour as: card gradient tint (~11% opacity background), 22×22px icon badge top-left, stop code badge top-right — the C+D hybrid treatment

**Given** `DepartureCard` in realtime mode
**When** rendered
**Then** it shows a green border (`#4ADE80`), bold departure time, and `● Live GPS` label

**Given** `DepartureCard` in estimated mode
**When** rendered
**Then** it shows an amber border (`#FBBF24`), regular weight time, and `~ Scheduled` label

**Given** all interactive components (StopCard, DepartureCard, MapMarker, tab items, CoordinatesBar)
**When** their tap target is measured
**Then** each is at minimum 44×44pt (NFR13)

**Given** the `GlassTabBar` on iOS and Android
**When** it is rendered at the bottom of the screen
**Then** it respects platform safe-area insets and system navigation areas
**And** it does not overlap Android system navigation controls or the iOS home indicator
**And** the visible bar height follows the UX token target (`layout.tabBarHeight = 64px`) before safe-area padding is added

**Given** the primary app navigation tabs
**When** `GlassTabBar` is rendered
**Then** it shows exactly three visible destinations: Map, Stops, Settings
**And** each tab uses icon-first presentation with a visible text label for clarity and accessibility
**And** Departures remains a push route, not a tab item

**Given** any component requires iconography
**When** an icon is rendered for navigation, status, or transport type
**Then** it uses the shared icon wrapper built on `@expo/vector-icons`
**And** no component imports `Ionicons`, `MaterialCommunityIcons`, or another icon package directly
**And** the tab bar, transport icon badges, and state icons all follow this same centralized icon contract

**Given** any text element
**When** the device system font scale is increased
**Then** text scales correctly with no clipping or overflow (NFR12)

**Components to build:** `GlassCard`, `CoordinatesBar`, `GlassTabBar`, `MapMarker`, `StopCard`, `StopHeaderCard`, `DepartureCard`, `DepartureNotificationDialog`, `ErrorBanner`, `EmptyState`, `LoadingState`

**Technical notes:**
- All tokens sourced from UX Design Specification: transport colours, card surface tokens, typography scale, spacing, border radius, layout constants, status colours
- Design tokens live in a **single file** `src/shared/theme/theme.ts` — not split into separate colors/spacing/typography files. All components import from this one file.
- Iconography lives behind `src/shared/icons/`; use `Ionicons` for app-shell/system icons and `MaterialCommunityIcons` for transport-mode glyphs, all provided via local wrapper components
- `CoordinatesBar`: 44px height, 12px border-radius, capable of displaying coordinate text and a `Location unavailable` state
- `GlassTabBar` replaces/upgrades the existing `app-tabs.tsx` scaffold component
- `GlassTabBar` must consume native safe-area insets so the interactive surface sits above Android navigation buttons / gesture areas and the iOS home indicator
- `GlassTabBar` must implement the Story 1.3 navigation structure exactly: 3 tabs only (`Map`, `Stops`, `Settings`) with icon + label treatment; `Departures` is never rendered as a tab

---

### Story 1.5: Dev Showcase Screen

As a developer,
I want a dev-only Showcase screen that renders all UI components with mock data,
So that the design system can be visually verified and iterated before real API data is wired up.

**Acceptance Criteria:**

**Given** the app is running in development mode
**When** the user taps the version number in Settings 5 times
**Then** the Showcase screen opens

**Given** the Showcase screen
**When** it renders
**Then** it displays all component variants with hardcoded mock data: `GlassCard`, `CoordinatesBar` (normal + location-unavailable), `StopCard` (all 5 transport types × home-pinned/unpinned states), `DepartureCard` (realtime green, estimated amber, notification-scheduled clock badge), `StopHeaderCard`, `MapMarker` (all 5 transport types × normal/tapped), `ErrorBanner`, `EmptyState` (GPS-denied and no-stops-in-radius variants), `DepartureNotificationDialog`

**Given** a design token is changed in `theme.ts`
**When** the app hot-reloads
**Then** all Showcase components reflect the change simultaneously

**Given** the Showcase screen
**When** the user navigates back
**Then** they return to the Settings tab with no navigation side effects

**Given** the app is in production mode
**When** the Settings version number is tapped
**Then** nothing happens — the Showcase is inaccessible in production builds

---

### Story 1.6: Live API Query Validation (Dev Tool)

As a developer,
I want a dev-only live query validation view that runs the actual GraphQL queries against the DigiTransit varely API with hardcoded Finnish coordinates,
So that I can verify the full stack — API key, endpoint, schema, and data shape — is working correctly before wiring queries into feature screens.

**Acceptance Criteria:**

**Given** the Showcase screen is open (dev mode only)
**When** the "Live API" section renders
**Then** it automatically runs `StopsNearbyQuery` with hardcoded coordinates (lat: 60.6310, lon: 24.8610, radius: 500m — Hyvinkää city centre)
**And** displays a loading state followed by results or a clear error — no user interaction required

**Given** the query completes successfully
**When** results are displayed
**Then** at least one stop is returned with a non-empty `name`, a valid `gtfsId`, a recognised `vehicleType`, and a numeric `distance` in metres
**And** the field shapes confirm the v2 GTFS schema matches expectations (catching any discrepancies from the v1 Kotlin app queries)

**Given** a stop from the results
**When** its `gtfsId` is used to run `StopDeparturesQuery`
**Then** at least one departure is returned containing `scheduledDeparture`, `serviceDay`, `realtimeState`, `trip.route.shortName`, and `headsign`
**And** the computed departure time (`serviceDay + scheduledDeparture` formatted as `HH:MM`) is displayed and shows a plausible clock time

**Given** the API key is missing or invalid
**When** the query runs
**Then** the validation view displays a clear error identifying the authentication failure — not a generic crash

**Given** the app is in production mode
**When** the Showcase is inaccessible
**Then** the live query validation and all hardcoded coordinates are also inaccessible — no dev tooling is exposed to production users

**Technical notes:**
- Hardcoded coordinates live in a `DEV_COORDS` constant scoped to the Showcase module only — not imported by any production code path
- Any v2 field name differences from the v1 queries must be resolved in the `.graphql` files during this story before Epic 2 begins
- `serviceDay + scheduledDeparture` time computation implemented in `src/core/utils/date.ts` — reused by Epic 3 departure cards

---

## Epic 2: Map View, GPS & Nearby Stop Discovery

User opens the app and immediately sees a GPS-centred dark map with colour-coded, proximity-sized stop markers for all nearby stops, plus a sorted Stops list with full metadata. User can pan/zoom to explore, pin a home stop via long-press, and sees graceful states when GPS is denied or the API is unavailable.

**FRs covered:** FR1–FR16, FR24, FR38–FR42
**NFRs covered:** NFR1, NFR3, NFR11, NFR12, NFR13

---

### Story 2.1: GPS Location Acquisition & Permission Flow

As a user,
I want the app to acquire my GPS location and handle the permission flow gracefully,
So that the map can centre on where I actually am, and the app works even if I decline (FR1, FR2, FR4, FR5).

**Acceptance Criteria:**

**Given** the app launches for the first time
**When** the map screen appears
**Then** the OS location permission prompt is shown before any map interaction is required (FR1)

**Given** the user grants location permission
**When** GPS coordinates are acquired
**Then** the map centres on the user's position and a location dot is rendered (FR2, FR3)

**Given** the user's position changes while the app is open
**When** the configured location update interval elapses
**Then** the map position and location dot update to reflect the new coordinates (FR4)

**Given** the user denies location permission
**When** the map screen renders
**Then** the map loads at a default fallback position and the `CoordinatesBar` shows `Location unavailable` (FR5)
**And** no crash or broken state occurs

---

### Story 2.2: Map View with Dark Tile Style

As a user,
I want to see a dark-styled map centred on my GPS location,
So that I have a spatial context that pairs correctly with the glassmorphism UI (FR6, FR10).

**Acceptance Criteria:**

**Given** the map screen loads
**When** map tiles render
**Then** a dark tile style is used (Mapbox `dark-v11` on web, equivalent dark style on native)
**And** the map is visible within 3 seconds of app launch at the 95th percentile on a normal mobile connection (NFR1)
**And** the live interactive map is exclusive to the Map tab; Stops and Departures must not mount a live map provider purely for background ambience

**Given** the map is rendered
**When** the user pans or zooms
**Then** the map responds fluidly without blocking the UI thread — touch response does not exceed 100ms (NFR3, FR10)

**Given** the platform is iOS or Android
**When** the map renders
**Then** `react-native-maps` is used via the platform adapter in `src/core/platform/maps/map-view.native.tsx`

**Given** the platform is web
**When** the map renders
**Then** the Mapbox GL JS adapter in `src/core/platform/maps/map-view.web.tsx` is used
**And** the Mapbox public token is read from env config — not hardcoded

---

### Story 2.3: Nearby Stop Markers on Map

As a user,
I want to see nearby transit stops displayed as colour-coded, proximity-sized markers on the map,
So that I can immediately identify the nearest stop and its transport type at a glance (FR7, FR8, FR9).

**Acceptance Criteria:**

**Given** GPS coordinates are available
**When** the `StopsNearbyQuery` completes
**Then** stop markers appear on the map within the configured search radius (default 250m) (FR7)

**Given** a stop marker renders
**When** inspected visually
**Then** its fill colour matches the transport type token: bus `#3B82F6`, tram `#22C55E`, train `#A855F7`, metro `#F97316`, ferry `#06B6D4` (FR8)
**And** each colour meets a minimum WCAG 3:1 contrast ratio against the dark map background (NFR11)

**Given** multiple stops are within the search radius
**When** markers render
**Then** the closest stop has the largest marker (up to `layout.markerSizeNear` 44px) and more distant stops have proportionally smaller markers (down to `layout.markerSizeBase` 28px) (FR9)

**Given** GPS coordinates change or the polling interval elapses
**When** the `StopsNearbyQuery` re-runs
**Then** markers update without a full re-render and the UI remains interactive — no blocking spinner appears (FR16, NFR3)

---

### Story 2.4: Nearby Stops List

As a user,
I want to see a sorted list of nearby stops with full metadata,
So that I can browse and compare stops beyond what is immediately visible on the map (FR12, FR13).

**Acceptance Criteria:**

**Given** GPS coordinates are available
**When** the Stops tab renders
**Then** a list of nearby stops is displayed sorted by distance from current location (FR12)
**And** any map-like background behind the list is a static image only, not a live interactive map surface

**Given** each stop in the list
**When** rendered as a `StopCard`
**Then** it displays: stop name, code, transport type (C+D icon badge), zone, distance in metres, and patterns (route names via the stop) (FR13)
**And** the `StopCard` tap target is at minimum 44×44pt (NFR13)

**Given** the stops polling interval elapses
**When** new data arrives
**Then** the list updates silently — last known data remains visible during refresh with only a subtle indicator (NFR3)

**Given** both the Map markers and the Stops list are mounted
**When** data is fetched
**Then** only one API request is issued — TanStack Query cache serves both (NFR14)

---

### Story 2.5: Home Stop Pinning

As a user,
I want to long-press a stop in the Stops list to pin it as my home stop,
So that I can designate my regular stop for notifications and quick access (FR15, FR24).

**Acceptance Criteria:**

**Given** the Stops list is displayed
**When** the user long-presses a `StopCard`
**Then** a pin affordance appears (context action: "Pin as home stop")

**Given** the user confirms the pin action
**When** the home stop is saved to the store
**Then** the pinned `StopCard` displays a home icon badge
**And** only one stop can be home stop at a time — pinning a new one replaces the previous without a confirmation dialog

**Given** a home stop is already pinned
**When** the user long-presses a different stop and confirms
**Then** the new stop becomes the home stop immediately and the previous stop's badge clears

**Given** a home stop is pinned
**When** the app is closed and relaunched
**Then** the home stop is restored from `app.homeStop.v1` in AsyncStorage

---

### Story 2.6: Map Tap Navigation & Error States

As a user,
I want to tap a stop marker on the map to navigate to its departures, and see clear error states when the API or GPS is unavailable,
So that the critical path is navigable and failures are informative rather than alarming (FR11, FR38–FR42).

**Acceptance Criteria:**

**Given** a stop marker is tapped on the map
**When** the navigation event fires
**Then** the app navigates to `stop/[stopId]` with the correct `gtfsId` passed as the route param (FR11)

**Given** the DigiTransit API is unavailable
**When** the stops query fails
**Then** the map continues to render (map tiles are independent of the API) (FR39)
**And** an `ErrorBanner` slides in below the `CoordinatesBar` with the text "DigiTransit API unavailable" (FR38)
**And** no crash, freeze, or blank screen occurs (FR42)

**Given** the API recovers
**When** TanStack Query retries successfully
**Then** the `ErrorBanner` auto-hides and stop data loads without user intervention (NFR10)
**And** the `ErrorBanner` is announced via `accessibilityLiveRegion="polite"` for screen readers

**Given** location permission is denied
**When** the Stops tab renders
**Then** an `EmptyState` is shown: "Enable location access to see nearby stops" with a link to device Settings (FR40)

**Given** no stops exist within the search radius
**When** the query returns an empty result
**Then** an `EmptyState` is shown: "No stops within [radius]m — try increasing search radius in Settings" (FR41)

---

## Epic 3: Departure Times

User taps any stop (on map or in list) and immediately sees next departures with an unmistakable realtime vs. scheduled distinction, headsign, and auto-refresh. The core 2-tap path — launch to departure info — is fully operational.

**FRs covered:** FR14, FR17–FR23
**NFRs covered:** NFR2, NFR3, NFR12

---

### Story 3.1: Departures Screen & Stop Header

As a user,
I want to see a departures screen when I tap a stop, with the stop's identity clearly presented at the top,
So that I always know which stop I'm looking at and can trust I tapped the right one (FR17, FR23).

**Acceptance Criteria:**

**Given** the user taps a stop marker on the map or a `StopCard` in the Stops list
**When** navigation to `stop/[stopId]` completes
**Then** the departures screen renders with a `StopHeaderCard` at the top showing stop name, code, transport type (C+D tint + icon badge), and zone (FR14)
**And** the screen renders within 2 seconds at the 95th percentile on a normal connection (NFR2)

**Given** the departures screen is open
**When** the user taps the back button
**Then** they return to the previous screen (Map or Stops list) — one tap, no dead ends (FR23)

**Given** the departures screen is open
**When** the tab bar is checked
**Then** the tab bar is hidden — this is a push route, not a tab
**And** any spatial/map backdrop on this screen is a static image only, not a live interactive map surface

---

### Story 3.2: Departure Cards with Realtime vs. Scheduled Distinction

As a user,
I want to see a list of upcoming departures with an unmistakable visual distinction between live GPS data and timetable estimates,
So that I can trust the departure time I am acting on (FR18, FR19, FR20, FR21).

**Acceptance Criteria:**

**Given** the `StopDeparturesQuery` completes
**When** departures render
**Then** each departure shows: route short name, headsign, and departure time formatted as `HH:MM` (computed from `serviceDay + scheduledDeparture`) (FR18, FR21)

**Given** a departure has `realtime: true`
**When** the `DepartureCard` renders
**Then** it shows the realtime departure time (from `realtimeDeparture`), a green border (`#4ADE80`), bold time typography, and a `● Live GPS` label (FR19, FR20)

**Given** a departure has `realtime: false`
**When** the `DepartureCard` renders
**Then** it shows the scheduled departure time, an amber border (`#FBBF24`), regular weight typography, and a `~ Scheduled` label (FR20)

**Given** the departure list renders
**When** inspected for accessibility
**Then** each `DepartureCard` has an `accessibilityLabel` in the format: "[HH:MM], route [shortName] to [headsign], [Live GPS | Scheduled]"
**And** all text respects the system font scale setting (NFR12)

---

### Story 3.3: Departures Auto-Refresh & Loading States

As a user,
I want departure times to refresh automatically in the background without interrupting my reading,
So that the information stays current without any manual action on my part (FR22).

**Acceptance Criteria:**

**Given** the departures screen is open
**When** the configured departures polling interval elapses (default 10s)
**Then** `StopDeparturesQuery` re-fetches and the list updates silently — last known data remains visible during the refresh (FR22)
**And** no blocking spinner appears during auto-refresh (NFR3)

**Given** the departures screen opens for the first time for a given stop
**When** data is loading
**Then** a skeleton shimmer loading state is shown — not a blank screen

**Given** the departures query fails
**When** the error is caught
**Then** an `ErrorBanner` appears with "DigiTransit API unavailable", the last known departure list remains visible if cached, and TanStack Query retries automatically

**Given** the API recovers
**When** the next retry succeeds
**Then** the `ErrorBanner` auto-hides and the departure list refreshes without user intervention (NFR10)

---

## Epic 4: Settings & Personalization

User configures all 7 app parameters (search radius, location/stops/departures polling intervals, push notifications toggle, notification lead time, home stop display and clearing), with all changes persisting across sessions and immediately affecting behaviour across the app.

**FRs covered:** FR25, FR26, FR27, FR28, FR30, FR31–FR35
**NFRs covered:** NFR7, NFR12

---

### Story 4.1: Settings Screen & Configurable Polling/Radius Values

As a user,
I want a Settings screen where I can configure search radius and all polling intervals,
So that I can tune the app to match my connection speed and battery preferences (FR31–FR34).

**Acceptance Criteria:**

**Given** the user taps the Settings tab
**When** the screen renders
**Then** it displays a plain functional layout (no glassmorphism — settings is utility, not spatial) with labelled rows for all 7 configurable values

**Given** the user changes the search radius (FR31)
**When** the new value is saved
**Then** the next `StopsNearbyQuery` uses the updated radius
**And** the value persists across app restarts (NFR7)

**Given** the user changes the location update interval (FR32), stops polling interval (FR33), or departures polling interval (FR34)
**When** the new value is saved
**Then** the corresponding TanStack Query `refetchInterval` updates immediately without requiring an app restart
**And** all values persist across sessions (NFR7)

**Given** any setting input
**When** an invalid value is entered (e.g. below minimum clamp)
**Then** inline validation feedback appears before save — not on submit
**And** the save action is only active when a value has actually changed

**Given** all text in the Settings screen
**When** system font scale is increased
**Then** all labels and values scale correctly with no clipping (NFR12)

---

### Story 4.2: Home Stop Display & Clearing in Settings

As a user,
I want to see my pinned home stop in Settings and be able to clear it,
So that I can manage my home stop designation from a central place (FR25, FR26).

**Acceptance Criteria:**

**Given** a home stop has been pinned (via Epic 2 Story 2.5)
**When** the Settings screen renders
**Then** a read-only row displays the home stop name and transport type (FR25)
**And** a "Clear" action is available next to the home stop name

**Given** the user taps "Clear"
**When** the action completes
**Then** the home stop is removed from the store and from `app.homeStop.v1` in AsyncStorage (FR26)
**And** the Settings row reverts to showing "No home stop set"

**Given** no home stop is set
**When** the Settings screen renders
**Then** the home stop row shows "No home stop set — long-press a stop in the Stops list to pin one"

---

### Story 4.3: Notification Preferences in Settings

As a user,
I want to configure push notification settings — toggle on/off and set my default lead time,
So that I control whether and how early I get departure alerts (FR27, FR28, FR35).

**Acceptance Criteria:**

**Given** the user taps the push notifications toggle when it is currently off
**When** the toggle is activated
**Then** the OS notification permission prompt is shown (FR30)
**And** if permission is granted, the toggle turns on and persists (NFR7)
**And** if permission is denied, the toggle remains off and reflects the system state

**Given** the user taps the push notifications toggle when it is currently on
**When** the toggle is deactivated
**Then** the toggle turns off immediately, home-stop launch notifications cease (FR27), and no OS permission prompt is shown

**Given** push notifications are enabled
**When** the user taps the notification lead time row
**Then** they can set a default lead time in minutes (e.g. 5, 10, 15) which is used as the pre-selected option in the `DepartureNotificationDialog` (FR28, FR35)

**Given** the notification lead time row
**When** push notifications are disabled
**Then** the lead time row is visually dimmed and non-interactive

---

## Epic 5: Push Notifications

User receives automatic departure notifications without navigating the app: an on-launch home stop alert fires when the app opens (if home stop is set and notifications enabled), and user can long-press any departure card to schedule a lead-time reminder for a specific departure.

**FRs covered:** FR29, FR30, FR43–FR46
**NFRs covered:** NFR4

---

### Story 5.1: On-Launch Home Stop Notification

As a user,
I want the app to automatically notify me of the next home stop departure when I open the app,
So that I get the one piece of information I need most without navigating anywhere (FR29).

**Acceptance Criteria:**

**Given** a home stop is set and push notifications are enabled
**When** the app launches and the map tab loads
**Then** the app immediately queries the home stop's next departure via `StopDeparturesQuery`
**And** upon receiving data, fires a local notification: "Next [shortName] from [stop name] at [HH:MM] — in [X] min" (FR29)

**Given** the on-launch notification fires
**When** startup time is measured
**Then** the notification processing adds no more than 50ms to app start time (NFR4)
**And** battery consumption is no greater than a single API request

**Given** the home stop query fails (API unavailable)
**When** the notification would fire
**Then** it is silently skipped — the app continues loading normally with no error shown to the user

**Given** push notifications are disabled in Settings
**When** the app launches with a home stop set
**Then** no notification is fired and no API query for the home stop is made on launch

**Given** no home stop is set
**When** the app launches
**Then** no notification is fired — this feature is a no-op without a home stop

**Technical notes:**
- Uses `expo-notifications` local notifications only — no `expo-task-manager` or background fetch
- Reuses the same `StopDeparturesQuery` from Epic 3 — no duplicate query logic
- Web platform: push notifications are out of scope; this feature is silently skipped on web

---

### Story 5.2: Per-Departure Notification Scheduling

As a user,
I want to long-press a departure card to schedule a reminder notification for that specific departure,
So that I can be alerted before a particular service leaves without watching the screen (FR43, FR44, FR45).

**Acceptance Criteria:**

**Given** the departures screen is open
**When** the user long-presses a `DepartureCard`
**Then** the `DepartureNotificationDialog` bottom sheet opens without navigating away from the departures view (FR43)

**Given** the dialog is open
**When** it renders
**Then** lead time options are shown (5 min, 10 min, 15 min) with the Settings default value pre-selected (FR44)

**Given** the user selects a lead time and confirms
**When** the dialog closes
**Then** a local notification is scheduled for `departure scheduledTime − lead time` via `expo-notifications` (FR45)
**And** the `DepartureCard` displays a small clock badge indicating a notification is scheduled
**And** the notification content reads: "[shortName] to [headsign] departs in [lead time] min from [stop name]"

**Given** the user dismisses the dialog without confirming
**When** the dialog closes
**Then** no notification is scheduled and the `DepartureCard` is unchanged — dismiss is a no-op

**Given** multiple departure notifications are scheduled simultaneously
**When** each scheduled time arrives
**Then** each fires independently and correctly

**Technical notes:**
- Scheduled time is based on `scheduledDeparture` at booking moment — live data is not re-queried at fire time (documented limitation per PRD risk register)
- Web platform: long-press gesture is a no-op on web; no scheduling attempt is made

---

### Story 5.3: Departure Notification Cancellation

As a user,
I want to cancel a scheduled departure notification by long-pressing the same departure card again,
So that I can undo a reminder I no longer need (FR46).

**Acceptance Criteria:**

**Given** a departure notification has been scheduled (clock badge visible on `DepartureCard`)
**When** the user long-presses the same `DepartureCard`
**Then** the `DepartureNotificationDialog` opens in cancel mode: "Cancel notification for this departure?"

**Given** the dialog is in cancel mode
**When** the user confirms cancellation
**Then** the scheduled local notification is cancelled via `expo-notifications`
**And** the clock badge clears from the `DepartureCard`

**Given** the dialog is in cancel mode
**When** the user dismisses without confirming
**Then** the scheduled notification is preserved and the clock badge remains — dismiss is a no-op

**Given** the user navigates away from the departures screen and returns
**When** the `DepartureCard` renders
**Then** the clock badge state is correctly restored — scheduled notification IDs persist across navigation

**Technical notes:**
- Scheduled notification IDs are stored in `src/core/store/ui.store.ts` (Zustand, in-memory only — not persisted to AsyncStorage since notifications are ephemeral per session)
- IDs are keyed by a composite of `stopId + serviceDay + scheduledDeparture` to uniquely identify each departure across navigation

---

## Epic 6: Build & Release

The app is buildable and distributable on iOS and Android via EAS Build development, preview, and production profiles, with CI quality gates (typecheck, lint, format:check, codegen validation) enforced on all PRs.

**FRs covered:** (none — delivery infrastructure)
**NFRs covered:** (deployment architecture)

---

### Story 6.1: EAS Build Profiles

As a developer,
I want EAS Build profiles configured for development, preview, and production,
So that I can build and distribute the app on iOS and Android without App Store submission.

**Acceptance Criteria:**

**Given** `eas.json` is configured
**When** `eas build --profile development --platform android` is run
**Then** a development build is produced with `expo-dev-client` included, installable via sideload

**Given** `eas build --profile preview --platform android` is run
**When** the build completes
**Then** an APK is produced suitable for internal testing (no Play Store submission required)

**Given** `eas build --profile production --platform android` is run
**When** the build completes
**Then** a production-signed AAB is produced

**Given** `eas build --profile development --platform ios` is run
**When** the build completes
**Then** an IPA is produced installable via TestFlight or sideload

**Given** any EAS build profile
**When** the build runs
**Then** `EXPO_PUBLIC_DIGITRANSIT_API_KEY` is sourced from EAS Secrets — not from a committed `.env` file

---

### Story 6.2: CI Quality Gates

As a developer,
I want CI checks to enforce typecheck, lint, formatting, and codegen validation on every PR,
So that code quality is maintained automatically and no stale generated files reach the main branch.

**Acceptance Criteria:**

**Given** a pull request is opened or updated
**When** the CI pipeline runs
**Then** all four gates must pass: `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm codegen:check`
**And** any failure blocks the PR from merging

**Given** `pnpm codegen:check` runs
**When** `.graphql` source files have changed but `src/generated/` has not been regenerated
**Then** the check fails with a clear message indicating which files are stale

**Given** the existing CI workflow
**When** it is reviewed
**Then** `format:check` and `codegen:check` gates are added if not already present, completing the four-gate suite
