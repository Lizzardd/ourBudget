import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { applyNumpadKey } from '../budget/numpad';
import { fontFamily } from '../theme/fonts';
import { useTheme } from '../theme/useTheme';

export interface NumpadProps {
	value: string;
	onChange: (next: string) => void;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'];

/**
 * 3-column keypad for the Add-Expense sheet's amount entry. Pure input
 * rules (append digit / decimal / backspace / 6-digit cap) live in
 * `budget/numpad.ts` — this component just renders the keys and forwards
 * the next amount string via `onChange`.
 */
export function Numpad({ value, onChange }: NumpadProps) {
	const { t } = useTheme();

	return (
		<View style={styles.grid}>
			{KEYS.map((key) => (
				<TouchableOpacity
					key={key}
					accessibilityRole="button"
					accessibilityLabel={key === '⌫' ? 'Backspace' : key}
					onPress={() => onChange(applyNumpadKey(value, key))}
					style={[styles.key, { backgroundColor: t.el }]}
				>
					<Text style={[styles.label, { color: t.text, fontFamily: fontFamily(700) }]}>
						{key}
					</Text>
				</TouchableOpacity>
			))}
		</View>
	);
}

const styles = StyleSheet.create({
	grid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 6,
	},
	key: {
		flexBasis: '31.5%',
		flexGrow: 1,
		height: 52,
		borderRadius: 16,
		alignItems: 'center',
		justifyContent: 'center',
	},
	label: {
		fontSize: 22,
	},
});
