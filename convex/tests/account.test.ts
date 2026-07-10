// @vitest-environment edge-runtime
import { convexTest } from 'convex-test';
import { expect, test } from 'vitest';
import { api } from '../_generated/api';
import type { Id } from '../_generated/dataModel';
import schema from '../schema';

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
 * A brand-new household starts BLANK (no default categories) — tests that
 * need a category to hang a transaction off of create one explicitly here.
 */
async function seedCategory(
	t: ReturnType<typeof makeCtx>,
	householdId: Id<'households'>,
	createdBy: Id<'users'>,
	sortOrder = 0,
) {
	return await t.run(async (ctx) =>
		ctx.db.insert('categories', {
			householdId,
			name: 'Groceries',
			emoji: '🛒',
			color: '#7FA86F',
			period: 'monthly',
			limit: 250000,
			sortOrder,
			archived: false,
			createdBy,
			createdAt: Date.now(),
		}),
	);
}

test('exportMyData returns the caller records, their household data, and not an unrelated user\'s', async () => {
	const t = makeCtx();

	const { userId, asUser } = await seedUser(t, 'Amira');
	const householdId = await asUser.mutation(api.households.createHousehold, {
		name: 'Our Home',
		currency: 'AED',
	});
	await seedCategory(t, householdId, userId);
	const categories = await t.run(async (ctx) =>
		ctx.db
			.query('categories')
			.withIndex('by_household', (q) => q.eq('householdId', householdId))
			.collect(),
	);
	const transactionId = await t.run(async (ctx) =>
		ctx.db.insert('transactions', {
			householdId,
			categoryId: categories[0]._id,
			amount: 4200,
			note: 'Coffee',
			spentAt: Date.now(),
			payerName: 'Amira',
			createdBy: userId,
			source: 'manual',
			createdAt: Date.now(),
		}),
	);

	const { userId: strangerId, asUser: stranger } = await seedUser(t, 'Stranger');
	const strangerHouseholdId = await stranger.mutation(api.households.createHousehold, {
		name: 'Stranger House',
		currency: 'USD',
	});
	await seedCategory(t, strangerHouseholdId, strangerId);
	const strangerCategories = await t.run(async (ctx) =>
		ctx.db
			.query('categories')
			.withIndex('by_household', (q) => q.eq('householdId', strangerHouseholdId))
			.collect(),
	);
	await t.run(async (ctx) =>
		ctx.db.insert('transactions', {
			householdId: strangerHouseholdId,
			categoryId: strangerCategories[0]._id,
			amount: 9999,
			note: 'Stranger secret',
			spentAt: Date.now(),
			payerName: 'Stranger',
			createdBy: strangerId,
			source: 'manual',
			createdAt: Date.now(),
		}),
	);

	const consentId = await t.run(async (ctx) =>
		ctx.db.insert('consents', {
			userId,
			policyVersion: '2026-07-09',
			consentAt: Date.now(),
		}),
	);

	const bundle = await asUser.query(api.account.exportMyData, { exportedAtMs: 1700000000000 });

	expect(bundle.exportedAtMs).toBe(1700000000000);
	expect(bundle.user?._id).toBe(userId);
	expect(bundle.memberships).toHaveLength(1);
	expect(bundle.memberships[0].householdId).toBe(householdId);
	expect(bundle.settings).toHaveLength(1);
	expect(bundle.settings[0].householdId).toBe(householdId);
	expect(bundle.consents).toHaveLength(1);
	expect(bundle.consents[0]._id).toBe(consentId);

	expect(bundle.households).toHaveLength(1);
	const household = bundle.households[0];
	expect(household.household._id).toBe(householdId);
	expect(household.categories.map((c) => c._id).sort()).toEqual(
		categories.map((c) => c._id).sort(),
	);
	expect(household.transactions.map((tx) => tx._id)).toContain(transactionId);

	// No cross-user leak: the stranger's household, categories, and
	// transactions must not appear anywhere in the caller's bundle.
	const bundleHouseholdIds = bundle.households.map((h) => h.household._id);
	expect(bundleHouseholdIds).not.toContain(strangerHouseholdId);
	const bundleTransactionNotes = bundle.households.flatMap((h) =>
		h.transactions.map((tx) => tx.note),
	);
	expect(bundleTransactionNotes).not.toContain('Stranger secret');
	const bundleCategoryIds = bundle.households.flatMap((h) => h.categories.map((c) => c._id));
	for (const strangerCategory of strangerCategories) {
		expect(bundleCategoryIds).not.toContain(strangerCategory._id);
	}
});

