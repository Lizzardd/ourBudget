import { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useConvex } from 'convex/react';

import { FadeIn } from '../../src/components/FadeIn';
import { Loading } from '../../src/components/Loading';
import { Toggle } from '../../src/components/Toggle';
import { DeleteAccountOverlay } from '../../src/features/DeleteAccountOverlay';
import { ManageHouseholdOverlay } from '../../src/features/ManageHouseholdOverlay';
import { useNewCategorySheet } from '../../src/features/NewCategoryProvider';
import { ProfileOverlay } from '../../src/features/ProfileOverlay';
import { useHousehold } from '../../src/hooks/useHousehold';
import { useHouseholdMembers } from '../../src/hooks/useHouseholdMembers';
import { useAuth } from '../../src/hooks/useAuth';
import { useSettings, useSetCurrency, useUpdateSettings } from '../../src/hooks/useSettings';
import type { Currency } from '../../src/hooks/types';
import { hexToRgba } from '../../src/lib/color';
import { useToast } from '../../src/lib/toast';
import { versionLabel } from '../../src/lib/version';
import { fontFamily } from '../../src/theme/fonts';
import { GLYPH } from '../../src/theme/tokens';
import { useTheme } from '../../src/theme/useTheme';
import { api } from '../../convex/_generated/api';

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

/**
 * Settings tab — appearance (theme + dashboard layout), household currency,
 * notification preferences, a profile entry point, and sign-out. Every
 * control here writes straight through to Convex via `useUpdateSettings` /
 * `useSetCurrency`, so changes are shared with the whole household and
 * reflected app-wide immediately (the theme flip additionally re-tokens the
 * app via `useTheme().toggle()`, which persists to local storage).
 */
