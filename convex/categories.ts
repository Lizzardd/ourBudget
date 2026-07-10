import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { requireMembership } from "./households";

const CATEGORY_COLOR_PALETTE = [
	"#7FA86F",
	"#E08B6F",
	"#E3B063",
	"#D492A6",
	"#9C8FC7",
	"#8FB5B0",
	"#8AA3C4",
	"#D97A8F",
];

async function requireCategoryMembership(
	ctx: QueryCtx | MutationCtx,
	categoryId: Id<"categories">,
) {
	const category = await ctx.db.get(categoryId);
	if (category === null) {
		throw new Error("Category not found");
	}
	await requireMembership(ctx, category.householdId);
	return category;
}

export const listCategories = query({
	args: {
		householdId: v.id("households"),
	},
	handler: async (ctx, args) => {
		await requireMembership(ctx, args.householdId);

		const categories = await ctx.db
			.query("categories")
			.withIndex("by_household", (q) => q.eq("householdId", args.householdId))
			.collect();

		return categories
			.filter((category) => !category.archived)
			.sort((a, b) => a.sortOrder - b.sortOrder);
	},
});

export const createCategory = mutation({
	args: {
		householdId: v.id("households"),
		name: v.string(),
		emoji: v.string(),
		period: v.union(v.literal("monthly"), v.literal("annual")),
		limit: v.number(),
	},
	handler: async (ctx, args) => {
		const { userId } = await requireMembership(ctx, args.householdId);

		const existing = await ctx.db
			.query("categories")
			.withIndex("by_household", (q) => q.eq("householdId", args.householdId))
			.collect();

		const color = CATEGORY_COLOR_PALETTE[existing.length % CATEGORY_COLOR_PALETTE.length];
		const nextSortOrder =
			existing.length === 0
				? 0
				: Math.max(...existing.map((category) => category.sortOrder)) + 1;

		return await ctx.db.insert("categories", {
			householdId: args.householdId,
			name: args.name,
			emoji: args.emoji,
			color,
			period: args.period,
			limit: args.limit,
			sortOrder: nextSortOrder,
			archived: false,
			createdBy: userId,
			createdAt: Date.now(),
		});
	},
});

export const updateCategoryLimit = mutation({
	args: {
		categoryId: v.id("categories"),
		limit: v.number(),
	},
	handler: async (ctx, args) => {
		await requireCategoryMembership(ctx, args.categoryId);
		await ctx.db.patch(args.categoryId, { limit: args.limit });
	},
});

export const archiveCategory = mutation({
	args: {
		categoryId: v.id("categories"),
	},
	handler: async (ctx, args) => {
		await requireCategoryMembership(ctx, args.categoryId);
		await ctx.db.patch(args.categoryId, { archived: true });
	},
});
