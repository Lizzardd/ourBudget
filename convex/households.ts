import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { internalMutation, mutation, query } from "./_generated/server";

const INVITE_WORDS = [
	"SUNNY",
	"MAPLE",
	"CORAL",
	"AMBER",
	"OASIS",
	"BREEZE",
	"CEDAR",
	"HARBOR",
	"MEADOW",
	"PEBBLE",
	"WILLOW",
	"COMET",
	"LANTERN",
	"GLACIER",
	"SAFFRON",
	"THISTLE",
	"HORIZON",
	"JASPER",
	"TUNDRA",
	"ORCHID",
];

/**
 * `${word}${4 digits}` (e.g. `SUNNY4829`) gives a space of
 * `INVITE_WORDS.length * 10000` (200,000 with the list above) — large enough
 * that random collisions are rare, but `createHousehold` still checks
 * uniqueness explicitly (see below) rather than relying on the space size
 * alone.
 */
function generateInviteCode(): string {
	const word = INVITE_WORDS[Math.floor(Math.random() * INVITE_WORDS.length)];
	const digits = Math.floor(Math.random() * 10000)
		.toString()
		.padStart(4, "0");
	return `${word}${digits}`;
}

/**
 * Canonical form of an invite code: uppercase, alphanumerics only. Codes used
 * to be minted hyphenated (`SUNNY-0790`) before the format changed to
 * `SUNNY0790`, so both spellings are still in circulation — in old databases,
 * in old chat threads, and in people's heads. Normalizing on the way in means
 * a member can paste or type either one (plus stray spaces or lowercase) and
 * still land on the same household.
 */
