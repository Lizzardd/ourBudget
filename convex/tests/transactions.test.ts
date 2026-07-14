// @vitest-environment edge-runtime
import { convexTest } from 'convex-test';
import { expect, test } from 'vitest';
import { api, internal } from '../_generated/api';
import type { Id } from '../_generated/dataModel';
import schema from '../schema';
import { monthLabel, monthShort } from '../../src/budget/periods';

// `import.meta.glob` is a Vite/Vitest build-time API; the ambient `vite/client`
// types aren't wired into this project's tsconfig, so cast narrowly here.
const modules = (import.meta as unknown as { glob: (pattern: string) => Record<string, () => Promise<unknown>> }).glob(
	'../**/*.ts',
);

function makeCtx() {
	return convexTest(schema, modules);
}

async function seedUser(t: ReturnType<typeof makeCtx>, name: string) {
	const userId = await t.run(async (ctx) => {
		return await ctx.db.insert('users', { name });
	});
	return { userId, asUser: t.withIdentity({ subject: `${userId}|testsession` }) };
}

/**
 * A brand-new household starts BLANK (no default categories), so tests that
 * need Groceries/Dining out/Transport/Car service create them explicitly
 * here — limits match the old DEFAULT_CATEGORIES seed data the tests were
 * originally written against.
 */
async function seedHousehold(t: ReturnType<typeof makeCtx>, asUser: ReturnType<typeof t.withIdentity>) {
	const householdId = await asUser.mutation(api.households.createHousehold, {
		name: 'Our Home',
		currency: 'AED',
	});
	await asUser.mutation(api.categories.createCategory, {
		householdId,
		name: 'Groceries',
		emoji: '🛒',
		period: 'monthly',
		limit: 250000,
	});
	await asUser.mutation(api.categories.createCategory, {
		householdId,
		name: 'Dining out',
		emoji: '🍽️',
		period: 'monthly',
		limit: 120000,
	});
	await asUser.mutation(api.categories.createCategory, {
		householdId,
		name: 'Transport',
		emoji: '🚕',
		period: 'monthly',
		limit: 60000,
	});
	await asUser.mutation(api.categories.createCategory, {
		householdId,
		name: 'Car service',
		emoji: '🚗',
		period: 'annual',
		limit: 400000,
	});

	const categories = await asUser.query(api.categories.listCategories, { householdId });
	const groceries = categories.find((c) => c.name === 'Groceries')!; // monthly
	const carService = categories.find((c) => c.name === 'Car service')!; // annual
	return { householdId, groceries, carService };
}

function julyMs(day: number) {
	return Date.UTC(2026, 6, day, 12, 0, 0);
}

function marchMs(day: number) {
	return Date.UTC(2026, 2, day, 12, 0, 0);
}

test('addTransaction requires amount > 0', async () => {
	const t = makeCtx();
	const { asUser } = await seedUser(t, 'Amira');
	const { householdId, groceries } = await seedHousehold(t, asUser);

	await expect(
		asUser.mutation(api.transactions.addTransaction, {
			householdId,
			categoryId: groceries._id,
			amount: 0,
			note: 'bad',
			payerName: 'Amira',
		}),
	).rejects.toThrow();

	await expect(
		asUser.mutation(api.transactions.addTransaction, {
			householdId,
			categoryId: groceries._id,
			amount: -100,
			note: 'bad',
			payerName: 'Amira',
		}),
	).rejects.toThrow();
});

test('addTransaction throws when category does not belong to household', async () => {
	const t = makeCtx();
	const { asUser } = await seedUser(t, 'Amira');
	const { householdId: householdA } = await seedHousehold(t, asUser);
	const { groceries: groceriesB } = await seedHousehold(t, asUser);

	await expect(
		asUser.mutation(api.transactions.addTransaction, {
			householdId: householdA,
			categoryId: groceriesB._id,
			amount: 1000,
			note: 'wrong household',
			payerName: 'Amira',
		}),
	).rejects.toThrow();
});

