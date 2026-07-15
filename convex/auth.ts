import Google from "@auth/core/providers/google";
import { convexAuth } from "@convex-dev/auth/server";

// After OAuth, the native app returns to this deep-link scheme (see app.json
// `scheme`). Convex Auth's default redirect check only allows URLs under
// SITE_URL, which would reject the native redirect — so we widen it below to
// also permit the app scheme.
const APP_SCHEME = "ourbudget://";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
	providers: [
		Google({
			clientId: process.env.AUTH_GOOGLE_ID,
			clientSecret: process.env.AUTH_GOOGLE_SECRET,
		}),
	],
	callbacks: {
		// Validate where users may be redirected back to after sign-in.
		async redirect({ redirectTo }) {
			// Native deep link (Expo standalone build) — the mobile OAuth flow.
			if (redirectTo.startsWith(APP_SCHEME)) {
				return redirectTo;
			}
			// Local web dev against this deployment: allow a localhost origin so
			// `pnpm web` (pointed at prod) lands back on the dev server after OAuth
			// instead of SITE_URL. Low risk — localhost is the developer's own
			// machine, not an attacker-controllable external domain, and a valid
			// session is still required to reach anything.
			if (/^https?:\/\/localhost(?::\d+)?(?:[/?]|$)/.test(redirectTo)) {
				return redirectTo;
			}
			const siteUrl = (process.env.SITE_URL ?? "").replace(/\/$/, "");
			// Relative paths resolve against the web app.
			if (redirectTo.startsWith("/") || redirectTo.startsWith("?")) {
				return `${siteUrl}${redirectTo}`;
			}
			// Absolute web URLs must stay within SITE_URL.
			if (siteUrl && redirectTo.startsWith(siteUrl)) {
				return redirectTo;
			}
			throw new Error(`Invalid redirectTo: ${redirectTo}`);
		},
	},
});
