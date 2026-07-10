/**
 * Pure budget-math module that shapes already-aggregated spend data into
 * view-ready structures for the Reports screen. No React Native / Convex
 * imports — inputs are plain data, fed later by Convex query results.
 */

import { fmt, fmtN } from './money';

/**
 * A budget category as needed by the reports views. This is a subset of the
 * full category record — only the fields the reports screen renders.
 */
export interface ReportCategory {
	id: string;
	emoji: string;
	name: string;
	color: string;
	limit: number;
	period: 'monthly' | 'annual';
}

/** A single month's aggregated spend total, used for the trend columns. */
export interface MonthTotal {
	label: string;
	short: string;
	total: number;
	year: number;
	month: number;
}

export interface CategoryBar {
	id: string;
	emoji: string;
	name: string;
	amtFmt: string;
	color: string;
	w: string;
}

export interface TrendCol {
	m: string;
	amt: string;
	/** Track (budget-column) height, e.g. '80%'. */
	budgetH: string;
	/** Fill height within the track, e.g. '45%'. */
	fillH: string;
	/** Where the fill grows from within the track. */
	fillSide: 'flex-start' | 'flex-end';
	/** Fill corner radius: square when over budget, rounded top when under. */
	fillRadius: string;
	/** Fill color: red when over budget, green when under. */
	fillColor: string;
	/** True when this column is the currently-selected month (label uses the accent color). */
	selected: boolean;
}

export interface AnnualPaceRow {
	id: string;
	emoji: string;
	name: string;
	color: string;
	usedFmt: string;
	w: string;
	pace: string;
	paceColor: string;
}

/**
 * Percent of `value` relative to `max`, clamped to [0, 100] and formatted as
 * 'NN%'. Guards against divide-by-zero: when max <= 0, returns '0%'.
 */
function pctOf(value: number, max: number): string {
	if (max <= 0) {
		return '0%';
	}
	const p = Math.round((value / max) * 100);
	return `${Math.max(0, Math.min(100, p))}%`;
}

/**
 * Builds the category spend bars for the Reports screen: one row per
 * category, sorted descending by amount spent, with bar width expressed as
 * a percentage of the highest-spending category (100% = longest bar).
 *
 * Categories missing from `spentByCat` are treated as zero spend. When every
 * category has zero spend, all widths are '0%' (no divide-by-zero).
 */
export function categoryBars(
	cats: ReportCategory[],
	spentByCat: Record<string, number>,
	cur: string
): CategoryBar[] {
	const rows = cats.map((cat) => ({
		cat,
		spent: spentByCat[cat.id] ?? 0,
	}));
	rows.sort((a, b) => b.spent - a.spent);
	const max = rows.reduce((m, r) => Math.max(m, r.spent), 0);
	return rows.map(({ cat, spent }) => ({
		id: cat.id,
		emoji: cat.emoji,
		name: cat.name,
		amtFmt: fmt(spent, cur),
		color: cat.color,
		w: pctOf(spent, max),
	}));
}

/**
 * Formats a month total (minor units) for the trend column's amount label:
 * thousands with one decimal place, using a comma as the decimal separator
 * (e.g. 2140000 -> '21,4k') — copied verbatim from the prototype's
 * `(t/1000).toFixed(1).replace('.', ',') + 'k'`. This is intentionally NOT
 * the same style as `money.ts`'s comma-grouped thousands (see its "Known
 * trap" note) — this is a distinct, prototype-mandated label format used
 * only for these small trend labels.
 */
function trendAmt(minor: number): string {
	return ((minor / 100) / 1000).toFixed(1).replace('.', ',') + 'k';
}

