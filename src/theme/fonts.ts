// Fonts are vendored into assets/fonts/ and required from there — NOT imported
// from @expo-google-fonts.
//
// Why: the @expo-google-fonts packages live under node_modules/.pnpm/…, and the
// Expo web export preserves that source path
// (assets/node_modules/.pnpm/…/node_modules/…/*.ttf). Cloudflare Pages refuses to
// upload any `node_modules` directory or dot-directory (`.pnpm`), so every
// bundled font 404'd to the SPA fallback on the web deploy — text fell back to a
// system font and Material Symbols icons rendered as their raw ligature names
// ("grocery", "local_taxi"). A normal path (assets/fonts/) exports to a clean
// assets/… URL that serves everywhere.
//
// Only the weights actually used are vendored, so the bundle stays as small as
// the previous per-weight subpath imports (the reason we didn't import the
// family root: that dragged in every weight, ~10MB, which bricked OTA startup).

/**
 * Weights loaded for the app's only text family, DM Sans.
 * Pass this object to `useFonts` in the root layout.
 */
export const dmSansFonts = {
	DMSans_400Regular: require('../../assets/fonts/DMSans_400Regular.ttf'),
	DMSans_500Medium: require('../../assets/fonts/DMSans_500Medium.ttf'),
	DMSans_600SemiBold: require('../../assets/fonts/DMSans_600SemiBold.ttf'),
	DMSans_700Bold: require('../../assets/fonts/DMSans_700Bold.ttf'),
	DMSans_800ExtraBold: require('../../assets/fonts/DMSans_800ExtraBold.ttf'),
	DMSans_900Black: require('../../assets/fonts/DMSans_900Black.ttf'),
};

/**
 * The icon font used to render category `emoji` fields (which, despite the name,
 * hold Material Symbols Rounded ligature strings like "grocery" rather than
 * emoji characters — see `src/components/Icon.tsx`). Only the static 300 (Light)
 * / FILL 0 instance is bundled, matching the prototype's
 * `font-variation-settings:'FILL' 0,'wght' 300`.
 */
export const materialSymbolsFonts = {
	MaterialSymbolsRounded: require('../../assets/fonts/MaterialSymbolsRounded_300Light.ttf'),
};

export type FontWeight = 400 | 500 | 600 | 700 | 800 | 900;

const familyByWeight: Record<FontWeight, string> = {
	400: 'DMSans_400Regular',
	500: 'DMSans_500Medium',
	600: 'DMSans_600SemiBold',
	700: 'DMSans_700Bold',
	800: 'DMSans_800ExtraBold',
	900: 'DMSans_900Black',
};

/**
 * Maps a font weight to the loaded DM Sans family name, so components request
 * weights consistently instead of hardcoding family strings.
 */
export function fontFamily(weight: FontWeight = 400): string {
	return familyByWeight[weight];
}