test('addTransaction throws for non-member', async () => {
	const t = makeCtx();
	const { asUser } = await seedUser(t, 'Amira');
	const { householdId, groceries } = await seedHousehold(t, asUser);
	const { asUser: asStranger } = await seedUser(t, 'Stranger');

	await expect(
		asStranger.mutation(api.transactions.addTransaction, {
			householdId,
			categoryId: groceries._id,
			amount: 1000,
			note: 'nope',
			payerName: 'Stranger',
		}),
	).rejects.toThrow();
});

test('listByCategory returns newest first, respects limit', async () => {
	const t = makeCtx();
	const { asUser } = await seedUser(t, 'Amira');
	const { householdId, groceries } = await seedHousehold(t, asUser);

	await asUser.mutation(api.transactions.addTransaction, {
		householdId,
		categoryId: groceries._id,
		amount: 1000,
		note: 'first',
		payerName: 'Amira',
		spentAt: julyMs(1),
	});
	await asUser.mutation(api.transactions.addTransaction, {
		householdId,
		categoryId: groceries._id,
		amount: 2000,
		note: 'second',
		payerName: 'Amira',
		spentAt: julyMs(15),
	});
	await asUser.mutation(api.transactions.addTransaction, {
		householdId,
		categoryId: groceries._id,
		amount: 3000,
		note: 'third',
		payerName: 'Amira',
		spentAt: julyMs(10),
	});

	const all = await asUser.query(api.transactions.listByCategory, { categoryId: groceries._id });
	expect(all.map((tx) => tx.note)).toEqual(['second', 'third', 'first']);

	const limited = await asUser.query(api.transactions.listByCategory, {
		categoryId: groceries._id,
		limit: 2,
	});
	expect(limited.map((tx) => tx.note)).toEqual(['second', 'third']);
});

test('summary sums two July transactions for a monthly category', async () => {
	const t = makeCtx();
	const { asUser } = await seedUser(t, 'Amira');
	const { householdId, groceries } = await seedHousehold(t, asUser);

	await asUser.mutation(api.transactions.addTransaction, {
		householdId,
		categoryId: groceries._id,
		amount: 5000,
		note: 'txn 1',
		payerName: 'Amira',
		spentAt: julyMs(3),
	});
	await asUser.mutation(api.transactions.addTransaction, {
		householdId,
		categoryId: groceries._id,
		amount: 7000,
		note: 'txn 2',
		payerName: 'Amira',
		spentAt: julyMs(20),
	});

	const result = await asUser.query(api.transactions.summary, {
		householdId,
		year: 2026,
		month: 6, // July, 0-indexed
	});

	const groceriesSummary = result.categories.find((c) => c.categoryId === groceries._id);
	expect(groceriesSummary?.spent).toBe(12000);
});

test('summary: annual-category March transaction still counts in July YTD', async () => {
	const t = makeCtx();
	const { asUser } = await seedUser(t, 'Amira');
	const { householdId, carService } = await seedHousehold(t, asUser);

	await asUser.mutation(api.transactions.addTransaction, {
		householdId,
		categoryId: carService._id,
		amount: 40000,
		note: 'March service',
		payerName: 'Amira',
		spentAt: marchMs(5),
	});

	const result = await asUser.query(api.transactions.summary, {
		householdId,
		year: 2026,
		month: 6, // querying July
	});

	const carServiceSummary = result.categories.find((c) => c.categoryId === carService._id);
	expect(carServiceSummary?.spent).toBe(40000);
});

test('summary: monthly-category March transaction does NOT count in July monthly spend', async () => {
	const t = makeCtx();
	const { asUser } = await seedUser(t, 'Amira');
	const { householdId, groceries } = await seedHousehold(t, asUser);

	await asUser.mutation(api.transactions.addTransaction, {
		householdId,
		categoryId: groceries._id,
		amount: 9000,
		note: 'March groceries',
		payerName: 'Amira',
		spentAt: marchMs(10),
	});

	const result = await asUser.query(api.transactions.summary, {
		householdId,
		year: 2026,
		month: 6, // July
	});

	const groceriesSummary = result.categories.find((c) => c.categoryId === groceries._id);
	expect(groceriesSummary?.spent).toBe(0);
});

