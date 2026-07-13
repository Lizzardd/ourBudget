import { useEffect, useState } from 'react';
import * as Updates from 'expo-updates';

/** What the launch-time update check did — surfaced in Settings. */
export interface OtaStatus {
	phase: 'idle' | 'checking' | 'none-available' | 'downloading' | 'downloaded' | 'error';
	/** Populated when the check or download threw, rather than being swallowed. */
	error: string | null;
}

/**
 * Downloads a newer EAS Update at launch, ready for the next start.
 *
 * Deliberately does NOT call `Updates.reloadAsync()`. Reloading as soon as an
 * update is pending looks appealing — the update lands a launch sooner — but
 * it is a trap: if the staged update does not become the running bundle (it is
 * older than the embedded one, or the launcher rejects it), `isUpdatePending`
 * is still true on the next boot, so it reloads again, and again. That is an
 * infinite restart loop which strands the app on the splash screen with no way
 * out but a reinstall. It is not worth saving one launch.
 *
 * So we only ever fetch. expo-updates activates a staged update on the next
 * cold start, which cannot loop: if it launches, we are on it; if it does not,
 * we simply keep running the current bundle.
 *
 * Failures are reported rather than swallowed — an unreachable update server
 * must not stop the app starting on the bundle it has, but discarding the
 * reason makes a stuck update impossible to diagnose.
 */
export function useOtaUpdates(): OtaStatus {
	const [status, setStatus] = useState<OtaStatus>({ phase: 'idle', error: null });

	useEffect(() => {
		if (__DEV__ || !Updates.isEnabled) {
			return;
		}
		let cancelled = false;
		void (async () => {
			try {
				setStatus({ phase: 'checking', error: null });
				const check = await Updates.checkForUpdateAsync();
				if (cancelled) {
					return;
				}
				if (!check.isAvailable) {
					setStatus({ phase: 'none-available', error: null });
					return;
				}
				setStatus({ phase: 'downloading', error: null });
				await Updates.fetchUpdateAsync();
				if (!cancelled) {
					// Staged. expo-updates will launch it on the next cold start.
					setStatus({ phase: 'downloaded', error: null });
				}
			} catch (err) {
				if (!cancelled) {
					setStatus({
						phase: 'error',
						error: `update: ${err instanceof Error ? err.message : String(err)}`,
					});
				}
			}
		})();
		return () => {
			cancelled = true;
		};
	}, []);

	return status;
}
