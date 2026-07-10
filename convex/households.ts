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
 * `${word}-${4 digits}` gives a space of `INVITE_WORDS.length * 10000`
 * (200,000 with the list above) — large enough that random collisions are
 * rare, but `createHousehold` still checks uniqueness explicitly (see
 * below) rather than relying on the space size alone.
 */
function generateInviteCode(): string {
	const word = INVITE_WORDS[Math.floor(Math.random() * INVITE_WORDS.length)];
	const digits = Math.floor(Math.random() * 10000)
		.toString()
		.padStart(4, "0");
	return `${word}-${digits}`;
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

type SeedCategory = {
	name: string;
	/**
	 * Despite the field name, this holds a Material Symbols Rounded ligature
	 * string (e.g. "grocery"), not an emoji character — the prototype
	 * replaced category emoji with Material Symbols icons, and the client
	 * renders this value via `src/components/Icon.tsx`. Kept as `emoji` to
	 * avoid a schema/field rename across the app.
	 */
	emoji: string;
	color: string;
	period: "monthly" | "annual";
	limit: number;
	sortOrder: number;
};

const DEFAULT_CATEGORIES: SeedCategory[] = [
	{ name: "Groceries", emoji: "grocery", color: "#7FA86F", period: "monthly", limit: 250000, sortOrder: 0 },
	{ name: "Dining out", emoji: "restaurant", color: "#E08B6F", period: "monthly", limit: 120000, sortOrder: 1 },
	{ name: "Transport", emoji: "local_taxi", color: "#E3B063", period: "monthly", limit: 60000, sortOrder: 2 },
	{ name: "Kids", emoji: "toys", color: "#D492A6", period: "monthly", limit: 90000, sortOrder: 3 },
	{ name: "Housing", emoji: "home", color: "#9C8FC7", period: "monthly", limit: 600000, sortOrder: 4 },
	{ name: "Everything else", emoji: "auto_awesome", color: "#B0A08C", period: "monthly", limit: 80000, sortOrder: 5 },
	{ name: "Household maintenance", emoji: "handyman", color: "#8FB5B0", period: "annual", limit: 1200000, sortOrder: 6 },
	{ name: "Car service", emoji: "directions_car", color: "#8AA3C4", period: "annual", limit: 400000, sortOrder: 7 },
	{ name: "Gifts", emoji: "redeem", color: "#D97A8F", period: "annual", limit: 600000, sortOrder: 8 },
];

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

		for (const category of DEFAULT_CATEGORIES) {
			await ctx.db.insert("categories", {
				householdId,
				name: category.name,
				emoji: category.emoji,
				color: category.color,
				period: category.period,
				limit: category.limit,
				sortOrder: category.sortOrder,
				archived: false,
				createdBy: userId,
				createdAt: now,
			});
		}

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
