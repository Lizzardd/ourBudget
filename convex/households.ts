import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";

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

		const household = await ctx.db
			.query("households")
			.withIndex("by_invite", (q) => q.eq("inviteCode", args.code))
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

const FALLBACK_DISPLAY_NAME = "Member";
const FALLBACK_PROFILE_COLOR = "#8A7663";

export const householdMembers = query({
	args: {
		householdId: v.id("households"),
	},
	handler: async (ctx, args) => {
		const { userId: callerId } = await requireMembership(ctx, args.householdId);

		const memberships = await ctx.db
			.query("memberships")
			.withIndex("by_household", (q) => q.eq("householdId", args.householdId))
			.collect();

		const members = await Promise.all(
			memberships.map(async (membership) => {
				const settings = await ctx.db
					.query("settings")
					.withIndex("by_user_household", (q) =>
						q.eq("userId", membership.userId).eq("householdId", args.householdId),
					)
					.unique();

				const displayName = settings?.displayName ?? FALLBACK_DISPLAY_NAME;
				const profileColor = settings?.profileColor ?? FALLBACK_PROFILE_COLOR;
				const initial = displayName.charAt(0).toUpperCase() || "?";

				return {
					userId: membership.userId,
					displayName,
					profileColor,
					initial,
					role: membership.role,
					isMe: membership.userId === callerId,
				};
			}),
		);

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
 * Hard-deletes a household and everything hanging off it: each category's
 * transactions (via `by_category`, mirroring `deleteCategory`), then the
 * categories, then the household row. Only called when the last member
 * leaves, so there is nobody left who could ever read this data again.
 */
async function deleteHouseholdCascade(
	ctx: MutationCtx,
	householdId: Id<"households">,
) {
	const categories = await ctx.db
		.query("categories")
		.withIndex("by_household", (q) => q.eq("householdId", householdId))
		.collect();

	for (const category of categories) {
		const transactions = await ctx.db
			.query("transactions")
			.withIndex("by_category", (q) => q.eq("categoryId", category._id))
			.collect();

		for (const transaction of transactions) {
			await ctx.db.delete(transaction._id);
		}

		await ctx.db.delete(category._id);
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
