import { describe, it, expect } from 'vitest';
import {
	bumpLimit,
	formatTxnDate,
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
		expect(det.amtFmt).toBe('Đ1,250');
		expect(det.ofFmt).toBe('of 2,500 this month');
		expect(det.limitLabel).toBe('MONTHLY LIMIT');
		expect(det.limitFmt).toBe('Đ2,500');
		expect(det.limitVal).toBe('2,500');
		expect(det.curSym).toBe('Đ');
		expect(det.addLabel).toBe('+ Add to Groceries');
		expect(det.isAnnual).toBe(false);
		expect(det.sub1).toBe('Đ1,250 left');
		expect(det.sub2).toBe('');
	});

	it('builds an annual detail with " this year" suffix and ANNUAL LIMIT label', () => {
		const det = toCategoryDetail(carService, 200000, 'AED', true, 2026, 6);
		expect(det.ofFmt).toBe('of 4,000 this year');
		expect(det.limitLabel).toBe('ANNUAL LIMIT');
		expect(det.isAnnual).toBe(true);
		expect(det.limitVal).toBe('4,000');
	});

	it('forces pctW to 0% when not yet mounted', () => {
		const det = toCategoryDetail(groceries, 125000, 'AED', false, 2026, 6);
		expect(det.pctW).toBe('0%');
	});
});

describe('payerAvatar()', () => {
	it('uses the pink Sara color for Sara', () => {
		const avatar = payerAvatar('Sara');
		expect(avatar).toEqual({ bg: '#D98BA4', color: '#3A1220', initial: 'S' });
	});

	it('uses the teal color for any other payer', () => {
		const avatar = payerAvatar('Omar');
		expect(avatar).toEqual({ bg: '#7FA8A0', color: '#0F2B26', initial: 'O' });
	});
});

describe('formatTxnDate()', () => {
	const now = new Date(2026, 6, 9, 15, 0, 0).getTime();

	it('reports "Today" for the same calendar day', () => {
		const today = new Date(2026, 6, 9, 8, 0, 0).getTime();
		expect(formatTxnDate(today, now)).toBe('Today');
	});

	it('reports "Yesterday" for the previous calendar day', () => {
		const yesterday = new Date(2026, 6, 8, 23, 0, 0).getTime();
		expect(formatTxnDate(yesterday, now)).toBe('Yesterday');
	});

	it('reports "MMM D" for earlier dates', () => {
		const earlier = new Date(2026, 5, 3, 10, 0, 0).getTime();
		expect(formatTxnDate(earlier, now)).toBe('Jun 3');
	});
});

describe('toTxnRow()', () => {
	const txn: DetailTransaction = {
		_id: 'txn1',
		amount: 4500,
		note: 'Weekly shop',
		payerName: 'Sara',
		spentAt: new Date(2026, 6, 9, 8, 0, 0).getTime(),
	};
	const now = new Date(2026, 6, 9, 15, 0, 0).getTime();

	it('formats amount, note, avatar, and meta line', () => {
		const row = toTxnRow(txn, 'AED', now);
		expect(row.id).toBe('txn1');
		expect(row.amtFmt).toBe('Đ45');
		expect(row.note).toBe('Weekly shop');
		expect(row.whoInitial).toBe('S');
		expect(row.whoBg).toBe('#D98BA4');
		expect(row.whoColor).toBe('#3A1220');
		expect(row.meta).toBe('Sara · Today');
	});

	it('uses the teal avatar and payer name in meta for non-Sara payers', () => {
		const row = toTxnRow({ ...txn, payerName: 'Omar' }, 'AED', now);
		expect(row.whoBg).toBe('#7FA8A0');
		expect(row.meta).toBe('Omar · Today');
	});
});