test('unauthenticated caller cannot export data', async () => {
	const t = makeCtx();
	await expect(t.query(api.account.exportMyData, { exportedAtMs: 0 })).rejects.toThrow();
});

test('deleteMyAccount cascades a solely-owned household and erases the user', async () => {
	const t = makeCtx();

	const { userId, asUser } = await seedUser(t, 'Amira');
	const householdId = await asUser.mutation(api.households.createHousehold, {
		name: 'Our Home',
		currency: 'AED',
	});
	await seedCategory(t, householdId, userId);
	const categories = await t.run(async (ctx) =>
		ctx.db
			.query('categories')
			.withIndex('by_household', (q) => q.eq('householdId', householdId))
			.collect(),
	);
	await t.run(async (ctx) =>
		ctx.db.insert('transactions', {
			householdId,
			categoryId: categories[0]._id,
			amount: 4200,
			note: 'Coffee',
			spentAt: Date.now(),
			payerName: 'Amira',
			createdBy: userId,
			source: 'manual',
			createdAt: Date.now(),
		}),
	);

	await t.run(async (ctx) =>
		ctx.db.insert('consents', {
			userId,
			policyVersion: '2026-07-09',
			consentAt: Date.now(),
		}),
	);

	const { accountId, sessionId } = await t.run(async (ctx) => {
		const accountId = await ctx.db.insert('authAccounts', {
			userId,
			provider: 'password',
			providerAccountId: 'amira@example.com',
		});
		const sessionId = await ctx.db.insert('authSessions', {
			userId,
			expirationTime: Date.now() + 1000,
		});
		await ctx.db.insert('authRefreshTokens', {
			sessionId,
			expirationTime: Date.now() + 1000,
		});
		await ctx.db.insert('authVerificationCodes', {
			accountId,
			provider: 'password',
			code: '123456',
			expirationTime: Date.now() + 1000,
		});
		await ctx.db.insert('authVerifiers', {
			sessionId,
			signature: 'sig-amira',
		});
		return { accountId, sessionId };
	});

	await asUser.mutation(api.account.deleteMyAccount, {});

	const [
		user,
		memberships,
		settingsRows,
		consentRows,
		household,
		remainingCategories,
		remainingTransactions,
		authAccountRows,
		authSessionRows,
		verificationCodeRows,
		verifierRows,
	] = await t.run(async (ctx) => {
		return Promise.all([
			ctx.db.get(userId),
			ctx.db
				.query('memberships')
				.withIndex('by_user', (q) => q.eq('userId', userId))
				.collect(),
			ctx.db
				.query('settings')
				.withIndex('by_user_household', (q) => q.eq('userId', userId))
				.collect(),
			ctx.db
				.query('consents')
				.withIndex('by_user', (q) => q.eq('userId', userId))
				.collect(),
			ctx.db.get(householdId),
			ctx.db
				.query('categories')
				.withIndex('by_household', (q) => q.eq('householdId', householdId))
				.collect(),
			ctx.db
				.query('transactions')
				.withIndex('by_household', (q) => q.eq('householdId', householdId))
				.collect(),
			ctx.db
				.query('authAccounts')
				.withIndex('userIdAndProvider', (q) => q.eq('userId', userId))
				.collect(),
			ctx.db
				.query('authSessions')
				.withIndex('userId', (q) => q.eq('userId', userId))
				.collect(),
			ctx.db
				.query('authVerificationCodes')
				.withIndex('accountId', (q) => q.eq('accountId', accountId))
				.collect(),
			ctx.db
				.query('authVerifiers')
				.filter((q) => q.eq(q.field('sessionId'), sessionId))
				.collect(),
		]);
	});

	expect(user).toBeNull();
	expect(memberships).toHaveLength(0);
	expect(settingsRows).toHaveLength(0);
	expect(consentRows).toHaveLength(0);
	expect(household).toBeNull();
	expect(remainingCategories).toHaveLength(0);
	expect(remainingTransactions).toHaveLength(0);
	expect(authAccountRows).toHaveLength(0);
	expect(authSessionRows).toHaveLength(0);
	// The two @convex-dev/auth tables that reference authAccounts/authSessions
	// by foreign key must also be erased — no orphaned verification data.
	expect(verificationCodeRows).toHaveLength(0);
	expect(verifierRows).toHaveLength(0);

	// Idempotent: calling again with the same (now-stale) identity is a
	// clean no-op, not a crash.
	await expect(asUser.mutation(api.account.deleteMyAccount, {})).resolves.toBeNull();
});

