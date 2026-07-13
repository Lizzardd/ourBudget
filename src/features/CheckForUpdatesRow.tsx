import * as Updates from 'expo-updates';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { useToast } from '../lib/toast';
import { fontFamily } from '../theme/fonts';
import { useTheme } from '../theme/useTheme';

/**
 * Manual "check for updates" — the on-demand counterpart to the launch-time
 * check in `useOtaUpdates`.
 *
 * That automatic check only runs once, at startup, so an update published
 * while the app is open stays invisible until the next cold start. Being able
 * to ask for it directly removes that wait entirely, and makes the state
 * observable instead of something you have to infer from a restart.
 *
 * Downloading only stages the update; applying it is left to the user via
 * `UpdateBanner`, which appears once something is pending. Nothing here ever
 * calls `reloadAsync` — an automatic reload can loop if the staged bundle
 * fails to launch.
 */
export function CheckForUpdatesRow() {
	const { t, accent } = useTheme();
	const { toast } = useToast();
	const [busy, setBusy] = useState(false);

	const check = async () => {
		if (busy) {
			return;
		}
		if (!Updates.isEnabled) {
			toast('Updates are not available in this build');
			return;
		}
		setBusy(true);
		try {
			const result = await Updates.checkForUpdateAsync();
			if (!result.isAvailable) {
				toast("You're on the latest version");
				return;
			}
			toast('Downloading update…');
			await Updates.fetchUpdateAsync();
			// Staged: UpdateBanner picks this up and offers the restart.
			toast('Update ready — restart to apply');
		} catch (err) {
			toast(err instanceof Error ? err.message : 'Could not check for updates');
		} finally {
			setBusy(false);
		}
	};

	return (
		<Pressable
			onPress={check}
			disabled={busy}
			accessibilityRole="button"
			accessibilityLabel="Check for updates"
			accessibilityState={{ disabled: busy }}
			style={[styles.row, { opacity: busy ? 0.6 : 1 }]}
		>
			<View style={styles.copy}>
				<Text style={[styles.title, { color: t.text, fontFamily: fontFamily(700) }]}>
					Check for updates
				</Text>
				<Text style={[styles.sub, { color: t.sub }]}>
					{busy ? 'Checking…' : 'Fetch the latest version of the app'}
				</Text>
			</View>
			{busy ? (
				<ActivityIndicator size="small" color={accent} />
			) : (
				<Text style={[styles.hint, { color: t.sub }]}>↻</Text>
			)}
		</Pressable>
	);
}

const styles = StyleSheet.create({
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		paddingVertical: 14,
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
	hint: {
		fontSize: 20,
	},
});
