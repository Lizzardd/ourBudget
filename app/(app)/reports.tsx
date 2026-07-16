import type { Id } from '../../convex/_generated/dataModel';
import { Loading } from '../../src/components/Loading';
import { useMonthTransactionsSheet } from '../../src/features/MonthTransactionsProvider';
import { useReports } from '../../src/hooks/useReports';
import { monthRange, yearRange } from '../../src/budget/periods';
import { ReportsView, type ReportsRow } from '../../src/screens/ReportsView';

/**
 * Reports tab container — wires `useReports()` (Convex data + selected-month
 * state) and `useMonthTransactionsSheet()` (the app-wide Month Transactions
 * sheet) into the pure `ReportsView`. See `ReportsView` for the actual
 * layout.
 */
export default function Reports() {
	const {
		categoryBars,
		trendCols,
		annualPace,
		selectedLabel,
		selectedYear,
		selectedMonth,
		selectedTotalFmt,
		selectedLimitFmt,
		yearTick,
		selectMonth,
		loading,
	} = useReports();
	const { open: openMonthTransactions } = useMonthTransactionsSheet();

	if (loading) {
		return <Loading />;
	}

	const openCategory = (row: ReportsRow) => {
		const { startMs, endMs } = monthRange(selectedYear, selectedMonth);
		openMonthTransactions({
			mode: 'category',
			categoryId: row.id as Id<'categories'>,
			emoji: row.emoji,
			name: row.name,
			color: row.color,
			monthLabel: selectedLabel,
			isAnnual: false,
			startMs,
			endMs,
		});
	};

	const openAnnual = (row: ReportsRow) => {
		const { startMs, endMs } = yearRange(selectedYear);
		openMonthTransactions({
			mode: 'category',
			categoryId: row.id as Id<'categories'>,
			emoji: row.emoji,
			name: row.name,
			color: row.color,
			monthLabel: 'Year to date',
			isAnnual: true,
			startMs,
			endMs,
		});
	};

	return (
		<ReportsView
			categoryBars={categoryBars}
			trendCols={trendCols}
			annualPace={annualPace}
			selectedLabel={selectedLabel}
			selectedTotalFmt={selectedTotalFmt}
			selectedLimitFmt={selectedLimitFmt}
			yearTick={yearTick}
			onSelectMonth={selectMonth}
			onOpenCategory={openCategory}
			onOpenAnnual={openAnnual}
		/>
	);
}
