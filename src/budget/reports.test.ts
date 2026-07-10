import { describe, expect, it } from 'vitest';
import { annualPace, categoryBars, trendCols } from './reports';
import type { MonthTotal, ReportCategory } from './reports';

const cur = 'USD';

function cat(overrides: Partial<ReportCategory> = {}): ReportCategory {
	return {
		id: 'food',
		emoji: '🍔',
		name: 'Food',
		color: '#E3B063',
		limit: 50000,
		period: 'monthly',
		...overrides,
	};
}

describe('categoryBars', () => {
	it('sorts categories descending by spent amount', () => {
		const cats = [
			cat({ id: 'a', name: 'A' }),
			cat({ id: 'b', name: 'B' }),
			cat({ id: 'c', name: 'C' }),
		];
		const spentByCat = { a: 1000, b: 5000, c: 3000 };
		const bars = categoryBars(cats, spentByCat, cur);
		expect(bars.map((b) => b.name)).toEqual(['B', 'C', 'A']);
	});

	it('computes width as percent of the max spent category', () => {
		const cats = [cat({ id: 'a', name: 'A' }), cat({ id: 'b', name: 'B' })];
		const spentByCat = { a: 2500, b: 5000 };
		const bars = categoryBars(cats, spentByCat, cur);
		expect(bars[0]).toEqual({
			id: 'b',
			emoji: '🍔',
			name: 'B',
			amtFmt: '$50',
			color: '#E3B063',
			w: '100%',
		});
		expect(bars[1].w).toBe('50%');
	});

	it('treats a category missing from spentByCat as zero spend', () => {
		const cats = [cat({ id: 'a', name: 'A' }), cat({ id: 'b', name: 'B' })];
		const spentByCat = { a: 4000 };
		const bars = categoryBars(cats, spentByCat, cur);
		expect(bars.map((b) => b.name)).toEqual(['A', 'B']);
		expect(bars[1].amtFmt).toBe('$0');
		expect(bars[1].w).toBe('0%');
	});

	it('guards against divide-by-zero when every category has zero spend', () => {
		const cats = [cat({ id: 'a' }), cat({ id: 'b' })];
		const bars = categoryBars(cats, {}, cur);
		expect(bars.every((b) => b.w === '0%')).toBe(true);
	});

	it('returns an empty array for empty input', () => {
		expect(categoryBars([], {}, cur)).toEqual([]);
	});
});

function monthTotal(overrides: Partial<MonthTotal> = {}): MonthTotal {
	return { label: 'July 2026', short: 'Jul', total: 0, year: 2026, month: 6, ...overrides };
}