test('summary totals sum only monthly categories', async () => {
	const t = makeCtx();
	const { asUser } = await seedUser(t, 'Amira');
	const { householdId, groceries, carService } = await seedHousehold(t, asUser);

	await asUser.mutation(api.transactions.addTransaction, {
		householdId,
		categoryId: groceries._id,
		amount: 5000,
		note: 'groceries',
		payerName: 'Amira',
		spentAt: julyMs(3),
	});
	await asUser.mutation(api.transactions.addTransaction, {
		householdId,
		categoryId: carService._id,
		amount: 40000,
		note: 'car service (annual, YTD only)',
		payerName: 'Amira',
		spentAt: julyMs(3),
	});

	const result = await asUser.query(api.transactions.summary, {
		householdId,
		year: 2026,
		month: 6,
	});

	expect(result.totalSpent).toBe(5000);

	const categories = await asUser.query(api.categories.listCategories, { householdId });
	const monthlyLimitSum = categories
		.filter((c) => c.period === 'monthly')
		.reduce((sum, c) => sum + c.limit, 0);
	expect(result.totalLimit).toBe(monthlyLimitSum);
});

test('summary throws for non-member', async () => {
	const t = makeCtx();
	const { asUser } = await seedUser(t, 'Amira');
	const { householdId } = await seedHousehold(t, asUser);
	const { asUser: asStranger } = await seedUser(t, 'Stranger');

	await expect(
		asStranger.query(api.transactions.summary, {
			householdId,
			year: 2026,
			month: 6,
		}),
	).rejects.toThrow();
});

test('monthTotals returns chronological (oldest -> newest) per-month sums for monthly categories', async () => {
	const t = makeCtx();
	const { asUser } = await seedUser(t, 'Amira');
	const { householdId, groceries, carService } = await seedHousehold(t, asUser);

	// May
	await asUser.mutation(api.transactions.addTransaction, {
		householdId,
		categoryId: groceries._id,
		amount: 1000,
		note: 'may',
		payerName: 'Amira',
		spentAt: Date.UTC(2026, 4, 10, 12),
	});
	// June
	await asUser.mutation(api.transactions.addTransaction, {
		householdId,
		categoryId: groceries._id,
		amount: 2000,
		note: 'june',
		payerName: 'Amira',
		spentAt: Date.UTC(2026, 5, 10, 12),
	});
	// July - two txns
	await asUser.mutation(api.transactions.addTransaction, {
		householdId,
		categoryId: groceries._id,
		amount: 1500,
		note: 'july a',
		payerName: 'Amira',
		spentAt: julyMs(3),
	});
	await asUser.mutation(api.transactions.addTransaction, {
		householdId,
		categoryId: groceries._id,
		amount: 500,
		note: 'july b',
		payerName: 'Amira',
		spentAt: julyMs(20),
	});
	// Annual category txn in July - must NOT be included
	await asUser.mutation(api.transactions.addTransaction, {
		householdId,
		categoryId: carService._id,
		amount: 99999,
		note: 'annual, excluded',
		payerName: 'Amira',
		spentAt: julyMs(5),
	});

	const now = julyMs(25);
	const result = await asUser.query(api.transactions.monthTotals, {
		householdId,
		months: 3,
		now,
	});

	expect(result).toHaveLength(3);
	expect(result.map((m) => m.total)).toEqual([1000, 2000, 2000]);
	expect(result[2].label).toBe(monthLabel(2026, 6));
	expect(result[2].short).toBe(monthShort(2026, 6));
	expect(result[0].label).toBe(monthLabel(2026, 4));
});

