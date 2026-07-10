import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Chip } from '../../src/components/Chip';
import { Numpad } from '../../src/components/Numpad';
import { fontFamily } from '../../src/theme/fonts';
import { useTheme } from '../../src/theme/useTheme';

/**
 * Headless preview route for the Add Expense sheet's PRESENTATION —
 * mirrors `AddExpenseSheet` (src/features/AddExpenseSheet.tsx) with
 * hardcoded mock categories/amount matching the design prototype's
 * "─── ADD EXPENSE SHEET ───". Rendered inline (not inside `Sheet`'s
 * animated/absolute overlay) so it's visible without opening it, and
 * deliberately does NOT touch Convex/auth. Not linked from any in-app
 * nav; reachable only by navigating directly to `/preview/add-expense`.
 */

const MOCK_CATEGORIES = [
	{ id: 'groceries', name: 'Groceries', emoji: 'grocery' },
	{ id: 'dining-out', name: 'Dining out', emoji: 'restaurant' },
	{ id: 'transport', name: 'Transport', emoji: 'local_taxi' },
	{ id: 'kids', name: 'Kids', emoji: 'toys' },
	{ id: 'housing', name: 'Housing', emoji: 'home' },
	{ id: 'household-maintenance', name: 'Household maintenance', emoji: 'handyman' },
	{ id: 'car-service', name: 'Car service', emoji: 'directions_car' },
	{ id: 'gifts', name: 'Gifts', emoji: 'redeem' },
];

const SARA_BG = '#D98BA4';
const OMAR_BG = '#7FA8A0';

export default function AddExpensePreview() {
	const { t, accent } = useTheme();
	const [categoryId, setCategoryId] = useState('groceries');
	const [payer, setPayer] = useState<'Sara' | 'Omar'>('Sara');

	const amountFmt = 'Đ42';
	const selectedCategory = MOCK_CATEGORIES.find((c) => c.id === categoryId)!;
	const confirmLabel = `Add ${amountFmt} to ${selectedCategory.name}`;

	return (
		<View style={[styles.root, { backgroundColor: t.bg }]}>
			<View style={[styles.panel, { backgroundColor: t.card }]}>
				<View style={[styles.grabber, { backgroundColor: t.track }]} />

				<View style={styles.header}>
					<Text style={[styles.title, { color: t.text, fontFamily: fontFamily(800) }]}>
						Add expense
					</Text>
					<TouchableOpacity
						accessibilityRole="button"
						accessibilityLabel="Close"
						style={[styles.closeButton, { backgroundColor: t.el }]}
					>
						<Text style={[styles.closeButtonText, { color: t.sub }]}>✕</Text>
					</TouchableOpacity>
				</View>

				<View style={styles.amountBlock}>
					<Text style={[styles.amount, { color: t.text, fontFamily: fontFamily(900) }]}>
						{amountFmt}
					</Text>
					<Text style={[styles.amountSub, { color: t.sub }]}>Today · paid by {payer}</Text>
				</View>

				<ScrollView
					horizontal={false}
					style={styles.chipsScroll}
					contentContainerStyle={styles.chipsRow}
				>
					{MOCK_CATEGORIES.map((cat) => (
						<Chip
							key={cat.id}
							label={cat.name}
							emoji={cat.emoji}
							selected={cat.id === categoryId}
							onPress={() => setCategoryId(cat.id)}
						/>
					))}
				</ScrollView>

				<View style={styles.noteRow}>
					<View style={[styles.noteInput, { backgroundColor: t.el }]}>
						<Text style={[styles.notePlaceholder, { color: t.sub }]}>Add a note (optional)</Text>
					</View>
					<View style={[styles.payerToggle, { backgroundColor: t.el }]}>
						<TouchableOpacity
							accessibilityRole="button"
							accessibilityLabel="Paid by Sara"
							onPress={() => setPayer('Sara')}
							style={[
								styles.payerButton,
								{ backgroundColor: payer === 'Sara' ? SARA_BG : 'transparent' },
							]}
						>
							<Text
								style={[
									styles.payerButtonText,
									{ color: payer === 'Sara' ? '#3A1220' : t.sub },
								]}
							>
								Sara
							</Text>
						</TouchableOpacity>
						<TouchableOpacity
							accessibilityRole="button"
							accessibilityLabel="Paid by Omar"
							onPress={() => setPayer('Omar')}
							style={[
								styles.payerButton,
								{ backgroundColor: payer === 'Omar' ? OMAR_BG : 'transparent' },
							]}
						>
							<Text
								style={[
									styles.payerButtonText,
									{ color: payer === 'Omar' ? '#0F2B26' : t.sub },
								]}
							>
								Omar
							</Text>
						</TouchableOpacity>
					</View>
				</View>

				<Numpad value="42" onChange={() => {}} />

				<TouchableOpacity
					accessibilityRole="button"
					accessibilityLabel={confirmLabel}
					style={[styles.confirmButton, { backgroundColor: accent }]}
				>
					<Text style={[styles.confirmButtonText, { color: '#2B0E1A' }]}>{confirmLabel}</Text>
				</TouchableOpacity>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	root: {
		flex: 1,
		justifyContent: 'flex-end',
	},
	panel: {
		borderTopLeftRadius: 28,
		borderTopRightRadius: 28,
		paddingTop: 10,
		paddingHorizontal: 20,
		paddingBottom: 28,
		gap: 12,
	},
	grabber: {
		width: 40,
		height: 4,
		borderRadius: 99,
		alignSelf: 'center',
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	title: {
		flex: 1,
		fontSize: 17,
	},
	closeButton: {
		width: 32,
		height: 32,
		borderRadius: 16,
		alignItems: 'center',
		justifyContent: 'center',
	},
	closeButtonText: {
		fontSize: 14,
	},
	amountBlock: {
		alignItems: 'center',
		paddingVertical: 4,
	},
	amount: {
		fontSize: 42,
		letterSpacing: -1,
	},
	amountSub: {
		fontSize: 12,
		marginTop: 2,
	},
	chipsScroll: {
		maxHeight: 92,
	},
	chipsRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 7,
		justifyContent: 'center',
	},
	noteRow: {
		flexDirection: 'row',
		gap: 8,
	},
	noteInput: {
		flex: 1,
		height: 44,
		borderRadius: 14,
		paddingHorizontal: 16,
		justifyContent: 'center',
	},
	notePlaceholder: {
		fontSize: 14,
		fontFamily: fontFamily(600),
	},
	payerToggle: {
		flexDirection: 'row',
		borderRadius: 14,
		padding: 4,
		gap: 4,
	},
	payerButton: {
		height: 36,
		paddingHorizontal: 12,
		borderRadius: 11,
		alignItems: 'center',
		justifyContent: 'center',
	},
	payerButtonText: {
		fontSize: 13,
		fontFamily: fontFamily(800),
	},
	confirmButton: {
		height: 56,
		borderRadius: 999,
		alignItems: 'center',
		justifyContent: 'center',
	},
	confirmButtonText: {
		fontSize: 16,
		fontFamily: fontFamily(800),
	},
});
