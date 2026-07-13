import * as Updates from 'expo-updates';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

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
	const [logs, setLogs] = useState<string[] | null>(null);

	/**
	 * The native update logs are the only place a launch failure is recorded.
	 * When a downloaded bundle crashes on startup, expo-updates rolls back to
	 * the embedded one before any JS of ours runs — so nothing in the React
	 * tree ever sees the error. These entries are what say why.
	 */
	const loadLogs = async () => {
		try {
			const entries = await Updates.readLogEntriesAsync(3600_000);
			setLogs(
				entries.length === 0
					? ['(no update log entries in the last hour)']
					: entries.slice(-12).map((e) => `${e.code ?? 'log'}: ${e.message}`)
			);
		} catch (err) {
			setLogs([`could not read logs: ${err instanceof Error ? err.message : String(err)}`]);
		}
	};

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

			<Pressable onPress={loadLogs} accessibilityRole="button" style={styles.logsBtn}>
				<Text style={[styles.logsBtnLabel, { color: accent }]}>Show update logs ›</Text>
			</Pressable>
			{logs?.map((line, i) => (
				<Text key={i} style={[styles.log, { color: t.sub }]} selectable>
					{line}
				</Text>
			))}
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
	logsBtn: {
		paddingTop: 12,
	},
	logsBtnLabel: {
		fontSize: 12,
		fontWeight: '800',
	},
	log: {
		fontSize: 10,
		lineHeight: 14,
		marginTop: 6,
	},
});