test('weeklySummary aggregates the last 7 days: totals, biggest, watch (over), on-track', async () => {
	const t = makeCtx();
	const { asUser } = await seedUser(t, 'Amira');
	const { householdId, groceries } = await seedHousehold(t, asUser);

	const categories = await asUser.query(api.categories.listCategories, { householdId });
	const diningOut = categories.find((c) => c.name === 'Dining out')!; // monthly, limit 120000
	const transport = categories.find((c) => c.name === 'Transport')!; // monthly, limit 60000

	const now = julyMs(25);

	// Groceries: two txns within the window totaling 300000, over its 250000 limit by 50000.
	await asUser.mutation(api.transactions.addTransaction, {
		householdId,
		categoryId: groceries._id,
		amount: 200000,
		note: 'big shop',
		payerName: 'Amira',
		spentAt: julyMs(19),
	});
	await asUser.mutation(api.transactions.addTransaction, {
		householdId,
		categoryId: groceries._id,
		amount: 100000,
		note: 'top up',
		payerName: 'Amira',
		spentAt: julyMs(22),
	});
	// Dining out: under its 120000 limit -> on track.
	await asUser.mutation(api.transactions.addTransaction, {
		householdId,
		categoryId: diningOut._id,
		amount: 50000,
		note: 'dinner',
		payerName: 'Amira',
		spentAt: julyMs(20),
	});
	// Transport: over its 60000 limit, but by less than Groceries -> not the "watch" category.
	await asUser.mutation(api.transactions.addTransaction, {
		householdId,
		categoryId: transport._id,
		amount: 70000,
		note: 'cabs',
		payerName: 'Amira',
		spentAt: julyMs(21),
	});
	// Outside the 7-day window (8 days before `now`) -> must be excluded entirely.
	await asUser.mutation(api.transactions.addTransaction, {
		householdId,
		categoryId: groceries._id,
		amount: 999999,
		note: 'too old',
		payerName: 'Amira',
		spentAt: julyMs(17),
	});

	const result = await asUser.query(api.transactions.weeklySummary, { householdId, nowMs: now });

	expect(result.totalSpent).toBe(420000);
	expect(result.txnCount).toBe(4);

	expect(result.biggest?.name).toBe('Groceries');
	expect(result.biggest?.spent).toBe(300000);

	expect(result.watch?.name).toBe('Groceries');
	expect(result.watch?.overBy).toBe(50000);

	const onTrackNames = result.onTrack.map((c) => c.name);
	expect(onTrackNames).toContain('Dining out');
	expect(onTrackNames).not.toContain('Groceries');
	expect(onTrackNames).not.toContain('Transport');
});

test('weeklySummary returns nulls and empty aggregates when there is no spend in the window', async () => {
	const t = makeCtx();
	const { asUser } = await seedUser(t, 'Amira');
	const { householdId } = await seedHousehold(t, asUser);

	const result = await asUser.query(api.transactions.weeklySummary, {
		householdId,
		nowMs: julyMs(25),
	});

	expect(result.totalSpent).toBe(0);
	expect(result.txnCount).toBe(0);
	expect(result.biggest).toBeNull();
	expect(result.watch).toBeNull();
	expect(result.onTrack.length).toBeGreaterThan(0);
});

test('listByCategoryInRange returns only transactions within [startMs, endMs), newest first', async () => {
	const t = makeCtx();
	const { asUser } = await seedUser(t, 'Amira');
	const { householdId, groceries } = await seedHousehold(t, asUser);

	await asUser.mutation(api.transactions.addTransaction, {
		householdId,
		categoryId: groceries._id,
		amount: 1000,
		note: 'june, excluded',
		payerName: 'Amira',
		spentAt: Date.UTC(2026, 5, 20, 12),
	});
	await asUser.mutation(api.transactions.addTransaction, {
		householdId,
		categoryId: groceries._id,
		amount: 2000,
		note: 'july early',
		payerName: 'Amira',
		spentAt: julyMs(1),
	});
	await asUser.mutation(api.transactions.addTransaction, {
		householdId,
		categoryId: groceries._id,
		amount: 3000,
		note: 'july late',
		payerName: 'Amira',
		spentAt: julyMs(20),
	});
	await asUser.mutation(api.transactions.addTransaction, {
		householdId,
		categoryId: groceries._id,
		amount: 4000,
		note: 'august, excluded',
		payerName: 'Amira',
		spentAt: Date.UTC(2026, 7, 1, 12),
	});

	const { startMs, endMs } = { startMs: Date.UTC(2026, 6, 1), endMs: Date.UTC(2026, 7, 1) };
	const result = await asUser.query(api.transactions.listByCategoryInRange, {
		categoryId: groceries._id,
		startMs,
		endMs,
	});

	expect(result.map((tx) => tx.note)).toEqual(['july late', 'july early']);
});

