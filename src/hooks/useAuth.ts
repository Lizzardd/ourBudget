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
			await signIn('google');
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
