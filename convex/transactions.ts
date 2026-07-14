import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { internalMutation, mutation, query } from "./_generated/server";
import { householdMemberProfiles, requireMembership } from "./households";
import { monthLabel, monthRange, monthShort, yearRange } from "../src/budget/periods";

/**
 * WHO PAID — how `paidBy` and `payerName` relate.
 *
 * `paidBy` is the source of truth for the payer; `payerName` is a denormalized
 * snapshot of what they were called at write time. The client resolves a row in
 * this order:
 *
 *   1. `paidBy` -> look that user up among the household's CURRENT members
 *      (`households:householdMembers`) -> use their LIVE display name and
 *      profile colour. A member who renames themselves therefore renames
 *      themselves on every expense they ever paid for.
 *   2. Otherwise — `paidBy` is absent (a legacy row written before it existed,
 *      see `backfillPaidBy`) or the user is no longer a member of the household
 *      — fall back to the stored `payerName` string, which is then the only
 *      record of who paid. It renders as a plain name with a neutral avatar.
 *
 * `payerName` is required on every write for exactly that reason: each row must
 * still read sensibly on its own, even once its payer is gone.
 */

/**
 * `paidBy` attributes an expense to a real person, so it may only ever point at
 * a member of that expense's own household — otherwise a caller could pin
 * someone else's household's spending on an outsider (or on a user in another
 * household entirely, whose name would then resolve to nothing).
 */
async function requirePayerIsMember(
	ctx: MutationCtx,
	householdId: Id<"households">,
	paidBy: Id<"users">,
) {
	const membership = await ctx.db
		.query("memberships")
		.withIndex("by_household", (q) => q.eq("householdId", householdId))
		.filter((q) => q.eq(q.field("userId"), paidBy))
		.unique();
	if (membership === null) {
		throw new Error("The payer must be a member of this household");
	}
}

export const addTransaction = mutation({
	args: {
		householdId: v.id("households"),
		categoryId: v.id("categories"),
		amount: v.number(),
		note: v.string(),
		memo: v.optional(v.string()),
		payerName: v.string(),
		paidBy: v.optional(v.id("users")),
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

		if (args.paidBy !== undefined) {
			await requirePayerIsMember(ctx, args.householdId, args.paidBy);
		}

		return await ctx.db.insert("transactions", {
			householdId: args.householdId,
			categoryId: args.categoryId,
			amount: args.amount,
			note: args.note,
			// "" and absent both mean "no memo", and both are stored as absent, so
			// reads never have to tell the two apart.
			memo: args.memo?.trim() || undefined,
			spentAt: args.spentAt ?? Date.now(),
			payerName: args.payerName,
			paidBy: args.paidBy,
			createdBy: userId,
			source: "manual",
			createdAt: Date.now(),
		});
	},
});

/**
 * Edits an existing expense in place — the prototype's expense sheet lets you
 * change the amount, the title (`note`, the "Where?" input), the secondary
 * `memo` and who paid. Authorized via the transaction's own household: this is
 * a shared household wallet, so ANY member may edit any of its expenses (same
 * rule as `renameHousehold`), not just whoever created the row.
 *
 * Every spend aggregate (`summary`, `monthTotals`, `weeklySummary`) is derived
 * from these rows at read time, so patching the amount here moves the totals
 * with no extra bookkeeping.
 *
 * Re-attributing the payer patches `paidBy` and its `payerName` snapshot
 * together — see the "WHO PAID" note at the top of this file.
 */
export const updateTransaction = mutation({
	args: {
		transactionId: v.id("transactions"),
		amount: v.number(),
		note: v.string(),
		/**
		 * Required, unlike on `addTransaction` — pass `""` to clear it.
		 *
		 * This is a full replace of the editable fields, and `memo` is patched
		 * with whatever arrives. When it was optional, a caller who simply did
		 * not mention `memo` silently erased it: `ctx.db.patch` removes a field
		 * set to `undefined`. That is fine for the edit form, which always
		 * submits its current field values, but it is a trap for any partial
		 * update written later — the kind of bug that deletes user data quietly
		 * and is only noticed much later.
		 *
		 * Making it required means the caller has to state its intent. There is
		 * no way to omit it by accident, and `""` says "no memo" out loud.
		 */
		memo: v.string(),
		payerName: v.string(),
		paidBy: v.optional(v.id("users")),
		/**
		 * When the expense happened. Required for the same reason as `memo`: this
		 * is a full replace, so an omitted field is silently destructive.
		 *
		 * Editing this moves the row between months, and the monthly totals are
		 * derived from `spentAt` at read time — so changing it re-attributes the
		 * spend with no extra bookkeeping.
		 */
		spentAt: v.number(),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const transaction = await ctx.db.get(args.transactionId);
		if (transaction === null) {
			throw new Error("Transaction not found");
		}
		await requireMembership(ctx, transaction.householdId);

		if (!Number.isInteger(args.amount) || args.amount <= 0) {
			throw new Error("Amount must be a positive whole number of minor units");
		}

		const note = args.note.trim();
		if (note === "") {
			throw new Error("Transaction note cannot be empty");
		}

		// Only a CHANGE of payer has to be a current member. Re-validating an
		// unchanged `paidBy` would make every edit of an expense paid by someone
		// who has since left the household throw — which in turn would force the
		// client to drop the attribution just to be able to save. That is exactly
		// the history this field exists to protect, so leaving an existing id in
		// place is always allowed.
		const paidByChanged = args.paidBy !== transaction.paidBy;
		if (args.paidBy !== undefined && paidByChanged) {
			await requirePayerIsMember(ctx, transaction.householdId, args.paidBy);
		}

		// An empty memo is stored as an absent field rather than "", so reads do
		// not have to distinguish the two.
		const memo = args.memo.trim();

		if (!Number.isFinite(args.spentAt)) {
			throw new Error("spentAt must be a timestamp in milliseconds");
		}

		await ctx.db.patch(args.transactionId, {
			amount: args.amount,
			note,
			memo: memo === "" ? undefined : memo,
			payerName: args.payerName,
			paidBy: args.paidBy,
			spentAt: args.spentAt,
		});
		return null;
	},
});

