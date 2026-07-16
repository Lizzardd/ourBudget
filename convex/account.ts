import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { deleteHouseholdCascade } from "./households";

/**
 * Accounts allowed to see the developer-only OTA diagnostics panel in Settings.
 *
 * The gate is `isDeveloper` below, which checks the VERIFIED email on the auth
 * identity server-side — a normal client cannot spoof its way in, and the panel
 * renders only when this query returns true (not merely client-side hiding).
 * Note the honest limit: the panel's *code* still ships in every bundle; what's
 * gated is whether it renders and pulls data. Add real developer emails here.
 */
const DEVELOPER_EMAILS = ["danielkrause.sa@gmail.com"];

export const isDeveloper = query({
	args: {},
	returns: v.boolean(),
	handler: async (ctx) => {
		const userId = await getAuthUserId(ctx);
		if (userId === null) {
			return false;
		}
		const user = await ctx.db.get(userId);
		const email = user?.email?.toLowerCase();
		return email ? DEVELOPER_EMAILS.includes(email) : false;
	},
});

/**
 * The caller's Google account photo URL (captured at sign-in as `user.image`),
 * or null if none. The Profile overlay's "Use Google photo" reads this and
 * stores it as the member's avatar (`settings.photoUrl`).
 */
export const myGooglePhoto = query({
	args: {},
	returns: v.union(v.string(), v.null()),
	handler: async (ctx) => {
		const userId = await getAuthUserId(ctx);
		if (userId === null) {
			return null;
		}
		const user = await ctx.db.get(userId);
		return user?.image ?? null;
	},
});

/**
 * GDPR data-portability export. Returns every record the caller "owns" or
 * personally participates in:
 *  - their own `users` row
 *  - their `memberships` rows
 *  - their `settings` rows (one per household)
 *  - their `consents` rows (the full audit trail of policy consents they
 *    have given)
 *  - for each household they belong to: the household itself, its
 *    categories, and its transactions (the shared household data they
 *    participate in — payer display names are already visible in-app, and
 *    no other member's auth/user record is included).
 *
 * `exportedAtMs` is passed in by the caller (client-supplied timestamp) so
 * the query stays pure/deterministic; it is not read from `Date.now()`.
 */
export const exportMyData = query({
	args: {
		exportedAtMs: v.number(),
	},
	handler: async (ctx, args) => {
		const userId = await getAuthUserId(ctx);
		if (userId === null) {
			throw new Error("Not authenticated");
		}

		const user = await ctx.db.get(userId);

		const memberships = await ctx.db
			.query("memberships")
			.withIndex("by_user", (q) => q.eq("userId", userId))
			.collect();

		const settings = await ctx.db
			.query("settings")
			.withIndex("by_user_household", (q) => q.eq("userId", userId))
			.collect();

		const consents = await ctx.db
			.query("consents")
			.withIndex("by_user", (q) => q.eq("userId", userId))
			.collect();

		const households = await Promise.all(
			memberships.map(async (membership) => {
				const household = await ctx.db.get(membership.householdId);
				const categories = await ctx.db
					.query("categories")
					.withIndex("by_household", (q) => q.eq("householdId", membership.householdId))
					.collect();
				const transactions = await ctx.db
					.query("transactions")
					.withIndex("by_household", (q) => q.eq("householdId", membership.householdId))
					.collect();
				return { household, categories, transactions };
			}),
		);

		return {
			exportedAtMs: args.exportedAtMs,
			user,
			memberships,
			settings,
			consents,
			households: households.filter(
				(h): h is { household: NonNullable<typeof h.household>; categories: typeof h.categories; transactions: typeof h.transactions } =>
					h.household !== null,
			),
		};
	},
});

/**
 * GDPR erasure ("right to be forgotten"). Authorizes the caller, then:
 *
 *  1. For each household the caller belongs to: if the caller is the SOLE
 *     member, the whole household is a cascade delete via the shared
 *     `households:deleteHouseholdCascade` — its `categories`,
 *     `transactions`, `settings` (every member's, not just the caller's:
 *     rows left behind by members who departed earlier would otherwise
 *     outlive the household) and `memberships` are removed along with it,
 *     since nothing else references them. If OTHER members remain, only
 *     the caller's own
 *     `memberships` row is removed; the shared `categories` and
 *     `transactions` stay, but their `createdBy` link back to this caller
 *     is cleared (set to `undefined`) so no erased-account foreign key is
 *     left dangling. `transactions.payerName` is a plain string (not a
 *     `users` foreign key), so it is already a tombstoned display label —
 *     it keeps working as "who paid" for the remaining members without
 *     linking back to the deleted account in any way.
 *  2. The caller's `settings` rows (one per household) and `consents` rows
 *     (the full policy-consent audit trail) are deleted.
 *  3. The caller's identity is fully erased: their `users` row and every
 *     row in the `@convex-dev/auth` tables that reference them —
 *     `authAccounts` (by `userIdAndProvider`) and each account's
 *     `authVerificationCodes` (by `accountId`); `authSessions` (by
 *     `userId`) and each session's `authRefreshTokens` (by `sessionId`)
 *     and `authVerifiers` (PKCE verifiers — this table only indexes
 *     `signature`, so it is filtered by the `sessionId` foreign key).
 *     `@convex-dev/auth` does not expose an official "delete this user"
 *     helper, so every table it defines that references a user, account,
 *     or session is erased explicitly here.
 *
 * Idempotent by construction rather than by an explicit "already deleted"
 * check: `getAuthUserId` only decodes the identity subject (it does not
 * look the session up in the database), so a second call with the same
 * caller identity resolves to the same user id, finds every collection
 * already empty / the user row already gone, and simply does nothing —
 * a safe no-op rather than a throw. The only throw is for a caller with
 * no identity at all (never authenticated in this request).
 */
