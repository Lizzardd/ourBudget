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

	// createHousehold seeds 9 default categories (sortOrder 0..8), palette cycles
	// every 8 entries, so the 10th category (index 9) wraps back to palette[1].
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
	const categories = await asUser.query(api.categories.listCategories, { householdId });
	const groceries = categories.find((c) => c.name === 'Groceries')!;

	await asUser.mutation(api.categories.updateCategoryLimit, {
		categoryId: groceries._id,
		limit: 300000,
	});

	const updated = await t.run(async (ctx) => ctx.db.get(groceries._id));
	expect(updated?.limit).toBe(300000);
});

test('archiveCategory hides it from listCategories', async () => {
	const t = makeCtx();
	const { asUser } = await seedUser(t, 'Amira');
	const householdId = await asUser.mutation(api.households.createHousehold, {
		name: 'Our Home',
		currency: 'AED',
	});
	const categories = await asUser.query(api.categories.listCategories, { householdId });
	const groceries = categories.find((c) => c.name === 'Groceries')!;

	await asUser.mutation(api.categories.archiveCategory, {
		categoryId: groceries._id,
	});

	const remaining = await asUser.query(api.categories.listCategories, { householdId });
	expect(remaining.find((c) => c._id === groceries._id)).toBeUndefined();
	expect(remaining).toHaveLength(8);

	const archived = await t.run(async (ctx) => ctx.db.get(groceries._id));
	expect(archived?.archived).toBe(true);
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
