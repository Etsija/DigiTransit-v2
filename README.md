# DigiTransit-v2

Expo Router app for nearby public transit discovery with native Google Maps support and a
Mapbox-backed web map.

## Get started

1. Install dependencies

   ```bash
   pnpm install
   ```

2. Configure DigiTransit API access

   ```bash
   cp .env.example .env
   ```

   Then set `EXPO_PUBLIC_DIGITRANSIT_API_KEY` in `.env`.
   Register for an API key at `https://portal-api.digitransit.fi`.
   If you want Android Google Maps tiles in a development build, also set
   `EXPO_PUBLIC_ANDROID_GOOGLE_MAPS_API_KEY` in `.env`.
   If you want Google Maps-backed native dark map parity on iOS, also set
   `EXPO_PUBLIC_IOS_GOOGLE_MAPS_API_KEY`.
   If you want the live web map instead of the local fallback surface, set
   `EXPO_PUBLIC_MAPBOX_PUBLIC_TOKEN`.
   You can optionally override the GraphQL endpoint with `EXPO_PUBLIC_DIGITRANSIT_API_URL`.

   For standalone EAS builds, set the same public variables in the EAS environment used by the
   build profile. The `preview` profile expects the EAS environment named `preview`.

   After adding the Google Maps key, rebuild the Android app so the native
   manifest metadata is regenerated. After adding the iOS Google Maps key,
   rebuild the iOS app so the config plugin can regenerate native settings.

3. Start the app

   ```bash
   pnpm start
   ```

4. Regenerate GraphQL types after editing any `.graphql` document

   ```bash
   pnpm codegen
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing files under `src/`. Route entry points live in `src/app`,
feature code in `src/features`, and platform adapters in `src/core/platform`.

## Verification

- `pnpm test -- --runInBand tests/features/map-screen.test.tsx tests/core/platform/map-view.native.test.tsx tests/core/platform/map-view.web.test.tsx`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test:ci`

## Notes

- To set up ESLint for linting, run `npx expo lint`, or follow our guide on ["Using ESLint and Prettier"](https://docs.expo.dev/guides/using-eslint/)
- If you'd like to set up unit testing, follow our guide on ["Unit Testing with Jest"](https://docs.expo.dev/develop/unit-testing/)
- Learn more about the TypeScript setup in this template in our guide on ["Using TypeScript"](https://docs.expo.dev/guides/typescript/)

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
