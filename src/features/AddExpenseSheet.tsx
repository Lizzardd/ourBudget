import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import type { Id } from '../../convex/_generated/dataModel';
import { fmt, glyph, parseAmountToMinor } from '../budget/money';
import { Chip } from '../components/Chip';
import { Icon } from '../components/Icon';
import { Numpad } from '../components/Numpad';
import { Sheet } from '../components/Sheet';
import { useCategories } from '../hooks/useCategories';
import { useHousehold } from '../hooks/useHousehold';
import { useHouseholdMembers } from '../hooks/useHouseholdMembers';
import { useAddExpense, useDeleteExpense, useUpdateExpense } from '../hooks/useSummary';
import { useToast } from '../lib/toast';
import { fontFamily } from '../theme/fonts';
import { useTheme } from '../theme/useTheme';

/** The transaction fields the sheet needs to prefill an edit. */
export interface EditableTransaction {
	_id: Id<'transactions'>;
	categoryId: Id<'categories'>;
	amount: number;
	note: string;
	memo?: string;
	payerName: string;
	/** The payer's user id — absent on legacy rows written before `paidBy` existed. */
	paidBy?: Id<'users'>;
}

export interface AddExpenseSheetProps {
	open: boolean;
	onClose: () => void;
	/** Pre-selects a category, e.g. when opened from a category detail's "+ Add to <name>". */
	initialCategoryId?: string;
	/** When set, the sheet is in edit mode for this transaction instead of adding a new one. */
	editTxn?: EditableTransaction | null;
}

/** Text color for a selected payer chip, over the member's profile color. */
const PAYER_CHIP_TEXT = '#3A1220';

/** Turns a minor-unit amount into the numpad's amount string ("4550" → "45.5"). */
function toAmountString(minor: number): string {
	return String(minor / 100);
}

/**
 * The core quick-add flow: big amount display, custom numpad, category
 * chips, a "Where?" title, an optional memo, and a dynamic "Paid by" chip
 * row — fidelity source is `docs/design/BudgetApp-Prototype.dc.html`'s
 * `─── ADD EXPENSE SHEET ───` and its `renderVals()` sheet logic. Mounted
 * once by `AddExpenseProvider`; opened via `useAddExpenseSheet().open()` for
 * a new expense, or `.openEdit(txn)` to edit an existing one (which swaps
 * the title/confirm copy and reveals the Delete expense button, mirroring
 * the prototype's `isEditing`).
 */
