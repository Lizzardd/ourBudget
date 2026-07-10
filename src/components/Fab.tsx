import { Pressable, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAddExpenseSheet } from '../features/AddExpenseProvider';
import { fontFamily } from '../theme/fonts';
import { useTheme } from '../theme/useTheme';

const TAB_BAR_ROW_HEIGHT = 68;
const NAV_INSET_PAD = 12;
const FAB_GAP = 18;

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
					bottom: TAB_BAR_ROW_HEIGHT + NAV_INSET_PAD + insets.bottom + FAB_GAP,
					transform: [{ scale: pressed ? 0.96 : 1 }],
				},
			]}
		>
			<Text style={[styles.plus, { fontFamily: fontFamily(700) }]}>+</Text>
			<Text style={[styles.label, { fontFamily: fontFamily(800) }]}>Add expense</Text>
		</Pressable>
	);
}

const styles = StyleSheet.create({
	fab: {
		position: 'absolute',
		right: 18,
		height: 56,
		paddingHorizontal: 22,
		borderRadius: 999,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		shadowOffset: { width: 0, height: 10 },
		shadowOpacity: 0.4,
		shadowRadius: 28,
		elevation: 6,
		zIndex: 20,
	},
	plus: {
		fontSize: 22,
		lineHeight: 24,
		color: '#2B0E1A',
	},
	label: {
		fontSize: 16,
		color: '#2B0E1A',
	},
});
