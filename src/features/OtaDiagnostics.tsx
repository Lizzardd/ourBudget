import * as Updates from 'expo-updates';
import { useState } from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';

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
	 * When a downloaded bundle fails to start, expo-updates falls back to the
	 * embedded one before any JS of ours runs — so nothing in the React tree
	 * ever sees why. These entries are what say why.
	 *
	 * Two kinds of noise dominate the log and bury the handful of lines that
	 * matter, so both are stripped:
	 *
	 * - `embeddedAssetFileMap` entries — one per bundled asset, no signal.
	 * - the `latestManifest` / `downloadedManifest` JSON that every state-change
	 *   entry carries. Each is tens of KB, and it is what made the whole log
	 *   167KB — far past what Android's share intent will accept, so sharing
	 *   simply failed. Each line is capped instead; the state name and any error
	 *   sit at the front, which is the part worth reading.
	 */
	const MAX_LINE = 300;
	const MAX_LINES = 60;

	/** The line that actually says why a bundle refused to launch. */
	const isFailure = (line: string) =>
		/error|exception|fail|fatal|rollback|ErrorRecovery/i.test(line);

	const toLines = (entries: Updates.UpdatesLogEntry[]): string[] =>
		entries
			.filter((e) => !e.message.startsWith('embeddedAssetFileMap'))
			.map((e) => {
				const line = `${e.code ?? 'log'}: ${e.message}`;
				return line.length > MAX_LINE ? `${line.slice(0, MAX_LINE)}…` : line;
			});

	const readLogs = async (): Promise<string[]> => {
		const lines = toLines(await Updates.readLogEntriesAsync(3600_000));
		if (lines.length === 0) {
			return ['(no useful update log entries in the last hour)'];
		}
		return lines.slice(-MAX_LINES);
	};

	/**
	 * What the on-screen viewer shows: the failure lines first.
	 *
	 * A launch failure is recorded once, early, and is then buried under dozens
	 * of state-change entries — so simply showing "the last N" reliably shows
	 * everything EXCEPT the one line worth reading. Hoisting the failures to the
	 * top means the answer is on screen without scrolling or sharing, which
	 * matters because sharing is exactly what breaks when the log is huge.
	 */
	const readLogsForScreen = async (): Promise<string[]> => {
		const lines = toLines(await Updates.readLogEntriesAsync(3600_000));
		if (lines.length === 0) {
			return ['(no useful update log entries in the last hour)'];
		}
		const failures = lines.filter(isFailure);
		if (failures.length === 0) {
			return ['(no failures logged)', ...lines.slice(-6)];
		}
		return [`⚠ ${failures.length} failure line(s):`, ...failures.slice(-6)];
	};

	const loadLogs = async () => {
		try {
			setLogs(await readLogsForScreen());
		} catch (err) {
			setLogs([`could not read logs: ${err instanceof Error ? err.message : String(err)}`]);
		}
	};

	/**
	 * Share the whole log as text. Screenshotting a log this long is unworkable
	 * — it wraps, truncates, and the one line that matters is never the one in
	 * frame — so hand it to the OS share sheet and let it go somewhere it can
	 * actually be read.
	 */
	const shareLogs = async () => {
		try {
			const lines = await readLogs();
			const header = [
				`enabled=${Updates.isEnabled}`,
				`channel=${Updates.channel ?? '—'}`,
				`runtime=${Updates.runtimeVersion ?? '—'}`,
				`running=${Updates.updateId ?? '—'}`,
				`embedded=${Updates.isEmbeddedLaunch}`,
				`available=${isUpdateAvailable} pending=${isUpdatePending}`,
				checkError ? `checkError=${checkError.message}` : '',
				downloadError ? `downloadError=${downloadError.message}` : '',
			]
				.filter(Boolean)
				.join('\n');
			await Share.share({ message: `OTA DIAGNOSTICS\n${header}\n\nLOGS\n${lines.join('\n')}` });
		} catch (err) {
			setLogs([`could not share logs: ${err instanceof Error ? err.message : String(err)}`]);
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

			<View style={styles.logsRow}>
				<Pressable onPress={loadLogs} accessibilityRole="button" style={styles.logsBtn}>
					<Text style={[styles.logsBtnLabel, { color: accent }]}>Show update logs ›</Text>
				</Pressable>
				<Pressable onPress={shareLogs} accessibilityRole="button" style={styles.logsBtn}>
					<Text style={[styles.logsBtnLabel, { color: accent }]}>Share logs ↗</Text>
				</Pressable>
			</View>
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
	logsRow: {
		flexDirection: 'row',
		gap: 16,
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