export function AddExpenseSheet({ open, onClose, initialCategoryId, editTxn }: AddExpenseSheetProps) {
	const { t, accent } = useTheme();
	const { householdId, currency } = useHousehold();
	const { categories } = useCategories();
	const { members } = useHouseholdMembers();
	const addExpense = useAddExpense();
	const updateExpense = useUpdateExpense();
	const deleteExpense = useDeleteExpense();
	const { toast } = useToast();

	const payers = members ?? [];
	const self = payers.find((m) => m.isMe);

	const [amount, setAmount] = useState('');
	const [categoryId, setCategoryId] = useState<string | undefined>(initialCategoryId);
	const [payee, setPayee] = useState('');
	const [note, setNote] = useState('');
	const [payerName, setPayerName] = useState('');
	const [paidBy, setPaidBy] = useState<Id<'users'> | undefined>(undefined);
	const [submitting, setSubmitting] = useState(false);

	const isEditing = !!editTxn;

	// Reset to a fresh entry every time the sheet opens, honoring any
	// pre-selected category — or prefill from the transaction being edited.
	// The edited row's payer is resolved the same way the detail rows resolve
	// it: by `paidBy` first, then by the stored `payerName` snapshot for a
	// legacy row — so the right chip preselects either way.
	useEffect(() => {
		if (open) {
			const editPayer = editTxn
				? (payers.find((m) => m.userId === editTxn.paidBy) ??
					payers.find(
						(m) =>
							m.displayName.trim().toLowerCase() === editTxn.payerName.trim().toLowerCase()
					))
				: undefined;
			setAmount(editTxn ? toAmountString(editTxn.amount) : '');
			setPayee(editTxn ? editTxn.note : '');
			setNote(editTxn?.memo ?? '');
			setPayerName(editTxn ? (editPayer?.displayName ?? editTxn.payerName) : (self?.displayName ?? ''));
			// If the payer has since left the household there is no chip to
			// preselect, but their id must still be carried back on save —
			// dropping it would permanently erase who paid, which is the very
			// history this field exists to keep. `updateTransaction` only
			// re-checks membership when the payer actually changes, so handing
			// an ex-member's id straight back is accepted.
			setPaidBy(editTxn ? (editPayer?.userId ?? editTxn.paidBy) : self?.userId);
			setCategoryId(editTxn ? editTxn.categoryId : initialCategoryId);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open, initialCategoryId, editTxn, members]);

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

	const confirmLabel = isEditing
		? 'Save changes'
		: canAdd
			? `Add ${fmt(amountMinor, cur)} to ${selectedCategory.name}`
			: 'Add expense';
	const confirmBg = canAdd ? accent : t.el;
	const confirmColor = canAdd ? '#2B0E1A' : t.sub;

	const handleConfirm = async () => {
		if (!canAdd || !householdId || !selectedCategory || submitting) {
			return;
		}
		const title = payee.trim() || selectedCategory.name;
		const memo = note.trim() || undefined;
		setSubmitting(true);
		try {
			if (editTxn) {
				// `paidBy` always goes back through: patching it as undefined
				// would REMOVE the field and degrade the row to a name-only
				// record, orphaning it from the member all over again.
				await updateExpense({
					transactionId: editTxn._id,
					amount: amountMinor,
					note: title,
					memo,
					payerName,
					paidBy,
				});
				toast('Expense updated ✓');
			} else {
				await addExpense({
					householdId,
					categoryId: selectedCategory._id,
					amount: amountMinor,
					note: title,
					memo,
					payerName,
					paidBy,
				});
				toast(`Added ${fmt(amountMinor, cur)} to ${selectedCategory.name} 🎉`);
			}
			onClose();
		} catch (err) {
			toast(err instanceof Error ? err.message : 'Could not save expense');
		} finally {
			setSubmitting(false);
		}
	};

	const handleDelete = async () => {
		if (!editTxn || submitting) {
			return;
		}
		setSubmitting(true);
		try {
			await deleteExpense({ transactionId: editTxn._id });
			toast('Expense deleted');
			onClose();
		} catch (err) {
			toast(err instanceof Error ? err.message : 'Could not delete expense');
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<Sheet open={open} onClose={onClose}>
			<View style={styles.header}>
				<Text style={[styles.title, { color: t.text, fontFamily: fontFamily(800) }]}>
					{isEditing ? 'Edit expense' : 'Add expense'}
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
				<Text style={[styles.amountSub, { color: t.sub }]}>Today · paid by {payerName}</Text>
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

			<TextInput
				value={payee}
				onChangeText={setPayee}
				placeholder="Where? (e.g. Carrefour)"
				placeholderTextColor={t.sub}
				style={[styles.payeeInput, { backgroundColor: t.el, color: t.text }]}
			/>

			<TextInput
				value={note}
				onChangeText={setNote}
				placeholder="Add a note (optional)"
				placeholderTextColor={t.sub}
				style={[styles.noteInput, { backgroundColor: t.el, color: t.text }]}
			/>

			<View style={styles.payerRow}>
				<Text style={[styles.payerLabel, { color: t.sub, fontFamily: fontFamily(700) }]}>
					Paid by
				</Text>
				<View style={styles.payerChips}>
					{payers.map((member) => {
						const selected = paidBy
							? member.userId === paidBy
							: member.displayName === payerName;
						return (
							<TouchableOpacity
								key={member.userId}
								accessibilityRole="button"
								accessibilityLabel={`Paid by ${member.displayName}`}
								accessibilityState={{ selected }}
								activeOpacity={0.6}
								onPress={() => {
									setPayerName(member.displayName);
									setPaidBy(member.userId);
								}}
								style={[
									styles.payerChip,
									{ backgroundColor: selected ? member.profileColor : 'transparent' },
								]}
							>
								<Text
									style={[
										styles.payerChipText,
										{ color: selected ? PAYER_CHIP_TEXT : t.sub },
									]}
								>
									{member.displayName}
								</Text>
							</TouchableOpacity>
						);
					})}
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

			{isEditing ? (
				<TouchableOpacity
					accessibilityRole="button"
					accessibilityLabel="Delete expense"
					accessibilityState={{ disabled: submitting }}
					disabled={submitting}
					onPress={handleDelete}
					style={styles.deleteButton}
					activeOpacity={0.6}
				>
					<Icon name="delete" size={18} color="#DE4B37" />
					<Text style={[styles.deleteButtonText, { fontFamily: fontFamily(800) }]}>
						Delete expense
					</Text>
				</TouchableOpacity>
			) : null}
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
		paddingVertical: 2,
	},
	amount: {
		fontSize: 34,
		letterSpacing: -1,
	},
	amountSub: {
		fontSize: 12,
		marginTop: 1,
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
	payeeInput: {
		height: 44,
		borderRadius: 14,
		paddingHorizontal: 16,
		fontSize: 14,
		fontFamily: fontFamily(700),
	},
	noteInput: {
		height: 44,
		borderRadius: 14,
		paddingHorizontal: 16,
		fontSize: 14,
		fontFamily: fontFamily(600),
	},
	payerRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	payerLabel: {
		fontSize: 12,
	},
	payerChips: {
		flex: 1,
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 6,
	},
	payerChip: {
		height: 36,
		paddingHorizontal: 14,
		borderRadius: 11,
		alignItems: 'center',
		justifyContent: 'center',
	},
	payerChipText: {
		fontSize: 13,
		fontFamily: fontFamily(800),
	},
	confirmButton: {
		height: 46,
		borderRadius: 999,
		alignItems: 'center',
		justifyContent: 'center',
	},
	confirmButtonText: {
		fontSize: 15,
		fontFamily: fontFamily(800),
	},
	deleteButton: {
		width: '100%',
		height: 48,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 6,
	},
	deleteButtonText: {
		fontSize: 14,
		color: '#DE4B37',
	},
});
