import {
	DMSans_400Regular,
	DMSans_500Medium,
	DMSans_600SemiBold,
	DMSans_700Bold,
	DMSans_800ExtraBold,
	DMSans_900Black,
} from '@expo-google-fonts/dm-sans';
import { MaterialSymbolsRounded_300Light } from '@expo-google-fonts/material-symbols-rounded';

/**
 * Weights loaded for the app's only font family, DM Sans.
 * Pass this object to `useFonts` in the root layout.
 */
export const dmSansFonts = {
	DMSans_400Regular,
	DMSans_500Medium,
	DMSans_600SemiBold,
	DMSans_700Bold,
	DMSans_800ExtraBold,
	DMSans_900Black,
};

/**
 * The icon font used to render category `emoji` fields (which, despite the
 * name, now hold Material Symbols Rounded ligature strings like "grocery"
 * rather than emoji characters — see `src/components/Icon.tsx`). Only the
 * static 300 (Light) / FILL 0 instance is bundled, matching the prototype's
 * `font-variation-settings:'FILL' 0,'wght' 300`. Self-hosted via the
 * @expo-google-fonts package so it renders on web, native, and in offline
 * screenshots without a Google Fonts stylesheet link.
 */
export const materialSymbolsFonts = {
	MaterialSymbolsRounded: MaterialSymbolsRounded_300Light,
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
 * Maps a font weight to the loaded DM Sans family name, so components
 * request weights consistently instead of hardcoding family strings.
 */
export function fontFamily(weight: FontWeight = 400): string {
	return familyByWeight[weight];
}