test('listByCategoryInRange throws for non-member', async () => {
	const t = makeCtx();
	const { asUser } = await seedUser(t, 'Amira');
	const { householdId, groceries } = await seedHousehold(t, asUser);
	const { asUser: asStranger } = await seedUser(t, 'Stranger');

	await expect(
		asStranger.query(api.transactions.listByCategoryInRange, {
			categoryId: groceries._id,
			startMs: julyMs(1),
			endMs: julyMs(31),
		}),
	).rejects.toThrow();
});

test('monthTotals rows include the year/month they represent', async () => {
	const t = makeCtx();
	const { asUser } = await seedUser(t, 'Amira');
	const { householdId } = await seedHousehold(t, asUser);

	const now = julyMs(25);
	const result = await asUser.query(api.transactions.monthTotals, { householdId, months: 2, now });

	expect(result).toEqual([
		{ label: monthLabel(2026, 5), short: monthShort(2026, 5), total: 0, year: 2026, month: 5 },
		{ label: monthLabel(2026, 6), short: monthShort(2026, 6), total: 0, year: 2026, month: 6 },
	]);
});

test('weeklySummary throws for non-member', async () => {
	const t = makeCtx();
	const { asUser } = await seedUser(t, 'Amira');
	const { householdId } = await seedHousehold(t, asUser);
	const { asUser: asStranger } = await seedUser(t, 'Stranger');

	await expect(
		asStranger.query(api.transactions.weeklySummary, {
			householdId,
			nowMs: julyMs(25),
		}),
	).rejects.toThrow();
});

test('addTransaction stores the optional memo alongside the note (title)', async () => {
	const t = makeCtx();
	const { asUser } = await seedUser(t, 'Amira');
	const { householdId, groceries } = await seedHousehold(t, asUser);

	await asUser.mutation(api.transactions.addTransaction, {
		householdId,
		categoryId: groceries._id,
		amount: 1000,
		note: 'Carrefour',
		memo: 'weekly shop, split with Sam',
		payerName: 'Amira',
		spentAt: julyMs(3),
	});
	await asUser.mutation(api.transactions.addTransaction, {
		householdId,
		categoryId: groceries._id,
		amount: 2000,
		note: 'Spinneys',
		payerName: 'Amira',
		spentAt: julyMs(4),
	});

	const all = await asUser.query(api.transactions.listByCategory, { categoryId: groceries._id });
	const carrefour = all.find((tx) => tx.note === 'Carrefour')!;
	const spinneys = all.find((tx) => tx.note === 'Spinneys')!;

	expect(carrefour.memo).toBe('weekly shop, split with Sam');
	expect(spinneys.memo).toBeUndefined();
});

test('updateTransaction changes amount, note, memo and payer', async () => {
	const t = makeCtx();
	const { asUser } = await seedUser(t, 'Amira');
	const { householdId, groceries } = await seedHousehold(t, asUser);

	const transactionId = await asUser.mutation(api.transactions.addTransaction, {
		householdId,
		categoryId: groceries._id,
		amount: 1000,
		note: 'Carrefour',
		memo: 'first guess',
		payerName: 'Amira',
		spentAt: julyMs(3),
	});

	await asUser.mutation(api.transactions.updateTransaction, {
		transactionId,
		amount: 4500,
		note: '  Spinneys  ',
		memo: 'corrected receipt',
		payerName: 'Sam',
	});

	const all = await asUser.query(api.transactions.listByCategory, { categoryId: groceries._id });
	expect(all).toHaveLength(1);
	expect(all[0]).toMatchObject({
		amount: 4500,
		note: 'Spinneys',
		memo: 'corrected receipt',
		payerName: 'Sam',
	});
});

test('updateTransaction rejects an empty note and a non-positive / non-integer amount', async () => {
	const t = makeCtx();
	const { asUser } = await seedUser(t, 'Amira');
	const { householdId, groceries } = await seedHousehold(t, asUser);

	const transactionId = await asUser.mutation(api.transactions.addTransaction, {
		householdId,
		categoryId: groceries._id,
		amount: 1000,
		note: 'Carrefour',
		payerName: 'Amira',
		spentAt: julyMs(3),
	});

	await expect(
		asUser.mutation(api.transactions.updateTransaction, {
			transactionId,
			amount: 1000,
			note: '   ',
			payerName: 'Amira',
		}),
	).rejects.toThrow();

	await expect(
		asUser.mutation(api.transactions.updateTransaction, {
			transactionId,
			amount: 0,
			note: 'Carrefour',
			payerName: 'Amira',
		}),
	).rejects.toThrow();

	await expect(
		asUser.mutation(api.transactions.updateTransaction, {
			transactionId,
			amount: -100,
			note: 'Carrefour',
			payerName: 'Amira',
		}),
	).rejects.toThrow();

	await expect(
		asUser.mutation(api.transactions.updateTransaction, {
			transactionId,
			amount: 10.5,
			note: 'Carrefour',
			payerName: 'Amira',
		}),
	).rejects.toThrow();
});