/**
 * Builds the month-over-month trend columns for the Reports screen: each
 * column now shows spend-vs-budget rather than a plain height bar.
 *
 * - `budgetT` is the monthly budget total (sum of monthly categories'
 *   limits) — a constant reference line across every column.
 * - `budgetH` is the track height: `max(t, budgetT) / maxT`, where `maxT`
 *   is the highest of all month totals and `budgetT` itself, so the track
 *   never shrinks below the budget reference even in a very-under month.
 * - `fillH` is the fill height *within* the track: when over budget, the
 *   fraction of the column that is the overage (`(t-budgetT)/t`); when
 *   under, the fraction of budget used, capped at 100%.
 * - `selectedIndex` marks which column represents the currently-selected
 *   month (drives the accent label color at the screen layer).
 *
 * Guards against divide-by-zero: a zero `budgetT` or zero-total month
 * yields a 0% fill rather than NaN.
 */
export function trendCols(monthTotals: MonthTotal[], budgetT: number, selectedIndex: number): TrendCol[] {
	if (monthTotals.length === 0) {
		return [];
	}
	// Drop leading zero-spend months (e.g. months before the household had
	// any transaction history) so the trend doesn't open on an empty "0,0k"
	// column. Never drops past the selected month, and always keeps at
	// least one column.
	let dropCount = 0;
	while (
		dropCount < monthTotals.length - 1 &&
		dropCount < selectedIndex &&
		monthTotals[dropCount].total === 0
	) {
		dropCount++;
	}
	const months = dropCount > 0 ? monthTotals.slice(dropCount) : monthTotals;
	const adjSelectedIndex = selectedIndex - dropCount;

	const maxT = months.reduce((m, mt) => Math.max(m, mt.total), budgetT);
	return months.map((mt, i) => {
		const t = mt.total;
		const over = t > budgetT;
		const fillHNum = over
			? t > 0 ? Math.round(((t - budgetT) / t) * 100) : 0
			: budgetT > 0 ? Math.min(100, Math.round((t / budgetT) * 100)) : 0;
		return {
			m: mt.short,
			amt: trendAmt(t),
			budgetH: pctOf(Math.max(t, budgetT), maxT),
			fillH: `${Math.max(0, fillHNum)}%`,
			fillSide: over ? 'flex-start' : 'flex-end',
			fillRadius: over ? '0' : '4px 4px 0 0',
			fillColor: over ? '#C8402E' : '#86B478',
			selected: i === adjSelectedIndex,
		};
	});
}

/**
 * Builds the annual-budget pace list for the Reports screen: one row per
 * annual category, showing percent of limit used against the percent of
 * the year elapsed (`yearPct`).
 *
 * - If pct-used > yearPct: "ahead" band — paceColor '#E3B063', copy
 *   '<pct>% used · a little ahead of the year 💛'.
 * - Otherwise (pct-used <= yearPct, including equal): "on-pace" band —
 *   paceColor '#8FBF7E', copy '<pct>% used · comfortably on pace 🌿'.
 *
 * A category with a zero (or negative) limit is treated as 0% used to
 * avoid divide-by-zero, and is reported as on-pace.
 */
export function annualPace(
	cats: ReportCategory[],
	spentByCat: Record<string, number>,
	yearPct: number,
	cur: string
): AnnualPaceRow[] {
	return cats.map((cat) => {
		const spent = spentByCat[cat.id] ?? 0;
		const pctUsed = cat.limit > 0 ? Math.round((spent / cat.limit) * 100) : 0;
		const ahead = pctUsed > yearPct;
		const paceColor = ahead ? '#E3B063' : '#8FBF7E';
		const pace = ahead
			? `${pctUsed}% used · a little ahead of the year 💛`
			: `${pctUsed}% used · comfortably on pace 🌿`;
		return {
			id: cat.id,
			emoji: cat.emoji,
			name: cat.name,
			color: pctUsed > 100 ? 'linear-gradient(90deg,#CE4B3A,#B7301F)' : '#86B478',
			usedFmt: `${fmt(spent, cur)} of ${fmtN(cat.limit)}`,
			w: `${Math.max(0, Math.min(100, pctUsed))}%`,
			pace,
			paceColor,
		};
	});
}
