import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
	...authTables,

	households: defineTable({
		name: v.string(),
		inviteCode: v.string(),
		currency: v.union(
			v.literal("AED"),
			v.literal("USD"),
			v.literal("GBP"),
			v.literal("EUR"),
			v.literal("ZAR"),
		),
		ownerId: v.id("users"),
		createdAt: v.number(),
	}).index("by_invite", ["inviteCode"]),

	memberships: defineTable({
		householdId: v.id("households"),
		userId: v.id("users"),
		role: v.union(v.literal("owner"), v.literal("member")),
		createdAt: v.number(),
	})
		.index("by_user", ["userId"])
		.index("by_household", ["householdId"]),

	categories: defineTable({
		householdId: v.id("households"),
		name: v.string(),
		emoji: v.string(),
		color: v.string(),
		period: v.union(v.literal("monthly"), v.literal("annual")),
		limit: v.number(),
		sortOrder: v.number(),
		archived: v.boolean(),
		createdBy: v.optional(v.id("users")),
		createdAt: v.number(),
	}).index("by_household", ["householdId"]),

	transactions: defineTable({
		householdId: v.id("households"),
		categoryId: v.id("categories"),
		amount: v.number(),
		// `note` is the transaction TITLE (the prototype's "Where?" input, e.g.
		// "Carrefour") — the whole app reads it as the title. `memo` is the
		// secondary free-text note; optional so rows written before it existed
		// stay valid and no migration is needed.
		note: v.string(),
		memo: v.optional(v.string()),
		spentAt: v.number(),
		payerName: v.string(),
		createdBy: v.optional(v.id("users")),
		source: v.union(v.literal("manual"), v.literal("sms")),
		raw: v.optional(v.string()),
		createdAt: v.number(),
	})
		.index("by_household", ["householdId"])
		.index("by_category", ["categoryId"])
		.index("by_household_spentAt", ["householdId", "spentAt"]),

	settings: defineTable({
		userId: v.id("users"),
		householdId: v.id("households"),
		theme: v.union(v.literal("dark"), v.literal("light")),
		layout: v.union(
			v.literal("cozy-cards"),
			v.literal("grid"),
			v.literal("compact"),
		),
		weeklyCheckin: v.boolean(),
		overNudges: v.boolean(),
		monthlyRecap: v.boolean(),
		profileColor: v.string(),
		displayName: v.string(),
		consentAt: v.optional(v.number()),
		policyVersion: v.optional(v.string()),
	}).index("by_user_household", ["userId", "householdId"]),

	consents: defineTable({
		userId: v.id("users"),
		policyVersion: v.string(),
		consentAt: v.number(),
	}).index("by_user", ["userId"]),
});
