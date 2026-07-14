// @vitest-environment edge-runtime
import { convexTest } from 'convex-test';
import { expect, test, vi } from 'vitest';
import { api, internal } from '../_generated/api';
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
	// Invite codes have NO separator — word immediately followed by 4 digits.
	expect(household?.inviteCode).toMatch(/^[A-Z]+\d{4}$/);
	expect(household?.inviteCode).not.toContain('-');

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

test('normalizeInviteCode strips hyphens, spaces and lowercasing', async () => {
	const { normalizeInviteCode } = await import('../households');

	expect(normalizeInviteCode('SUNNY-0790')).toBe('SUNNY0790');
	expect(normalizeInviteCode('sunny0790')).toBe('SUNNY0790');
	expect(normalizeInviteCode('  sunny - 0790 ')).toBe('SUNNY0790');
	// Already canonical codes pass through untouched.
	expect(normalizeInviteCode('SUNNY0790')).toBe('SUNNY0790');
});

test('joinHousehold resolves a code typed with a hyphen when it is stored without one', async () => {
	const t = makeCtx();
	const { asUser: owner } = await seedUser(t, 'Owner');
	const householdId = await owner.mutation(api.households.createHousehold, {
		name: 'Shared House',
		currency: 'AED',
	});
	const household = await t.run(async (ctx) => ctx.db.get(householdId));
	const stored = household!.inviteCode;
	// Re-insert the separator the old format used, plus some human noise.
	const typed = ` ${stored.slice(0, -4).toLowerCase()}-${stored.slice(-4)} `;

	const { asUser: joiner } = await seedUser(t, 'Joiner');
	const joinedHouseholdId = await joiner.mutation(api.households.joinHousehold, {
		code: typed,
	});
	expect(joinedHouseholdId).toBe(householdId);
});

test('joinHousehold resolves a code typed without a hyphen when a legacy row stored one', async () => {
	const t = makeCtx();
	const { asUser: owner } = await seedUser(t, 'Owner');
	const householdId = await owner.mutation(api.households.createHousehold, {
		name: 'Legacy House',
		currency: 'AED',
	});
	// Simulate a household minted before the format change.
	await t.run(async (ctx) => ctx.db.patch(householdId, { inviteCode: 'SUNNY-0790' }));

	const patched = await t.mutation(internal.households.normalizeExistingInviteCodes, {});
	expect(patched).toBe(1);

	const { asUser: joiner } = await seedUser(t, 'Joiner');
	const joinedHouseholdId = await joiner.mutation(api.households.joinHousehold, {
		code: 'SUNNY0790',
	});
	expect(joinedHouseholdId).toBe(householdId);
});

test('normalizeExistingInviteCodes rewrites legacy codes and is idempotent', async () => {
	const t = makeCtx();
	const { asUser: owner } = await seedUser(t, 'Owner');
	const householdId = await owner.mutation(api.households.createHousehold, {
		name: 'Legacy House',
		currency: 'AED',
	});
	await t.run(async (ctx) => ctx.db.patch(householdId, { inviteCode: 'MAPLE-1234' }));

	const patched = await t.mutation(internal.households.normalizeExistingInviteCodes, {});
	expect(patched).toBe(1);

	const household = await t.run(async (ctx) => ctx.db.get(householdId));
	expect(household?.inviteCode).toBe('MAPLE1234');

	// Running it a second time must be a no-op — nothing left to normalize.
	const patchedAgain = await t.mutation(internal.households.normalizeExistingInviteCodes, {});
	expect(patchedAgain).toBe(0);

	const unchanged = await t.run(async (ctx) => ctx.db.get(householdId));
	expect(unchanged?.inviteCode).toBe('MAPLE1234');
});

