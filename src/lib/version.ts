import Constants from 'expo-constants';
import * as Updates from 'expo-updates';

/**
 * Display version string for footers (login + settings).
 *
 * Shows the app version from `app.json` (e.g. "v1.0.0"), and — on a real
 * build running an EAS Update — a short OTA update id after it. The app
 * version does NOT change across over-the-air updates, so the update id is
 * what confirms a specific OTA push is the one actually running.
 */
export function versionLabel(): string {
	const version = Constants.expoConfig?.version ?? '0.0.0';
	const base = `Version ${version} (MVP)`;
	// The app version doesn't change across OTA updates, so append a short
	// update id on real builds running one — it's what confirms an OTA push.
	const updateId =
		!__DEV__ && Updates.updateId ? Updates.updateId.slice(0, 6) : null;
	return updateId ? `${base} · ${updateId}` : base;
}
