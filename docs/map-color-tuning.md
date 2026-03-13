# Map Color Tuning

The native basemap colors now live in semantic tokens instead of inline hex values:

- Palette and OKLCH authoring references: `src/shared/theme/map-theme.ts`
- Native map style wiring: `src/shared/theme/map-theme.ts`
- Native map usage: `src/core/platform/maps/map-view.native.tsx`

Use this process when tuning:

1. Tune structure first.
   Set all tokens near-neutral and adjust only OKLCH `L` values until the visual hierarchy is clear: base, land, roads, highways, water, labels.

2. Tune one role at a time.
   Change only one semantic token group per pass, such as `roadMinor` and `roadHighway`, then re-check the map in dense urban, residential, and waterfront views.

3. Add chroma second.
   Once hierarchy works in grayscale, adjust OKLCH `C` carefully for categories that need identity, usually water, parks, transit, and highways.

4. Adjust hue last.
   Use `h` only to separate categories, not to create contrast. Visibility should come mainly from lightness gaps.

5. Keep the map subordinate to product markers.
   If labels or roads begin to compete with stop markers or the live-location marker, reduce their lightness or chroma.

Implementation notes:

- `react-native-maps` still needs final hex strings, so `map-theme.ts` converts each `oklch(...)` token to hex automatically.
- Tune only the `oklch(...)` value. No manual RGB or hex conversion step is needed anymore.
- If you want to change feature density rather than color, edit the style entries in `nativeDarkMapStyle`, not the palette.
