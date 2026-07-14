import { describe, it, expect } from 'vitest';
import {
	bumpLimit,
	expenseDateLabel,
	formatTxnDate,
	isTxnEditable,
	limitStep,
	payerAvatar,
	periodLabel,
	toCategoryDetail,
	toTxnRow,
	LIMIT_STEP_ANNUAL,
	LIMIT_STEP_MONTHLY,
	type DetailCategory,
	type DetailTransaction,
} from './detail';

const groceries: DetailCategory = {
	id: 'cat1',
	emoji: 'grocery',
	name: 'Groceries',
	color: '#7FA86F',
	period: 'monthly',
	limit: 250000,
};

const carService: DetailCategory = {
	id: 'cat2',
	emoji: 'directions_car',
	name: 'Car service',
	color: '#8AA3C4',
	period: 'annual',
	limit: 400000,
};

describe('periodLabel()', () => {
	it('formats a monthly label with month + year', () => {
		expect(periodLabel('monthly', 2026, 6)).toBe('Monthly budget · July 2026');
	});

	it('formats an annual label with the year', () => {
		expect(periodLabel('annual', 2026, 6)).toBe('Annual budget · Jan – Dec 2026');
	});
});

describe('limitStep() / bumpLimit()', () => {
	it('reports the monthly step as 10000 minor units (100 AED)', () => {
		expect(limitStep('monthly')).toBe(LIMIT_STEP_MONTHLY);
		expect(LIMIT_STEP_MONTHLY).toBe(10000);
	});

	it('reports the annual step as 50000 minor units (500 AED)', () => {
		expect(limitStep('annual')).toBe(LIMIT_STEP_ANNUAL);
		expect(LIMIT_STEP_ANNUAL).toBe(50000);
	});

	it('increments a monthly limit by one step', () => {
		expect(bumpLimit(250000, 'monthly', 1)).toBe(260000);
	});

	it('decrements a monthly limit by one step', () => {
		expect(bumpLimit(250000, 'monthly', -1)).toBe(240000);
	});

	it('increments an annual limit by one step', () => {
		expect(bumpLimit(400000, 'annual', 1)).toBe(450000);
	});

	it('floors a limit at one step when decrementing below it', () => {
		expect(bumpLimit(10000, 'monthly', -1)).toBe(10000);
		expect(bumpLimit(5000, 'monthly', -1)).toBe(10000);
		expect(bumpLimit(50000, 'annual', -1)).toBe(50000);
	});
});

describe('toCategoryDetail()', () => {
	it('builds a monthly detail with periodLabel, ofFmt suffix, and limit copy', () => {
		const det = toCategoryDetail(groceries, 125000, 'AED', true, 2026, 6);
		expect(det.periodLabel).toBe('Monthly budget · July 2026');
		expect(det.amtFmt).toBe('Đ 1250,00');
		expect(det.ofFmt).toBe('of 2500 this month');
		expect(det.limitLabel).toBe('MONTHLY LIMIT');
		expect(det.limitFmt).toBe('Đ 2500,00');
		expect(det.limitVal).toBe('2500');
		expect(det.curSym).toBe('Đ');
		expect(det.addLabel).toBe('+ Add to Groceries');
		expect(det.isAnnual).toBe(false);
		expect(det.sub1).toBe('Đ 1250,00 left');
		expect(det.sub2).toBe('');
	});

	it('builds an annual detail with " this year" suffix and ANNUAL LIMIT label', () => {
		const det = toCategoryDetail(carService, 200000, 'AED', true, 2026, 6);
		expect(det.ofFmt).toBe('of 4000 this year');
		expect(det.limitLabel).toBe('ANNUAL LIMIT');
		expect(det.isAnnual).toBe(true);
		expect(det.limitVal).toBe('4000');
	});

	it('forces pctW to 0% when not yet mounted', () => {
		const det = toCategoryDetail(groceries, 125000, 'AED', false, 2026, 6);
		expect(det.pctW).toBe('0%');
	});
});

