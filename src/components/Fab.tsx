import { Pressable, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAddExpenseSheet } from '../features/AddExpenseProvider';
import { fontFamily } from '../theme/fonts';
import { useTheme } from '../theme/useTheme';

/**
 * Distance from the bottom, before the safe-area inset — the prototype's
 * `bottom: calc(66px + env(safe-area-inset-bottom, 0px))`.
 *
 * This used to be derived from a local copy of the tab bar's height, which then
 * drifted: the tab bar shrank to 48px but this file still said 68, so the pill
 * floated higher than the design. Taking the offset straight from the prototype
 * removes the duplicated constant along with the chance to drift again.
 */
const BOTTOM_OFFSET = 66;

/**
 * Accent "+ Add expense" pill floating bottom-right above the tab bar. Per
 * the prototype it is a LABELLED rose pill (not a bare icon button) and is
 * shown on the Home tab only — the app shell mounts it conditionally.
 * Honors the bottom safe-area/system-nav inset the same way `TabBar` does,
 * and opens the app-wide Add-Expense sheet from `AddExpenseProvider`.
 */
export function Fab() {
	const { accent } = useTheme();
	const insets = useSafeAreaInsets();
	const { open } = useAddExpenseSheet();

	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel="Add expense"
			onPress={() => open()}
			style={({ pressed }) => [
				styles.fab,
				{
					backgroundColor: accent,
					shadowColor: accent,
					bottom: BOTTOM_OFFSET + insets.bottom,
					transform: [{ scale: pressed ? 0.96 : 1 }],
				},
			]}
		>
			<Text style={[styles.plus, { fontFamily: fontFamily(700) }]}>+</Text>
			{/* The prototype's visible label is just "Add" — the accessibility
			    label stays "Add expense", which is what a screen reader needs. */}
			<Text style={[styles.label, { fontFamily: fontFamily(800) }]}>Add</Text>
		</Pressable>
	);
}

const styles = StyleSheet.create({
	fab: {
		position: 'absolute',
		right: 18,
		height: 46,
		paddingHorizontal: 18,
		borderRadius: 999,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		shadowOffset: { width: 0, height: 10 },
		shadowOpacity: 0.4,
		shadowRadius: 28,
		elevation: 6,
		zIndex: 20,
	},
	plus: {
		fontSize: 19,
		lineHeight: 21,
		color: '#2B0E1A',
	},
	label: {
		fontSize: 14,
		color: '#2B0E1A',
	},
});