test('deleteMyAccount on a shared household only removes the caller\'s membership', async () => {
	const t = makeCtx();

	const { userId: ownerId, asUser: owner } = await seedUser(t, 'Amira');
	const householdId = await owner.mutation(api.households.createHousehold, {
		name: 'Our Home',
		currency: 'AED',
	});
	const household = await t.run(async (ctx) => ctx.db.get(householdId));
	const inviteCode = household!.inviteCode;

	const { userId: memberId, asUser: member } = await seedUser(t, 'Sam');
	await member.mutation(api.households.joinHousehold, { code: inviteCode });
	await t.run(async (ctx) =>
		ctx.db.insert('consents', {
			userId: memberId,
			policyVersion: '2026-07-09',
			consentAt: Date.now(),
		}),
	);

	await seedCategory(t, householdId, ownerId);
	const categories = await t.run(async (ctx) =>
		ctx.db
			.query('categories')
			.withIndex('by_household', (q) => q.eq('householdId', householdId))
			.collect(),
	);
	const memberCategoryId = await t.run(async (ctx) =>
		ctx.db.insert('categories', {
			householdId,
			name: 'Side hustle',
			emoji: '💼',
			color: '#000000',
			period: 'monthly',
			limit: 100000,
			sortOrder: categories.length,
			archived: false,
			createdBy: memberId,
			createdAt: Date.now(),
		}),
	);
	const transactionId = await t.run(async (ctx) =>
		ctx.db.insert('transactions', {
			householdId,
			categoryId: categories[0]._id,
			amount: 1500,
			note: 'Shared groceries',
			spentAt: Date.now(),
			payerName: 'Sam',
			createdBy: memberId,
			source: 'manual',
			createdAt: Date.now(),
		}),
	);

	await member.mutation(api.account.deleteMyAccount, {});

	const [
		memberUser,
		memberMemberships,
		memberSettings,
		memberConsents,
		ownerMemberships,
		survivingHousehold,
		survivingCategories,
		survivingTransactions,
	] = await t.run(async (ctx) => {
		return Promise.all([
			ctx.db.get(memberId),
			ctx.db
				.query('memberships')
				.withIndex('by_user', (q) => q.eq('userId', memberId))
				.collect(),
			ctx.db
				.query('settings')
				.withIndex('by_user_household', (q) => q.eq('userId', memberId))
				.collect(),
			ctx.db
				.query('consents')
				.withIndex('by_user', (q) => q.eq('userId', memberId))
				.collect(),
			ctx.db
				.query('memberships')
				.withIndex('by_user', (q) => q.eq('userId', ownerId))
				.collect(),
			ctx.db.get(householdId),
			ctx.db
				.query('categories')
				.withIndex('by_household', (q) => q.eq('householdId', householdId))
				.collect(),
			ctx.db
				.query('transactions')
				.withIndex('by_household', (q) => q.eq('householdId', householdId))
				.collect(),
		]);
	});

	expect(memberUser).toBeNull();
	expect(memberMemberships).toHaveLength(0);
	expect(memberSettings).toHaveLength(0);
	expect(memberConsents).toHaveLength(0);
	expect(ownerMemberships).toHaveLength(1);
	expect(survivingHousehold).not.toBeNull();
	expect(survivingCategories.length).toBeGreaterThan(0);
	expect(survivingTransactions.map((tx) => tx._id)).toContain(transactionId);
	// The tombstoned payer label survives untouched — it was never a link
	// to the deleted member's account.
	const survivingTransaction = survivingTransactions.find((tx) => tx._id === transactionId);
	expect(survivingTransaction?.payerName).toBe('Sam');
	// ...but the `createdBy` foreign key back to the now-erased member is
	// cleared, so nothing dangling points at the deleted account.
	expect(survivingTransaction?.createdBy).toBeUndefined();
	const survivingMemberCategory = survivingCategories.find((c) => c._id === memberCategoryId);
	expect(survivingMemberCategory).toBeDefined();
	expect(survivingMemberCategory?.createdBy).toBeUndefined();

	// Idempotent second call for the already-deleted member.
	await expect(member.mutation(api.account.deleteMyAccount, {})).resolves.toBeNull();
});

test('unauthenticated caller cannot delete an account', async () => {
	const t = makeCtx();
	await expect(t.mutation(api.account.deleteMyAccount, {})).rejects.toThrow();
});