test('updateTransaction throws for non-member', async () => {
	const t = makeCtx();
	const { asUser } = await seedUser(t, 'Amira');
	const { householdId, groceries } = await seedHousehold(t, asUser);
	const { asUser: asStranger } = await seedUser(t, 'Stranger');

	const transactionId = await asUser.mutation(api.transactions.addTransaction, {
		householdId,
		categoryId: groceries._id,
		amount: 1000,
		note: 'Carrefour',
		payerName: 'Amira',
		spentAt: julyMs(3),
	});

	await expect(
		asStranger.mutation(api.transactions.updateTransaction, {
			transactionId,
			amount: 9999,
			note: 'hijacked',
			payerName: 'Stranger',
		}),
	).rejects.toThrow();
});

test('deleteTransaction removes the row', async () => {
	const t = makeCtx();
	const { asUser } = await seedUser(t, 'Amira');
	const { householdId, groceries } = await seedHousehold(t, asUser);

	const transactionId = await asUser.mutation(api.transactions.addTransaction, {
		householdId,
		categoryId: groceries._id,
		amount: 1000,
		note: 'Carrefour',
		payerName: 'Amira',
		spentAt: julyMs(3),
	});
	await asUser.mutation(api.transactions.addTransaction, {
		householdId,
		categoryId: groceries._id,
		amount: 2000,
		note: 'Spinneys',
		payerName: 'Amira',
		spentAt: julyMs(4),
	});

	await asUser.mutation(api.transactions.deleteTransaction, { transactionId });

	const all = await asUser.query(api.transactions.listByCategory, { categoryId: groceries._id });
	expect(all.map((tx) => tx.note)).toEqual(['Spinneys']);
});

test('deleteTransaction throws for non-member', async () => {
	const t = makeCtx();
	const { asUser } = await seedUser(t, 'Amira');
	const { householdId, groceries } = await seedHousehold(t, asUser);
	const { asUser: asStranger } = await seedUser(t, 'Stranger');

	const transactionId = await asUser.mutation(api.transactions.addTransaction, {
		householdId,
		categoryId: groceries._id,
		amount: 1000,
		note: 'Carrefour',
		payerName: 'Amira',
		spentAt: julyMs(3),
	});

	await expect(
		asStranger.mutation(api.transactions.deleteTransaction, { transactionId }),
	).rejects.toThrow();

	const all = await asUser.query(api.transactions.listByCategory, { categoryId: groceries._id });
	expect(all).toHaveLength(1);
});

/**
 * The whole point of allowing edits/deletes: the aggregates are derived from
 * the transaction rows at read time, so an edited or deleted amount must move
 * `summary` and `monthTotals` with it.
 */
