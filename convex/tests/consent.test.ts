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

test('myConsent returns null when the caller has never consented', async () => {
	const t = makeCtx();
	const { asUser } = await seedUser(t, 'Amira');

	const consent = await asUser.query(api.consent.myConsent, {});
	expect(consent).toBeNull();
});

test('recordConsent stores the policy version and a timestamp, myConsent returns it', async () => {
	const t = makeCtx();
	const { userId, asUser } = await seedUser(t, 'Amira');

	const before = Date.now();
	await asUser.mutation(api.consent.recordConsent, { policyVersion: '2026-07-09' });
	const after = Date.now();

	const consent = await asUser.query(api.consent.myConsent, {});
	expect(consent).not.toBeNull();
	expect(consent?.userId).toBe(userId);
	expect(consent?.policyVersion).toBe('2026-07-09');
	expect(consent?.consentAt).toBeGreaterThanOrEqual(before);
	expect(consent?.consentAt).toBeLessThanOrEqual(after);
});

test('myConsent returns the most recent consent row when the caller has consented more than once', async () => {
	const t = makeCtx();
	const { asUser } = await seedUser(t, 'Amira');

	await asUser.mutation(api.consent.recordConsent, { policyVersion: '2026-01-01' });
	await asUser.mutation(api.consent.recordConsent, { policyVersion: '2026-07-09' });

	const consent = await asUser.query(api.consent.myConsent, {});
	expect(consent?.policyVersion).toBe('2026-07-09');
});

test('recordConsent requires authentication', async () => {
	const t = makeCtx();

	await expect(
		t.mutation(api.consent.recordConsent, { policyVersion: '2026-07-09' }),
	).rejects.toThrow();
});

test('myConsent requires authentication', async () => {
	const t = makeCtx();

	await expect(t.query(api.consent.myConsent, {})).rejects.toThrow();
});

test("a stranger cannot see another user's consent", async () => {
	const t = makeCtx();
	const { asUser: owner } = await seedUser(t, 'Owner');
	const { asUser: stranger } = await seedUser(t, 'Stranger');

	await owner.mutation(api.consent.recordConsent, { policyVersion: '2026-07-09' });

	const consent = await stranger.query(api.consent.myConsent, {});
	expect(consent).toBeNull();
});
