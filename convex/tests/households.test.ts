// @vitest-environment edge-runtime
import { convexTest } from 'convex-test';
import { expect, test, vi } from 'vitest';
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

test('createHousehold makes caller owner, starts blank (no categories), and a settings row', async () => {
	const t = makeCtx();
	const { userId, asUser } = await seedUser(t, 'Amira');

	const householdId = await asUser.mutation(api.households.createHousehold, {
		name: 'Our Home',
		currency: 'AED',
	});

	expect(householdId).toBeTruthy();

	const household = await t.run(async (ctx) => ctx.db.get(householdId));
	expect(household?.ownerId).toBe(userId);
	expect(household?.name).toBe('Our Home');
	expect(household?.currency).toBe('AED');
	expect(household?.inviteCode).toMatch(/^[A-Z]+-\d{4}$/);

	const memberships = await t.run(async (ctx) =>
		ctx.db
			.query('memberships')
			.withIndex('by_household', (q) => q.eq('householdId', householdId))
			.collect(),
	);
	expect(memberships).toHaveLength(1);
	expect(memberships[0].userId).toBe(userId);
	expect(memberships[0].role).toBe('owner');

	const categories = await t.run(async (ctx) =>
		ctx.db
			.query('categories')
			.withIndex('by_household', (q) => q.eq('householdId', householdId))
			.collect(),
	);
	// A new household starts blank — members add their own categories.
	expect(categories).toHaveLength(0);

	const settings = await t.run(async (ctx) =>
		ctx.db
			.query('settings')
			.withIndex('by_user_household', (q) =>
				q.eq('userId', userId).eq('householdId', householdId),
			)
			.collect(),
	);
	expect(settings).toHaveLength(1);
	expect(settings[0]).toMatchObject({
		theme: 'dark',
		layout: 'cozy-cards',
		weeklyCheckin: true,
		overNudges: true,
		monthlyRecap: false,
		profileColor: '#D98BA4',
		displayName: 'Amira',
	});
});

test('joinHousehold with a valid code adds membership and is idempotent', async () => {
	const t = makeCtx();
	const { asUser: owner } = await seedUser(t, 'Owner');
	const householdId = await owner.mutation(api.households.createHousehold, {
		name: 'Shared House',
		currency: 'AED',
	});
	const household = await t.run(async (ctx) => ctx.db.get(householdId));
	const inviteCode = household!.inviteCode;

	const { userId: joinerId, asUser: joiner } = await seedUser(t, 'Joiner');
	const joinedHouseholdId = await joiner.mutation(api.households.joinHousehold, {
		code: inviteCode,
	});
	expect(joinedHouseholdId).toBe(householdId);

	const memberships = await t.run(async (ctx) =>
		ctx.db
			.query('memberships')
			.withIndex('by_household', (q) => q.eq('householdId', householdId))
			.collect(),
	);
	expect(memberships).toHaveLength(2);
	expect(memberships.some((m) => m.userId === joinerId)).toBe(true);

	// idempotent: joining again does not duplicate the membership
	await joiner.mutation(api.households.joinHousehold, { code: inviteCode });
	const membershipsAfter = await t.run(async (ctx) =>
		ctx.db
			.query('memberships')
			.withIndex('by_household', (q) => q.eq('householdId', householdId))
			.collect(),
	);
	expect(membershipsAfter).toHaveLength(2);

	const joinerSettings = await t.run(async (ctx) =>
		ctx.db
			.query('settings')
			.withIndex('by_user_household', (q) =>
				q.eq('userId', joinerId).eq('householdId', householdId),
			)
			.collect(),
	);
	expect(joinerSettings).toHaveLength(1);
});

test('joinHousehold throws for an invalid code', async () => {
	const t = makeCtx();
	const { asUser } = await seedUser(t, 'Someone');

	await expect(
		asUser.mutation(api.households.joinHousehold, { code: 'NOPE-99' }),
	).rejects.toThrow('No household found for that code');
});

test('requireMembership throws for a non-member', async () => {
	const t = makeCtx();
	const { asUser: owner } = await seedUser(t, 'Owner');
	const householdId = await owner.mutation(api.households.createHousehold, {
		name: 'Private House',
		currency: 'AED',
	});

	const { asUser: outsider } = await seedUser(t, 'Outsider');

	const { requireMembership } = await import('../households');
	await expect(
		outsider.run(async (ctx) => requireMembership(ctx, householdId)),
	).rejects.toThrow('Not a member of this household');
});

test('myHouseholds returns households for the caller', async () => {
	const t = makeCtx();
	const { asUser } = await seedUser(t, 'Amira');
	const householdId = await asUser.mutation(api.households.createHousehold, {
		name: 'Our Home',
		currency: 'AED',
	});

	const households = await asUser.query(api.households.myHouseholds, {});
	expect(households).toHaveLength(1);
	expect(households[0]._id).toBe(householdId);
});

