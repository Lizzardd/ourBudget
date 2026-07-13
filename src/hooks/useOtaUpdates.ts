import { useEffect } from 'react';
import * as Updates from 'expo-updates';

/**
 * Applies a pending EAS Update at launch.
 *
 * expo-updates' automatic behaviour only downloads in the background and
 * defers activation to the *next* launch — so a user who closes the app
 * before the download finishes never gets the update, and even a completed
 * download needs a second cold start. That is too fragile to rely on.
 *
 * Instead we drive the lifecycle explicitly: check, fetch, and reload into
 * the new bundle within this launch. Reloading is only ever done at startup
 * (never mid-session), so nothing the user is doing gets thrown away.
 *
 * No-ops in development and wherever updates are disabled (Expo Go), and
 * swallows failures — an unreachable update server must never stop the app
 * from starting on the bundle it already has.
 */
export function useOtaUpdates(): void {
	useEffect(() => {
		if (__DEV__ || !Updates.isEnabled) {
			return;
		}
		let cancelled = false;
		void (async () => {
			try {
				const check = await Updates.checkForUpdateAsync();
				if (cancelled || !check.isAvailable) {
					return;
				}
				await Updates.fetchUpdateAsync();
				if (cancelled) {
					return;
				}
				await Updates.reloadAsync();
			} catch {
				// Offline, or the update server is unreachable: keep running the
				// bundle we already have.
			}
		})();
		return () => {
			cancelled = true;
		};
	}, []);
}
