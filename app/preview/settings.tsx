import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Toggle } from '../../src/components/Toggle';
import { hexToRgba } from '../../src/lib/color';
import { fontFamily } from '../../src/theme/fonts';
import { GLYPH } from '../../src/theme/tokens';
import { useTheme } from '../../src/theme/useTheme';
import type { Currency } from '../../src/hooks/types';

/**
 * Headless preview route for the Settings tab's PRESENTATION — mirrors
 * `app/(app)/settings.tsx` with hardcoded mock data matching the design
 * prototype's "─── SETTINGS TAB ───". Deliberately does NOT touch Convex or
 * auth (no `useSettings` / `useHousehold` / `useAuth`), so it can be
 * rendered headlessly (e.g. via Playwright) without a signed-in session.
 * Not linked from any in-app nav; reachable only by navigating directly to
 * `/preview/settings`.
 */

const CURRENCY_OPTS: Currency[] = ['AED', 'USD', 'GBP', 'EUR', 'ZAR'];

const LAYOUT_OPTS: Array<{ id: 'cozy-cards' | 'grid' | 'compact'; label: string }> = [
	{ id: 'cozy-cards', label: 'Cozy cards' },
	{ id: 'grid', label: 'Grid' },
	{ id: 'compact', label: 'Compact' },
];

const NOTIF_ROWS = [
	{
		key: 'weeklyCheckin' as const,
		title: 'Weekly check-in',
		sub: 'Monday mornings at 8:00',
	},
	{
		key: 'overNudges' as const,
		title: 'Over-budget nudges',
		sub: 'A gentle heads-up when a category tips over',
	},
	{
		key: 'monthlyRecap' as const,
		title: 'Monthly recap email',
		sub: 'A summary on the 1st of each month',
	},
];

