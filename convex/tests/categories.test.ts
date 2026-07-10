// @vitest-environment edge-runtime
import { convexTest } from 'convex-test';
import { expect, test } from 'vitest';
import { api } from '../_generated/api';
import schema from '../schema';

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

test('createCategory appears in listCategories with cycled color and next sortOrder', async () => {
	const t = makeCtx();
	const { asUser } = await seedUser(t, 'Amira');
	const householdId = await asUser.mutation(api.households.createHousehold, {
		name: 'Our Home',
		currency: 'AED',
	});

	// A brand-new household starts BLANK, so create 9 categories first (sortOrder
	// 0..8, palette cycles every 8 entries), then confirm the 10th category
	// (index 9) wraps back to palette[1].
	for (let i = 0; i < 9; i++) {
		await asUser.mutation(api.categories.createCategory, {
			householdId,
			name: `Category ${i}`,
			emoji: '📦',
			period: 'monthly',
			limit: 10000,
		});
	}

	const categoryId = await asUser.mutation(api.categories.createCategory, {
		householdId,
		name: 'Fun money',
		emoji: '🎉',
		period: 'monthly',
		limit: 50000,
	});
	expect(categoryId).toBeTruthy();

	const categories = await asUser.query(api.categories.listCategories, { householdId });
	const created = categories.find((c) => c._id === categoryId);
	expect(created).toBeTruthy();
	expect(created).toMatchObject({
		name: 'Fun money',
		emoji: '🎉',
		period: 'monthly',
		limit: 50000,
		sortOrder: 9,
		color: '#E08B6F',
		archived: false,
	});
	expect(categories).toHaveLength(10);
	// ordered by sortOrder ascending
	for (let i = 1; i < categories.length; i++) {
		expect(categories[i].sortOrder).toBeGreaterThan(categories[i - 1].sortOrder);
	}
});

test('updateCategoryLimit persists the new absolute limit', async () => {
	const t = makeCtx();
	const { asUser } = await seedUser(t, 'Amira');
	const householdId = await asUser.mutation(api.households.createHousehold, {
		name: 'Our Home',
		currency: 'AED',
	});
	const groceriesId = await asUser.mutation(api.categories.createCategory, {
		householdId,
		name: 'Groceries',
		emoji: '🛒',
		period: 'monthly',
		limit: 250000,
	});

	await asUser.mutation(api.categories.updateCategoryLimit, {
		categoryId: groceriesId,
		limit: 300000,
	});

	const updated = await t.run(async (ctx) => ctx.db.get(groceriesId));
	expect(updated?.limit).toBe(300000);
});

test('archiveCategory hides it from listCategories', async () => {
	const t = makeCtx();
	const { asUser } = await seedUser(t, 'Amira');
	const householdId = await asUser.mutation(api.households.createHousehold, {
		name: 'Our Home',
		currency: 'AED',
	});
	const groceriesId = await asUser.mutation(api.categories.createCategory, {
		householdId,
		name: 'Groceries',
		emoji: '🛒',
		period: 'monthly',
		limit: 250000,
	});
	// A second category so we can assert the archived one specifically drops
	// out while the household isn't left empty.
	await asUser.mutation(api.categories.createCategory, {
		householdId,
		name: 'Dining out',
		emoji: '🍽️',
		period: 'monthly',
		limit: 120000,
	});

	await asUser.mutation(api.categories.archiveCategory, {
		categoryId: groceriesId,
	});

	const remaining = await asUser.query(api.categories.listCategories, { householdId });
	expect(remaining.find((c) => c._id === groceriesId)).toBeUndefined();
	expect(remaining).toHaveLength(1);

	const archived = await t.run(async (ctx) => ctx.db.get(groceriesId));
	expect(archived?.archived).toBe(true);
});

test('deleteCategory removes the category and its transactions', async () => {
	const t = makeCtx();
	const { asUser } = await seedUser(t, 'Amira');
	const householdId = await asUser.mutation(api.households.createHousehold, {
		name: 'Our Home',
		currency: 'AED',
	});
	const groceriesId = await asUser.mutation(api.categories.createCategory, {
		householdId,
		name: 'Groceries',
		emoji: '🛒',
		period: 'monthly',
		limit: 250000,
	});
	// A second category so we can assert it (and its transactions) survive.
	const diningId = await asUser.mutation(api.categories.createCategory, {
		householdId,
		name: 'Dining out',
		emoji: '🍽️',
		period: 'monthly',
		limit: 120000,
	});

	const tx1 = await asUser.mutation(api.transactions.addTransaction, {
		householdId,
		categoryId: groceriesId,
		amount: 5000,
		note: 'Milk',
		payerName: 'Amira',
	});
	const tx2 = await asUser.mutation(api.transactions.addTransaction, {
		householdId,
		categoryId: groceriesId,
		amount: 3000,
		note: 'Bread',
		payerName: 'Amira',
	});
	const otherTx = await asUser.mutation(api.transactions.addTransaction, {
		householdId,
		categoryId: diningId,
		amount: 2000,
		note: 'Coffee',
		payerName: 'Amira',
	});

	await asUser.mutation(api.categories.deleteCategory, {
		categoryId: groceriesId,
	});

	const deletedCategory = await t.run(async (ctx) => ctx.db.get(groceriesId));
	expect(deletedCategory).toBeNull();

	const deletedTx1 = await t.run(async (ctx) => ctx.db.get(tx1));
	const deletedTx2 = await t.run(async (ctx) => ctx.db.get(tx2));
	expect(deletedTx1).toBeNull();
	expect(deletedTx2).toBeNull();

	const survivingTx = await t.run(async (ctx) => ctx.db.get(otherTx));
	expect(survivingTx).toBeTruthy();

	const remaining = await asUser.query(api.categories.listCategories, { householdId });
	expect(remaining.find((c) => c._id === groceriesId)).toBeUndefined();
	expect(remaining.find((c) => c._id === diningId)).toBeTruthy();
});

test('deleteCategory throws for a non-member', async () => {
	const t = makeCtx();
	const { asUser: owner } = await seedUser(t, 'Owner');
	const householdId = await owner.mutation(api.households.createHousehold, {
		name: 'Private House',
		currency: 'AED',
	});
	const groceriesId = await owner.mutation(api.categories.createCategory, {
		householdId,
		name: 'Groceries',
		emoji: '🛒',
		period: 'monthly',
		limit: 250000,
	});

	const { asUser: outsider } = await seedUser(t, 'Outsider');
	await expect(
		outsider.mutation(api.categories.deleteCategory, {
			categoryId: groceriesId,
		}),
	).rejects.toThrow('Not a member of this household');
});

test('createCategory throws for a non-member', async () => {
	const t = makeCtx();
	const { asUser: owner } = await seedUser(t, 'Owner');
	const householdId = await owner.mutation(api.households.createHousehold, {
		name: 'Private House',
		currency: 'AED',
	});

	const { asUser: outsider } = await seedUser(t, 'Outsider');
	await expect(
		outsider.mutation(api.categories.createCategory, {
			householdId,
			name: 'Snooping',
			emoji: '👀',
			period: 'monthly',
			limit: 1000,
		}),
	).rejects.toThrow('Not a member of this household');
});
