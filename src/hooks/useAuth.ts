import { useAuthActions } from '@convex-dev/auth/react';
import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

// Dismisses the in-app browser if an auth redirect completed while the app
// was backgrounded. No-op on web / when there's nothing to complete.
WebBrowser.maybeCompleteAuthSession();

/**
 * Auth actions for the app.
 *
 * `signInWithGoogle` handles the platform difference in the OAuth flow:
 * - **Web:** Convex Auth redirects the page to Google directly.
 * - **Native:** there is no page redirect, so we drive it manually — ask
 *   Convex for the provider URL (`signIn('google', { redirectTo })` →
 *   `{ redirect }`), open it in an in-app browser bound to the app's deep
 *   link scheme, then exchange the returned `code`
 *   (`signIn('google', { code })`) to finish signing in.
 */
export function useAuth() {
	const { signIn, signOut } = useAuthActions();

	async function signInWithGoogle() {
		if (Platform.OS === 'web') {
			// Send the browser back to THIS origin after OAuth. With no explicit
			// redirectTo, Convex Auth falls back to the deployment's SITE_URL — which
			// on the prod backend is https://ourbudget.app — so a local dev server
			// (`pnpm web`, pointed at prod) gets bounced there after sign-in and the
			// `?code=` is never exchanged. Passing the current origin keeps the flow
			// on localhost. The server must allow this origin (see convex/auth.ts's
			// redirect callback); on the real web app the origin IS SITE_URL, so this
			// is a no-op there.
			await signIn('google', { redirectTo: window.location.origin });
			return;
		}

		const redirectTo = makeRedirectUri();
		const { redirect } = await signIn('google', { redirectTo });
		if (!redirect) {
			throw new Error('Google sign-in did not return a redirect URL.');
		}

		const result = await WebBrowser.openAuthSessionAsync(redirect.toString(), redirectTo);
		if (result.type !== 'success' || !result.url) {
			// User cancelled or the browser was dismissed — nothing to do.
			return;
		}

		const code = new URL(result.url).searchParams.get('code');
		if (!code) {
			throw new Error('Google sign-in did not return an authorization code.');
		}
		await signIn('google', { code });
	}

	return { signIn, signInWithGoogle, signOut };
}
