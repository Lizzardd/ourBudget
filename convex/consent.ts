import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Current privacy policy / terms version. Mirrors `POLICY_VERSION` in
 * `src/lib/policy.ts` — Convex functions can't cleanly import from outside
 * `convex/`, so the value is duplicated here. Keep both in sync when the
 * policy changes.
 */
export const POLICY_VERSION = "2026-07-09";

/**
 * Records that the authenticated caller consented to a given policy
 * version, right now. Each call inserts a new row rather than upserting,
 * so `consents` is a full audit trail of every consent event (re-consent
 * on policy bumps included).
 */
export const recordConsent = mutation({
	args: {
		policyVersion: v.string(),
	},
	handler: async (ctx, args) => {
		const userId = await getAuthUserId(ctx);
		if (userId === null) {
			throw new Error("Not authenticated");
		}

		await ctx.db.insert("consents", {
			userId,
			policyVersion: args.policyVersion,
			consentAt: Date.now(),
		});
	},
});

/**
 * Returns the authenticated caller's most recent consent row, or `null`
 * if they have never consented. Used by the onboarding gate to decide
 * whether to show the consent screen.
 */
export const myConsent = query({
	args: {},
	handler: async (ctx) => {
		const userId = await getAuthUserId(ctx);
		if (userId === null) {
			throw new Error("Not authenticated");
		}

		// Order by `_creationTime` (monotonic) rather than `consentAt`
		// (wall-clock `Date.now()`, which can tie across calls in the same
		// millisecond) so "most recent" is unambiguous.
		const latest = await ctx.db
			.query("consents")
			.withIndex("by_user", (q) => q.eq("userId", userId))
			.order("desc")
			.first();

		return latest;
	},
});