describe('payerAvatar()', () => {
	const members = [
		{ userId: 'u1', displayName: 'Daniel Krause', profileColor: '#D98BA4' },
		{ userId: 'u2', displayName: 'Kate Krause', profileColor: '#7FA8A0' },
	];

	it("resolves by paidBy and uses the member's own profile color", () => {
		expect(payerAvatar('Daniel Krause', 'u1', members)).toEqual({
			bg: '#D98BA4',
			color: '#3A1220',
			initial: 'D',
			displayName: 'Daniel Krause',
		});
		expect(payerAvatar('Kate Krause', 'u2', members)).toEqual({
			bg: '#7FA8A0',
			color: '#3A1220',
			initial: 'K',
			displayName: 'Kate Krause',
		});
	});

	it("prefers the member's live name and colour over a stale payerName snapshot", () => {
		expect(payerAvatar('Dan', 'u1', members)).toEqual({
			bg: '#D98BA4',
			color: '#3A1220',
			initial: 'D',
			displayName: 'Daniel Krause',
		});
	});

	it('falls back to the payerName match when paidBy is absent (legacy row)', () => {
		expect(payerAvatar('Kate Krause', undefined, members)).toEqual({
			bg: '#7FA8A0',
			color: '#3A1220',
			initial: 'K',
			displayName: 'Kate Krause',
		});
	});

	it('falls back to the payerName match when paidBy is no longer a member', () => {
		expect(payerAvatar('Kate Krause', 'u9', members).bg).toBe('#7FA8A0');
		expect(payerAvatar('Kate Krause', 'u9', members).color).toBe('#3A1220');
	});

	it('matches the payer name case-insensitively and ignores surrounding space', () => {
		expect(payerAvatar('  daniel krause ', undefined, members).bg).toBe('#D98BA4');
	});

	it('falls back to a neutral color for a payer who is no longer a member', () => {
		expect(payerAvatar('Someone Else', 'u9', members)).toEqual({
			bg: '#7FA8A0',
			color: '#0F2B26',
			initial: 'S',
			displayName: 'Someone Else',
		});
	});

	it('falls back when no members are known at all', () => {
		expect(payerAvatar('Daniel Krause', 'u1')).toEqual({
			bg: '#7FA8A0',
			color: '#0F2B26',
			initial: 'D',
			displayName: 'Daniel Krause',
		});
	});
});

describe('formatTxnDate()', () => {
	it('reports "MMM D"', () => {
		expect(formatTxnDate(new Date(2026, 5, 3, 10, 0, 0).getTime())).toBe('Jun 3');
		expect(formatTxnDate(new Date(2026, 0, 1, 0, 0, 0).getTime())).toBe('Jan 1');
		expect(formatTxnDate(new Date(2026, 11, 31, 23, 59, 0).getTime())).toBe('Dec 31');
	});

	// A row said "Today" until midnight and then silently meant something else.
	// A ledger states when a thing happened, so today's date is a date like
	// any other. (The Add sheet's date PILL still says "Today" — see below.)
	it('says the date even for today and yesterday', () => {
		const today = new Date(2026, 6, 9, 8, 0, 0).getTime();
		const yesterday = new Date(2026, 6, 8, 23, 0, 0).getTime();
		expect(formatTxnDate(today)).toBe('Jul 9');
		expect(formatTxnDate(yesterday)).toBe('Jul 8');
	});
});