export default function Settings() {
	const { mode, t, accent, toggle } = useTheme();
	const { householdId, currency } = useHousehold();
	const { members } = useHouseholdMembers();
	const { settings, loading } = useSettings();
	const updateSettings = useUpdateSettings();
	const setCurrency = useSetCurrency();
	const { signOut } = useAuth();
	const { open: openNewCategory } = useNewCategorySheet();
	const [profileOpen, setProfileOpen] = useState(false);
	const [manageOpen, setManageOpen] = useState(false);
	const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
	const [exporting, setExporting] = useState(false);
	const convex = useConvex();
	const { toast } = useToast();

	const isDark = mode === 'dark';
	const themeLabel = isDark ? 'Cozy dark mode 🌙' : 'Warm light mode ☀️';

	const patchSettings = (patch: Parameters<typeof updateSettings>[0]['patch']) => {
		if (!householdId) {
			return;
		}
		updateSettings({ householdId, patch }).catch(() => {
			toast("Couldn't save that change — try again");
		});
	};

	const handlePickCurrency = (next: Currency) => {
		if (!householdId || next === currency) {
			return;
		}
		setCurrency({ householdId, currency: next }).catch(() => {
			toast("Couldn't update the currency — try again");
		});
	};

	const handlePickLayout = (next: 'cozy-cards' | 'grid' | 'compact') => {
		if (!settings || next === settings.layout) {
			return;
		}
		patchSettings({ layout: next });
	};

	const onPressProfile = () => {
		setProfileOpen(true);
	};

	const onPressDeleteAccount = () => {
		setDeleteAccountOpen(true);
	};

	const handleExportData = async () => {
		if (exporting) {
			return;
		}
		setExporting(true);
		try {
			const bundle = await convex.query(api.account.exportMyData, {
				exportedAtMs: Date.now(),
			});
			const json = JSON.stringify(bundle, null, 2);

			if (Platform.OS === 'web') {
				const blob = new Blob([json], { type: 'application/json' });
				const url = URL.createObjectURL(blob);
				const anchor = document.createElement('a');
				anchor.href = url;
				anchor.download = `our-budget-export-${bundle.exportedAtMs}.json`;
				document.body.appendChild(anchor);
				anchor.click();
				anchor.remove();
				URL.revokeObjectURL(url);
				toast('Your data was downloaded');
			} else {
				await Share.share({ message: json });
				toast('Your data is ready to share');
			}
		} catch {
			toast('Could not export your data — try again');
		} finally {
			setExporting(false);
		}
	};

	if (loading || !settings) {
		return <Loading />;
	}

	return (
		<FadeIn style={styles.container}>
		<ScrollView
			style={[styles.container, { backgroundColor: t.bg }]}
			contentContainerStyle={styles.content}
		>
			<View style={styles.header}>
				<Text style={[styles.title, { color: t.text, fontFamily: fontFamily(800) }]}>
					Settings
				</Text>
			</View>

			<Pressable
				onPress={onPressProfile}
				accessibilityRole="button"
				style={[styles.card, { backgroundColor: t.card }]}
			>
				<Text style={[styles.sectionLabel, { color: t.sub, fontFamily: fontFamily(700) }]}>
					PROFILE
				</Text>
				<View style={styles.profileRow}>
					<Text style={[styles.rowTitle, { color: t.text, fontFamily: fontFamily(700) }]}>
						{settings.displayName || 'You'}
					</Text>
					<Text style={[styles.rowHint, { color: t.sub }]}>edit ›</Text>
				</View>
			</Pressable>

			<ProfileOverlay open={profileOpen} onClose={() => setProfileOpen(false)} />

			{householdId ? (
				<View style={[styles.card, { backgroundColor: t.card }]}>
					<View style={styles.membersHeader}>
						<Text style={[styles.sectionLabel, styles.rowText, { color: t.sub, fontFamily: fontFamily(700) }]}>
							MEMBERS
						</Text>
						<Pressable
							onPress={() => setManageOpen(true)}
							accessibilityRole="button"
							style={[styles.manageBtn, { backgroundColor: t.el }]}
						>
							<Text style={[styles.manageLabel, { color: t.text, fontFamily: fontFamily(800) }]}>
								Manage
							</Text>
						</Pressable>
					</View>
					<View style={styles.membersList}>
						{(members ?? []).map((m) => (
							<View key={m.userId} style={styles.memberRow}>
								<View style={[styles.memberAvatar, { backgroundColor: m.profileColor }]}>
									<Text style={[styles.memberInitial, { fontFamily: fontFamily(800) }]}>
										{m.initial}
									</Text>
								</View>
								<Text style={[styles.rowTitle, styles.rowText, { color: t.text, fontFamily: fontFamily(700) }]}>
									{m.displayName}
								</Text>
								<Text style={[styles.rowHint, { color: m.isMe ? accent : t.sub }]}>
									{m.isMe ? 'You' : m.role === 'owner' ? 'Owner' : 'Member'}
								</Text>
							</View>
						))}
					</View>
				</View>
			) : null}

			<ManageHouseholdOverlay open={manageOpen} onClose={() => setManageOpen(false)} />

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
								onPress={() => handlePickCurrency(c)}
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
						const selected = o.id === settings.layout;
						return (
							<Pressable
								key={o.id}
								onPress={() => handlePickLayout(o.id)}
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

			<Pressable
				onPress={openNewCategory}
				accessibilityRole="button"
				style={[styles.card, styles.rowCard, { backgroundColor: t.card }]}
			>
				<View style={styles.rowText}>
					<Text style={[styles.rowTitle, { color: t.text, fontFamily: fontFamily(700) }]}>
						New category
					</Text>
					<Text style={[styles.rowSub, { color: t.sub }]}>Add a budget category</Text>
				</View>
				<Text style={[styles.rowHint, { color: t.sub }]}>+</Text>
			</Pressable>

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
								<Text
									style={[styles.rowTitle, { color: t.text, fontFamily: fontFamily(700) }]}
								>
									{row.title}
								</Text>
								<Text style={[styles.rowSub, { color: t.sub }]}>{row.sub}</Text>
							</View>
							<Toggle
								value={settings[row.key]}
								onValueChange={(next) => patchSettings({ [row.key]: next })}
							/>
						</View>
					))}
				</View>
			</View>

			<View style={[styles.card, { backgroundColor: t.card }]}>
				<Text style={[styles.sectionLabel, { color: t.sub, fontFamily: fontFamily(700) }]}>
					PRIVACY & DATA
				</Text>
				<Pressable
					onPress={handleExportData}
					disabled={exporting}
					accessibilityRole="button"
					style={[styles.rowCard, styles.exportRow]}
				>
					<View style={styles.rowText}>
						<Text style={[styles.rowTitle, { color: t.text, fontFamily: fontFamily(700) }]}>
							Download my data
						</Text>
						<Text style={[styles.rowSub, { color: t.sub }]}>
							Export everything tied to your account as JSON
						</Text>
					</View>
					{exporting ? (
						<ActivityIndicator color={t.sub} />
					) : (
						<Text style={[styles.rowHint, { color: t.sub }]}>⭳</Text>
					)}
				</Pressable>

				<Pressable
					onPress={onPressDeleteAccount}
					accessibilityRole="button"
					style={[styles.rowCard, styles.exportRow]}
				>
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

			<DeleteAccountOverlay open={deleteAccountOpen} onClose={() => setDeleteAccountOpen(false)} />

			<Pressable
				onPress={() => signOut()}
				accessibilityRole="button"
				style={styles.signOut}
			>
				<Text style={[styles.signOutLabel, { color: t.sub, fontFamily: fontFamily(700) }]}>
					Sign out
				</Text>
			</Pressable>
			<Text style={[styles.version, { color: t.sub }]}>ourbudget. · {versionLabel()}</Text>
		</ScrollView>
		</FadeIn>
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
	membersHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	manageBtn: {
		height: 34,
		paddingHorizontal: 14,
		borderRadius: 999,
		alignItems: 'center',
		justifyContent: 'center',
	},
	manageLabel: {
		fontSize: 12,
	},
	membersList: {
		marginTop: 2,
	},
	memberRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		paddingTop: 14,
	},
	memberAvatar: {
		width: 40,
		height: 40,
		borderRadius: 20,
		alignItems: 'center',
		justifyContent: 'center',
	},
	memberInitial: {
		fontSize: 15,
		color: '#3A1220',
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
	version: {
		textAlign: 'center',
		fontSize: 11,
		opacity: 0.7,
		marginTop: 8,
	},
});
