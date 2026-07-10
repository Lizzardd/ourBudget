import { useQuery } from 'convex/react';
import { useState } from 'react';
import {
	annualPace,
	categoryBars,
	trendCols,
	type AnnualPaceRow,
	type CategoryBar,
	type MonthTotal,
	type TrendCol,
} from '../budget/reports';
import { fmt, fmtN } from '../budget/money';
import { monthLabel, yearProgressPct } from '../budget/periods';
import { api } from '../../convex/_generated/api';
import { toBudgetCategory } from './categoryMapper';
import { useHousehold } from './useHousehold';

export interface UseReportsResult {
	categoryBars: CategoryBar[];
	trendCols: TrendCol[];
	annualPace: AnnualPaceRow[];
	/** Label of the currently-selected trend month, e.g. "July 2026". */
	selectedLabel: string;
	/** Calendar year/month backing `selectedLabel`, for building month/year date ranges. */
	selectedYear: number;
	selectedMonth: number;
	/** Total spend across monthly categories for the selected month, formatted. */
	selectedTotalFmt: string;
	/** The (constant) monthly budget total, formatted — "of {selectedLimitFmt} spent". */
	selectedLimitFmt: string;
	/** Year-progress marker position for the annual-budgets tick line, e.g. '51%'. */
	yearTick: string;
	/** Selects a different trend month in-place (no navigation). */
	selectMonth: (index: number) => void;
	loading: boolean;
}

/**
 * Runs `categories.listCategories` + `transactions.monthTotals` (for the
 * trend) + `transactions.summary` for the currently-selected trend month,
 * and maps the results to the Reports screen's view-ready shapes via
 * `src/budget/reports.ts`. The selected month defaults to the most recent
 * (current) month and is changed in-place by tapping a trend column — see
 * `selectMonth`.
 */
export function useReports(monthsBack: number = 6): UseReportsResult {
	const { householdId, currency, loading: householdLoading } = useHousehold();
	const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

	const categories = useQuery(
		api.categories.listCategories,
		householdId ? { householdId } : 'skip'
	);
	const monthTotals = useQuery(
		api.transactions.monthTotals,
		householdId ? { householdId, months: monthsBack } : 'skip'
	);

	// Default to the last (most recent/current) month until the user taps a column.
	const effectiveIndex =
		selectedIndex !== null && monthTotals && selectedIndex < monthTotals.length
			? selectedIndex
			: monthTotals
				? monthTotals.length - 1
				: 0;
	const selected: MonthTotal | undefined = monthTotals?.[effectiveIndex];

	const summaryData = useQuery(
		api.transactions.summary,
		householdId && selected ? { householdId, year: selected.year, month: selected.month } : 'skip'
	);

	const loading =
		householdLoading ||
		categories === undefined ||
		monthTotals === undefined ||
		summaryData === undefined ||
		!currency;

	if (loading) {
		return {
			categoryBars: [],
			trendCols: [],
			annualPace: [],
			selectedLabel: '',
			selectedYear: new Date().getUTCFullYear(),
			selectedMonth: new Date().getUTCMonth(),
			selectedTotalFmt: '',
			selectedLimitFmt: '',
			yearTick: '0%',
			selectMonth: setSelectedIndex,
			loading: true,
		};
	}

	const spentByCat: Record<string, number> = {};
	for (const c of summaryData.categories) {
		spentByCat[c.categoryId] = c.spent;
	}

	const monthlyCats = categories.filter((cat) => cat.period === 'monthly').map(toBudgetCategory);
	const annualCats = categories.filter((cat) => cat.period === 'annual').map(toBudgetCategory);
	const yearPct = yearProgressPct(Date.now());
	const budgetT = summaryData.totalLimit;

	return {
		categoryBars: categoryBars(monthlyCats, spentByCat, currency),
		trendCols: trendCols(monthTotals, budgetT, effectiveIndex),
		annualPace: annualPace(annualCats, spentByCat, yearPct, currency),
		selectedLabel: selected ? monthLabel(selected.year, selected.month) : '',
		selectedYear: selected?.year ?? new Date().getUTCFullYear(),
		selectedMonth: selected?.month ?? new Date().getUTCMonth(),
		selectedTotalFmt: fmt(summaryData.totalSpent, currency),
		selectedLimitFmt: fmtN(budgetT),
		yearTick: `${yearPct}%`,
		selectMonth: setSelectedIndex,
		loading: false,
	};
}
