---
stepsCompleted: ['step-01-init', 'step-02-discovery', 'step-02b-vision', 'step-02c-executive-summary', 'step-03-success', 'step-04-journeys', 'step-05-domain', 'step-06-innovation', 'step-07-project-type', 'step-08-scoping', 'step-09-functional', 'step-10-nonfunctional', 'step-11-polish', 'step-12-complete']
status: complete
completedAt: '2026-03-03'
lastEdited: '2026-03-07'
editHistory:
  - date: '2026-03-07'
    changes: 'Added Journey 6 (Home Stop Setup & Settings); refined FR7, FR17, FR38; strengthened NFR1-4, 9, 11, 13-15 measurability; removed library names from NFR9/14'
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
4. **Settings tab** — Core configurable controls: search radius, location update interval, stops polling interval, departures polling interval, home stop, push notifications master toggle, home-stop launch notification toggle, notification lead time
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

### Journey 4: The Home Stop — Morning at Any Location

**Persona:** Jyrki, at home or elsewhere in the world. He has pinned his regular tram stop as his home stop.

**Opening scene:** It's 7:55am. Jyrki is getting ready and hasn't left yet. He opens DigiTransit v2.

**Rising action:** The map tab loads. The app immediately fires a local notification: *"Next tram from Eerikinkatu: route 6 at 08:04 — in 9 minutes."* He didn't navigate anywhere, didn't tap anything.

**Climax:** He reads the notification from the lock screen or notification drawer. 9 minutes. That's enough time.

**Resolution:** He closes the app. He got the single most relevant piece of information without opening the app past the splash. He leaves in 7 minutes.

*Capabilities revealed: On-launch home stop query, immediate local notification with route and time-until-departure, notification works regardless of current GPS location.*

---

### Journey 5: The Departure Alarm — Choosing a Specific Train

**Persona:** Jyrki at the railway station, browsing departures from Helsinki Central. He knows he wants to catch the 14:32 intercity train but needs to do something first.

**Opening scene:** He's looking at the Departures view for Helsinki Central. He can see several trains. He wants to be reminded before the 14:32 leaves.

**Rising action:** He long-presses the departure card showing *"IC 61 → Tampere, 14:32"*. A dialog appears: *"Notify me before this departure? 5 min / 10 min / 15 min / Cancel."* He taps *"10 min"*.

**Climax:** At 14:22, his phone fires a notification: *"IC 61 to Tampere departs in 10 minutes from Helsinki Central."* He wraps up what he was doing and walks to the platform.

**Resolution:** He boards with time to spare. He chose a specific departure, not a general polling interval — the app did exactly what he asked and nothing more.

*Capabilities revealed: Long-press departure card gesture, notification scheduling dialog, lead time selection, local notification fired at the scheduled time.*

---

### Journey 6: The Setup — Pinning Home Stop and Configuring the App

**Persona:** Jyrki, day two of using the app. The core flow works well. He now wants to set his regular tram stop as his home stop so the app notifies him on launch, and he wants to tighten the search radius so only stops within walking distance appear.

**Opening scene:** He opens DigiTransit v2 at home. He knows his tram stop is the one 90m away. He switches to the Stops tab.

**Rising action:** The stops list loads sorted by distance. The nearest entry is "Eerikinkatu" — 90m away, tram icon, green zone. He long-presses the row. A context menu appears: *"Pin as home stop."* He taps it. A pin icon appears next to the stop name confirming it's set.

He taps the Settings tab. He sees the full set of controls. He taps "Search radius" and changes it from 250m to 150m — enough to see stops he can realistically walk to, but not ones two blocks over that would never be his choice. He taps "Push notifications" — it's off. He taps it to toggle on. The OS permission prompt appears; he grants it. The toggle turns blue.

**Climax:** He taps "Notification lead time" and sets it to 8 minutes — his walk to the tram stop takes 7. He leaves Settings. The next morning, when he opens the app, a notification fires immediately: *"Next tram from Eerikinkatu: route 6 at 08:04 — in 9 minutes."* He didn't navigate to anything.

**Resolution:** Two minutes of configuration, zero daily effort. The app now works the way he thinks — his stop, his radius, his lead time.

*Capabilities revealed: Long-press stop → pin as home stop, home stop display in Settings, home stop clearing, push notifications master toggle (with OS permission prompt), dedicated home-stop launch notification toggle, notification lead time configuration, search radius configuration, settings persistence across sessions.*

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
| On-launch home stop notification | Journey 4 |
| Long-press departure → notification dialog | Journey 5 |
| Departure notification scheduling with lead time | Journey 5 |
| Scheduled local notification fires before departure | Journey 5 |
| Long-press stop → pin as home stop | Journey 6 |
| Home stop display and clearing in Settings | Journey 6 |
| Push notifications toggle + OS permission prompt | Journey 6 |
| Notification lead time configuration | Journey 6 |
| Search radius configuration | Journey 6 |
| Settings persistence across sessions | Journey 6 |

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

Two distinct notification patterns, both using local notifications via `expo-notifications`. No background task manager or backend required.

**Pattern 1 — Home stop notification on app launch**

When the app opens and a home stop is configured with notifications enabled:
1. App queries the DigiTransit API for the next departure from the home stop
2. App immediately fires a local notification: *"Next [route] from [stop name] at [HH:MM] — in [X] minutes"*
3. Works from any location in the world — queries home stop directly, not GPS-dependent

