---
stepsCompleted: ['step-01-init', 'step-02-discovery', 'step-02b-vision', 'step-02c-executive-summary', 'step-03-success', 'step-04-journeys', 'step-05-domain', 'step-06-innovation', 'step-07-project-type', 'step-08-scoping', 'step-09-functional', 'step-10-nonfunctional', 'step-11-polish', 'step-12-complete']
status: complete
completedAt: '2026-03-03'
inputDocuments:
  - 'product-brief-DigiTransit-v2-2026-03-03.md'
  - 'https://github.com/Etsija/DigiTransit (Kotlin Android original — models, features, API, settings)'
workflowType: 'prd'
briefCount: 1
researchCount: 0
brainstormingCount: 0
projectDocsCount: 0
classification:
  projectType: mobile_app
  domain: general
  complexity: medium
  projectContext: greenfield
  platforms: [ios, android, web]
  features:
    - map_view_with_geolocated_stops
    - nearby_stops_list
    - departures
    - settings
  dropped:
    - alerts
  dataFetching: tanstack_query_idiomatic
---

# Product Requirements Document - DigiTransit-v2

**Author:** Jyrki
**Date:** 2026-03-03

## Executive Summary

DigiTransit v2 is a cross-platform (iOS, Android, web) public transit companion app built on React Native + Expo + TanStack Query. It is a ground-up rebuild of a proven Kotlin/Android personal project, consuming the DigiTransit GraphQL API to serve Finnish public transport data. The app's core purpose is a single, fast answer to a recurring question: *"When is the next departure from the stop nearest to me?"*

**Target users:** Commuters and occasional transit riders in Finland who already know their destination and need immediate, frictionless access to nearby stop departures — not a route planner.

**Problem:** Official transit apps (HSL, Reittiopas) are optimised for route planning, making them slow and over-featured for the most common use case: checking what's coming soon to a nearby stop. DigiTransit v2 solves this by exposing only what matters, in the fewest possible taps.

### What Makes This Special

The defining feature is a **map-first tab**: the user's GPS location is centred on a map showing nearby transit stops as colour-coded markers (bus, tram, train, metro, ferry), with marker *size* proportional to proximity — the closest stops are visually dominant with no user action required. The map is fully explorable (pan/zoom) for spatial discovery beyond the immediate vicinity.

The app does not compete with official transit apps on breadth — it wins on *speed of the core task*. Two taps from launch to departure times for the nearest stop. The four-tab structure (Map → Stops → Departures → Settings) reflects deliberate scope discipline: no route planning, no fare purchase, no alerts, no account management.

Targeting web in addition to iOS and Android makes the app accessible without an app store installation.

## Project Classification