describe('trendCols', () => {
	it('under-budget month: budgetH tracks max(t, budgetT)/maxT, fillH is capped pct-of-budget, green fill growing from the bottom', () => {
		const months: MonthTotal[] = [monthTotal({ short: 'Jul', total: 400000 })];
		const cols = trendCols(months, /* budgetT */ 800000, /* selectedIndex */ 0);
		expect(cols).toEqual([
			{
				m: 'Jul',
				amt: '4,0k',
				budgetH: '100%',
				fillH: '50%',
				fillSide: 'flex-end',
				fillRadius: '4px 4px 0 0',
				fillColor: '#86B478',
				selected: true,
			},
		]);
	});

	it('over-budget month: fillH is the overage fraction of the total, red square fill growing from the top', () => {
		const months: MonthTotal[] = [monthTotal({ short: 'Jul', total: 1200000 })];
		const cols = trendCols(months, /* budgetT */ 800000, 0);
		expect(cols[0]).toEqual({
			m: 'Jul',
			amt: '12,0k',
			budgetH: '100%',
			fillH: '33%', // (1200000-800000)/1200000
			fillSide: 'flex-start',
			fillRadius: '0',
			fillColor: '#C8402E',
			selected: true,
		});
	});

	it('marks only the selected column as selected', () => {
		const months: MonthTotal[] = [
			monthTotal({ short: 'May', total: 1000 }),
			monthTotal({ short: 'Jun', total: 2000 }),
			monthTotal({ short: 'Jul', total: 3000 }),
		];
		const cols = trendCols(months, 5000, 1);
		expect(cols.map((c) => c.selected)).toEqual([false, true, false]);
	});

	it('guards against divide-by-zero when budgetT and every month total are zero', () => {
		const months: MonthTotal[] = [monthTotal({ total: 0 }), monthTotal({ total: 0 })];
		const cols = trendCols(months, 0, 0);
		expect(cols.map((c) => c.fillH)).toEqual(['0%', '0%']);
	});

	it('returns an empty array for empty input', () => {
		expect(trendCols([], 8000, 0)).toEqual([]);
	});

	it('drops leading zero-spend months so the trend does not open on an empty column', () => {
		const months: MonthTotal[] = [
			monthTotal({ short: 'Jan', total: 0 }),
			monthTotal({ short: 'Feb', total: 0 }),
			monthTotal({ short: 'Mar', total: 5000 }),
			monthTotal({ short: 'Apr', total: 6000 }),
		];
		const cols = trendCols(months, 8000, 3);
		expect(cols.map((c) => c.m)).toEqual(['Mar', 'Apr']);
		expect(cols.map((c) => c.selected)).toEqual([false, true]);
	});

	it('never drops the selected month, even if it is zero-spend', () => {
		const months: MonthTotal[] = [
			monthTotal({ short: 'Jan', total: 0 }),
			monthTotal({ short: 'Feb', total: 0 }),
			monthTotal({ short: 'Mar', total: 5000 }),
		];
		const cols = trendCols(months, 8000, 1);
		expect(cols.map((c) => c.m)).toEqual(['Feb', 'Mar']);
		expect(cols.map((c) => c.selected)).toEqual([true, false]);
	});

	it('always keeps at least one column when every month is zero-spend', () => {
		const months: MonthTotal[] = [
			monthTotal({ short: 'Jan', total: 0 }),
			monthTotal({ short: 'Feb', total: 0 }),
			monthTotal({ short: 'Mar', total: 0 }),
		];
		const cols = trendCols(months, 8000, 2);
		expect(cols.map((c) => c.m)).toEqual(['Mar']);
	});
});

describe('annualPace', () => {
	it('marks a category ahead of the year when pct-used exceeds year progress', () => {
		const cats = [cat({ id: 'travel', name: 'Travel', limit: 100000, period: 'annual' })];
		const spentByCat = { travel: 60000 };
		const rows = annualPace(cats, spentByCat, 50, cur);
		expect(rows[0]).toEqual({
			id: 'travel',
			emoji: '🍔',
			name: 'Travel',
			color: '#86B478',
			usedFmt: '$600 of 1,000',
			w: '60%',
			pace: '60% used · a little ahead of the year 💛',
			paceColor: '#E3B063',
		});
	});

	it('bar color switches to the over-budget gradient once pct-used exceeds 100%', () => {
		const cats = [cat({ id: 'travel', name: 'Travel', limit: 100000, period: 'annual' })];
		const spentByCat = { travel: 150000 };
		const rows = annualPace(cats, spentByCat, 50, cur);
		expect(rows[0].color).toBe('linear-gradient(90deg,#CE4B3A,#B7301F)');
	});

	it('marks a category on-pace when pct-used is at or below year progress', () => {
		const cats = [cat({ id: 'travel', name: 'Travel', limit: 100000, period: 'annual' })];
		const spentByCat = { travel: 40000 };
		const rows = annualPace(cats, spentByCat, 50, cur);
		expect(rows[0].pace).toBe('40% used · comfortably on pace 🌿');
		expect(rows[0].paceColor).toBe('#8FBF7E');
	});

	it('treats equal pct-used and year progress as on-pace, not ahead', () => {
		const cats = [cat({ id: 'travel', limit: 100000, period: 'annual' })];
		const spentByCat = { travel: 50000 };
		const rows = annualPace(cats, spentByCat, 50, cur);
		expect(rows[0].paceColor).toBe('#8FBF7E');
	});

	it('guards against divide-by-zero when a category has a zero limit', () => {
		const cats = [cat({ id: 'zero', limit: 0, period: 'annual' })];
		const rows = annualPace(cats, { zero: 500 }, 50, cur);
		expect(rows[0].w).toBe('0%');
		expect(rows[0].pace).toContain('0% used');
	});

	it('returns an empty array for empty input', () => {
		expect(annualPace([], {}, 50, cur)).toEqual([]);
	});
});