test('createHousehold never produces duplicate invite codes, and joinHousehold still works afterwards', async () => {
	const t = makeCtx();

	const householdIds: Array<{ id: unknown; code: string }> = [];
	for (let i = 0; i < 25; i++) {
		const { asUser } = await seedUser(t, `Creator ${i}`);
		const householdId = await asUser.mutation(api.households.createHousehold, {
			name: `House ${i}`,
			currency: 'AED',
		});
		const household = await t.run(async (ctx) => ctx.db.get(householdId));
		householdIds.push({ id: householdId, code: household!.inviteCode });
	}

	const codes = householdIds.map((h) => h.code);
	expect(new Set(codes).size).toBe(codes.length);

	// joinHousehold's `.unique()` lookup on `by_invite` must still resolve
	// cleanly for every one of these codes even with many households seeded.
	const lastCode = householdIds[householdIds.length - 1].code;
	const { asUser: joiner } = await seedUser(t, 'Late joiner');
	const joinedHouseholdId = await joiner.mutation(api.households.joinHousehold, {
		code: lastCode,
	});
	expect(joinedHouseholdId).toBe(householdIds[householdIds.length - 1].id);
});

test('householdMembers returns all members with the caller first and isMe true for caller', async () => {
	const t = makeCtx();
	const { userId: ownerId, asUser: owner } = await seedUser(t, 'Amira Al-Marri');
	const householdId = await owner.mutation(api.households.createHousehold, {
		name: 'Our Home',
		currency: 'AED',
	});

	const { userId: joinerId, asUser: joiner } = await seedUser(t, 'Omar');
	const household = await t.run(async (ctx) => ctx.db.get(householdId));
	await joiner.mutation(api.households.joinHousehold, { code: household!.inviteCode });

	const membersFromOwner = await owner.query(api.households.householdMembers, { householdId });
	expect(membersFromOwner).toHaveLength(2);
	expect(membersFromOwner[0]).toMatchObject({
		userId: ownerId,
		displayName: 'Amira Al-Marri',
		profileColor: '#D98BA4',
		initial: 'A',
		isMe: true,
	});
	expect(membersFromOwner[1]).toMatchObject({
		userId: joinerId,
		displayName: 'Omar',
		isMe: false,
	});

	const membersFromJoiner = await joiner.query(api.households.householdMembers, { householdId });
	expect(membersFromJoiner).toHaveLength(2);
	expect(membersFromJoiner[0]).toMatchObject({ userId: joinerId, isMe: true });
	expect(membersFromJoiner[1]).toMatchObject({ userId: ownerId, isMe: false });
});

test('householdMembers throws for a non-member', async () => {
	const t = makeCtx();
	const { asUser: owner } = await seedUser(t, 'Owner');
	const householdId = await owner.mutation(api.households.createHousehold, {
		name: 'Private House',
		currency: 'AED',
	});

	const { asUser: outsider } = await seedUser(t, 'Outsider');
	await expect(
		outsider.query(api.households.householdMembers, { householdId }),
	).rejects.toThrow('Not a member of this household');
});

test('createHousehold retries when a candidate invite code is already taken', async () => {
	const t = makeCtx();
	const { asUser } = await seedUser(t, 'Amira');

	// Force every random draw to collide with an existing invite code on the
	// first attempt, then succeed on the second — proving the retry loop in
	// `generateUniqueInviteCode` actually re-queries `by_invite` rather than
	// trusting the random draw blindly.
	const takenCode = 'SUNNY-0000';
	const dummyOwner = await t.run(async (ctx) => ctx.db.insert('users', { name: 'Dummy' }));
	await t.run(async (ctx) =>
		ctx.db.insert('households', {
			name: 'Taken',
			inviteCode: takenCode,
			currency: 'AED',
			ownerId: dummyOwner,
			createdAt: Date.now(),
		}),
	);

	const randomSpy = vi.spyOn(Math, 'random');
	// First candidate: word index 0 ("SUNNY"), digits 0 -> collides with
	// `takenCode`. Second candidate: word index 1 ("MAPLE"), digits 1 -> free.
	randomSpy.mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValueOnce(1 / 20).mockReturnValueOnce(1 / 10000);

	const householdId = await asUser.mutation(api.households.createHousehold, {
		name: 'Our Home',
		currency: 'AED',
	});
	randomSpy.mockRestore();

	const household = await t.run(async (ctx) => ctx.db.get(householdId));
	expect(household?.inviteCode).not.toBe(takenCode);
});
