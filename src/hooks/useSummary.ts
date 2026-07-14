import { useMutation, useQuery } from 'convex/react';
import { toCategoryCard, toSummary, type CategoryCard, type SummaryVM } from '../budget/cards';
import { api } from '../../convex/_generated/api';
import { toBudgetCategory } from './categoryMapper';
import { useHousehold } from './useHousehold';
import { useMounted } from './useMounted';

export interface SummarySection {
	title: string;
	hint: string;
	cards: CategoryCard[];
}

export interface UseSummaryResult {
	sections: SummarySection[];
	summary: SummaryVM | undefined;
	loading: boolean;
}

/**
 * Runs `categories.listCategories` + `transactions.summary` for the given
 * month and maps the results to the Home screen's view-ready shape via
 * `cards.ts`. Monthly categories go in the first section, annual categories
 * in the second.
 */
export function useSummary(year: number, month: number): UseSummaryResult {
	const { householdId, currency, loading: householdLoading } = useHousehold();
	const mounted = useMounted();

	const categories = useQuery(
		api.categories.listCategories,
		householdId ? { householdId } : 'skip'
	);
	const summaryData = useQuery(
		api.transactions.summary,
		householdId ? { householdId, year, month } : 'skip'
	);

	const loading =
		householdLoading || categories === undefined || summaryData === undefined || !currency;

	if (loading) {
		return {
			sections: [
				{ title: 'This Month', hint: 'Resets Monthly', cards: [] },
				{ title: 'Annual Budgets', hint: 'Resets Annually', cards: [] },
			],
			summary: undefined,
			loading: true,
		};
	}

	const spentByCat = new Map(summaryData.categories.map((c) => [c.categoryId, c.spent]));
	const monthlyCards = categories
		.filter((cat) => cat.period === 'monthly')
		.map((cat) => toCategoryCard(toBudgetCategory(cat), spentByCat.get(cat._id) ?? 0, currency, mounted));
	const annualCards = categories
		.filter((cat) => cat.period === 'annual')
		.map((cat) => toCategoryCard(toBudgetCategory(cat), spentByCat.get(cat._id) ?? 0, currency, mounted));

	const summary = toSummary(monthlyCards, summaryData.totalSpent, summaryData.totalLimit, currency, mounted);

	return {
		sections: [
			{ title: 'This Month', hint: 'Resets Monthly', cards: monthlyCards },
			{ title: 'Annual Budgets', hint: 'Resets Annually', cards: annualCards },
		],
		summary,
		loading: false,
	};
}

/** Thin wrapper over the `addTransaction` mutation. */
export function useAddExpense() {
	return useMutation(api.transactions.addTransaction);
}

/** Thin wrapper over the `updateTransaction` mutation (Add-Expense sheet, edit mode). */
export function useUpdateExpense() {
	return useMutation(api.transactions.updateTransaction);
}

/** Thin wrapper over the `deleteTransaction` mutation (Add-Expense sheet, edit mode). */
export function useDeleteExpense() {
	return useMutation(api.transactions.deleteTransaction);
}

/**
 * Runs `transactions.weeklySummary` for the in-app Monday check-in
 * (`MondayNotification` + `WeeklyCheckIn` — see the NOTES on those files:
 * this is an in-app simulation only, there is no scheduled push/email yet).
 * `nowMs` is passed in by the caller so both components share one window.
 */
export function useWeeklySummary(nowMs: number) {
	const { householdId, currency, loading: householdLoading } = useHousehold();
	const weekly = useQuery(
		api.transactions.weeklySummary,
		householdId ? { householdId, nowMs } : 'skip'
	);

	return {
		weekly,
		currency,
		loading: householdLoading || weekly === undefined,
	};
}
