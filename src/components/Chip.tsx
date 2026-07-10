import { Pressable, StyleSheet, Text } from 'react-native';

import { hexToRgba } from '../lib/color';
import { fontFamily } from '../theme/fonts';
import { useTheme } from '../theme/useTheme';
import { Icon } from './Icon';

export interface ChipProps {
	label: string;
	emoji?: string;
	selected: boolean;
	onPress: () => void;
}

/**
 * Selectable pill chip (category picker, filters). Selected state gets an
 * accent border, a tinted accent background, and accent-colored text;
 * unselected falls back to the theme's elevated surface.
 */
export function Chip({ label, emoji, selected, onPress }: ChipProps) {
	const { t, accent } = useTheme();

	return (
		<Pressable
			onPress={onPress}
			accessibilityRole="button"
			accessibilityState={{ selected }}
			style={({ pressed }) => [
				styles.chip,
				{
					borderColor: selected ? accent : 'transparent',
					backgroundColor: selected ? hexToRgba(accent, 0.14) : t.el,
					transform: [{ scale: pressed ? 0.95 : 1 }],
				},
			]}
		>
			{emoji ? <Icon name={emoji} size={16} color={selected ? accent : t.text} /> : null}
			<Text
				style={[
					styles.label,
					{ color: selected ? accent : t.text },
				]}
			>
				{label}
			</Text>
		</Pressable>
	);
}

const styles = StyleSheet.create({
	chip: {
		height: 36,
		paddingHorizontal: 13,
		borderRadius: 999,
		borderWidth: 1.5,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 5,
	},
	label: {
		fontFamily: fontFamily(700),
		fontSize: 13,
	},
});
