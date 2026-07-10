import { useAuthActions } from '@convex-dev/auth/react';

/**
 * Thin wrapper around Convex Auth's `useAuthActions`, giving the app a
 * single import for sign-in/sign-out actions.
 */
export function useAuth() {
	const { signIn, signOut } = useAuthActions();

	return { signIn, signOut };
}
