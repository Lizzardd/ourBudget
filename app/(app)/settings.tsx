import { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useConvex, useQuery } from 'convex/react';

import { Avatar } from '../../src/components/Avatar';
import { FadeIn } from '../../src/components/FadeIn';
import { Icon } from '../../src/components/Icon';
import { Loading } from '../../src/components/Loading';
import { Toggle } from '../../src/components/Toggle';
import { ManageHouseholdOverlay } from '../../src/features/ManageHouseholdOverlay';
import { ProfileOverlay } from '../../src/features/ProfileOverlay';
import { useHousehold } from '../../src/hooks/useHousehold';
import { useHouseholdMembers } from '../../src/hooks/useHouseholdMembers';
import { useAuth } from '../../src/hooks/useAuth';
import { useSettings, useSetCurrency, useUpdateSettings } from '../../src/hooks/useSettings';
import type { Currency } from '../../src/hooks/types';
import { hexToRgba } from '../../src/lib/color';
import { useToast } from '../../src/lib/toast';
import { CheckForUpdatesRow } from '../../src/features/CheckForUpdatesRow';
import { OtaDiagnostics } from '../../src/features/OtaDiagnostics';
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
	const { householdId, currency, name: householdName } = useHousehold();
	const { members } = useHouseholdMembers();
	const { settings, loading } = useSettings();
	const updateSettings = useUpdateSettings();
	const setCurrency = useSetCurrency();
	const { signOut } = useAuth();
	const [profileOpen, setProfileOpen] = useState(false);
	const [manageOpen, setManageOpen] = useState(false);
	const [confirmDelete, setConfirmDelete] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const [exporting, setExporting] = useState(false);
	const convex = useConvex();
	const { toast } = useToast();
	// Developer-only OTA diagnostics. Server-verified against the auth email —
	// undefined (loading) and false both render nothing, so a normal user never
	// sees the panel and there's no layout shift.
	const isDeveloper = useQuery(api.account.isDeveloper);

	const isDark = mode === 'dark';
	const themeLabel = isDark ? 'Cozy dark mode 🌙' : 'Warm light mode ☀️';

	// The prototype lists you first inside MEMBERS — your row doubles as the
	// Profile entry point ("You · edit ›"); everyone else shows their role.
	const memberRows = [...(members ?? [])].sort((a, b) => Number(b.isMe) - Number(a.isMe));

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

	/**
	 * Two-step, in-card account deletion (the prototype dropped the separate
	 * confirm screen): the row swaps in place for a confirm block, and only
	 * the explicit "Delete" press calls `account.deleteMyAccount`. Sign-out
	 * follows immediately — the root auth gate (`app/index.tsx`) then
	 * redirects to onboarding once `<Unauthenticated>` takes over.
	 */
	const handleDeleteAccount = async () => {
		if (deleting) {
			return;
		}
		setDeleting(true);
		try {
			await convex.mutation(api.account.deleteMyAccount, {});
			await signOut();
		} catch {
			setDeleting(false);
			toast('Could not delete your account — try again');
		}
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
				{householdName ? (
					<Text style={[styles.headerSub, { color: t.sub }]}>{householdName}</Text>
				) : null}
			</View>

			{householdId ? (
				<View style={[styles.card, { backgroundColor: t.card }]}>
					<View style={styles.membersHeader}>
						<Text style={[styles.sectionLabel, styles.rowText, { color: t.sub, fontFamily: fontFamily(700) }]}>
							MEMBERS
						</Text>
						<Pressable
							onPress={() => setManageOpen(true)}
							accessibilityRole="button"
							style={({ pressed }) => [pressed ? styles.pressed : null]}
						>
							<Text style={[styles.manageLabel, { color: accent, fontFamily: fontFamily(800) }]}>
								Manage ›
							</Text>
						</Pressable>
					</View>
					<View style={styles.membersList}>
						{memberRows.map((m) => (
							<Pressable
								key={m.userId}
								onPress={m.isMe ? onPressProfile : undefined}
								disabled={!m.isMe}
								accessibilityRole={m.isMe ? 'button' : undefined}
								style={styles.memberRow}
							>
								<Avatar size={40} initial={m.initial} bg={m.profileColor} photoUrl={m.photoUrl} />
								<Text style={[styles.rowTitle, styles.rowText, { color: t.text, fontFamily: fontFamily(700) }]}>
									{m.displayName}
								</Text>
								<Text style={[styles.rowHint, { color: t.sub }]}>
									{m.isMe ? 'You · edit ›' : m.role === 'owner' ? 'Owner' : 'Member'}
								</Text>
							</Pressable>
						))}
					</View>
				</View>
			) : null}

			<ProfileOverlay open={profileOpen} onClose={() => setProfileOpen(false)} />

			<ManageHouseholdOverlay open={manageOpen} onClose={() => setManageOpen(false)} />

			<View style={[styles.card, { backgroundColor: t.card }]}>
				<Text style={[styles.eyebrow, { color: t.sub, fontFamily: fontFamily(800) }]}>
					APPEARANCE
				</Text>
				<Pressable
					onPress={toggle}
					accessibilityRole="button"
					style={[styles.rowCard, styles.themeRow, { borderBottomColor: t.line }]}
				>
					<View style={styles.rowText}>
						<Text style={[styles.rowTitle, { color: t.text, fontFamily: fontFamily(700) }]}>
							{themeLabel}
						</Text>
						<Text style={[styles.rowSub, { color: t.sub }]}>Tap to switch</Text>
					</View>
					<Toggle value={isDark} onValueChange={toggle} />
				</Pressable>

				<View style={styles.layoutBlock}>
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
			</View>

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

			<View style={[styles.card, styles.listCard, { backgroundColor: t.card }]}>
				<Text style={[styles.eyebrow, styles.listEyebrow, { color: t.sub, fontFamily: fontFamily(800) }]}>
					NOTIFICATIONS
				</Text>
				{/*
				  These toggles are inert — they wrote a flag nothing reads (see TODO).
				  The prototype now shows the whole list disabled (opacity 0.45,
				  non-interactive, toggles off) rather than promising something the app
				  does not do. `pointerEvents="none"` makes them unresponsive.
				*/}
				<View style={styles.notifsDisabled} pointerEvents="none">
					{NOTIF_ROWS.map((row) => (
						<View
							key={row.key}
							style={[styles.rowCard, styles.listRow, { borderBottomColor: t.line }]}
						>
							<View style={styles.rowText}>
								<Text style={[styles.rowTitle, { color: t.text, fontFamily: fontFamily(700) }]}>
									{row.title}
								</Text>
								<Text style={[styles.rowSub, { color: t.sub }]}>{row.sub}</Text>
							</View>
							<Toggle value={false} onValueChange={() => {}} />
						</View>
					))}
				</View>
			</View>

			<View style={[styles.card, styles.listCard, { backgroundColor: t.card }]}>
				<Text style={[styles.eyebrow, styles.listEyebrow, { color: t.sub, fontFamily: fontFamily(800) }]}>
					PRIVACY & DATA
				</Text>
				<Pressable
					onPress={handleExportData}
					disabled={exporting}
					accessibilityRole="button"
					style={[styles.rowCard, styles.listRow, { borderBottomColor: t.line }]}
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
						<Icon name="download" size={22} color={t.sub} />
					)}
				</Pressable>

				{confirmDelete ? (
					<View style={styles.confirmBlock}>
						<Text style={[styles.rowTitle, styles.confirmTitle, { fontFamily: fontFamily(700) }]}>
							Delete your account?
						</Text>
						<Text style={[styles.confirmBody, { color: t.sub }]}>
							This permanently erases your account and personal data. Shared
							household data stays with other members.
						</Text>
						<View style={styles.confirmActions}>
							<Pressable
								onPress={() => setConfirmDelete(false)}
								disabled={deleting}
								accessibilityRole="button"
								style={[styles.confirmBtn, { backgroundColor: t.el }]}
							>
								<Text style={[styles.confirmBtnLabel, { color: t.text, fontFamily: fontFamily(800) }]}>
									Keep account
								</Text>
							</Pressable>
							<Pressable
								onPress={handleDeleteAccount}
								disabled={deleting}
								accessibilityRole="button"
								accessibilityState={{ disabled: deleting }}
								style={[styles.confirmBtn, styles.confirmDangerBtn]}
							>
								{deleting ? (
									<ActivityIndicator color="#FFF3F0" />
								) : (
									<Text style={[styles.confirmBtnLabel, styles.confirmDangerLabel, { fontFamily: fontFamily(800) }]}>
										Delete
									</Text>
								)}
							</Pressable>
						</View>
					</View>
				) : (
					<Pressable
						onPress={() => setConfirmDelete(true)}
						accessibilityRole="button"
						style={[styles.rowCard, styles.deleteRow]}
					>
						<View style={styles.rowText}>
							<Text style={[styles.rowTitle, styles.dangerText, { fontFamily: fontFamily(700) }]}>
								Delete account
							</Text>
							<Text style={[styles.rowSub, { color: t.sub }]}>
								Permanently erase your account and personal data
							</Text>
						</View>
						<Icon name="chevron_right" size={22} color="#DE4B37" />
					</Pressable>
				)}
			</View>

			<Pressable
				onPress={() => signOut()}
				accessibilityRole="button"
				style={styles.signOut}
			>
				<Text style={[styles.signOutLabel, { color: accent, fontFamily: fontFamily(800) }]}>
					Sign Out
				</Text>
			</Pressable>
			<View style={[styles.card, styles.listCard, { backgroundColor: t.card }]}>
				<CheckForUpdatesRow />
			</View>

			<View style={styles.footer}>
				<Text style={[styles.brand, { color: t.sub, fontFamily: fontFamily(900) }]}>
					ourbudget<Text style={{ color: accent }}>.</Text>
				</Text>
				<Text style={[styles.version, { color: t.sub }]}>{versionLabel()}</Text>
			</View>
			{isDeveloper ? <OtaDiagnostics /> : null}
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
	headerSub: {
		fontSize: 13,
		marginTop: 1,
	},
	pressed: {
		opacity: 0.6,
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
	notifsDisabled: {
		opacity: 0.45,
	},
	listCard: {
		paddingVertical: 8,
	},
	sectionLabel: {
		fontSize: 13,
	},
	eyebrow: {
		fontSize: 13,
		letterSpacing: 1,
	},
	listEyebrow: {
		paddingTop: 12,
		paddingBottom: 2,
	},
	listRow: {
		paddingVertical: 14,
		borderBottomWidth: 1,
	},
	themeRow: {
		paddingVertical: 16,
		borderBottomWidth: 1,
	},
	layoutBlock: {
		paddingTop: 16,
	},
	membersHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	manageLabel: {
		fontSize: 13,
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
	deleteRow: {
		paddingVertical: 14,
	},
	dangerText: {
		color: '#DE4B37',
	},
	confirmBlock: {
		paddingVertical: 14,
	},
	confirmTitle: {
		color: '#DE4B37',
	},
	confirmBody: {
		fontSize: 12,
		lineHeight: 18,
		marginTop: 4,
	},
	confirmActions: {
		flexDirection: 'row',
		gap: 8,
		marginTop: 12,
	},
	confirmBtn: {
		flex: 1,
		height: 44,
		borderRadius: 999,
		alignItems: 'center',
		justifyContent: 'center',
	},
	confirmDangerBtn: {
		backgroundColor: '#C8402E',
	},
	confirmBtnLabel: {
		fontSize: 14,
	},
	confirmDangerLabel: {
		color: '#FFF3F0',
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
	footer: {
		alignItems: 'center',
		marginTop: 12,
	},
	brand: {
		fontSize: 13,
		letterSpacing: -0.4,
	},
	version: {
		fontSize: 11,
		opacity: 0.7,
		marginTop: 2,
	},
});
