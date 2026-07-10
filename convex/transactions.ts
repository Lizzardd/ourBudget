import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { requireMembership } from "./households";
import { monthLabel, monthRange, monthShort, yearRange } from "../src/budget/periods";

export const addTransaction = mutation({
	args: {
		householdId: v.id("households"),
		categoryId: v.id("categories"),
		amount: v.number(),
		note: v.string(),
		payerName: v.string(),
		spentAt: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const { userId } = await requireMembership(ctx, args.householdId);

		if (args.amount <= 0) {
			throw new Error("Amount must be greater than 0");
		}

		const category = await ctx.db.get(args.categoryId);
		if (category === null || category.householdId !== args.householdId) {
			throw new Error("Category does not belong to this household");
		}

		return await ctx.db.insert("transactions", {
			householdId: args.householdId,
			categoryId: args.categoryId,
			amount: args.amount,
			note: args.note,
			spentAt: args.spentAt ?? Date.now(),
			payerName: args.payerName,
			createdBy: userId,
			source: "manual",
			createdAt: Date.now(),
		});
	},
});

export const listByCategory = query({
	args: {
		categoryId: v.id("categories"),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const category = await ctx.db.get(args.categoryId);
		if (category === null) {
			throw new Error("Category not found");
		}
		await requireMembership(ctx, category.householdId);

		const transactions = await ctx.db
			.query("transactions")
			.withIndex("by_category", (q) => q.eq("categoryId", args.categoryId))
			.collect();

		const sorted = transactions.sort((a, b) => b.spentAt - a.spentAt);

		return args.limit !== undefined ? sorted.slice(0, args.limit) : sorted;
	},
});

/**
 * A category's transactions within `[startMs, endMs)`, newest first — feeds
 * the Reports "Month Transactions Sheet" (a month range for monthly
 * categories, a year range for annual ones). Authorized via the category's
 * household, same as `listByCategory`.
 */
export const listByCategoryInRange = query({
	args: {
		categoryId: v.id("categories"),
		startMs: v.number(),
		endMs: v.number(),
	},
	handler: async (ctx, args) => {
		const category = await ctx.db.get(args.categoryId);
		if (category === null) {
			throw new Error("Category not found");
		}
		await requireMembership(ctx, category.householdId);

		const transactions = await ctx.db
			.query("transactions")
			.withIndex("by_category", (q) => q.eq("categoryId", args.categoryId))
			.filter((q) => q.and(q.gte(q.field("spentAt"), args.startMs), q.lt(q.field("spentAt"), args.endMs)))
			.collect();

		return transactions.sort((a, b) => b.spentAt - a.spentAt);
	},
});

async function sumSpentInRange(
	ctx: QueryCtx,
	householdId: Id<"households">,
	startMs: number,
	endMs: number,
): Promise<Map<Id<"categories">, number>> {
	const transactions = await ctx.db
		.query("transactions")
		.withIndex("by_household_spentAt", (q) =>
			q.eq("householdId", householdId).gte("spentAt", startMs).lt("spentAt", endMs),
		)
		.collect();

	const totals = new Map<Id<"categories">, number>();
	for (const transaction of transactions) {
		totals.set(transaction.categoryId, (totals.get(transaction.categoryId) ?? 0) + transaction.amount);
	}
	return totals;
}

export const summary = query({
	args: {
		householdId: v.id("households"),
		year: v.number(),
		month: v.number(),
	},
	handler: async (ctx, args) => {
		await requireMembership(ctx, args.householdId);

		const categories = await ctx.db
			.query("categories")
			.withIndex("by_household", (q) => q.eq("householdId", args.householdId))
			.collect();

		const { startMs: monthStartMs, endMs: monthEndMs } = monthRange(args.year, args.month);
		const { startMs: yearStartMs, endMs: yearEndMs } = yearRange(args.year);

		const monthlyTotals = await sumSpentInRange(ctx, args.householdId, monthStartMs, monthEndMs);
		const annualTotals = await sumSpentInRange(ctx, args.householdId, yearStartMs, yearEndMs);

		let totalSpent = 0;
		let totalLimit = 0;

		const result = categories.map((category) => {
			const spent =
				category.period === "monthly"
					? monthlyTotals.get(category._id) ?? 0
					: annualTotals.get(category._id) ?? 0;

			if (category.period === "monthly") {
				totalSpent += spent;
				totalLimit += category.limit;
			}

			return { categoryId: category._id, spent };
		});

		return { categories: result, totalSpent, totalLimit };
	},
});