test('normalizeExistingInviteCodes issues a fresh code when normalizing would collide', async () => {
	const t = makeCtx();
	const dummyOwner = await t.run(async (ctx) => ctx.db.insert('users', { name: 'Dummy' }));

	// The legacy row normalizes onto a code another household already holds —
	// letting both keep it would break `joinHousehold`'s `.unique()` for BOTH.
	const legacyId = await t.run(async (ctx) =>
		ctx.db.insert('households', {
			name: 'Legacy',
			inviteCode: 'CORAL-0001',
			currency: 'AED',
			ownerId: dummyOwner,
			createdAt: Date.now(),
		}),
	);
	const incumbentId = await t.run(async (ctx) =>
		ctx.db.insert('households', {
			name: 'Incumbent',
			inviteCode: 'CORAL0001',
			currency: 'AED',
			ownerId: dummyOwner,
			createdAt: Date.now(),
		}),
	);

	const patched = await t.mutation(internal.households.normalizeExistingInviteCodes, {});
	expect(patched).toBe(1);

	const legacy = await t.run(async (ctx) => ctx.db.get(legacyId));
	const incumbent = await t.run(async (ctx) => ctx.db.get(incumbentId));
	// The incumbent keeps its code; the legacy row gets a fresh, canonical one.
	expect(incumbent?.inviteCode).toBe('CORAL0001');
	expect(legacy?.inviteCode).not.toBe('CORAL0001');
	expect(legacy?.inviteCode).toMatch(/^[A-Z]+\d{4}$/);
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
	const takenCode = 'SUNNY0000';
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

test('renameHousehold updates the name for any member', async () => {
	const t = makeCtx();
	const { asUser: owner } = await seedUser(t, 'Owner');
	const householdId = await owner.mutation(api.households.createHousehold, {
		name: 'Our Home',
		currency: 'AED',
	});
	const household = await t.run(async (ctx) => ctx.db.get(householdId));

	const { asUser: joiner } = await seedUser(t, 'Joiner');
	await joiner.mutation(api.households.joinHousehold, { code: household!.inviteCode });

	// A plain member — not just the owner — may rename.
	await joiner.mutation(api.households.renameHousehold, {
		householdId,
		name: '  The Nest  ',
	});

	const renamed = await t.run(async (ctx) => ctx.db.get(householdId));
	expect(renamed?.name).toBe('The Nest');
});

test('renameHousehold rejects an empty name', async () => {
	const t = makeCtx();
	const { asUser: owner } = await seedUser(t, 'Owner');
	const householdId = await owner.mutation(api.households.createHousehold, {
		name: 'Our Home',
		currency: 'AED',
	});

	await expect(
		owner.mutation(api.households.renameHousehold, { householdId, name: '   ' }),
	).rejects.toThrow('Household name cannot be empty');

	const household = await t.run(async (ctx) => ctx.db.get(householdId));
	expect(household?.name).toBe('Our Home');
});

test('removeMember lets the owner remove another member', async () => {
	const t = makeCtx();
	const { asUser: owner } = await seedUser(t, 'Owner');
	const householdId = await owner.mutation(api.households.createHousehold, {
		name: 'Our Home',
		currency: 'AED',
	});
	const household = await t.run(async (ctx) => ctx.db.get(householdId));

	const { userId: joinerId, asUser: joiner } = await seedUser(t, 'Joiner');
	await joiner.mutation(api.households.joinHousehold, { code: household!.inviteCode });

	await owner.mutation(api.households.removeMember, { householdId, userId: joinerId });

	const memberships = await t.run(async (ctx) =>
		ctx.db
			.query('memberships')
			.withIndex('by_household', (q) => q.eq('householdId', householdId))
			.collect(),
	);
	expect(memberships).toHaveLength(1);
	expect(memberships.some((m) => m.userId === joinerId)).toBe(false);
});

test('removeMember throws when the caller is not the owner', async () => {
	const t = makeCtx();
	const { userId: ownerId, asUser: owner } = await seedUser(t, 'Owner');
	const householdId = await owner.mutation(api.households.createHousehold, {
		name: 'Our Home',
		currency: 'AED',
	});
	const household = await t.run(async (ctx) => ctx.db.get(householdId));

	const { asUser: joiner } = await seedUser(t, 'Joiner');
	await joiner.mutation(api.households.joinHousehold, { code: household!.inviteCode });

	await expect(
		joiner.mutation(api.households.removeMember, { householdId, userId: ownerId }),
	).rejects.toThrow('Only the household owner can remove members');
});

test('removeMember throws when the owner targets themselves', async () => {
	const t = makeCtx();
	const { userId: ownerId, asUser: owner } = await seedUser(t, 'Owner');
	const householdId = await owner.mutation(api.households.createHousehold, {
		name: 'Our Home',
		currency: 'AED',
	});

	await expect(
		owner.mutation(api.households.removeMember, { householdId, userId: ownerId }),
	).rejects.toThrow('Use leaveHousehold to remove yourself');
});

test('leaveHousehold removes a plain member and leaves the household intact', async () => {
	const t = makeCtx();
	const { userId: ownerId, asUser: owner } = await seedUser(t, 'Owner');
	const householdId = await owner.mutation(api.households.createHousehold, {
		name: 'Our Home',
		currency: 'AED',
	});
	const household = await t.run(async (ctx) => ctx.db.get(householdId));

	const { userId: joinerId, asUser: joiner } = await seedUser(t, 'Joiner');
	await joiner.mutation(api.households.joinHousehold, { code: household!.inviteCode });

	await joiner.mutation(api.households.leaveHousehold, { householdId });

	const memberships = await t.run(async (ctx) =>
		ctx.db
			.query('memberships')
			.withIndex('by_household', (q) => q.eq('householdId', householdId))
			.collect(),
	);
	expect(memberships).toHaveLength(1);
	expect(memberships[0].userId).toBe(ownerId);
	expect(memberships.some((m) => m.userId === joinerId)).toBe(false);

	const stillThere = await t.run(async (ctx) => ctx.db.get(householdId));
	expect(stillThere?.ownerId).toBe(ownerId);
});

test('leaveHousehold promotes the earliest-joined remaining member when the owner leaves', async () => {
	const t = makeCtx();
	const { asUser: owner } = await seedUser(t, 'Owner');
	const householdId = await owner.mutation(api.households.createHousehold, {
		name: 'Our Home',
		currency: 'AED',
	});
	const household = await t.run(async (ctx) => ctx.db.get(householdId));

	const { userId: firstJoinerId, asUser: firstJoiner } = await seedUser(t, 'First');
	await firstJoiner.mutation(api.households.joinHousehold, { code: household!.inviteCode });
	const { userId: secondJoinerId, asUser: secondJoiner } = await seedUser(t, 'Second');
	await secondJoiner.mutation(api.households.joinHousehold, { code: household!.inviteCode });

	await owner.mutation(api.households.leaveHousehold, { householdId });

	const memberships = await t.run(async (ctx) =>
		ctx.db
			.query('memberships')
			.withIndex('by_household', (q) => q.eq('householdId', householdId))
			.collect(),
	);
	expect(memberships).toHaveLength(2);

	const first = memberships.find((m) => m.userId === firstJoinerId);
	const second = memberships.find((m) => m.userId === secondJoinerId);
	expect(first?.role).toBe('owner');
	expect(second?.role).toBe('member');

	const updated = await t.run(async (ctx) => ctx.db.get(householdId));
	expect(updated?.ownerId).toBe(firstJoinerId);
});

test('leaveHousehold by the last member deletes the household, its categories, transactions and settings', async () => {
	const t = makeCtx();
	const { asUser: owner } = await seedUser(t, 'Owner');
	const householdId = await owner.mutation(api.households.createHousehold, {
		name: 'Our Home',
		currency: 'AED',
	});

	const categoryId = await owner.mutation(api.categories.createCategory, {
		householdId,
		name: 'Groceries',
		emoji: '🥑',
		period: 'monthly',
		limit: 1200,
	});
	await t.run(async (ctx) =>
		ctx.db.insert('transactions', {
			householdId,
			categoryId,
			amount: 84,
			note: 'Market run',
			spentAt: Date.now(),
			payerName: 'Owner',
			source: 'manual',
			createdAt: Date.now(),
		}),
	);

	await owner.mutation(api.households.leaveHousehold, { householdId });

	const household = await t.run(async (ctx) => ctx.db.get(householdId));
	expect(household).toBeNull();

	const categories = await t.run(async (ctx) =>
		ctx.db
			.query('categories')
			.withIndex('by_household', (q) => q.eq('householdId', householdId))
			.collect(),
	);
	expect(categories).toHaveLength(0);

	const transactions = await t.run(async (ctx) =>
		ctx.db
			.query('transactions')
			.withIndex('by_household', (q) => q.eq('householdId', householdId))
			.collect(),
	);
	expect(transactions).toHaveLength(0);

	const memberships = await t.run(async (ctx) =>
		ctx.db
			.query('memberships')
			.withIndex('by_household', (q) => q.eq('householdId', householdId))
			.collect(),
	);
	expect(memberships).toHaveLength(0);

	// The per-household `settings` row must go too — it references a household
	// that no longer exists, and Settings promises the data is erasable.
	const settings = await t.run(async (ctx) =>
		ctx.db
			.query('settings')
			.filter((q) => q.eq(q.field('householdId'), householdId))
			.collect(),
	);
	expect(settings).toHaveLength(0);
});

test('leaveHousehold by the last member removes EVERY member\'s settings row, not just the leaver\'s', async () => {
	const t = makeCtx();
	const { asUser: owner } = await seedUser(t, 'Owner');
	const householdId = await owner.mutation(api.households.createHousehold, {
		name: 'Our Home',
		currency: 'AED',
	});
	const household = await t.run(async (ctx) => ctx.db.get(householdId));

	// Three members, so three `settings` rows...
	const { asUser: firstJoiner } = await seedUser(t, 'First');
	await firstJoiner.mutation(api.households.joinHousehold, { code: household!.inviteCode });
	const { asUser: secondJoiner } = await seedUser(t, 'Second');
	await secondJoiner.mutation(api.households.joinHousehold, { code: household!.inviteCode });

	const settingsBefore = await t.run(async (ctx) =>
		ctx.db
			.query('settings')
			.filter((q) => q.eq(q.field('householdId'), householdId))
			.collect(),
	);
	expect(settingsBefore).toHaveLength(3);

	// ...and every one of them must be gone once the household is destroyed,
	// including the rows of members who left before the final one did.
	await firstJoiner.mutation(api.households.leaveHousehold, { householdId });
	await secondJoiner.mutation(api.households.leaveHousehold, { householdId });
	await owner.mutation(api.households.leaveHousehold, { householdId });

	expect(await t.run(async (ctx) => ctx.db.get(householdId))).toBeNull();

	const settingsAfter = await t.run(async (ctx) =>
		ctx.db
			.query('settings')
			.filter((q) => q.eq(q.field('householdId'), householdId))
			.collect(),
	);
	expect(settingsAfter).toHaveLength(0);
});