/**
 * Hard-deletes an expense. Same shared-wallet rule as `updateTransaction`: any
 * member of the transaction's household may delete it. Nothing references a
 * transaction row, so there is no cascade to do — and the aggregates recompute
 * from the remaining rows.
 */
export const deleteTransaction = mutation({
	args: {
		transactionId: v.id("transactions"),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const transaction = await ctx.db.get(args.transactionId);
		if (transaction === null) {
			throw new Error("Transaction not found");
		}
		await requireMembership(ctx, transaction.householdId);

		await ctx.db.delete(args.transactionId);
		return null;
	},
});

/** How many past payee names the sheet's autocomplete draws from. */
const PAYEE_HISTORY_LIMIT = 100;

/**
 * The household's previously-used payee names ("Where?" titles), most recent
 * first and de-duplicated case-insensitively.
 *
 * Returns the whole (bounded) list rather than taking a search term: the sheet
 * filters it locally on every keystroke, so a round trip per character would be
 * both slower and pointless. Bounded at `PAYEE_HISTORY_LIMIT` so this can never
 * grow into an unbounded read as a household's history piles up.
 *
 * The first spelling wins, so a payee typed as "carrefour" once and "Carrefour"
 * twenty times is suggested however it was most recently written.
 */
export const payeeHistory = query({
	args: {
		householdId: v.id("households"),
	},
	returns: v.array(v.string()),
	handler: async (ctx, args) => {
		await requireMembership(ctx, args.householdId);

		const transactions = await ctx.db
			.query("transactions")
			.withIndex("by_household", (q) => q.eq("householdId", args.householdId))
			.collect();

		const byRecency = transactions.sort((a, b) => b.spentAt - a.spentAt);

		const seen = new Map<string, string>();
		for (const transaction of byRecency) {
			const name = transaction.note.trim();
			if (name === "") {
				continue;
			}
			const key = name.toLowerCase();
			if (!seen.has(key)) {
				seen.set(key, name);
			}
			if (seen.size >= PAYEE_HISTORY_LIMIT) {
				break;
			}
		}
		return [...seen.values()];
	},
});

/**
 * A category's transactions, newest first. Returns whole transaction rows —
 * including both `paidBy` and `payerName`, so the client can run the payer
 * resolution documented at the top of this file.
 */
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
 * household, same as `listByCategory`, and like it returns whole rows —
 * `paidBy` included.
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

/**
 * One-off backfill for expenses written before `paidBy` existed, when
 * `payerName` was the only record of who paid. For each such row it matches the
 * stored `payerName` against the display names of that household's CURRENT
 * members (via `households:householdMemberProfiles`, so the match uses exactly
 * the same names the UI renders), trimmed and case-insensitively, and on a hit
 * patches `paidBy` — from then on the row follows that member's renames.
 *
 * A row whose `payerName` matches nobody is LEFT ALONE: it belongs to an
 * ex-member or is a freehand name, and `payerName` remains its only record (the
 * documented fallback). An ambiguous name — two current members going by the
 * same display name — is also left alone rather than guessed at.
 *
 * Idempotent: rows that already have `paidBy` are skipped, so a second run
 * patches nothing and returns 0. Returns the number of rows patched.
 *
 * Run once with `npx convex run transactions:backfillPaidBy [--prod]`.
 */
export const backfillPaidBy = internalMutation({
	args: {},
	returns: v.number(),
	handler: async (ctx) => {
		const transactions = await ctx.db.query("transactions").collect();

		// One lookup per household, not per transaction: name (normalized) ->
		// the single member who goes by it, or `null` when two members share it.
		const byHousehold = new Map<Id<"households">, Map<string, Id<"users"> | null>>();

		let patched = 0;
		for (const transaction of transactions) {
			if (transaction.paidBy !== undefined) {
				continue;
			}

			let byName = byHousehold.get(transaction.householdId);
			if (byName === undefined) {
				byName = new Map();
				for (const member of await householdMemberProfiles(ctx, transaction.householdId)) {
					const key = member.displayName.trim().toLowerCase();
					byName.set(key, byName.has(key) ? null : member.userId);
				}
				byHousehold.set(transaction.householdId, byName);
			}

			const paidBy = byName.get(transaction.payerName.trim().toLowerCase());
			if (paidBy === undefined || paidBy === null) {
				continue;
			}

			await ctx.db.patch(transaction._id, { paidBy });
			patched++;
		}

		return patched;
	},
});
