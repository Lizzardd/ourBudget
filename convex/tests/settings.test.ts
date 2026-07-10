// @vitest-environment edge-runtime
import { convexTest } from 'convex-test';
import { expect, test } from 'vitest';
import { api } from '../_generated/api';
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

test('getSettings returns the caller settings row for the household', async () => {
	const t = makeCtx();
	const { userId, asUser } = await seedUser(t, 'Amira');
	const householdId = await asUser.mutation(api.households.createHousehold, {
		name: 'Our Home',
		currency: 'AED',
	});

	const settings = await asUser.query(api.settings.getSettings, { householdId });
	expect(settings).toMatchObject({
		userId,
		householdId,
		theme: 'dark',
		layout: 'cozy-cards',
		weeklyCheckin: true,
		overNudges: true,
		monthlyRecap: false,
		profileColor: '#D98BA4',
		displayName: 'Amira',
	});
});

test('updateSettings patches only provided fields and persists', async () => {
	const t = makeCtx();
	const { asUser } = await seedUser(t, 'Amira');
	const householdId = await asUser.mutation(api.households.createHousehold, {
		name: 'Our Home',
		currency: 'AED',
	});

	const now = Date.now();
	await asUser.mutation(api.settings.updateSettings, {
		householdId,
		patch: { theme: 'light', consentAt: now, policyVersion: 'v2' },
	});

	const settings = await asUser.query(api.settings.getSettings, { householdId });
	expect(settings).toMatchObject({
		theme: 'light',
		consentAt: now,
		policyVersion: 'v2',
		layout: 'cozy-cards',
		weeklyCheckin: true,
		overNudges: true,
		monthlyRecap: false,
		profileColor: '#D98BA4',
		displayName: 'Amira',
	});

	await asUser.mutation(api.settings.updateSettings, {
		householdId,
		patch: { layout: 'grid', displayName: 'Amira K' },
	});

	const settings2 = await asUser.query(api.settings.getSettings, { householdId });
	expect(settings2).toMatchObject({
		theme: 'light',
		layout: 'grid',
		displayName: 'Amira K',
		consentAt: now,
		policyVersion: 'v2',
	});
});

test('setCurrency updates the household currency and is reflected for all members', async () => {
	const t = makeCtx();
	const { asUser: owner } = await seedUser(t, 'Owner');
	const householdId = await owner.mutation(api.households.createHousehold, {
		name: 'Shared House',
		currency: 'AED',
	});

	const household = await t.run(async (ctx) => ctx.db.get(householdId));
	const invite = household!.inviteCode;

	const { asUser: member } = await seedUser(t, 'Member');
	await member.mutation(api.households.joinHousehold, { code: invite });

	await owner.mutation(api.settings.setCurrency, { householdId, currency: 'USD' });

	const updated = await t.run(async (ctx) => ctx.db.get(householdId));
	expect(updated?.currency).toBe('USD');
});

test('setCurrency throws for a member and succeeds for the owner', async () => {
	const t = makeCtx();
	const { asUser: owner } = await seedUser(t, 'Owner');
	const householdId = await owner.mutation(api.households.createHousehold, {
		name: 'Shared House',
		currency: 'AED',
	});

	const household = await t.run(async (ctx) => ctx.db.get(householdId));
	const invite = household!.inviteCode;

	const { asUser: member } = await seedUser(t, 'Member');
	await member.mutation(api.households.joinHousehold, { code: invite });

	await expect(
		member.mutation(api.settings.setCurrency, { householdId, currency: 'EUR' }),
	).rejects.toThrow('Only the household owner can change the currency');

	const unchanged = await t.run(async (ctx) => ctx.db.get(householdId));
	expect(unchanged?.currency).toBe('AED');

	await owner.mutation(api.settings.setCurrency, { householdId, currency: 'EUR' });
	const updated = await t.run(async (ctx) => ctx.db.get(householdId));
	expect(updated?.currency).toBe('EUR');
});

test('non-member calling getSettings, updateSettings, or setCurrency throws', async () => {
	const t = makeCtx();
	const { asUser: owner } = await seedUser(t, 'Owner');
	const householdId = await owner.mutation(api.households.createHousehold, {
		name: 'Our Home',
		currency: 'AED',
	});

	const { asUser: stranger } = await seedUser(t, 'Stranger');

	await expect(
		stranger.query(api.settings.getSettings, { householdId }),
	).rejects.toThrow();
	await expect(
		stranger.mutation(api.settings.updateSettings, { householdId, patch: { theme: 'light' } }),
	).rejects.toThrow();
	await expect(
		stranger.mutation(api.settings.setCurrency, { householdId, currency: 'USD' }),
	).rejects.toThrow();
});