export const monthTotals = query({
	args: {
		householdId: v.id("households"),
		months: v.number(),
		now: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		await requireMembership(ctx, args.householdId);

		const categories = await ctx.db
			.query("categories")
			.withIndex("by_household", (q) => q.eq("householdId", args.householdId))
			.collect();
		const monthlyCategoryIds = new Set(
			categories.filter((category) => category.period === "monthly").map((category) => category._id),
		);

		const now = args.now ?? Date.now();
		const nowDate = new Date(now);
		const currentYear = nowDate.getUTCFullYear();
		const currentMonth = nowDate.getUTCMonth();

		const results: { label: string; short: string; total: number; year: number; month: number }[] = [];

		for (let offset = args.months - 1; offset >= 0; offset--) {
			const totalMonthIndex = currentYear * 12 + currentMonth - offset;
			const year = Math.floor(totalMonthIndex / 12);
			const month = ((totalMonthIndex % 12) + 12) % 12;

			const { startMs, endMs } = monthRange(year, month);
			const totals = await sumSpentInRange(ctx, args.householdId, startMs, endMs);

			let total = 0;
			for (const [categoryId, amount] of totals) {
				if (monthlyCategoryIds.has(categoryId)) {
					total += amount;
				}
			}

			results.push({ label: monthLabel(year, month), short: monthShort(year, month), total, year, month });
		}

		return results;
	},
});

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export interface WeeklyCategorySummary {
	categoryId: Id<"categories">;
	name: string;
	emoji: string;
	spent: number;
	/**
	 * `over` uses a deliberately simple rule (documented on `weeklySummary`
	 * below): a monthly category is "over" for the week if its last-7-days
	 * spend alone already exceeds its full monthly limit. Annual categories
	 * are never flagged over/on-track here — a week of annual spend vs. a
	 * yearly limit isn't a meaningful weekly signal.
	 */
	over: boolean;
	overBy: number;
}

/**
 * Last-7-days spend summary for the in-app Monday check-in
 * (`MondayNotification` + `WeeklyCheckIn`) — see NOTES on those files: this
 * is an in-app simulation only, there is no scheduled push/email yet.
 *
 * Window is `[nowMs - 7d, nowMs)` — the caller passes `nowMs` explicitly
 * (no `Date.now()` inside the query) so tests are deterministic.
 *
 * "Over vs. on track" rule (kept intentionally simple, not pro-rated):
 * a monthly category is flagged `over` when its spend in the last 7 days
 * alone exceeds its full monthly `limit`. This is a coarse weekly signal —
 * a category can spend its whole month's budget in one bad week — rather
 * than a precise pro-rated (limit / ~4.345) comparison. Annual categories
 * are excluded from `over`/on-track since a week of spend vs. a yearly
 * limit is not a meaningful comparison.
 */
export const weeklySummary = query({
	args: {
		householdId: v.id("households"),
		nowMs: v.number(),
	},
	handler: async (ctx, args) => {
		await requireMembership(ctx, args.householdId);

		const startMs = args.nowMs - WEEK_MS;
		const endMs = args.nowMs;

		const categories = await ctx.db
			.query("categories")
			.withIndex("by_household", (q) => q.eq("householdId", args.householdId))
			.collect();
		const categoryById = new Map(categories.map((category) => [category._id, category]));

		const transactions = await ctx.db
			.query("transactions")
			.withIndex("by_household_spentAt", (q) =>
				q.eq("householdId", args.householdId).gte("spentAt", startMs).lt("spentAt", endMs),
			)
			.collect();

		const spentByCategory = new Map<Id<"categories">, number>();
		for (const transaction of transactions) {
			spentByCategory.set(
				transaction.categoryId,
				(spentByCategory.get(transaction.categoryId) ?? 0) + transaction.amount,
			);
		}

		const totalSpent = transactions.reduce((sum, transaction) => sum + transaction.amount, 0);
		const txnCount = transactions.length;

		const categorySummaries: WeeklyCategorySummary[] = categories
			.filter((category) => (spentByCategory.get(category._id) ?? 0) > 0)
			.map((category) => {
				const spent = spentByCategory.get(category._id) ?? 0;
				const over = category.period === "monthly" && spent > category.limit;
				const overBy = over ? spent - category.limit : 0;
				return {
					categoryId: category._id,
					name: category.name,
					emoji: category.emoji,
					spent,
					over,
					overBy,
				};
			})
			.sort((a, b) => b.spent - a.spent);

		const biggest = categorySummaries[0] ?? null;

		const overCategories = categorySummaries.filter((c) => c.over);
		const watch = overCategories.length > 0
			? overCategories.reduce((worst, c) => (c.overBy > worst.overBy ? c : worst))
			: null;

		const onTrack = categories
			.filter((category) => category.period === "monthly")
			.map((category) => {
				const spent = spentByCategory.get(category._id) ?? 0;
				return { categoryId: category._id, name: category.name, emoji: category.emoji, spent, over: spent > category.limit };
			})
			.filter((category) => !category.over)
			.map((category) => ({ categoryId: category.categoryId, name: category.name, emoji: category.emoji }));

		return {
			startMs,
			endMs,
			totalSpent,
			txnCount,
			categories: categorySummaries,
			biggest: biggest ? { categoryId: biggest.categoryId, name: biggest.name, emoji: biggest.emoji, spent: biggest.spent } : null,
			watch: watch ? { categoryId: watch.categoryId, name: watch.name, emoji: watch.emoji, overBy: watch.overBy } : null,
			onTrack,
		};
	},
});