describe('expenseDateLabel()', () => {
	const now = new Date(2026, 6, 9, 15, 0, 0).getTime();

	it('reports "Today" for the same calendar day', () => {
		const today = new Date(2026, 6, 9, 8, 0, 0).getTime();
		expect(expenseDateLabel(today, now)).toBe('Today');
	});

	it('spells out "D MMM YYYY" for another day — even yesterday', () => {
		const yesterday = new Date(2026, 6, 8, 23, 0, 0).getTime();
		expect(expenseDateLabel(yesterday, now)).toBe('8 Jul 2026');
	});

	it('spells out "D MMM YYYY" for a later day in the same month', () => {
		const later = new Date(2026, 6, 14, 10, 0, 0).getTime();
		expect(expenseDateLabel(later, now)).toBe('14 Jul 2026');
	});

	it('carries the year, so the same day-of-year in another year reads apart', () => {
		const lastYear = new Date(2025, 6, 9, 8, 0, 0).getTime();
		expect(expenseDateLabel(lastYear, now)).toBe('9 Jul 2025');
	});
});

describe('toTxnRow()', () => {
	const members = [{ userId: 'u1', displayName: 'Daniel', profileColor: '#D98BA4' }];
	const txn: DetailTransaction = {
		_id: 'txn1',
		amount: 4500,
		note: 'Weekly shop',
		payerName: 'Daniel',
		paidBy: 'u1',
		spentAt: new Date(2026, 6, 9, 8, 0, 0).getTime(),
	};
	const now = new Date(2026, 6, 9, 15, 0, 0).getTime();

	it('formats amount, note, avatar, and meta line', () => {
		const row = toTxnRow(txn, 'AED', members);
		expect(row.id).toBe('txn1');
		expect(row.amtFmt).toBe('Đ 45,00');
		expect(row.note).toBe('Weekly shop');
		expect(row.whoInitial).toBe('D');
		expect(row.whoBg).toBe('#D98BA4');
		expect(row.whoColor).toBe('#3A1220');
		expect(row.meta).toBe('Daniel · Jul 9');
	});

	it("meta line uses the member's current name when the payerName snapshot is stale", () => {
		const row = toTxnRow({ ...txn, payerName: 'Dan' }, 'AED', members);
		expect(row.whoBg).toBe('#D98BA4');
		expect(row.meta).toBe('Daniel · Jul 9');
	});

	it('falls back to the stored payerName when paidBy is absent (legacy row)', () => {
		const row = toTxnRow({ ...txn, paidBy: undefined }, 'AED', members);
		expect(row.whoBg).toBe('#D98BA4');
		expect(row.meta).toBe('Daniel · Jul 9');
	});

	it('falls back to the neutral avatar for a payer who is not a member', () => {
		const row = toTxnRow({ ...txn, payerName: 'Kate', paidBy: 'u9' }, 'AED', members);
		expect(row.whoBg).toBe('#7FA8A0');
		expect(row.meta).toBe('Kate · Jul 9');
	});

	it('leads the meta line with the memo when there is one', () => {
		const row = toTxnRow({ ...txn, memo: 'Birthday cake' }, 'AED', members);
		expect(row.note).toBe('Weekly shop');
		expect(row.meta).toBe('Birthday cake · Daniel · Jul 9');
	});

	it('ignores a blank memo', () => {
		const row = toTxnRow({ ...txn, memo: '   ' }, 'AED', members);
		expect(row.meta).toBe('Daniel · Jul 9');
	});
});

describe('isTxnEditable()', () => {
	const now = new Date(2026, 6, 9, 15, 0, 0).getTime();

	it('allows editing a transaction in the current month', () => {
		expect(isTxnEditable(new Date(2026, 6, 1).getTime(), now, false)).toBe(true);
	});

	it('makes a previous month read-only', () => {
		expect(isTxnEditable(new Date(2026, 5, 30).getTime(), now, false)).toBe(false);
	});

	it('makes the same month of another year read-only', () => {
		expect(isTxnEditable(new Date(2025, 6, 9).getTime(), now, false)).toBe(false);
	});

	it('always allows editing in annual / year-to-date categories', () => {
		expect(isTxnEditable(new Date(2026, 0, 4).getTime(), now, true)).toBe(true);
	});
});