test('summary and monthTotals follow an edited then deleted amount', async () => {
	const t = makeCtx();
	const { asUser } = await seedUser(t, 'Amira');
	const { householdId, groceries } = await seedHousehold(t, asUser);

	const now = julyMs(25);
	const transactionId = await asUser.mutation(api.transactions.addTransaction, {
		householdId,
		categoryId: groceries._id,
		amount: 5000,
		note: 'Carrefour',
		payerName: 'Amira',
		spentAt: julyMs(3),
	});
	await asUser.mutation(api.transactions.addTransaction, {
		householdId,
		categoryId: groceries._id,
		amount: 7000,
		note: 'Spinneys',
		payerName: 'Amira',
		spentAt: julyMs(20),
	});

	const before = await asUser.query(api.transactions.summary, { householdId, year: 2026, month: 6 });
	expect(before.categories.find((c) => c.categoryId === groceries._id)?.spent).toBe(12000);
	expect(before.totalSpent).toBe(12000);

	await asUser.mutation(api.transactions.updateTransaction, {
		transactionId,
		amount: 1000,
		note: 'Carrefour',
		payerName: 'Amira',
	});

	const afterEdit = await asUser.query(api.transactions.summary, { householdId, year: 2026, month: 6 });
	expect(afterEdit.categories.find((c) => c.categoryId === groceries._id)?.spent).toBe(8000);
	expect(afterEdit.totalSpent).toBe(8000);

	const monthsAfterEdit = await asUser.query(api.transactions.monthTotals, { householdId, months: 1, now });
	expect(monthsAfterEdit[0].total).toBe(8000);

	await asUser.mutation(api.transactions.deleteTransaction, { transactionId });

	const afterDelete = await asUser.query(api.transactions.summary, { householdId, year: 2026, month: 6 });
	expect(afterDelete.categories.find((c) => c.categoryId === groceries._id)?.spent).toBe(7000);
	expect(afterDelete.totalSpent).toBe(7000);

	const monthsAfterDelete = await asUser.query(api.transactions.monthTotals, { householdId, months: 1, now });
	expect(monthsAfterDelete[0].total).toBe(7000);
});

/**
 * Adds a second member to `householdId` by joining with its invite code, the
 * same way a real household grows. Their per-household `settings.displayName`
 * seeds from the user's name, which is what the payer resolution (and
 * `backfillPaidBy`) matches against.
 */
async function seedSecondMember(
	t: ReturnType<typeof makeCtx>,
	asOwner: ReturnType<typeof t.withIdentity>,
	householdId: Id<'households'>,
	name: string,
) {
	const { userId, asUser } = await seedUser(t, name);
	const households = await asOwner.query(api.households.myHouseholds, {});
	const household = households.find((h) => h._id === householdId)!;
	await asUser.mutation(api.households.joinHousehold, { code: household.inviteCode });
	return { userId, asUser };
}

/**
 * A legacy expense: written before `paidBy` existed, so `payerName` is the only
 * record of who paid. Inserted straight into the db — `addTransaction` cannot
 * produce this shape any more.
 */
async function insertLegacyTransaction(
	t: ReturnType<typeof makeCtx>,
	householdId: Id<'households'>,
	categoryId: Id<'categories'>,
	payerName: string,
) {
	return await t.run(async (ctx) => {
		return await ctx.db.insert('transactions', {
			householdId,
			categoryId,
			amount: 1000,
			note: 'Carrefour',
			spentAt: julyMs(3),
			payerName,
			source: 'manual',
			createdAt: julyMs(3),
		});
	});
}

test('addTransaction stores paidBy, and listByCategory returns it', async () => {
	const t = makeCtx();
	const { userId, asUser } = await seedUser(t, 'Amira');
	const { householdId, groceries } = await seedHousehold(t, asUser);

	await asUser.mutation(api.transactions.addTransaction, {
		householdId,
		categoryId: groceries._id,
		amount: 1000,
		note: 'Carrefour',
		payerName: 'Amira',
		paidBy: userId,
		spentAt: julyMs(3),
	});

	const all = await asUser.query(api.transactions.listByCategory, { categoryId: groceries._id });
	expect(all[0]).toMatchObject({ payerName: 'Amira', paidBy: userId });
});

test('addTransaction rejects a paidBy who is not a member of the household', async () => {
	const t = makeCtx();
	const { asUser } = await seedUser(t, 'Amira');
	const { householdId, groceries } = await seedHousehold(t, asUser);
	const { userId: strangerId } = await seedUser(t, 'Stranger');

	await expect(
		asUser.mutation(api.transactions.addTransaction, {
			householdId,
			categoryId: groceries._id,
			amount: 1000,
			note: 'Carrefour',
			payerName: 'Stranger',
			paidBy: strangerId,
		}),
	).rejects.toThrow(/member of this household/);
});

