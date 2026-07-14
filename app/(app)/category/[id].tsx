import { useMutation, useQuery } from 'convex/react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { api } from '../../../convex/_generated/api';
import { Icon } from '../../../src/components/Icon';
import { Loading } from '../../../src/components/Loading';
import { ProgressBar } from '../../../src/components/ProgressBar';
import { SlideIn } from '../../../src/components/SlideIn';
import { bumpLimit, isTxnEditable, toCategoryDetail, toTxnRow } from '../../../src/budget/detail';
import { useAddExpenseSheet } from '../../../src/features/AddExpenseProvider';
import { toBudgetCategory } from '../../../src/hooks/categoryMapper';
import { useHousehold } from '../../../src/hooks/useHousehold';
import { useHouseholdMembers } from '../../../src/hooks/useHouseholdMembers';
import { useMounted } from '../../../src/hooks/useMounted';
import { useToast } from '../../../src/lib/toast';
import { fontFamily } from '../../../src/theme/fonts';
import { useTheme } from '../../../src/theme/useTheme';

/**
 * Category detail screen — header (emoji/name/period), the big spent/limit
 * card with progress bar, a ± limit editor (persists via
 * `updateCategoryLimit`), and the category's recent transactions. Reached
 * from Home's category cards via `/category/[id]`.
 *
 * The "+ Add to <name>" button opens the app-wide Add-Expense sheet
 * (mounted by `AddExpenseProvider` in the app layout) pre-selected to this
 * category.
 */