export default function SettingsPreview() {
	const { mode, t, accent, toggle } = useTheme();
	const [currency, setCurrency] = useState<Currency>('AED');
	const [layout, setLayout] = useState<'cozy-cards' | 'grid' | 'compact'>('cozy-cards');
	const [notifs, setNotifs] = useState({ weeklyCheckin: true, overNudges: true, monthlyRecap: false });

	const isDark = mode === 'dark';
	const themeLabel = isDark ? 'Cozy dark mode 🌙' : 'Warm light mode ☀️';

	return (
		<ScrollView
			style={[styles.container, { backgroundColor: t.bg }]}
			contentContainerStyle={styles.content}
		>
			<View style={styles.header}>
				<Text style={[styles.title, { color: t.text, fontFamily: fontFamily(800) }]}>
					Settings
				</Text>
				<Text style={[styles.headerSub, { color: t.sub }]}>The Al-Marri Home</Text>
			</View>

			<Pressable
				accessibilityRole="button"
				style={[styles.card, { backgroundColor: t.card }]}
			>
				<Text style={[styles.sectionLabel, { color: t.sub, fontFamily: fontFamily(700) }]}>
					PROFILE
				</Text>
				<View style={styles.profileRow}>
					<Text style={[styles.rowTitle, { flex: 1, color: t.text, fontFamily: fontFamily(700) }]}>
						Sara
					</Text>
					<Text style={[styles.rowHint, { color: t.sub }]}>edit ›</Text>
				</View>
			</Pressable>

			<Pressable
				onPress={toggle}
				accessibilityRole="button"
				style={[styles.card, styles.rowCard, { backgroundColor: t.card }]}
			>
				<View style={styles.rowText}>
					<Text style={[styles.rowTitle, { color: t.text, fontFamily: fontFamily(700) }]}>
						{themeLabel}
					</Text>
					<Text style={[styles.rowSub, { color: t.sub }]}>Tap to switch</Text>
				</View>
				<Toggle value={isDark} onValueChange={toggle} />
			</Pressable>

			<View style={[styles.card, { backgroundColor: t.card }]}>
				<Text style={[styles.rowTitle, { color: t.text, fontFamily: fontFamily(700) }]}>
					Currency
				</Text>
				<Text style={[styles.rowSub, { color: t.sub }]}>
					Shown on every amount, for everyone
				</Text>
				<View style={styles.pickerWrap}>
					{CURRENCY_OPTS.map((c) => {
						const selected = c === currency;
						return (
							<Pressable
								key={c}
								onPress={() => setCurrency(c)}
								accessibilityRole="button"
								accessibilityState={{ selected }}
								style={[
									styles.currencyOpt,
									{
										borderColor: selected ? accent : t.line,
										backgroundColor: selected ? hexToRgba(accent, 0.18) : 'transparent',
									},
								]}
							>
								<Text
									style={[
										styles.currencyLabel,
										{ color: selected ? accent : t.text, fontFamily: fontFamily(800) },
									]}
								>
									{GLYPH[c]} {c}
								</Text>
							</Pressable>
						);
					})}
				</View>
			</View>

			<View style={[styles.card, { backgroundColor: t.card }]}>
				<Text style={[styles.rowTitle, { color: t.text, fontFamily: fontFamily(700) }]}>
					Dashboard layout
				</Text>
				<Text style={[styles.rowSub, { color: t.sub }]}>
					How your categories are shown on Home
				</Text>
				<View style={[styles.layoutWrap, { backgroundColor: t.el }]}>
					{LAYOUT_OPTS.map((o) => {
						const selected = o.id === layout;
						return (
							<Pressable
								key={o.id}
								onPress={() => setLayout(o.id)}
								accessibilityRole="button"
								accessibilityState={{ selected }}
								style={[
									styles.layoutOpt,
									{ backgroundColor: selected ? accent : 'transparent' },
								]}
							>
								<Text
									style={[
										styles.layoutLabel,
										{ color: selected ? '#2B0E1A' : t.sub, fontFamily: fontFamily(800) },
									]}
								>
									{o.label}
								</Text>
							</Pressable>
						);
					})}
				</View>
			</View>

			<View style={[styles.card, { backgroundColor: t.card }]}>
				<Text style={[styles.sectionLabel, { color: t.sub, fontFamily: fontFamily(700) }]}>
					NOTIFICATIONS
				</Text>
				<View style={styles.notifList}>
					{NOTIF_ROWS.map((row, i) => (
						<View
							key={row.key}
							style={[
								styles.notifRow,
								i < NOTIF_ROWS.length - 1 ? { borderBottomColor: t.line, borderBottomWidth: 1 } : null,
							]}
						>
							<View style={styles.rowText}>
								<Text style={[styles.rowTitle, { color: t.text, fontFamily: fontFamily(700) }]}>
									{row.title}
								</Text>
								<Text style={[styles.rowSub, { color: t.sub }]}>{row.sub}</Text>
							</View>
							<Toggle
								value={notifs[row.key]}
								onValueChange={(next) => setNotifs((prev) => ({ ...prev, [row.key]: next }))}
							/>
						</View>
					))}
				</View>
			</View>

			<View style={[styles.card, { backgroundColor: t.card }]}>
				<Text style={[styles.sectionLabel, { color: t.sub, fontFamily: fontFamily(700) }]}>
					PRIVACY & DATA
				</Text>
				<Pressable accessibilityRole="button" style={[styles.rowCard, styles.exportRow]}>
					<View style={styles.rowText}>
						<Text style={[styles.rowTitle, { color: t.text, fontFamily: fontFamily(700) }]}>
							Download my data
						</Text>
						<Text style={[styles.rowSub, { color: t.sub }]}>
							Export everything tied to your account as JSON
						</Text>
					</View>
					<Text style={[styles.rowHint, { color: t.sub }]}>⭳</Text>
				</Pressable>

				<Pressable accessibilityRole="button" style={[styles.rowCard, styles.exportRow]}>
					<View style={styles.rowText}>
						<Text style={[styles.rowTitle, { color: '#D14343', fontFamily: fontFamily(700) }]}>
							Delete account
						</Text>
						<Text style={[styles.rowSub, { color: t.sub }]}>
							Permanently erase your account and personal data
						</Text>
					</View>
					<Text style={[styles.rowHint, { color: '#D14343' }]}>›</Text>
				</Pressable>
			</View>

			<Pressable accessibilityRole="button" style={styles.signOut}>
				<Text style={[styles.signOutLabel, { color: t.sub, fontFamily: fontFamily(700) }]}>
					Sign out
				</Text>
			</Pressable>
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	content: {
		padding: 18,
		paddingTop: 12,
		paddingBottom: 150,
	},
	header: {
		padding: 8,
		paddingBottom: 16,
	},
	title: {
		fontSize: 22,
		letterSpacing: -0.4,
	},
	headerSub: {
		fontSize: 13,
		marginTop: 1,
	},
	card: {
		borderRadius: 24,
		padding: 20,
		marginTop: 12,
	},
	rowCard: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	sectionLabel: {
		fontSize: 13,
	},
	profileRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		marginTop: 14,
	},
	rowText: {
		flex: 1,
	},
	rowTitle: {
		fontSize: 15,
	},
	rowHint: {
		fontSize: 12,
	},
	rowSub: {
		fontSize: 12,
		marginTop: 2,
	},
	pickerWrap: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 7,
		marginTop: 14,
	},
	currencyOpt: {
		height: 38,
		paddingHorizontal: 16,
		borderRadius: 999,
		borderWidth: 1.5,
		alignItems: 'center',
		justifyContent: 'center',
	},
	currencyLabel: {
		fontSize: 13,
	},
	layoutWrap: {
		flexDirection: 'row',
		borderRadius: 15,
		padding: 4,
		gap: 4,
		marginTop: 14,
	},
	layoutOpt: {
		flex: 1,
		height: 40,
		borderRadius: 12,
		alignItems: 'center',
		justifyContent: 'center',
	},
	layoutLabel: {
		fontSize: 13,
	},
	notifList: {
		marginTop: 2,
	},
	exportRow: {
		marginTop: 14,
	},
	notifRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		paddingVertical: 14,
	},
	signOut: {
		width: '100%',
		height: 52,
		marginTop: 12,
		borderRadius: 999,
		alignItems: 'center',
		justifyContent: 'center',
	},
	signOutLabel: {
		fontSize: 14,
	},
});