export function normalizeInviteCode(code: string): string {
	return code.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

const MAX_INVITE_CODE_ATTEMPTS = 10;

/**
 * Generates invite codes until one that isn't already taken is found (the
 * `by_invite` index makes this a cheap point lookup per attempt). Without
 * this check, two households could share a code, and `joinHousehold`'s
 * `.unique()` query on `by_invite` would throw for BOTH of them the moment
 * a second household collides — silently locking real households out of
 * being joined. Capped so a pathological run of collisions fails loudly
 * instead of looping forever.
 */
async function generateUniqueInviteCode(ctx: MutationCtx): Promise<string> {
	for (let attempt = 0; attempt < MAX_INVITE_CODE_ATTEMPTS; attempt++) {
		const candidate = generateInviteCode();
		const existing = await ctx.db
			.query("households")
			.withIndex("by_invite", (q) => q.eq("inviteCode", candidate))
			.unique();
		if (existing === null) {
			return candidate;
		}
	}
	throw new Error(
		`Could not generate a unique invite code after ${MAX_INVITE_CODE_ATTEMPTS} attempts`,
	);
}

/**
 * Throws if the authenticated caller has no membership row for the given
 * household. Reused by later tasks to authorize household-scoped functions.
 */
export async function requireMembership(
	ctx: QueryCtx | MutationCtx,
	householdId: Id<"households">,
): Promise<{ userId: Id<"users">; role: "owner" | "member" }> {
	const userId = await getAuthUserId(ctx);
	if (userId === null) {
		throw new Error("Not authenticated");
	}
	const membership = await ctx.db
		.query("memberships")
		.withIndex("by_household", (q) => q.eq("householdId", householdId))
		.filter((q) => q.eq(q.field("userId"), userId))
		.unique();
	if (membership === null) {
		throw new Error("Not a member of this household");
	}
	return { userId, role: membership.role };
}

async function insertDefaultSettings(
	ctx: MutationCtx,
	userId: Id<"users">,
	householdId: Id<"households">,
) {
	const user = await ctx.db.get(userId);
	const displayName = user?.name ?? "You";
	await ctx.db.insert("settings", {
		userId,
		householdId,
		theme: "dark",
		layout: "cozy-cards",
		weeklyCheckin: true,
		overNudges: true,
		monthlyRecap: false,
		profileColor: "#D98BA4",
		displayName,
	});
}

export const createHousehold = mutation({
	args: {
		name: v.string(),
		currency: v.optional(
			v.union(
				v.literal("AED"),
				v.literal("USD"),
				v.literal("GBP"),
				v.literal("EUR"),
				v.literal("ZAR"),
			),
		),
	},
	handler: async (ctx, args) => {
		const userId = await getAuthUserId(ctx);
		if (userId === null) {
			throw new Error("Not authenticated");
		}

		const now = Date.now();
		const inviteCode = await generateUniqueInviteCode(ctx);
		const householdId = await ctx.db.insert("households", {
			name: args.name,
			inviteCode,
			currency: args.currency ?? "AED",
			ownerId: userId,
			createdAt: now,
		});

		await ctx.db.insert("memberships", {
			householdId,
			userId,
			role: "owner",
			createdAt: now,
		});

		await insertDefaultSettings(ctx, userId, householdId);

		// A brand-new household starts BLANK — no default categories. Members
		// add their own budgets via the "+ New category" flow.
		return householdId;
	},
});

export const joinHousehold = mutation({
	args: {
		code: v.string(),
	},
	handler: async (ctx, args) => {
		const userId = await getAuthUserId(ctx);
		if (userId === null) {
			throw new Error("Not authenticated");
		}

		// The `by_invite` index is an exact-match lookup, so the typed code has to
		// be canonicalized first — otherwise "sunny-0790" could never resolve to
		// the stored "SUNNY0790".
		const code = normalizeInviteCode(args.code);
		const household = await ctx.db
			.query("households")
			.withIndex("by_invite", (q) => q.eq("inviteCode", code))
			.unique();
		if (household === null) {
			throw new Error("No household found for that code");
		}

		const existingMembership = await ctx.db
			.query("memberships")
			.withIndex("by_household", (q) => q.eq("householdId", household._id))
			.filter((q) => q.eq(q.field("userId"), userId))
			.unique();

		if (existingMembership === null) {
			await ctx.db.insert("memberships", {
				householdId: household._id,
				userId,
				role: "member",
				createdAt: Date.now(),
			});
		}

		const existingSettings = await ctx.db
			.query("settings")
			.withIndex("by_user_household", (q) =>
				q.eq("userId", userId).eq("householdId", household._id),
			)
			.unique();
		if (existingSettings === null) {
			await insertDefaultSettings(ctx, userId, household._id);
		}

		return household._id;
	},
});

/**
 * One-off backfill for households minted before invite codes dropped their
 * hyphen: rewrites every stored `inviteCode` to its `normalizeInviteCode`
 * form so the `by_invite` lookup in `joinHousehold` (which now normalizes its
 * input) can find them. Idempotent — already-normalized rows are skipped, so
 * a second run patches nothing and returns 0.
 *
 * Stripping punctuation can in principle land a legacy code on top of a code
 * some other household already holds (e.g. `SUNNY-0790` and `SUNNY0790` both
 * exist). Two households sharing a code would make `joinHousehold`'s
 * `.unique()` throw for BOTH, so on collision the legacy household is issued a
 * fresh unique code instead — it loses its old code, but stays joinable.
 *
 * Run once with `npx convex run households:normalizeExistingInviteCodes`.
 */
export const normalizeExistingInviteCodes = internalMutation({
	args: {},
	returns: v.number(),
	handler: async (ctx) => {
		const households = await ctx.db.query("households").collect();

		let patched = 0;
		for (const household of households) {
			const normalized = normalizeInviteCode(household.inviteCode);
			if (normalized === household.inviteCode) {
				continue;
			}

			const clash = await ctx.db
				.query("households")
				.withIndex("by_invite", (q) => q.eq("inviteCode", normalized))
				.unique();
			const inviteCode =
				clash === null || clash._id === household._id
					? normalized
					: await generateUniqueInviteCode(ctx);

			await ctx.db.patch(household._id, { inviteCode });
			patched++;
		}

		return patched;
	},
});

const FALLBACK_DISPLAY_NAME = "Member";
const FALLBACK_PROFILE_COLOR = "#8A7663";

export interface HouseholdMemberProfile {
	userId: Id<"users">;
	displayName: string;
	profileColor: string;
	/** Avatar photo URL, or undefined to show the colour + initial. */
	photoUrl?: string;
	initial: string;
	role: "owner" | "member";
}

/**
 * The household's CURRENT members with the display name and profile colour
 * they go by right now (their per-household `settings` row, falling back to a
 * neutral placeholder if none exists yet).
 *
 * This is the one place that resolves "who is in this household and what are
 * they called" — `householdMembers` renders it, and `transactions:backfillPaidBy`
 * matches legacy `payerName` snapshots against it. Keep them on the same
 * definition of a member's name so a name that once resolved keeps resolving.
 */
export async function householdMemberProfiles(
	ctx: QueryCtx | MutationCtx,
	householdId: Id<"households">,
): Promise<HouseholdMemberProfile[]> {
	const memberships = await ctx.db
		.query("memberships")
		.withIndex("by_household", (q) => q.eq("householdId", householdId))
		.collect();

	return await Promise.all(
		memberships.map(async (membership) => {
			const settings = await ctx.db
				.query("settings")
				.withIndex("by_user_household", (q) =>
					q.eq("userId", membership.userId).eq("householdId", householdId),
				)
				.unique();

			const displayName = settings?.displayName ?? FALLBACK_DISPLAY_NAME;
			const profileColor = settings?.profileColor ?? FALLBACK_PROFILE_COLOR;
			const initial = displayName.charAt(0).toUpperCase() || "?";

			return {
				userId: membership.userId,
				displayName,
				profileColor,
				photoUrl: settings?.photoUrl,
				initial,
				role: membership.role,
			};
		}),
	);
}

export const householdMembers = query({
	args: {
		householdId: v.id("households"),
	},
	handler: async (ctx, args) => {
		const { userId: callerId } = await requireMembership(ctx, args.householdId);

		const profiles = await householdMemberProfiles(ctx, args.householdId);

		const members = profiles.map((profile) => ({
			...profile,
			isMe: profile.userId === callerId,
		}));

		members.sort((a, b) => {
			if (a.isMe === b.isMe) {
				return 0;
			}
			return a.isMe ? -1 : 1;
		});

		return members;
	},
});

export const myHouseholds = query({
	args: {},
	handler: async (ctx) => {
		const userId = await getAuthUserId(ctx);
		if (userId === null) {
			throw new Error("Not authenticated");
		}

		const memberships = await ctx.db
			.query("memberships")
			.withIndex("by_user", (q) => q.eq("userId", userId))
			.collect();

		const households = await Promise.all(
			memberships.map((membership) => ctx.db.get(membership.householdId)),
		);

		return households.filter((household): household is NonNullable<typeof household> => household !== null);
	},
});

export const renameHousehold = mutation({
	args: {
		householdId: v.id("households"),
		name: v.string(),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		// Renaming is a shared-household affordance: any member may do it.
		await requireMembership(ctx, args.householdId);

		const name = args.name.trim();
		if (name === "") {
			throw new Error("Household name cannot be empty");
		}

		await ctx.db.patch(args.householdId, { name });
		return null;
	},
});

export const removeMember = mutation({
	args: {
		householdId: v.id("households"),
		userId: v.id("users"),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const { userId: callerId, role } = await requireMembership(ctx, args.householdId);
		if (role !== "owner") {
			throw new Error("Only the household owner can remove members");
		}
		// Removing yourself has different semantics (ownership handoff, cascade
		// delete of the last member's household) — `leaveHousehold` owns that.
		if (args.userId === callerId) {
			throw new Error("Use leaveHousehold to remove yourself");
		}

		const membership = await ctx.db
			.query("memberships")
			.withIndex("by_household", (q) => q.eq("householdId", args.householdId))
			.filter((q) => q.eq(q.field("userId"), args.userId))
			.unique();
		if (membership === null) {
			throw new Error("That user is not a member of this household");
		}

		await ctx.db.delete(membership._id);
		return null;
	},
});

/**
 * Hard-deletes a household and EVERYTHING that belongs to it — the single
 * definition of "delete a household", shared by `leaveHousehold` (last member
 * out) and `account:deleteMyAccount` (GDPR erasure of a sole member) so the
 * two paths cannot drift apart.
 *
 * Every table that carries a `householdId` is swept here:
 *  - `transactions` (via `by_household`, which also catches any row whose
 *    category has already gone away),
 *  - `categories` (via `by_household`),
 *  - `settings` — one row PER MEMBER per household, so the whole household's
 *    rows go, not just the caller's. Settings is only indexed
 *    `by_user_household`, which cannot be range-scanned by `householdId`
 *    alone, so this is a filtered scan. Acceptable on a cold delete path; if
 *    `settings` ever grows hot, add a `by_household` index.
 *  - `memberships` (via `by_household`) — any stragglers, so no membership can
 *    outlive its household.
 * `consents` is keyed by `userId` ONLY (no `householdId`), so it belongs to
 * the user and not the household: it is deliberately NOT touched here — it is
 * erased by `account:deleteMyAccount` instead.
 *
 * The household row itself goes last.
 */
export async function deleteHouseholdCascade(
	ctx: MutationCtx,
	householdId: Id<"households">,
) {
	const transactions = await ctx.db
		.query("transactions")
		.withIndex("by_household", (q) => q.eq("householdId", householdId))
		.collect();
	for (const transaction of transactions) {
		await ctx.db.delete(transaction._id);
	}

	const categories = await ctx.db
		.query("categories")
		.withIndex("by_household", (q) => q.eq("householdId", householdId))
		.collect();
	for (const category of categories) {
		await ctx.db.delete(category._id);
	}

	const settingsRows = await ctx.db
		.query("settings")
		.withIndex("by_household", (q) => q.eq("householdId", householdId))
		.collect();
	for (const settingsRow of settingsRows) {
		await ctx.db.delete(settingsRow._id);
	}

	const memberships = await ctx.db
		.query("memberships")
		.withIndex("by_household", (q) => q.eq("householdId", householdId))
		.collect();
	for (const membership of memberships) {
		await ctx.db.delete(membership._id);
	}

	await ctx.db.delete(householdId);
}

export const leaveHousehold = mutation({
	args: {
		householdId: v.id("households"),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const { userId, role } = await requireMembership(ctx, args.householdId);

		const memberships = await ctx.db
			.query("memberships")
			.withIndex("by_household", (q) => q.eq("householdId", args.householdId))
			.collect();

		const own = memberships.find((membership) => membership.userId === userId);
		if (own === undefined) {
			throw new Error("Not a member of this household");
		}
		await ctx.db.delete(own._id);

		const remaining = memberships.filter((membership) => membership._id !== own._id);

		if (remaining.length === 0) {
			// Last one out turns off the lights — nothing left to own the data.
			await deleteHouseholdCascade(ctx, args.householdId);
			return null;
		}

		if (role === "owner") {
			// Never leave a household ownerless: hand off to whoever joined first.
			const successor = remaining.reduce((earliest, membership) =>
				membership._creationTime < earliest._creationTime ? membership : earliest,
			);
			await ctx.db.patch(successor._id, { role: "owner" });
			await ctx.db.patch(args.householdId, { ownerId: successor.userId });
		}

		return null;
	},
});