export default function CategoryDetail() {
	const { t, accent } = useTheme();
	const router = useRouter();
	const { id } = useLocalSearchParams<{ id: string }>();
	const { householdId, currency, loading: householdLoading } = useHousehold();
	const { members } = useHouseholdMembers();
	const mounted = useMounted();
	const { open: openAddExpense, openEdit: openEditExpense } = useAddExpenseSheet();
	const { toast } = useToast();

	const now = new Date();
	const year = now.getFullYear();
	const month = now.getMonth();

	const categories = useQuery(
		api.categories.listCategories,
		householdId ? { householdId } : 'skip'
	);
	const summaryData = useQuery(
		api.transactions.summary,
		householdId ? { householdId, year, month } : 'skip'
	);
	const category = categories?.find((cat) => cat._id === id);
	const txns = useQuery(
		api.transactions.listByCategory,
		category ? { categoryId: category._id } : 'skip'
	);
	const updateLimit = useMutation(api.categories.updateCategoryLimit);
	const deleteCategory = useMutation(api.categories.deleteCategory);
	const [limitInput, setLimitInput] = useState('');
	const [confirmDelete, setConfirmDelete] = useState(false);

	useEffect(() => {
		if (category) {
			setLimitInput(String(Math.round(category.limit / 100)));
		}
	}, [category?._id, category?.limit]);

	const loading =
		householdLoading ||
		categories === undefined ||
		summaryData === undefined ||
		txns === undefined ||
		!currency;

	if (loading) {
		return <Loading />;
	}

	if (!category) {
		return (
			<View style={[styles.loading, { backgroundColor: t.bg }]}>
				<Text style={[styles.notFound, { color: t.sub }]}>Category not found</Text>
				<TouchableOpacity onPress={() => router.back()} style={styles.backLink}>
					<Text style={[styles.backLinkText, { color: t.sub, fontFamily: fontFamily(700) }]}>
						‹ Back
					</Text>
				</TouchableOpacity>
			</View>
		);
	}

	const spent = summaryData.categories.find((c) => c.categoryId === category._id)?.spent ?? 0;
	const det = toCategoryDetail(toBudgetCategory(category), spent, currency, mounted, year, month);
	const nowMs = Date.now();
	// Only the live period is editable: the current month for monthly
	// categories, always for annual ones — history stays read-only.
	const rows = (txns ?? []).map((txn) => ({
		...toTxnRow(txn, currency, nowMs, members ?? []),
		txn,
		editable: isTxnEditable(txn.spentAt, nowMs, det.isAnnual),
	}));

	const applyLimit = (dir: 1 | -1) => {
		const next = bumpLimit(category.limit, category.period, dir);
		updateLimit({ categoryId: category._id, limit: next }).catch(() => {
			toast("Couldn't update the limit — try again");
		});
	};

	const handleLimitChange = (text: string) => {
		setLimitInput(text.replace(/[^0-9]/g, ''));
	};

	const commitLimit = () => {
		const digits = limitInput.replace(/[^0-9]/g, '');
		const nextMinor = Math.max(1, Math.round(parseFloat(digits || '0') * 100));
		if (nextMinor !== category.limit) {
			updateLimit({ categoryId: category._id, limit: nextMinor }).catch(() => {
				toast("Couldn't update the limit — try again");
			});
		} else {
			setLimitInput(String(Math.round(category.limit / 100)));
		}
	};

	const openAdd = () => {
		openAddExpense(category._id);
	};

	const handleDelete = () => {
		deleteCategory({ categoryId: category._id })
			.then(() => {
				router.replace('/(app)/home');
			})
			.catch(() => {
				toast("Couldn't delete the category — try again");
			});
	};

	return (
		<View style={[styles.container, { backgroundColor: t.bg }]}>
			<SlideIn style={styles.container}>
			<ScrollView contentContainerStyle={styles.content}>
				<TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
					<Text style={[styles.backText, { color: t.sub, fontFamily: fontFamily(700) }]}>
						‹ Back
					</Text>
				</TouchableOpacity>

				<View style={styles.header}>
					<View style={styles.tile}>
						<Icon name={det.emoji} size={34} color={t.text} />
					</View>
					<View style={styles.headerText}>
						<View style={styles.nameRow}>
							<Text style={[styles.name, { color: t.text, fontFamily: fontFamily(800) }]}>
								{det.name}
							</Text>
							{det.isAnnual ? (
								<View style={[styles.badge, { backgroundColor: accent + '26' }]}>
									<Text style={[styles.badgeText, { color: accent }]}>ANNUAL</Text>
								</View>
							) : null}
						</View>
						<Text style={[styles.periodLabel, { color: t.sub }]}>{det.periodLabel}</Text>
					</View>
				</View>

				<View style={[styles.card, { backgroundColor: t.card }]}>
					<View style={styles.amtRow}>
						<Text style={[styles.amt, { color: t.text, fontFamily: fontFamily(900) }]}>
							{det.amtFmt}
						</Text>
						<Text style={[styles.of, { color: t.sub }]}>{det.ofFmt}</Text>
					</View>
					<View style={styles.barWrap}>
						<ProgressBar
							pct={parseInt(det.pctW, 10)}
							from={det.bar.from}
							to={det.bar.to ?? undefined}
							height={10}
						/>
					</View>
					<Text style={[styles.sub, { color: det.subColor, fontFamily: fontFamily(700) }]}>
						{det.sub1}
					</Text>
					{det.sub2 ? (
						<Text style={[styles.sub2, { color: det.subColor, fontFamily: fontFamily(700) }]}>
							{det.sub2}
						</Text>
					) : null}
				</View>

				<View style={[styles.limitCard, { backgroundColor: t.card }]}>
					<View style={styles.limitText}>
						<Text style={[styles.limitLabel, { color: t.sub, fontFamily: fontFamily(700) }]}>
							{det.limitLabel}
						</Text>
						<View style={styles.limitInputRow}>
							<Text style={[styles.limitCurSym, { color: t.text, fontFamily: fontFamily(800) }]}>
								{det.curSym}
							</Text>
							<TextInput
								value={limitInput}
								onChangeText={handleLimitChange}
								onBlur={commitLimit}
								onSubmitEditing={commitLimit}
								keyboardType="numeric"
								inputMode="numeric"
								style={[styles.limitInput, { color: t.text, fontFamily: fontFamily(800) }]}
							/>
						</View>
					</View>
					<TouchableOpacity
						accessibilityRole="button"
						accessibilityLabel="Decrease limit"
						onPress={() => applyLimit(-1)}
						style={[styles.limitBtn, { backgroundColor: t.el }]}
					>
						<Text style={[styles.limitBtnText, { color: t.text }]}>−</Text>
					</TouchableOpacity>
					<TouchableOpacity
						accessibilityRole="button"
						accessibilityLabel="Increase limit"
						onPress={() => applyLimit(1)}
						style={[styles.limitBtn, { backgroundColor: t.el }]}
					>
						<Text style={[styles.limitBtnText, { color: t.text }]}>+</Text>
					</TouchableOpacity>
				</View>

				<Text style={[styles.recentTitle, { color: t.text, fontFamily: fontFamily(800) }]}>
					Recent
				</Text>
				<View style={[styles.txnCard, { backgroundColor: t.card }]}>
					{rows.length === 0 ? (
						<Text style={[styles.empty, { color: t.sub }]}>No expenses yet</Text>
					) : (
						rows.map((row, i) => (
							<TouchableOpacity
								key={row.id}
								accessibilityRole={row.editable ? 'button' : undefined}
								accessibilityLabel={row.editable ? `Edit ${row.note}` : undefined}
								disabled={!row.editable}
								activeOpacity={0.6}
								onPress={() =>
									openEditExpense({
										_id: row.txn._id,
										categoryId: category._id,
										amount: row.txn.amount,
										note: row.txn.note,
										memo: row.txn.memo,
										payerName: row.txn.payerName,
										paidBy: row.txn.paidBy,
										spentAt: row.txn.spentAt,
									})
								}
								style={[
									styles.txnRow,
									i < rows.length - 1 ? { borderBottomColor: t.line, borderBottomWidth: 1 } : null,
								]}
							>
								<View style={[styles.avatar, { backgroundColor: row.whoBg }]}>
									<Text style={[styles.avatarText, { color: row.whoColor }]}>
										{row.whoInitial}
									</Text>
								</View>
								<View style={styles.txnMid}>
									<Text
										style={[styles.txnNote, { color: t.text, fontFamily: fontFamily(700) }]}
										numberOfLines={1}
									>
										{row.note}
									</Text>
									<Text style={[styles.txnMeta, { color: t.sub }]}>{row.meta}</Text>
								</View>
								<Text style={[styles.txnAmt, { color: t.text, fontFamily: fontFamily(800) }]}>
									{row.amtFmt}
								</Text>
								{row.editable ? <Icon name="chevron_right" size={18} color={t.sub} /> : null}
							</TouchableOpacity>
						))
					)}
				</View>

				{confirmDelete ? (
					<View style={[styles.confirmCard, { backgroundColor: t.card }]}>
						<Text style={[styles.confirmTitle, { color: t.text, fontFamily: fontFamily(700) }]}>
							Delete {category.name}?
						</Text>
						<Text style={[styles.confirmBody, { color: t.sub }]}>
							This removes the category and its expenses for everyone. This can’t be undone.
						</Text>
						<View style={styles.confirmRow}>
							<TouchableOpacity
								accessibilityRole="button"
								accessibilityLabel="Keep it"
								onPress={() => setConfirmDelete(false)}
								style={[styles.confirmBtn, { backgroundColor: t.el }]}
							>
								<Text style={[styles.confirmBtnText, { color: t.text, fontFamily: fontFamily(800) }]}>
									Keep it
								</Text>
							</TouchableOpacity>
							<TouchableOpacity
								accessibilityRole="button"
								accessibilityLabel="Delete"
								onPress={handleDelete}
								style={[styles.confirmBtn, { backgroundColor: '#C8402E' }]}
							>
								<Text style={[styles.confirmBtnText, { color: '#FFF3F0', fontFamily: fontFamily(800) }]}>
									Delete
								</Text>
							</TouchableOpacity>
						</View>
					</View>
				) : (
					<>
						<TouchableOpacity
							accessibilityRole="button"
							accessibilityLabel={det.addLabel}
							onPress={openAdd}
							style={[styles.addButton, { backgroundColor: accent }]}
						>
							<Text style={styles.addButtonText}>{det.addLabel}</Text>
						</TouchableOpacity>
						<TouchableOpacity
							accessibilityRole="button"
							accessibilityLabel="Delete category"
							onPress={() => setConfirmDelete(true)}
							style={styles.deleteButton}
							activeOpacity={0.6}
						>
							<Icon name="delete" size={18} color="#DE4B37" />
							<Text style={[styles.deleteButtonText, { fontFamily: fontFamily(700) }]}>
								Delete category
							</Text>
						</TouchableOpacity>
					</>
				)}
			</ScrollView>
			</SlideIn>
		</View>
	);
}

