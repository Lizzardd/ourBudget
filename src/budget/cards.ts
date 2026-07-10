/**
 * Pure budget-math module that shapes category + summary aggregates into
 * the view-ready card shapes used by the Home screen. No React Native /
 * Convex imports — inputs are plain data, fed later by Convex query results.
 */

import { fmt, fmtN } from './money';
import { status } from './status';

/**
 * A budget category as needed by the card views. This is a subset of the
 * full category record — only the fields the card renders.
 */
export interface CardCategory {
	id: string;
	emoji: string;
	name: string;
	color: string;
	period: 'monthly' | 'annual';
	limit: number;
}

export interface CardBar {
	from: string;
	to: string | null;
}

export interface CategoryCard {
	id: string;
	emoji: string;
	name: string;
	isAnnual: boolean;
	amtFmt: string;
	ofFmt: string;
	pctW: string;
	bar: CardBar;
	sub1: string;
	sub2: string;
	subColor: string;
}

export interface SummaryVM {
	ringPct: number;
	ringLabel: string;
	ringColor: string;
	totalSpentFmt: string;
	totalLimitFmt: string;
	summaryLine1: string;
	summaryLine2: string;
	summaryColor: string;
}

/**
 * Percent of `spent` relative to `limit`, clamped to [0, 100] and rounded to
 * an integer. Guards against divide-by-zero: when limit <= 0, returns 0.
 */
function clampedPct(spent: number, limit: number): number {
	if (limit <= 0) {
		return 0;
	}
	return Math.max(0, Math.min(100, Math.round((spent / limit) * 100)));
}

/**
 * Builds a single category card for the Home screen: amount/limit copy,
 * progress-bar width and colors, and the status sub-line — all derived from
 * `status()` so the bands (good/warn/over) stay in one place.
 *
 * `mounted` controls the progress-bar width: while false (pre-mount), the
 * width is always '0%' so the bar can animate in from zero on first paint.
 */
export function toCategoryCard(
	cat: CardCategory,
	spentMinor: number,
	cur: string,
	mounted: boolean
): CategoryCard {
	const isAnnual = cat.period === 'annual';
	const st = status(spentMinor, cat.limit, isAnnual, cur);
	const pct = mounted ? Math.max(0, Math.min(100, Math.round(st.pct * 100))) : 0;

	return {
		id: cat.id,
		emoji: cat.emoji,
		name: cat.name,
		isAnnual,
		amtFmt: fmt(spentMinor, cur),
		ofFmt: 'of ' + fmtN(cat.limit),
		pctW: pct + '%',
		bar: { from: st.barFrom, to: st.barTo },
		sub1: st.sub1,
		sub2: st.sub2,
		subColor: st.subColor,
	};
}

/**
 * Builds the Home screen summary (progress ring + total spend copy) from the
 * month’s category cards and the household’s total spend/limit for the
 * month.
 *
 * `ringLabel` reports the budget-usage percentage (e.g. "78%"), `ringColor`
 * is green normally and red when the household has overspent, and
 * `summaryLine1`/`summaryLine2` are the encouragement copy: "left" when
 * under/at limit, "over" when the household has overspent — copy is
 * verbatim from the prototype.
 */
export function toSummary(
	monthlyCards: CategoryCard[],
	totalSpentMinor: number,
	totalLimitMinor: number,
	cur: string,
	mounted: boolean
): SummaryVM {
	const ringPct = mounted ? clampedPct(totalSpentMinor, totalLimitMinor) : 0;
	const left = totalLimitMinor - totalSpentMinor;
	const ringColor = totalSpentMinor > totalLimitMinor ? '#C8402E' : '#86B478';
	const summaryLine1 = left >= 0 ? fmt(left, cur) + ' left' : fmt(-left, cur) + ' over';
	const summaryLine2 = left >= 0 ? 'you’ve got this 🌿' : 'deep breath 💛';
	const summaryColor = left >= 0 ? '#8FBF7E' : '#DE4B37';

	return {
		ringPct,
		ringLabel: clampedPct(totalSpentMinor, totalLimitMinor) + "%",
		ringColor,
		totalSpentFmt: fmt(totalSpentMinor, cur),
		totalLimitFmt: fmt(totalLimitMinor, cur),
		summaryLine1,
		summaryLine2,
		summaryColor,
	};
}
