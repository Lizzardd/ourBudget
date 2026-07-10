import { Platform, StyleProp, Text, TextStyle } from 'react-native';

import { useTheme } from '../theme/useTheme';

export interface IconProps {
	/** Material Symbols Rounded ligature name, e.g. "grocery" or "home". */
	name: string;
	size: number;
	color?: string;
	style?: StyleProp<TextStyle>;
}

/**
 * Renders a Material Symbols Rounded glyph. Category data's `emoji` field
 * (see convex/households.ts, convex/seed.ts) now stores ligature strings
 * like "grocery" instead of emoji characters; this component renders that
 * ligature text through the self-hosted `MaterialSymbolsRounded` font,
 * which substitutes it with the corresponding glyph.
 *
 * `font-variation-settings` (FILL 0, weight 300) only applies on web — React
 * Native doesn't support variable font axes at render time, so native relies
 * on the bundled static 300-weight/FILL-0 font file for the same look.
 */
export function Icon({ name, size, color, style }: IconProps) {
	const { t } = useTheme();
	return (
		<Text
			allowFontScaling={false}
			style={[
				{ fontFamily: 'MaterialSymbolsRounded', fontSize: size, color: color ?? t.text },
				Platform.OS === 'web' &&
					({ fontVariationSettings: "'FILL' 0, 'wght' 300" } as TextStyle),
				style,
			]}
		>
			{name}
		</Text>
	);
}