const styles = StyleSheet.create({
	loading: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		gap: 12,
	},
	notFound: {
		fontSize: 15,
	},
	backLink: {
		padding: 8,
	},
	backLinkText: {
		fontSize: 15,
	},
	container: {
		flex: 1,
	},
	content: {
		padding: 18,
		paddingBottom: 150,
	},
	backButton: {
		alignSelf: 'flex-start',
		paddingVertical: 8,
		paddingHorizontal: 4,
	},
	backText: {
		fontSize: 15,
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 14,
		paddingVertical: 10,
		paddingHorizontal: 4,
	},
	tile: {
		width: 56,
		height: 56,
		alignItems: 'center',
		justifyContent: 'center',
	},
	emoji: {
		fontSize: 34,
	},
	headerText: {
		flex: 1,
	},
	nameRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	name: {
		fontSize: 20,
		letterSpacing: -0.3,
	},
	badge: {
		borderRadius: 999,
		paddingVertical: 3,
		paddingHorizontal: 7,
	},
	badgeText: {
		fontFamily: fontFamily(800),
		fontSize: 9,
		letterSpacing: 1,
	},
	periodLabel: {
		fontSize: 13,
		marginTop: 2,
	},
	card: {
		borderRadius: 24,
		padding: 20,
		marginTop: 8,
	},
	amtRow: {
		flexDirection: 'row',
		alignItems: 'baseline',
		gap: 8,
	},
	amt: {
		fontSize: 30,
		letterSpacing: -0.7,
	},
	of: {
		fontSize: 14,
	},
	barWrap: {
		marginTop: 14,
	},
	sub: {
		fontSize: 13,
		marginTop: 10,
	},
	sub2: {
		fontSize: 13,
		marginTop: 1,
	},
	limitCard: {
		borderRadius: 24,
		paddingVertical: 16,
		paddingHorizontal: 20,
		marginTop: 12,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	limitText: {
		flex: 1,
	},
	limitLabel: {
		fontSize: 13,
	},
	limitFmt: {
		fontSize: 18,
		marginTop: 2,
	},
	limitInputRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: 2,
	},
	limitCurSym: {
		fontSize: 18,
	},
	limitInput: {
		fontSize: 18,
		width: 110,
		padding: 0,
		backgroundColor: 'transparent',
		borderWidth: 0,
	},
	limitBtn: {
		width: 42,
		height: 42,
		borderRadius: 21,
		alignItems: 'center',
		justifyContent: 'center',
	},
	limitBtnText: {
		fontSize: 20,
		fontFamily: fontFamily(800),
	},
	recentTitle: {
		fontSize: 16,
		paddingHorizontal: 4,
		paddingTop: 22,
		paddingBottom: 10,
	},
	txnCard: {
		borderRadius: 24,
		paddingHorizontal: 18,
	},
	empty: {
		fontSize: 14,
		paddingVertical: 18,
		textAlign: 'center',
	},
	txnRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		paddingVertical: 14,
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
	txnMid: {
		flex: 1,
		minWidth: 0,
	},
	txnNote: {
		fontSize: 14,
	},
	txnMeta: {
		fontSize: 12,
		marginTop: 1,
	},
	txnAmt: {
		fontSize: 15,
	},
	addButton: {
		width: '100%',
		height: 54,
		marginTop: 16,
		borderRadius: 999,
		alignItems: 'center',
		justifyContent: 'center',
	},
	addButtonText: {
		fontFamily: fontFamily(800),
		fontSize: 16,
		color: '#2B0E1A',
	},
	deleteButton: {
		width: '100%',
		height: 48,
		marginTop: 10,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 6,
	},
	deleteButtonText: {
		fontSize: 14,
		color: '#DE4B37',
	},
	confirmCard: {
		borderRadius: 20,
		padding: 18,
		marginTop: 12,
		alignItems: 'center',
	},
	confirmTitle: {
		fontSize: 14,
		textAlign: 'center',
	},
	confirmBody: {
		fontSize: 12,
		marginTop: 4,
		lineHeight: 18,
		textAlign: 'center',
	},
	confirmRow: {
		flexDirection: 'row',
		gap: 8,
		marginTop: 14,
		width: '100%',
	},
	confirmBtn: {
		flex: 1,
		height: 46,
		borderRadius: 999,
		alignItems: 'center',
		justifyContent: 'center',
	},
	confirmBtnText: {
		fontSize: 14,
	},
});
