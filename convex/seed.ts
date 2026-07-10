import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { internalMutation } from "./_generated/server";

const HOUSEHOLD_NAME = "The Al-Marri Home";
const DAY = 86400000;

type Period = "monthly" | "annual";
type Payer = "Sara" | "Omar";

interface SeedCategory {
	key: string;
	name: string;
	/**
	 * Material Symbols Rounded ligature string (e.g. "grocery"), not an
	 * emoji character — see the matching comment on `SeedCategory` in
	 * convex/households.ts.
	 */
	emoji: string;
	color: string;
	period: Period;
	limit: number; // minor units
	sortOrder: number;
}

// Matches the Task-10 DEFAULT_CATEGORIES in convex/households.ts and the
// prototype's MCATS/ACATS (docs/design/BudgetApp-Prototype.dc.html).
const CATEGORIES: SeedCategory[] = [
	{ key: "groceries", name: "Groceries", emoji: "grocery", color: "#7FA86F", period: "monthly", limit: 250000, sortOrder: 0 },
	{ key: "dining", name: "Dining out", emoji: "restaurant", color: "#E08B6F", period: "monthly", limit: 120000, sortOrder: 1 },
	{ key: "fuel", name: "Transport", emoji: "local_taxi", color: "#E3B063", period: "monthly", limit: 60000, sortOrder: 2 },
	{ key: "kids", name: "Kids", emoji: "toys", color: "#D492A6", period: "monthly", limit: 90000, sortOrder: 3 },
	{ key: "rent", name: "Housing", emoji: "home", color: "#9C8FC7", period: "monthly", limit: 600000, sortOrder: 4 },
	{ key: "other", name: "Everything else", emoji: "auto_awesome", color: "#B0A08C", period: "monthly", limit: 80000, sortOrder: 5 },
	{ key: "maint", name: "Household maintenance", emoji: "handyman", color: "#8FB5B0", period: "annual", limit: 1200000, sortOrder: 6 },
	{ key: "car", name: "Car service", emoji: "directions_car", color: "#8AA3C4", period: "annual", limit: 400000, sortOrder: 7 },
	{ key: "gifts", name: "Gifts", emoji: "redeem", color: "#D97A8F", period: "annual", limit: 600000, sortOrder: 8 },
];

// Prototype MONTHS array (major AED units). Index 0 = current month (July
// 2026, relative to nowMs), index 1..4 = the 4 preceding months.
const MONTH_SHORT = ["Jul", "Jun", "May", "Apr", "Mar"];
const MONTHS: Array<Record<string, number>> = [
	{ groceries: 1720, dining: 1340, fuel: 385, kids: 610, rent: 6000, other: 240 },
	{ groceries: 2380, dining: 1150, fuel: 540, kids: 880, rent: 6000, other: 410 },
	{ groceries: 2210, dining: 990, fuel: 640, kids: 720, rent: 6000, other: 380 },
	{ groceries: 2450, dining: 1080, fuel: 520, kids: 830, rent: 6000, other: 350 },
	{ groceries: 2300, dining: 870, fuel: 495, kids: 760, rent: 6000, other: 290 },
];

// Prototype ACATS[*].ytd (major AED units).
const YTD: Record<string, number> = { maint: 4300, car: 1850, gifts: 2100 };

interface SeedTxn {
	note: string;
	amt: number; // major AED units
	who: Payer;
	when: string;
}

// Prototype TXNS, verbatim (docs/design/BudgetApp-Prototype.dc.html, lines
// 661-705).
const TXNS: Record<string, SeedTxn[]> = {
	groceries: [
		{ note: "Carrefour", amt: 320, who: "Sara", when: "Today" },
		{ note: "Spinneys", amt: 264, who: "Omar", when: "Jul 5" },
		{ note: "Union Coop", amt: 188, who: "Sara", when: "Jul 3" },
		{ note: "Carrefour", amt: 412, who: "Omar", when: "Jul 1" },
	],
	dining: [
		{ note: "Reform Social", amt: 210, who: "Sara", when: "Yesterday" },
		{ note: "Karak House", amt: 46, who: "Omar", when: "Jul 5" },
		{ note: "Zuma — anniversary", amt: 684, who: "Omar", when: "Jul 3" },
		{ note: "Common Grounds", amt: 400, who: "Sara", when: "Jul 1" },
	],
	fuel: [
		{ note: "Shell fuel", amt: 180, who: "Omar", when: "Yesterday" },
		{ note: "ENOC", amt: 130, who: "Sara", when: "Jul 4" },
		{ note: "Careem to DIFC", amt: 45, who: "Sara", when: "Jul 3" },
		{ note: "Nol top-up", amt: 30, who: "Omar", when: "Jul 1" },
	],
	kids: [
		{ note: "Swim class", amt: 150, who: "Sara", when: "Jul 6" },
		{ note: "School supplies", amt: 230, who: "Omar", when: "Jul 4" },
		{ note: "Toy store", amt: 230, who: "Sara", when: "Jul 2" },
	],
	rent: [{ note: "July rent", amt: 6000, who: "Omar", when: "Jul 1" }],
	other: [
		{ note: "Pharmacy", amt: 85, who: "Sara", when: "Jul 4" },
		{ note: "Mall parking", amt: 90, who: "Sara", when: "Jul 5" },
		{ note: "Dry cleaning", amt: 65, who: "Omar", when: "Jul 2" },
	],
	maint: [
		{ note: "Plumber", amt: 450, who: "Omar", when: "3 days ago" },
		{ note: "AC service", amt: 1200, who: "Sara", when: "Jun 14" },
		{ note: "Handyman — shelves", amt: 350, who: "Omar", when: "May 30" },
		{ note: "Paint touch-up", amt: 2300, who: "Sara", when: "Apr 12" },
	],
	car: [
		{ note: "Minor service", amt: 1250, who: "Omar", when: "May 22" },
		{ note: "Tyre repair", amt: 600, who: "Omar", when: "Mar 8" },
	],
	gifts: [
		{ note: "Mum's birthday", amt: 800, who: "Sara", when: "Jun 2" },
		{ note: "Eid gifts", amt: 1300, who: "Sara", when: "Mar 30" },
	],
};

