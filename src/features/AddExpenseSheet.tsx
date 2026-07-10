import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { fmt, glyph, parseAmountToMinor } from '../budget/money';
import { Chip } from '../components/Chip';
import { Numpad } from '../components/Numpad';
import { Sheet } from '../components/Sheet';
import { useCategories } from '../hooks/useCategories';
import { useHousehold } from '../hooks/useHousehold';
import { useAddExpense } from '../hooks/useSummary';
import { useToast } from '../lib/toast';
import { fontFamily } from '../theme/fonts';
import { useTheme } from '../theme/useTheme';

export interface AddExpenseSheetProps {
	open: boolean;
	onClose: () => void;
	/** Pre-selects a category, e.g. when opened from a category detail's "+ Add to <name>". */
	initialCategoryId?: string;
}

type Payer = 'Sara' | 'Omar';

const SARA_BG = '#D98BA4';
const OMAR_BG = '#7FA8A0';

/**
 * The core quick-add flow: big amount display, custom numpad, category
 * chips, a note field, and a Sara/Omar payer toggle — fidelity source is
 * `docs/design/BudgetApp-Prototype.dc.html`'s `─── ADD EXPENSE SHEET ───`
 * and its `renderVals()` sheet logic. Mounted once by `AddExpenseProvider`;
 * opened via `useAddExpenseSheet().open()`.
 */
export function AddExpenseSheet({ open, onClose, initialCategoryId }: AddExpenseSheetProps) {
	const { t, accent } = useTheme();
	const { householdId, currency } = useHousehold();
	const { categories } = useCategories();
	const addExpense = useAddExpense();
	const { toast } = useToast();

	const [amount, setAmount] = useState('');
	const [categoryId, setCategoryId] = useState<string | undefined>(initialCategoryId);
	const [note, setNote] = useState('');
	const [payer, setPayer] = useState<Payer>('Sara');
	const [submitting, setSubmitting] = useState(false);

	// Reset to a fresh entry every time the sheet opens, honoring any
	// pre-selected category.
	useEffect(() => {
		if (open) {
			setAmount('');
			setNote('');
			setPayer('Sara');
			setCategoryId(initialCategoryId);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open, initialCategoryId]);

	const cur = currency ?? 'AED';
	const amountMinor = parseAmountToMinor(amount);
	const amountMajor = amountMinor / 100;
	const selectedCategory = categories.find((cat) => cat._id === categoryId);
	const canAdd = amountMinor > 0 && !!selectedCategory && !!householdId;

	const amountFmt = amount
		? glyph(cur) +
			(amount.endsWith('.')
				? Math.trunc(amountMajor).toLocaleString('en-US') + '.'
				: amountMajor.toLocaleString('en-US'))
		: glyph(cur) + '0';
	const amountColor = amountMinor > 0 ? t.text : t.sub;

	const confirmLabel = canAdd
		? `Add ${fmt(amountMinor, cur)} to ${selectedCategory.name}`
		: 'Add expense';
	const confirmBg = canAdd ? accent : t.el;
	const confirmColor = canAdd ? '#2B0E1A' : t.sub;

	const handleConfirm = async () => {
		if (!canAdd || !householdId || !selectedCategory || submitting) {
			return;
		}
		setSubmitting(true);
		try {
			await addExpense({
				householdId,
				categoryId: selectedCategory._id,
				amount: amountMinor,
				note: note.trim() || selectedCategory.name,
				payerName: payer,
			});
			toast(`Added ${fmt(amountMinor, cur)} to ${selectedCategory.name} 🎉`);
			onClose();
		} catch (err) {
			toast(err instanceof Error ? err.message : 'Could not add expense');
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<Sheet open={open} onClose={onClose}>
			<View style={styles.header}>
				<Text style={[styles.title, { color: t.text, fontFamily: fontFamily(800) }]}>
					Add expense
				</Text>
				<TouchableOpacity
					accessibilityRole="button"
					accessibilityLabel="Close"
					onPress={onClose}
					style={[styles.closeButton, { backgroundColor: t.el }]}
				>
					<Text style={[styles.closeButtonText, { color: t.sub }]}>✕</Text>
				</TouchableOpacity>
			</View>

			<View style={styles.amountBlock}>
				<Text style={[styles.amount, { color: amountColor, fontFamily: fontFamily(900) }]}>
					{amountFmt}
				</Text>
				<Text style={[styles.amountSub, { color: t.sub }]}>Today · paid by {payer}</Text>
			</View>

			<ScrollView
				horizontal={false}
				style={styles.chipsScroll}
				contentContainerStyle={styles.chipsRow}
			>
				{categories.map((cat) => (
					<Chip
						key={cat._id}
						label={cat.name}
						emoji={cat.emoji}
						selected={cat._id === categoryId}
						onPress={() => setCategoryId(cat._id)}
					/>
				))}
			</ScrollView>

			<View style={styles.noteRow}>
				<TextInput
					value={note}
					onChangeText={setNote}
					placeholder="Add a note (optional)"
					placeholderTextColor={t.sub}
					style={[styles.noteInput, { backgroundColor: t.el, color: t.text }]}
				/>
				<View style={[styles.payerToggle, { backgroundColor: t.el }]}>
					<TouchableOpacity
						accessibilityRole="button"
						accessibilityLabel="Paid by Sara"
						accessibilityState={{ selected: payer === 'Sara' }}
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
						accessibilityState={{ selected: payer === 'Omar' }}
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

			<Numpad value={amount} onChange={setAmount} />

			<TouchableOpacity
				accessibilityRole="button"
				accessibilityLabel={confirmLabel}
				accessibilityState={{ disabled: !canAdd || submitting }}
				disabled={!canAdd || submitting}
				onPress={handleConfirm}
				style={[styles.confirmButton, { backgroundColor: confirmBg }]}
			>
				<Text style={[styles.confirmButtonText, { color: confirmColor }]}>{confirmLabel}</Text>
			</TouchableOpacity>
		</Sheet>
	);
}

const styles = StyleSheet.create({
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