test('updateTransaction keeps an unchanged paidBy even after that payer leaves the household', async () => {
	const t = makeCtx();
	const { userId: amiraId, asUser } = await seedUser(t, 'Amira');
	const { householdId, groceries } = await seedHousehold(t, asUser);
	const { userId: samId, asUser: asSam } = await seedSecondMember(t, asUser, householdId, 'Sam');

	const transactionId = await asUser.mutation(api.transactions.addTransaction, {
		householdId,
		categoryId: groceries._id,
		amount: 1000,
		note: 'Carrefour',
		payerName: 'Sam',
		paidBy: samId,
		spentAt: julyMs(3),
	});

	// Sam leaves. His past expenses must keep pointing at him: re-validating an
	// unchanged payer would force the client to drop the attribution just to be
	// able to save an unrelated edit, destroying the very history `paidBy` exists
	// to keep.
	await asSam.mutation(api.households.leaveHousehold, { householdId });

	await asUser.mutation(api.transactions.updateTransaction, {
		transactionId,
		amount: 2500,
		note: 'Carrefour',
		payerName: 'Sam',
		paidBy: samId,
	});

	const all = await asUser.query(api.transactions.listByCategory, { categoryId: groceries._id });
	expect(all[0]).toMatchObject({ amount: 2500, paidBy: samId, payerName: 'Sam' });
});

test('updateTransaction can re-attribute paidBy to another member, but not to a non-member', async () => {
	const t = makeCtx();
	const { userId: amiraId, asUser } = await seedUser(t, 'Amira');
	const { householdId, groceries } = await seedHousehold(t, asUser);
	const { userId: samId } = await seedSecondMember(t, asUser, householdId, 'Sam');
	const { userId: strangerId } = await seedUser(t, 'Stranger');

	const transactionId = await asUser.mutation(api.transactions.addTransaction, {
		householdId,
		categoryId: groceries._id,
		amount: 1000,
		note: 'Carrefour',
		payerName: 'Amira',
		paidBy: amiraId,
		spentAt: julyMs(3),
	});

	await asUser.mutation(api.transactions.updateTransaction, {
		transactionId,
		amount: 1000,
		note: 'Carrefour',
		payerName: 'Sam',
		paidBy: samId,
	});

	const all = await asUser.query(api.transactions.listByCategory, { categoryId: groceries._id });
	expect(all[0]).toMatchObject({ payerName: 'Sam', paidBy: samId });

	await expect(
		asUser.mutation(api.transactions.updateTransaction, {
			transactionId,
			amount: 1000,
			note: 'Carrefour',
			payerName: 'Stranger',
			paidBy: strangerId,
		}),
	).rejects.toThrow(/member of this household/);
});

test('backfillPaidBy matches payerName to a member case-insensitively and is idempotent', async () => {
	const t = makeCtx();
	const { userId: amiraId, asUser } = await seedUser(t, 'Amira');
	const { householdId, groceries } = await seedHousehold(t, asUser);
	const { userId: samId } = await seedSecondMember(t, asUser, householdId, 'Sam');

	const amiras = await insertLegacyTransaction(t, householdId, groceries._id, '  aMiRa ');
	const sams = await insertLegacyTransaction(t, householdId, groceries._id, 'Sam');

	expect(await t.mutation(internal.transactions.backfillPaidBy, {})).toBe(2);

	const all = await asUser.query(api.transactions.listByCategory, { categoryId: groceries._id });
	expect(all.find((tx) => tx._id === amiras)).toMatchObject({ payerName: '  aMiRa ', paidBy: amiraId });
	expect(all.find((tx) => tx._id === sams)).toMatchObject({ payerName: 'Sam', paidBy: samId });

	// Second run has nothing left to do.
	expect(await t.mutation(internal.transactions.backfillPaidBy, {})).toBe(0);
});

test('backfillPaidBy leaves a payerName that matches no current member alone', async () => {
	const t = makeCtx();
	const { asUser } = await seedUser(t, 'Amira');
	const { householdId, groceries } = await seedHousehold(t, asUser);

	await insertLegacyTransaction(t, householdId, groceries._id, 'Jules');

	expect(await t.mutation(internal.transactions.backfillPaidBy, {})).toBe(0);

	const all = await asUser.query(api.transactions.listByCategory, { categoryId: groceries._id });
	expect(all[0].payerName).toBe('Jules');
	expect(all[0].paidBy).toBeUndefined();
});