const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Resolves a prototype `when` label ("Today", "Yesterday", "3 days ago",
 * "Jul 5", ...) to an absolute ms timestamp, relative to `nowMs`. All
 * calendar dates ("Mon D") fall in the same UTC year as `nowMs`, matching
 * the prototype where every itemized date is in 2026.
 */
function resolveWhen(when: string, nowMs: number): number {
	if (when === "Today") {
		return nowMs;
	}
	if (when === "Yesterday") {
		return nowMs - DAY;
	}
	const agoMatch = /^(\d+) days ago$/.exec(when);
	if (agoMatch !== null) {
		return nowMs - Number(agoMatch[1]) * DAY;
	}
	const dateMatch = /^([A-Za-z]{3}) (\d{1,2})$/.exec(when);
	if (dateMatch !== null) {
		const monthIdx = MONTH_ABBR.indexOf(dateMatch[1]);
		if (monthIdx === -1) {
			throw new Error(`Unknown month abbreviation in "when": ${when}`);
		}
		const year = new Date(nowMs).getUTCFullYear();
		return Date.UTC(year, monthIdx, Number(dateMatch[2]));
	}
	throw new Error(`Unrecognized "when" label: ${when}`);
}

/** Mid-month timestamp `monthsAgo` months before `nowMs` (UTC-safe, rolls the year). */
function monthsAgoMid(nowMs: number, monthsAgo: number): number {
	const now = new Date(nowMs);
	return Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - monthsAgo, 15);
}

