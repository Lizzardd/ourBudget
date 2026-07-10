import { useQuery } from 'convex/react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { fmt } from '../budget/money';
import { toTxnRow } from '../budget/detail';
import { Icon } from '../components/Icon';
import { Sheet } from '../components/Sheet';
import { useHousehold } from '../hooks/useHousehold';
import { fontFamily } from '../theme/fonts';
import { useTheme } from '../theme/useTheme';

export interface MonthTransactionsSheetParams {
	categoryId: Id<'categories'>;
	emoji: string;
	name: string;
	color: string;
	/** 'Year to date' for annual categories, else the selected month's label. */
	monthLabel: string;
	startMs: number;
	endMs: number;
}

export interface MonthTransactionsSheetProps {
	open: boolean;
	onClose: () => void;
	params: MonthTransactionsSheetParams | null;
}

/**
 * Bottom sheet listing a single category's transactions for a date range —
 * a month range for monthly categories, a year-to-date range for annual
 * ones. Opened from Reports (trend/category/annual rows) via
 * `useMonthTransactionsSheet()`. Reuses the transaction-row styling from
 * the category-detail screen (`toTxnRow`).
 */
export function MonthTransactionsSheet({ open, onClose, params }: MonthTransactionsSheetProps) {
	const { t } = useTheme();
	const { currency } = useHousehold();

	const txns = useQuery(
		api.transactions.listByCategoryInRange,
		params
			? { categoryId: params.categoryId, startMs: params.startMs, endMs: params.endMs }
			: 'skip'
	);

	const cur = currency ?? 'AED';
	const rows = (txns ?? []).map((txn) => toTxnRow(txn, cur, Date.now()));
	const total = (txns ?? []).reduce((sum, txn) => sum + txn.amount, 0);

	return (
		<Sheet open={open} onClose={onClose} maxHeight="75%">
			{params ? (
				<>
					<View style={styles.header}>
						<View style={styles.tile}>
							<Icon name={params.emoji} size={26} color={t.text} />
						</View>
						<View style={styles.headerText}>
							<Text style={[styles.name, { color: t.text, fontFamily: fontFamily(800) }]}>
								{params.name}
							</Text>
							<Text style={[styles.sub, { color: t.sub }]}>
								{params.monthLabel} · {fmt(total, cur)}
							</Text>
						</View>
					</View>
					<ScrollView style={styles.list}>
						{txns === undefined ? null : rows.length === 0 ? (
							<Text style={[styles.empty, { color: t.sub }]}>No expenses in this period</Text>
						) : (
							rows.map((row, i) => (
								<View
									key={row.id}
									style={[
										styles.row,
										i < rows.length - 1 ? { borderBottomColor: t.line, borderBottomWidth: 1 } : null,
									]}
								>
									<View style={[styles.avatar, { backgroundColor: row.whoBg }]}>
										<Text style={[styles.avatarText, { color: row.whoColor }]}>
											{row.whoInitial}
										</Text>
									</View>
									<View style={styles.rowMid}>
										<Text
											style={[styles.rowNote, { color: t.text, fontFamily: fontFamily(700) }]}
											numberOfLines={1}
										>
											{row.note}
										</Text>
										<Text style={[styles.rowMeta, { color: t.sub }]}>{row.meta}</Text>
									</View>
									<Text style={[styles.rowAmt, { color: t.text, fontFamily: fontFamily(800) }]}>
										{row.amtFmt}
									</Text>
								</View>
							))
						)}
					</ScrollView>
				</>
			) : null}
		</Sheet>
	);
}

const styles = StyleSheet.create({
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	tile: {
		width: 44,
		height: 44,
		alignItems: 'center',
		justifyContent: 'center',
	},
	emoji: {
		fontSize: 26,
	},
	headerText: {
		flex: 1,
	},
	name: {
		fontSize: 17,
	},
	sub: {
		fontSize: 12,
		marginTop: 1,
	},
	list: {
		flexShrink: 1,
		marginHorizontal: -4,
		paddingHorizontal: 4,
	},
	empty: {
		fontSize: 14,
		paddingVertical: 18,
		textAlign: 'center',
	},
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		paddingVertical: 13,
	},
	avatar: {
		width: 36,
		height: 36,
		borderRadius: 18,
		alignItems: 'center',
		justifyContent: 'center',
	},
	avatarText: {
		fontSize: 14,
		fontFamily: fontFamily(800),
	},
	rowMid: {
		flex: 1,
		minWidth: 0,
	},
	rowNote: {
		fontSize: 14,
	},
	rowMeta: {
		fontSize: 12,
		marginTop: 1,
	},
	rowAmt: {
		fontSize: 15,
	},
});
