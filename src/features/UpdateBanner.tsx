import * as Updates from 'expo-updates';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fontFamily } from '../theme/fonts';
import { useTheme } from '../theme/useTheme';

/**
 * Offers a downloaded update, and applies it only when the user says so.
 *
 * `useOtaUpdates` fetches new bundles but deliberately never reloads on its
 * own: reloading automatically whenever an update is staged means that if the
 * staged bundle fails to launch, it is still staged on the next boot, so the
 * app reloads again — an infinite restart loop that strands the user on the
 * splash screen.
 *
 * Reloading from an explicit tap cannot loop. Worst case the reload fails and
 * the user simply carries on with the bundle they already had. It is also
 * honest UX: nothing restarts under the user's hands mid-task.
 */
export function UpdateBanner() {
	const { t, accent } = useTheme();
	const insets = useSafeAreaInsets();
	const { isUpdatePending, isDownloading } = Updates.useUpdates();
	const [restarting, setRestarting] = useState(false);
	const [dismissed, setDismissed] = useState(false);

	// Only offer the restart once the bundle is fully downloaded AND staged.
	// Reloading into a half-downloaded update launches a bundle whose assets
	// are missing, which strands the app on the splash screen — so `Restart`
	// must never be reachable while the download is still in flight.
	const ready = isUpdatePending && !isDownloading;

	if (dismissed || (!ready && !isDownloading)) {
		return null;
	}

	if (isDownloading) {
		return (
			<View style={[styles.wrap, { bottom: insets.bottom + 90 }]} pointerEvents="box-none">
				<View style={[styles.banner, { backgroundColor: t.card }]}>
					<View style={styles.copy}>
						<Text style={[styles.title, { color: t.text, fontFamily: fontFamily(800) }]}>
							Downloading update…
						</Text>
						<Text style={[styles.sub, { color: t.sub }]}>Keep the app open until it finishes</Text>
					</View>
					<ActivityIndicator size="small" color={accent} />
				</View>
			</View>
		);
	}

	const restart = () => {
		if (restarting) {
			return;
		}
		setRestarting(true);
		// If this rejects, the app keeps running the current bundle — the banner
		// simply comes back on the next launch.
		Updates.reloadAsync().catch(() => {
			setRestarting(false);
		});
	};

	return (
		<View style={[styles.wrap, { bottom: insets.bottom + 90 }]} pointerEvents="box-none">
			<View style={[styles.banner, { backgroundColor: t.card }]}>
				<View style={styles.copy}>
					<Text style={[styles.title, { color: t.text, fontFamily: fontFamily(800) }]}>
						Update ready
					</Text>
					<Text style={[styles.sub, { color: t.sub }]}>Restart to get the latest version</Text>
				</View>
				<Pressable
					accessibilityRole="button"
					accessibilityLabel="Dismiss update"
					onPress={() => setDismissed(true)}
					style={[styles.later, { backgroundColor: t.el }]}
				>
					<Text style={[styles.laterLabel, { color: t.sub, fontFamily: fontFamily(700) }]}>
						Later
					</Text>
				</Pressable>
				<Pressable
					accessibilityRole="button"
					accessibilityLabel="Restart to update"
					disabled={restarting}
					onPress={restart}
					style={[styles.restart, { backgroundColor: accent, opacity: restarting ? 0.6 : 1 }]}
				>
					<Text style={[styles.restartLabel, { fontFamily: fontFamily(800) }]}>
						{restarting ? '…' : 'Restart'}
					</Text>
				</Pressable>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	wrap: {
		position: 'absolute',
		left: 0,
		right: 0,
		paddingHorizontal: 18,
		zIndex: 200,
		elevation: 200,
	},
	banner: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		borderRadius: 20,
		paddingVertical: 12,
		paddingHorizontal: 16,
	},
	copy: {
		flex: 1,
	},
	title: {
		fontSize: 15,
	},
	sub: {
		fontSize: 12,
		marginTop: 2,
	},
	later: {
		height: 38,
		paddingHorizontal: 14,
		borderRadius: 999,
		alignItems: 'center',
		justifyContent: 'center',
	},
	laterLabel: {
		fontSize: 13,
	},
	restart: {
		height: 38,
		paddingHorizontal: 16,
		borderRadius: 999,
		alignItems: 'center',
		justifyContent: 'center',
	},
	restartLabel: {
		fontSize: 13,
		color: '#2B0E1A',
	},
});