This replaces any background polling approach. The notification fires on every app launch, giving the user their home stop status without any navigation.

**Pattern 2 — Per-departure notification scheduling**

From the Departures view:
1. User long-presses a departure card
2. Dialog: *"Notify me before this departure?"* with lead time options (5 / 10 / 15 min, defaulting to the Settings value)
3. User confirms → local notification scheduled for [departure scheduled time − lead time]
4. Notification fires: *"[Route] to [headsign] departs in [lead time] minutes from [stop name]"*
5. Multiple departure notifications can be scheduled simultaneously
6. Long-pressing an already-scheduled departure card shows a cancel option

**Settings additions:**
- Push notifications master toggle (on/off) — enables or disables notification capability overall
- Home-stop launch notification toggle (on/off) — controls Pattern 1 separately when notifications are enabled
- Notification lead time (minutes, e.g. 5 / 10 / 15 / 30) — default for Pattern 2 dialog
- Home stop display (name of pinned stop, with option to clear)

**Platform notes:**
- Android: notification channel created on first launch (`expo-notifications` handles this)
- iOS: system permission prompt required before notifications can be sent
- Web: push notifications out of scope (no service worker / web push required)
- No `expo-task-manager` or background fetch required — all notification logic is on-demand

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
- Notifications: `expo-notifications` with local notification scheduling — no background task manager required
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
| 6 | Push notifications — on-launch home stop + per-departure scheduling | expo-notifications only |
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
| Departure notification fired for a cancelled or delayed service | Medium | Notifications are scheduled against the DigiTransit scheduled time; realtime data is not re-queried at fire time. Document limitation: the notification reflects the schedule at the time of booking, not live data. |
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
- **FR7:** User can see transit stops within the configured search radius displayed as markers on the map
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

- **FR17:** User can view the next departures from a selected stop
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
- **FR27:** User can enable or disable the home-stop launch notification
- **FR28:** User can configure the default notification lead time (minutes before departure, used as default for departure notification scheduling)
- **FR29:** App can query the home stop's next departure on app launch and immediately fire a local notification showing route, scheduled time, and minutes until departure
- **FR30:** User can grant or deny the notification system permission when enabling push notifications
- **FR43:** User can long-press a departure card to open a notification scheduling dialog for that departure
- **FR44:** User can select a lead time in the notification dialog (5 / 10 / 15 min or the configured default) and confirm to schedule a local notification
- **FR45:** App can fire a local notification at the configured lead time before a user-selected departure's scheduled time, identifying route, headsign, and stop
- **FR46:** User can cancel a previously scheduled departure notification by long-pressing the departure card again

### 6. Settings & Preferences

- **FR31:** User can configure the nearby stops search radius
- **FR32:** User can configure the location update interval
- **FR33:** User can configure the stops list polling interval
- **FR34:** User can configure the departures list polling interval
- **FR35:** User can configure the push notification lead time
- **FR36:** App can persist all settings across sessions
- **FR37:** App can apply default values for all settings on first launch

### 7. Error & Edge Case Handling

- **FR38:** App can display an error banner identifying the DigiTransit API as unavailable when the API cannot be reached
- **FR39:** App can display the map independently when the DigiTransit API is unavailable
- **FR40:** App can display an empty state with guidance when location permission is denied
- **FR41:** App can display an empty state when no stops are found within the search radius
- **FR42:** App can handle API failures without crashing or freezing

## Non-Functional Requirements

### Performance

- **NFR1:** Map and nearest stop markers are visible within 3 seconds of app launch at the 95th percentile on a normal mobile connection, as measured by in-app timing
- **NFR2:** Departures list renders within 2 seconds of selecting a stop at the 95th percentile, as measured by in-app timing
- **NFR3:** The UI remains interactive during background data fetching — touch response must not exceed 100ms and no blocking spinners must appear on auto-refresh
- **NFR4:** On-launch home stop notification processing must not add more than 50ms to app start time, and must not increase battery consumption beyond what a single API request incurs

### Privacy

- **NFR5:** No location data is persisted beyond the active session
- **NFR6:** No user data is transmitted to any server other than the DigiTransit public API
- **NFR7:** All user settings and home stop preference are stored locally on the device (no cloud sync, no analytics)

### Reliability

- **NFR8:** The app must not crash or freeze on API failure, network timeout, or empty API response
- **NFR9:** The app must retry failed API requests automatically with exponential backoff (maximum 3 retries) for transient errors, without user intervention
- **NFR10:** The app must recover automatically when API connectivity is restored after an outage

### Accessibility

- **NFR11:** Stop type marker colours must meet a minimum WCAG 3:1 contrast ratio against the map background to be distinguishable in direct sunlight on a mobile screen
- **NFR12:** All text must respect the device's system font scale setting (no hardcoded font sizes that prevent scaling)
- **NFR13:** Interactive touch targets (stop markers, list items, buttons) must meet a minimum tap area of 44×44pt to support outdoor one-handed use

### Integration

- **NFR14:** The app must deduplicate concurrent API requests — no duplicate simultaneous requests to the same endpoint must be issued
- **NFR15:** The app must handle DigiTransit API rate limiting or throttling responses by backing off for a minimum of 30 seconds before retrying, with no more than 3 automatic retries per polling cycle
- **NFR16:** The DigiTransit API base URL must be centralised in a single config location to allow easy endpoint updates
