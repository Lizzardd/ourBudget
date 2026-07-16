import { Image, StyleSheet, Text, View, type ImageStyle, type StyleProp, type ViewStyle } from 'react-native';

import { fontFamily } from '../theme/fonts';

export interface AvatarProps {
	size: number;
	/** Uppercase initial shown when there's no photo. */
	initial: string;
	/** Background colour when there's no photo (the member's profile colour). */
	bg: string;
	/** Initial text colour. Defaults to the dark rose used across the app. */
	color?: string;
	/** The member's avatar photo; when set it replaces the colour + initial. */
	photoUrl?: string | null;
	/** Extra layout (borders/margins) — e.g. the overlapping Home avatar stack. */
	style?: StyleProp<ViewStyle>;
}

/**
 * A member avatar: their photo when they've set one, otherwise their initial on
 * their profile colour. One component so every avatar site (Home stack, txn
 * rows, member lists, the Profile overlay) renders photos consistently.
 */
export function Avatar({ size, initial, bg, color = '#3A1220', photoUrl, style }: AvatarProps) {
	const dims = { width: size, height: size, borderRadius: size / 2 };

	if (photoUrl) {
		return (
			<Image
				source={{ uri: photoUrl }}
				style={[dims, style as StyleProp<ImageStyle>]}
				accessibilityIgnoresInvertColors
			/>
		);
	}

	return (
		<View style={[dims, styles.fallback, { backgroundColor: bg }, style]}>
			<Text style={{ color, fontSize: Math.round(size * 0.42), fontFamily: fontFamily(800) }}>
				{initial}
			</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	fallback: {
		alignItems: 'center',
		justifyContent: 'center',
		overflow: 'hidden',
	},
});