| Attribute | Value |
|---|---|
| **Project Type** | Cross-platform mobile + web (React Native / Expo) |
| **Domain** | General — public transport consumer app |
| **Complexity** | Medium — map integration, cross-platform, real-time polling |
| **Project Context** | Greenfield rebuild — new codebase, known domain |
| **Target Platforms** | iOS, Android, Web |
| **API** | DigiTransit GraphQL (Finland public transport) |
| **Data Fetching** | TanStack Query (idiomatic: `refetchInterval`, `useQuery`, etc.) |
| **Reference** | [Etsija/DigiTransit](https://github.com/Etsija/DigiTransit) (Kotlin/Android original) |

## Success Criteria

### User Success

- User launches the app and sees the map with geolocated, colour-coded stops within a few seconds
- User can reach departure times for the nearest stop in two taps from launch
- The app answers "when's my next bus?" without navigating menus or entering destinations
- Stops and departures data refreshes automatically without any user interaction
- When the API is unavailable, the map remains visible with a clear error message (not a crash, not silent failure)

### Business Success

- The app is used daily by the author as a personal transit companion
- All three platforms (iOS, Android, web) are functional and deployable
- The codebase is maintainable — built on stable, idiomatic patterns (Expo + TanStack Query) that require minimal ongoing effort

### Technical Success

- Map + nearest stops visible within a few seconds of launch on a normal mobile connection
- TanStack Query polling: stops `refetchInterval` 20s (default), departures `refetchInterval` 10s (default)
- GPS location acquired and map centred on user within a few seconds of permission grant
- API error state renders gracefully: map shown, error banner displayed, no crash
- Cross-platform: feature-complete on iOS, Android, and web

### Measurable Outcomes

| Metric | Target |
|---|---|
| Time to map + stops visible | ≤ few seconds (normal connection) |
| Taps from launch to departures | 2 |
| Stops polling interval (default) | 20s |
| Departures polling interval (default) | 10s |
| Search radius (default) | 250m |
| Location update interval (default) | 20s |
| API error handling | Map visible + error message, no crash |

## Product Scope

### MVP — Minimum Viable Product

1. **Map tab** — GPS-centred map, nearby stops as colour-coded markers (by transport type), marker size proportional to proximity, explorable (pan/zoom)
2. **Stops tab** — List of nearby stops sorted by distance, showing stop name, code, type, zone, patterns, and next stops
3. **Departures tab** — Per-stop next departures with scheduled vs. realtime indication, headsign, colour-coded departure cards (yellow = estimate, green = realtime GPS)
4. **Settings tab** — Seven configurable values: search radius, location update interval, stops polling interval, departures polling interval, home stop, push notifications toggle, notification lead time
5. **Home stop pin** — User designates one stop as home stop from the Stops tab
6. **Push notifications** — Local notifications when next home stop departure is within configured lead time
7. **Error handling** — API unavailable: map renders, error message shown; GPS unavailable: prompt for permission

### Growth Features (Post-MVP)

- Filter stops on map by transport type (show only trams, only buses, etc.)
- Multiple pinned stops (expand beyond single home stop)
- Share a stop or departure via URL / copy-to-clipboard

### Vision (Future)

- Multi-city/country support — other DigiTransit-compatible cities in Europe
- Home screen widget (iOS/Android) showing next departure from your pinned stop
- Walk time overlay — "you need to leave in X minutes" based on distance to stop

## User Journeys

### Journey 1: The Daily Commuter — Happy Path

**Persona:** Jyrki, 35, software developer in Helsinki. Uses public transport every weekday. Knows his route well but always needs to know *exactly* when the next tram is coming before he commits to putting his shoes on.

**Opening scene:** It's 8:17am. Jyrki is in his hallway, jacket half-on. He has maybe a 3-minute window before he needs to leave to catch the tram. He opens DigiTransit v2.

**Rising action:** The map loads in under two seconds, centred on his GPS location. He immediately sees the tram stop 90m away — a large red marker, prominent because of its proximity. Two smaller bus stop markers sit further out. He taps the tram stop.

**Climax:** The departures screen appears. Next tram: 4 minutes. The departure card is outlined in green — realtime GPS data, not an estimate. He can trust it.

**Resolution:** He finishes putting his jacket on and walks out. Total interaction: under 5 seconds. He didn't open a menu, type anything, or scroll through a route planner. He got the one answer he needed.

*Capabilities revealed: GPS geolocation, map with proximity-sized markers, colour-coding by transport type, tap-to-departures navigation, realtime vs. scheduled departure indication.*

---

### Journey 2: The Explorer — Unfamiliar Area

**Persona:** Same Jyrki, but visiting a friend in Kallio after dinner. It's 10:30pm. He needs to get home but has no idea what stops are nearby or where they go.

**Opening scene:** Standing on an unfamiliar street corner. He'd normally look this up in HSL but dreads the route planner flow. He opens DigiTransit v2 instead.

**Rising action:** The map loads centred on his location. He sees three stops nearby: a large bus stop marker (closest, ~80m) and two smaller tram markers further away. He pans the map slightly north and spots a metro station marker 400m away — something he wouldn't have found from the stops list alone. He taps the bus stop first.

**Climax:** Departures show a bus heading toward the city centre in 3 minutes — but looking at the headsign, it's going the wrong direction. He goes back, taps the tram stop. Next tram toward Hakaniemi in 7 minutes. That works.

**Resolution:** He walks to the tram stop, confident. The map gave him spatial context — not just a list — that let him make an informed choice fast.

*Capabilities revealed: Map pan/zoom, multiple stop types visible simultaneously, marker size as proximity signal, back-navigation from departures to map, headsign display on departures.*

---

### Journey 3: The First-Timer — Friend Onboarding Cold

**Persona:** Mikko, 31, Jyrki's colleague. Jyrki mentions the app over lunch. Mikko installs it that evening while waiting for a bus in Espoo.

**Opening scene:** Mikko opens the app for the first time. He's already standing at a bus stop — he just wants to know if this thing actually works.

**Rising action:** The app requests location permission. Mikko grants it. The map loads, centred on his position. He immediately sees a large bus stop marker almost exactly where he's standing — the app found the right stop without him doing anything. He taps it.

**Climax:** Departures appear. Next bus: 2 minutes. He looks up and sees the bus already rounding the corner.

**Resolution:** Mikko laughs. He got accurate realtime data the very first time he opened the app, with zero learning curve. He keeps it.

*Capabilities revealed: First-launch location permission flow, fast cold-start map load, intuitive tap-to-departures with no onboarding required.*

---

### Sub-case A: API Unavailable

Jyrki opens the app during a DigiTransit outage. The map tile loads normally (it's a separate service) and his GPS location is shown. The stops panel displays a clear error banner: *"DigiTransit API unavailable."* No crash, no white screen, no spinner that never resolves. He understands the situation immediately and closes the app.

*Capabilities revealed: Decoupled map rendering from API data, graceful error state with informative message.*

---

### Sub-case B: Location Permission Denied

A new user declines the location permission prompt. The map loads but defaults to a neutral position (e.g. central Helsinki). The stops list shows an empty state with a message: *"Enable location access to see nearby stops."* No crash, no broken state.

*Capabilities revealed: Permission denial handling, empty state messaging, map functional without GPS.*

---

### Journey Requirements Summary

| Capability | Revealed By |
|---|---|
| GPS geolocation + map centring | Journeys 1, 2, 3 |
| Colour-coded stop markers by transport type | Journeys 1, 2 |
| Marker size proportional to proximity | Journeys 1, 2 |
| Map pan/zoom exploration | Journey 2 |
| Tap stop → departures navigation | Journeys 1, 2, 3 |
| Realtime vs. scheduled departure indication | Journey 1 |
| Headsign display on departures | Journey 2 |
| Back-navigation from departures to map | Journey 2 |
| First-launch location permission flow | Journey 3 |
| API error state (map visible, banner shown) | Sub-case A |
| GPS denied empty state | Sub-case B |

## Domain-Specific Requirements

### Privacy (GDPR)

The app accesses device GPS solely to query the DigiTransit public API. No location data is stored, transmitted to a backend, or shared with third parties beyond the API query itself. No user accounts, no analytics, no persistent personal data. GDPR exposure is minimal for a personal app of this nature.

## Mobile App Specific Requirements

### Project-Type Overview

Cross-platform mobile + web app built with Expo (React Native). Targets iOS and Android via Expo Go and internal builds; web via browser. No App Store or Play Store submission required for current scope.

### Platform Requirements

| Platform | Target | Distribution |
|---|---|---|
| iOS | Expo Go / internal build | Sideload / TestFlight |
| Android | Expo Go / internal build | Sideload / internal APK |
| Web | Modern browsers | Hosted web build |

App Store / Play Store compliance (privacy policy, permission descriptions, review guidelines) is deferred — not required for current scope.

### Device Permissions

| Permission | Required | Purpose |
|---|---|---|
| Location (foreground) | Yes | GPS centring of map, nearby stops query |
| Notifications | Optional (user-controlled) | Home stop departure alerts |

Permission denial handling: location denied → map loads at default position (central Helsinki), empty stops list with prompt; notifications denied → push feature silently unavailable, Settings toggle reflects state.

### Offline Mode

No offline data mode. The app is API-dependent by design. Graceful degradation: map tiles render independently of API; stops and departures show error banner when API is unavailable. No local data caching required for MVP.

### Push Notification Strategy

**Implementation:** Local notifications via `expo-notifications` + `expo-task-manager` background fetch. No backend required — the app polls the DigiTransit API from a background task and triggers a local notification when the next departure from the home stop is within the configured lead time.

**User flow:**
1. User pins a stop as their "home stop" from the Stops tab (long-press or dedicated button)
2. User enables push notifications and sets notification lead time in Settings
3. App registers a background task that periodically checks next departure from home stop
4. Local notification fires: *"Next [route] from [stop name] in [X] minutes"*

**Settings additions:**
- Push notifications toggle (on/off)
- Notification lead time (minutes before departure, e.g. 5 / 10 / 15)
- Home stop display (name of pinned stop, with option to clear)

**Platform notes:**
- Android: notification channel must be created on first launch (`expo-notifications` handles this)
- iOS: system permission prompt required before notifications can be sent
- Web: browser push notifications are out of scope (no service worker / web push required)

### Updated Settings Tab

| Setting | Default | Type |
|---|---|---|
| Search radius | 250m | Configurable |
| Location update interval | 20s | Configurable |
| Stops polling interval | 20s | Configurable |
| Departures polling interval | 10s | Configurable |
| Home stop | None | Pinned from Stops tab |
| Push notifications | Off | Toggle |
| Notification lead time | 10 min | Configurable (when push enabled) |

### Implementation Considerations

- Map: `react-native-maps` (iOS/Android) + Google Maps JS API or Mapbox (web) — requires platform-specific setup
- Background tasks: `expo-task-manager` + `expo-background-fetch` for notification polling
- Notifications: `expo-notifications` with local notification scheduling
- No backend, no authentication, no user accounts required

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**MVP Approach:** Experience MVP — the app must work reliably and feel fast from day one. Success is defined by daily personal use, not user growth metrics. Scope discipline is the primary quality lever: every feature that isn't essential to the core task is deferred.

**Resource requirements:** Solo developer. No backend infrastructure. All complexity is client-side.

### MVP Feature Set (Phase 1)

**Core user journeys supported:**
- Daily commuter: map → tap stop → departures in ≤2 taps
- Explorer: pan map → discover nearby stops spatially
- First-timer: grant location → immediate value, no onboarding

**Must-have capabilities:**

| # | Feature | Notes |
|---|---|---|
| 1 | Map tab — GPS-centred, colour-coded stops, proximity-sized markers | Cross-platform map required |
| 2 | Stops tab — nearby stops list sorted by distance | TanStack Query, 20s refetchInterval |
| 3 | Departures tab — per-stop next departures, realtime vs. scheduled | TanStack Query, 10s refetchInterval |
| 4 | Settings tab — 7 configurable values | Persisted locally |
| 5 | Home stop pin | From Stops tab |
| 6 | Push notifications — local, background-polled | expo-notifications + expo-task-manager |
| 7 | Error states — API unavailable, GPS denied | Graceful degradation |

**Explicit MVP exclusions:** Route planning, fare information, traffic alerts, deep links, web push, store submission, backend/accounts.

### Post-MVP Features (Phase 2 — Growth)

- Filter stops on map by transport type (bus-only, tram-only, etc.)
- Share a stop or departure via URL / copy-to-clipboard
- Multiple pinned stops (expand beyond single home stop)

### Expansion Features (Phase 3 — Vision)

- Multi-city/country support (other DigiTransit-compatible European cities)
- Home screen widget — next departure from home stop without opening app
- Walk time overlay — "leave in X min" based on distance to stop
- App Store / Play Store distribution

### Risk Mitigation Strategy

**Technical risks:**

| Risk | Likelihood | Mitigation |
|---|---|---|
| iOS background fetch unreliable for notifications | High | Document known limitation; consider foreground-only notification as fallback (manual refresh triggers check) |
| Cross-platform map divergence (native vs. web) | Medium | Implement platform-specific map wrappers behind a shared interface; web map may have reduced feature parity |
| DigiTransit API endpoint changes | Low | Centralise API config; monitor DigiTransit developer docs |

**Resource risk:** Solo developer — if push notifications prove too complex on iOS, the feature ships Android-only or is deferred to Phase 2 without blocking the rest of MVP.

## Functional Requirements

### 1. Location & Geolocation

- **FR1:** User can grant location permission on first app launch
- **FR2:** App can acquire the device's current GPS coordinates
- **FR3:** App can centre the map on the user's current location
- **FR4:** App can update the displayed location as the user moves
- **FR5:** User can use the app without granting location permission (map defaults to a fallback position)

### 2. Map View

- **FR6:** User can view a map centred on their current GPS location
- **FR7:** User can see nearby transit stops displayed as markers on the map
- **FR8:** User can distinguish stop type (bus, tram, train, metro, ferry) by marker colour
- **FR9:** User can identify the closest stops by marker size (larger markers = closer stops)
- **FR10:** User can pan and zoom the map to explore stops beyond their immediate vicinity
- **FR11:** User can tap a stop marker on the map to view its departures

### 3. Stop Discovery

- **FR12:** User can view a list of nearby transit stops sorted by distance from current location
- **FR13:** User can see stop name, code, type, zone, distance, patterns, and next stops for each stop in the list
- **FR14:** User can tap a stop in the list to view its departures
- **FR15:** User can pin a stop as their home stop from the stops list
- **FR16:** App can automatically refresh the nearby stops list at the configured interval

### 4. Departure Information

- **FR17:** User can view upcoming departures from a selected stop
- **FR18:** User can see the scheduled departure time for each departure
- **FR19:** User can see a realtime departure estimate when live vehicle tracking data is available
- **FR20:** User can visually distinguish realtime departures from timetable-based estimates
- **FR21:** User can see the route headsign for each departure
- **FR22:** App can automatically refresh the departures list at the configured interval
- **FR23:** User can navigate back from departures to the previous screen

### 5. Home Stop & Push Notifications

- **FR24:** User can designate one stop as their home stop
- **FR25:** User can view their currently pinned home stop in Settings
- **FR26:** User can remove their home stop designation
- **FR27:** User can enable or disable push notifications for home stop departures
- **FR28:** User can configure the notification lead time (minutes before departure)
- **FR29:** App can send a local notification when the next departure from the home stop is within the configured lead time
- **FR30:** User can grant or deny the notification system permission when enabling push notifications

### 6. Settings & Preferences

- **FR31:** User can configure the nearby stops search radius
- **FR32:** User can configure the location update interval
- **FR33:** User can configure the stops list polling interval
- **FR34:** User can configure the departures list polling interval
- **FR35:** User can configure the push notification lead time
- **FR36:** App can persist all settings across sessions
- **FR37:** App can apply default values for all settings on first launch

### 7. Error & Edge Case Handling

- **FR38:** App can display an informative error message when the DigiTransit API is unavailable
- **FR39:** App can display the map independently when the DigiTransit API is unavailable
- **FR40:** App can display an empty state with guidance when location permission is denied
- **FR41:** App can display an empty state when no stops are found within the search radius
- **FR42:** App can handle API failures without crashing or freezing

## Non-Functional Requirements

### Performance

- **NFR1:** Map and nearest stop markers are visible within ~3 seconds of app launch on a normal mobile connection
- **NFR2:** Departures list renders within 2 seconds of selecting a stop
- **NFR3:** The UI remains responsive during background data fetching — no blocking spinners on auto-refresh
- **NFR4:** Background notification polling must not cause measurable UI lag or battery drain in normal use

### Privacy

- **NFR5:** No location data is persisted beyond the active session
- **NFR6:** No user data is transmitted to any server other than the DigiTransit public API
- **NFR7:** All user settings and home stop preference are stored locally on the device (no cloud sync, no analytics)

### Reliability

- **NFR8:** The app must not crash or freeze on API failure, network timeout, or empty API response
- **NFR9:** TanStack Query retry behaviour must handle transient API errors gracefully without user intervention
- **NFR10:** The app must recover automatically when API connectivity is restored after an outage

### Accessibility

- **NFR11:** Stop type marker colours must have sufficient contrast to be distinguishable in direct sunlight on a mobile screen
- **NFR12:** All text must respect the device's system font scale setting (no hardcoded font sizes that prevent scaling)
- **NFR13:** Interactive touch targets (stop markers, list items, buttons) must meet a minimum tap area suitable for outdoor one-handed use

### Integration

- **NFR14:** API polling must use TanStack Query's built-in request deduplication — no duplicate simultaneous requests to the same endpoint
- **NFR15:** The app must handle DigiTransit API rate limiting or throttling responses gracefully (no tight retry loops)
- **NFR16:** The DigiTransit API base URL must be centralised in a single config location to allow easy endpoint updates
