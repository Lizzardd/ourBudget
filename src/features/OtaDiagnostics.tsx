import * as Updates from 'expo-updates';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../theme/useTheme';

const short = (value: string | null | undefined) =>
	value ? value.slice(0, 6) : '—';

/**
 * TEMPORARY: on-device readout of the EAS Update state.
 *
 * Published updates were matching the build's channel and runtime yet never
 * activating, and the failure was invisible because errors in the update
 * lifecycle surface nowhere in the UI. This renders the values that decide
 * whether an update is eligible (channel, runtime) alongside whatever the
 * check/download actually reported, so a stuck update can be diagnosed from
 * the phone instead of guessed at.
 *
 * Remove once OTA is confirmed working.
 */
export function OtaDiagnostics() {
	const { t, accent } = useTheme();
	const { isUpdateAvailable, isUpdatePending, isChecking, isDownloading, checkError, downloadError } =
		Updates.useUpdates();

	const rows: [string, string][] = [
		['enabled', String(Updates.isEnabled)],
		['channel', Updates.channel ?? '—'],
		['runtime', short(Updates.runtimeVersion)],
		['running', short(Updates.updateId)],
		['embedded', String(Updates.isEmbeddedLaunch)],
		['checking', String(isChecking)],
		['downloading', String(isDownloading)],
		['available', String(isUpdateAvailable)],
		['pending', String(isUpdatePending)],
	];

	return (
		<View style={[styles.card, { backgroundColor: t.card }]}>
			<Text style={[styles.title, { color: t.sub }]}>OTA DIAGNOSTICS</Text>
			{rows.map(([label, value]) => (
				<View key={label} style={styles.row}>
					<Text style={[styles.label, { color: t.sub }]}>{label}</Text>
					<Text style={[styles.value, { color: t.text }]}>{value}</Text>
				</View>
			))}
			{checkError ? (
				<Text style={[styles.error, { color: accent }]}>check: {checkError.message}</Text>
			) : null}
			{downloadError ? (
				<Text style={[styles.error, { color: accent }]}>download: {downloadError.message}</Text>
			) : null}
		</View>
	);
}

const styles = StyleSheet.create({
	card: {
		borderRadius: 24,
		padding: 20,
		marginTop: 12,
	},
	title: {
		fontSize: 11,
		fontWeight: '800',
		letterSpacing: 1,
		marginBottom: 8,
	},
	row: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		paddingVertical: 2,
	},
	label: {
		fontSize: 12,
	},
	value: {
		fontSize: 12,
		fontWeight: '700',
	},
	error: {
		fontSize: 11,
		marginTop: 8,
	},
});
