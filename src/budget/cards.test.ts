import { describe, it, expect } from 'vitest';
import { toCategoryCard, toSummary, type CardCategory, type CategoryCard } from './cards';

const groceries: CardCategory = {
	id: 'cat1',
	emoji: 'grocery',
	name: 'Groceries',
	color: '#7FA86F',
	period: 'monthly',
	limit: 250000,
};

const carService: CardCategory = {
	id: 'cat2',
	emoji: 'directions_car',
	name: 'Car service',
	color: '#8AA3C4',
	period: 'annual',
	limit: 400000,
};

describe('toCategoryCard()', () => {
	it('builds a monthly card with isAnnual false and no year suffix in sub1', () => {
		const card = toCategoryCard(groceries, 125000, 'AED', true);
		expect(card.id).toBe('cat1');
		expect(card.emoji).toBe('grocery');
		expect(card.name).toBe('Groceries');
		expect(card.isAnnual).toBe(false);
		expect(card.amtFmt).toBe('Đ1,250');
		expect(card.ofFmt).toBe('of 2,500');
		expect(card.sub1).toBe('Đ1,250 left');
		expect(card.sub2).toBe('');
	});

	it('builds an annual card with isAnnual true and no year suffix', () => {
		const card = toCategoryCard(carService, 200000, 'AED', true);
		expect(card.isAnnual).toBe(true);
		expect(card.sub1).toBe('Đ2,000 left');
		expect(card.sub2).toBe('');
	});

	it('reflects the good band bar + sub via status()', () => {
		const card = toCategoryCard(groceries, 50000, 'AED', true);
		expect(card.bar).toEqual({ from: '#86B478', to: null });
		expect(card.subColor).toBe('#8FBF7E');
		expect(card.sub1).toBe('Đ2,000 left');
		expect(card.sub2).toBe('');
	});

	it('reflects the warn band bar + sub via status()', () => {
		const card = toCategoryCard(groceries, 225000, 'AED', true);
		expect(card.bar).toEqual({ from: '#86B478', to: null });
		expect(card.subColor).toBe('#8FBF7E');
		expect(card.sub1).toBe('Đ250 left');
		expect(card.sub2).toBe('nearly there 🌿');
	});

	it('reflects the over band bar + sub via status()', () => {
		const card = toCategoryCard(groceries, 300000, 'AED', true);
		expect(card.bar).toEqual({ from: '#CE4B3A', to: '#B7301F' });
		expect(card.subColor).toBe('#DE4B37');
		expect(card.sub1).toBe('Đ500 over');
		expect(card.sub2).toBe('it happens 💛');
	});

	it('reports pctW as the rounded status pct when mounted', () => {
		const card = toCategoryCard(groceries, 125000, 'AED', true);
		expect(card.pctW).toBe('50%');
	});

	it('clamps pctW to 100% when over budget', () => {
		const card = toCategoryCard(groceries, 500000, 'AED', true);
		expect(card.pctW).toBe('100%');
	});

	it('forces pctW to 0% when not yet mounted, regardless of spend', () => {
		const card = toCategoryCard(groceries, 125000, 'AED', false);
		expect(card.pctW).toBe('0%');
	});
});

describe('toSummary()', () => {
	const cards: CategoryCard[] = [
		toCategoryCard(groceries, 125000, 'AED', true),
		toCategoryCard(carService, 200000, 'AED', true),
	];

	it('formats total spent and total limit', () => {
		const summary = toSummary(cards, 325000, 500000, 'AED', true);
		expect(summary.totalSpentFmt).toBe('Đ3,250');
		expect(summary.totalLimitFmt).toBe('Đ5,000');
	});

	it('reports ringLabel as budget-usage percentage', () => {
		const summary = toSummary(cards, 325000, 500000, 'AED', true);
		expect(summary.ringLabel).toBe('65%');

		const single = toSummary([cards[0]], 125000, 250000, 'AED', true);
		expect(single.ringLabel).toBe('50%');
	});

	it('reports ringLabel as 0% when totalLimitMinor is 0 (divide-by-zero guard)', () => {
		const summary = toSummary(cards, 325000, 0, 'AED', true);
		expect(summary.ringLabel).toBe('0%');
	});

	it('computes ringPct as rounded spent/limit when mounted', () => {
		const summary = toSummary(cards, 325000, 500000, 'AED', true);
		expect(summary.ringPct).toBe(65);
	});

	it('forces ringPct to 0 when not yet mounted', () => {
		const summary = toSummary(cards, 325000, 500000, 'AED', false);
		expect(summary.ringPct).toBe(0);
	});

	it('clamps ringPct to 100 when over budget', () => {
		const summary = toSummary(cards, 600000, 500000, 'AED', true);
		expect(summary.ringPct).toBe(100);
	});

	it('ringColor is green when under/at limit, red when over', () => {
		const under = toSummary(cards, 325000, 500000, 'AED', true);
		expect(under.ringColor).toBe('#86B478');

		const atLimit = toSummary(cards, 500000, 500000, 'AED', true);
		expect(atLimit.ringColor).toBe('#86B478');

		const over = toSummary(cards, 600000, 500000, 'AED', true);
		expect(over.ringColor).toBe('#C8402E');
	});

	it('summaryLine1/summaryLine2 report amount left with encouragement copy when under/at limit', () => {
		const summary = toSummary(cards, 325000, 500000, 'AED', true);
		expect(summary.summaryLine1).toBe('Đ1,750 left');
		expect(summary.summaryLine2).toBe('you’ve got this 🌿');
	});

	it('summaryLine1/summaryLine2 report amount over with different copy when over limit', () => {
		const summary = toSummary(cards, 600000, 500000, 'AED', true);
		expect(summary.summaryLine1).toBe('Đ1,000 over');
		expect(summary.summaryLine2).toBe('deep breath 💛');
	});

	it('summaryLine1 treats exactly-at-limit as "left" (0 left)', () => {
		const summary = toSummary(cards, 500000, 500000, 'AED', true);
		expect(summary.summaryLine1).toBe('Đ0 left');
		expect(summary.summaryLine2).toBe('you’ve got this 🌿');
	});

	it('summaryColor is green when under/at limit, red when over', () => {
		const under = toSummary(cards, 325000, 500000, 'AED', true);
		expect(under.summaryColor).toBe('#8FBF7E');

		const atLimit = toSummary(cards, 500000, 500000, 'AED', true);
		expect(atLimit.summaryColor).toBe('#8FBF7E');

		const over = toSummary(cards, 600000, 500000, 'AED', true);
		expect(over.summaryColor).toBe('#DE4B37');
	});
});