export const deleteMyAccount = mutation({
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

		for (const membership of memberships) {
			const householdId = membership.householdId;
			const householdMembers = await ctx.db
				.query("memberships")
				.withIndex("by_household", (q) => q.eq("householdId", householdId))
				.collect();
			const isSoleMember = householdMembers.every((m) => m.userId === userId);

			if (isSoleMember) {
				// One definition of "delete a household" — the same cascade
				// `leaveHousehold` runs for the last member out. It takes the
				// household's `categories`, `transactions`, `settings` (every
				// member's, including any left behind by members who departed
				// earlier) and `memberships` — the caller's membership row
				// included, hence the `continue` instead of deleting it below.
				await deleteHouseholdCascade(ctx, householdId);
				continue;
			}

			// Shared household: the caller's own categories/transactions stay
			// (other members still use them), but the `createdBy` link back to
			// this now-erased account must be cleared so nothing dangling
			// remains. `payerName` is a plain-string tombstone already and is
			// left untouched.
			const ownCategories = await ctx.db
				.query("categories")
				.withIndex("by_household", (q) => q.eq("householdId", householdId))
				.filter((q) => q.eq(q.field("createdBy"), userId))
				.collect();
			for (const category of ownCategories) {
				await ctx.db.patch(category._id, { createdBy: undefined });
			}

			const ownTransactions = await ctx.db
				.query("transactions")
				.withIndex("by_household", (q) => q.eq("householdId", householdId))
				.filter((q) => q.eq(q.field("createdBy"), userId))
				.collect();
			for (const transaction of ownTransactions) {
				await ctx.db.patch(transaction._id, { createdBy: undefined });
			}

			await ctx.db.delete(membership._id);
		}

		const settingsRows = await ctx.db
			.query("settings")
			.withIndex("by_user_household", (q) => q.eq("userId", userId))
			.collect();
		for (const settingsRow of settingsRows) {
			await ctx.db.delete(settingsRow._id);
		}

		const consentRows = await ctx.db
			.query("consents")
			.withIndex("by_user", (q) => q.eq("userId", userId))
			.collect();
		for (const consentRow of consentRows) {
			await ctx.db.delete(consentRow._id);
		}

		const authAccountRows = await ctx.db
			.query("authAccounts")
			.withIndex("userIdAndProvider", (q) => q.eq("userId", userId))
			.collect();
		for (const authAccount of authAccountRows) {
			const verificationCodes = await ctx.db
				.query("authVerificationCodes")
				.withIndex("accountId", (q) => q.eq("accountId", authAccount._id))
				.collect();
			for (const verificationCode of verificationCodes) {
				await ctx.db.delete(verificationCode._id);
			}
			await ctx.db.delete(authAccount._id);
		}

		const authSessionRows = await ctx.db
			.query("authSessions")
			.withIndex("userId", (q) => q.eq("userId", userId))
			.collect();
		for (const authSession of authSessionRows) {
			const refreshTokens = await ctx.db
				.query("authRefreshTokens")
				.withIndex("sessionId", (q) => q.eq("sessionId", authSession._id))
				.collect();
			for (const refreshToken of refreshTokens) {
				await ctx.db.delete(refreshToken._id);
			}

			// `authVerifiers` (PKCE verifiers) only expose a `signature` index,
			// not `sessionId` — the auth library never queries them by session,
			// so there is no dedicated index to use here. Filter by the FK.
			const verifiers = await ctx.db
				.query("authVerifiers")
				.filter((q) => q.eq(q.field("sessionId"), authSession._id))
				.collect();
			for (const verifier of verifiers) {
				await ctx.db.delete(verifier._id);
			}

			await ctx.db.delete(authSession._id);
		}

		const user = await ctx.db.get(userId);
		if (user !== null) {
			await ctx.db.delete(userId);
		}

		return null;
	},
});