export const seedDemo = internalMutation({
	args: { nowMs: v.number() },
	handler: async (ctx, { nowMs }) => {
		// --- 1. Idempotency: wipe any prior "The Al-Marri Home" seed data ---
		const existingHouseholds = await ctx.db
			.query("households")
			.filter((q) => q.eq(q.field("name"), HOUSEHOLD_NAME))
			.collect();

		// Guarded delete — tolerates already-deleted ids so a re-run over a
		// partially-wiped deployment always completes (idempotent).
		const safeDelete = async (id: Parameters<typeof ctx.db.delete>[0]) => {
			if (await ctx.db.get(id)) {
				await ctx.db.delete(id);
			}
		};
		// Only the demo users this seed creates get removed on a reseed; a real
		// signed-in member's account is left intact (they simply re-join the new
		// MEADOW-01) so a reseed never nukes a tester's login.
		const SEED_EMAILS = new Set([
			"sara.almarri@gmail.com",
			"omar.almarri@gmail.com",
		]);

		for (const household of existingHouseholds) {
			const memberships = await ctx.db
				.query("memberships")
				.withIndex("by_household", (q) => q.eq("householdId", household._id))
				.collect();
			const categories = await ctx.db
				.query("categories")
				.withIndex("by_household", (q) => q.eq("householdId", household._id))
				.collect();
			const transactions = await ctx.db
				.query("transactions")
				.withIndex("by_household", (q) => q.eq("householdId", household._id))
				.collect();

			for (const txn of transactions) {
				await safeDelete(txn._id);
			}
			for (const category of categories) {
				await safeDelete(category._id);
			}
			for (const membership of memberships) {
				const settingsRows = await ctx.db
					.query("settings")
					.withIndex("by_user_household", (q) =>
						q.eq("userId", membership.userId).eq("householdId", household._id),
					)
					.collect();
				for (const settingsRow of settingsRows) {
					await safeDelete(settingsRow._id);
				}
				await safeDelete(membership._id);
				const user = await ctx.db.get(membership.userId);
				if (user && "email" in user && user.email && SEED_EMAILS.has(user.email)) {
					await safeDelete(membership.userId);
				}
			}
			await safeDelete(household._id);
		}

		// --- 2. Users, household, memberships, settings ---
		const saraId = await ctx.db.insert("users", {
			name: "Sara",
			email: "sara.almarri@gmail.com",
		});
		const omarId = await ctx.db.insert("users", {
			name: "Omar",
			email: "omar.almarri@gmail.com",
		});

		const householdId = await ctx.db.insert("households", {
			name: HOUSEHOLD_NAME,
			inviteCode: "MEADOW-01",
			currency: "AED",
			ownerId: saraId,
			createdAt: nowMs,
		});

		await ctx.db.insert("memberships", {
			householdId,
			userId: saraId,
			role: "owner",
			createdAt: nowMs,
		});
		await ctx.db.insert("memberships", {
			householdId,
			userId: omarId,
			role: "member",
			createdAt: nowMs,
		});

		await ctx.db.insert("settings", {
			userId: saraId,
			householdId,
			theme: "dark",
			layout: "cozy-cards",
			weeklyCheckin: true,
			overNudges: true,
			monthlyRecap: false,
			profileColor: "#D98BA4",
			displayName: "Sara",
		});
		await ctx.db.insert("settings", {
			userId: omarId,
			householdId,
			theme: "dark",
			layout: "cozy-cards",
			weeklyCheckin: true,
			overNudges: true,
			monthlyRecap: false,
			profileColor: "#8AA3C4",
			displayName: "Omar",
		});

		// --- 3. Categories ---
		const categoryIdByKey = new Map<string, Id<"categories">>();
		for (const category of CATEGORIES) {
			const categoryId = await ctx.db.insert("categories", {
				householdId,
				name: category.name,
				emoji: category.emoji,
				color: category.color,
				period: category.period,
				limit: category.limit,
				sortOrder: category.sortOrder,
				archived: false,
				createdBy: saraId,
				createdAt: nowMs,
			});
			categoryIdByKey.set(category.key, categoryId);
		}

		const userIdByPayer: Record<Payer, Id<"users">> = { Sara: saraId, Omar: omarId };

		// Alternates Sara/Omar for the synthetic "balancing" and "history"
		// transactions below, so no single payer dominates the demo data.
		let payerToggle: Payer = "Omar";
		function nextPayer(): Payer {
			payerToggle = payerToggle === "Sara" ? "Omar" : "Sara";
			return payerToggle;
		}

		async function insertTxn(
			categoryKey: string,
			amountMajor: number,
			note: string,
			payer: Payer,
			spentAt: number,
		) {
			const categoryId = categoryIdByKey.get(categoryKey);
			if (categoryId === undefined) {
				throw new Error(`Unknown category key: ${categoryKey}`);
			}
			await ctx.db.insert("transactions", {
				householdId,
				categoryId,
				amount: Math.round(amountMajor * 100),
				note,
				spentAt,
				payerName: payer,
				createdBy: userIdByPayer[payer],
				source: "manual",
				createdAt: nowMs,
			});
		}

		// --- 4. Itemized transactions (prototype TXNS, all in minor units) ---
		for (const [categoryKey, txns] of Object.entries(TXNS)) {
			for (const txn of txns) {
				await insertTxn(categoryKey, txn.amt, txn.note, txn.who, resolveWhen(txn.when, nowMs));
			}
		}

		// --- 5. Balancing + history transactions ---
		// The itemized TXNS above are dated within the current month (or,
		// for annual categories, spread across several months). To make
		// every screen add up to the prototype's numbers exactly, we insert
		// one synthetic "balancing" transaction per bucket that makes up the
		// difference between the itemized sum and the intended total. Most
		// buckets already sum exactly (diff 0, so nothing is added); only
		// Groceries needs a top-up for July, matching the prototype where
		// `spentOf()` adds an extra on-the-fly adjustment on top of the
		// itemized list.
		for (const category of CATEGORIES) {
			const itemized = TXNS[category.key] ?? [];
			const itemizedSum = itemized.reduce((sum, txn) => sum + txn.amt, 0);

			if (category.period === "monthly") {
				const julyTarget = MONTHS[0][category.key];
				const diff = julyTarget - itemizedSum;
				if (diff !== 0) {
					await insertTxn(category.key, diff, "Balancing adjustment", nextPayer(), nowMs);
				}
				// History: one lump-sum transaction per preceding month so the
				// History tab totals match MONTHS[1..4] exactly.
				for (let i = 1; i < MONTHS.length; i++) {
					const monthTotal = MONTHS[i][category.key];
					if (monthTotal > 0) {
						await insertTxn(
							category.key,
							monthTotal,
							`${MONTH_SHORT[i]} ${category.name.toLowerCase()} (recap)`,
							nextPayer(),
							monthsAgoMid(nowMs, i),
						);
					}
				}
			} else {
				const ytdTarget = YTD[category.key];
				const diff = ytdTarget - itemizedSum;
				if (diff !== 0) {
					await insertTxn(category.key, diff, "Balancing adjustment", nextPayer(), nowMs);
				}
			}
		}

		return householdId;
	},
});
