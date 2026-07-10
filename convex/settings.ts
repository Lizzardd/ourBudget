import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireMembership } from "./households";

export const getSettings = query({
	args: {
		householdId: v.id("households"),
	},
	handler: async (ctx, args) => {
		const { userId } = await requireMembership(ctx, args.householdId);

		const settings = await ctx.db
			.query("settings")
			.withIndex("by_user_household", (q) =>
				q.eq("userId", userId).eq("householdId", args.householdId),
			)
			.unique();

		if (settings === null) {
			throw new Error("No settings row found for this member and household");
		}

		return settings;
	},
});

export const updateSettings = mutation({
	args: {
		householdId: v.id("households"),
		patch: v.object({
			theme: v.optional(v.union(v.literal("dark"), v.literal("light"))),
			layout: v.optional(
				v.union(
					v.literal("cozy-cards"),
					v.literal("grid"),
					v.literal("compact"),
				),
			),
			weeklyCheckin: v.optional(v.boolean()),
			overNudges: v.optional(v.boolean()),
			monthlyRecap: v.optional(v.boolean()),
			profileColor: v.optional(v.string()),
			displayName: v.optional(v.string()),
			consentAt: v.optional(v.number()),
			policyVersion: v.optional(v.string()),
		}),
	},
	handler: async (ctx, args) => {
		const { userId } = await requireMembership(ctx, args.householdId);

		const settings = await ctx.db
			.query("settings")
			.withIndex("by_user_household", (q) =>
				q.eq("userId", userId).eq("householdId", args.householdId),
			)
			.unique();

		if (settings === null) {
			throw new Error("No settings row found for this member and household");
		}

		const patch = Object.fromEntries(
			Object.entries(args.patch).filter(([, value]) => value !== undefined),
		);

		await ctx.db.patch(settings._id, patch);
	},
});

/**
 * Owner-only: currency is a household-wide display label, not a conversion
 * — changing it does NOT convert any historical `transactions.amount`
 * values (they stay in the same minor units, just relabeled). Because that
 * silently changes how every past amount reads for every member, only the
 * household owner may change it.
 */
export const setCurrency = mutation({
	args: {
		householdId: v.id("households"),
		currency: v.union(
			v.literal("AED"),
			v.literal("USD"),
			v.literal("GBP"),
			v.literal("EUR"),
			v.literal("ZAR"),
		),
	},
	handler: async (ctx, args) => {
		const { role } = await requireMembership(ctx, args.householdId);
		if (role !== "owner") {
			throw new Error("Only the household owner can change the currency");
		}

		await ctx.db.patch(args.householdId, { currency: args.currency });
	},
});
