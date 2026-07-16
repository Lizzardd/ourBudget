import { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { useMutation, useQuery } from 'convex/react';

import { Avatar } from '../components/Avatar';
import { Icon } from '../components/Icon';
import { Overlay } from '../components/Overlay';
import { useHousehold } from '../hooks/useHousehold';
import { useToast } from '../lib/toast';
import { fontFamily } from '../theme/fonts';
import { useTheme } from '../theme/useTheme';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';

export interface ManageHouseholdOverlayProps {
	open: boolean;
	onClose: () => void;
}

const DANGER = '#DE4B37';
const DANGER_BG = '#C8402E';
const DANGER_BORDER = 'rgba(200,64,46,0.5)';

/**
 * Manage-household overlay — rename the household, review who is in it
 * (removing members when you're the owner), share the invite code, and
 * leave the household altogether.
 *
 * Fidelity source: `docs/design/BudgetApp-Prototype.dc.html`'s
 * `─── MANAGE HOUSEHOLD OVERLAY ───`.
 *
 * The prototype persists the name on every keystroke; here the input holds
 * local state and commits (trimmed, ignoring empty) on blur/submit and on
 * close, so a half-typed name never round-trips to the backend and every
 * member's header doesn't flicker mid-word.
 *
 * Removal is two-tap, per the prototype's `askRemove`/`cancelRemove`/
 * `doRemove`: the circle icon button swaps the row into a "Keep" + red
 * "Remove" pair. Only the owner sees the button at all — `removeMember`
 * rejects everyone else server-side anyway.
 *
 * Leaving needs no navigation of its own: the membership row disappears,
 * `useHousehold()` resolves to no household, and the no-household guard in
 * `app/(app)/_layout.tsx` redirects to `/(onboarding)/fork`.
 */
export function ManageHouseholdOverlay({ open, onClose }: ManageHouseholdOverlayProps) {
	const { t, accent } = useTheme();
	const { householdId, name: householdName, inviteCode } = useHousehold();
	const members = useQuery(
		api.households.householdMembers,
		householdId ? { householdId } : 'skip',
	);
	const renameHousehold = useMutation(api.households.renameHousehold);
	const removeMember = useMutation(api.households.removeMember);
	const leaveHousehold = useMutation(api.households.leaveHousehold);
	const { toast } = useToast();

	const [name, setName] = useState('');
	const [confirmingId, setConfirmingId] = useState<Id<'users'> | null>(null);

	// Re-seed the input from the loaded household each time the overlay
	// opens, so edits always start from the current name.
	useEffect(() => {
		if (open && householdName !== undefined) {
			setName(householdName);
			setConfirmingId(null);
		}
	}, [open, householdName]);

	const me = members?.find((m) => m.isMe);
	const others = members?.filter((m) => !m.isMe) ?? [];
	const isOwner = me?.role === 'owner';

	const commitName = () => {
		const trimmed = name.trim();
		if (!householdId || trimmed === '' || trimmed === householdName) {
			return;
		}
		renameHousehold({ householdId, name: trimmed }).catch(() => {
			toast("Couldn't rename your household — try again");
		});
	};

	const handleClose = () => {
		commitName();
		onClose();
	};

	const handleRemove = (userId: Id<'users'>, displayName: string) => {
		if (!householdId) {
			return;
		}
		setConfirmingId(null);
		removeMember({ householdId, userId })
			.then(() => {
				toast(`${displayName} removed from household`);
			})
			.catch(() => {
				toast(`Couldn't remove ${displayName} — try again`);
			});
	};

	const handleShareInviteCode = async () => {
		if (!inviteCode) {
			return;
		}
		const message = `Join our household on Our Budget — use invite code ${inviteCode}`;
		try {
			if (Platform.OS === 'web') {
				const copied = await navigator.clipboard
					?.writeText(message)
					.then(() => true, () => false);
				if (copied) {
					toast('Copied');
				}
				return;
			}
			await Share.share({ message });
			toast('Invite code shared');
		} catch {
			// Share sheet dismissed or unavailable — no-op.
		}
	};

	const handleLeave = () => {
		if (!householdId) {
			return;
		}
		// No navigation here: once the membership is gone `useHousehold()` has
		// nothing to resolve and the `app/(app)/_layout.tsx` guard redirects.
		leaveHousehold({ householdId })
			.then(() => {
				onClose();
			})
			.catch(() => {
				toast("Couldn't leave the household — try again");
			});
	};

	return (
		<Overlay open={open} onClose={handleClose}>
			<ScrollView
				style={styles.container}
				contentContainerStyle={styles.content}
			>
				<Pressable
					onPress={handleClose}
					accessibilityRole="button"
					accessibilityLabel="Back"
					style={styles.back}
				>
					<Text style={[styles.backLabel, { color: t.sub, fontFamily: fontFamily(700) }]}>
						‹ Back
					</Text>
				</Pressable>

				<Text style={[styles.title, { color: t.text, fontFamily: fontFamily(800) }]}>
					Manage household
				</Text>

				<View style={[styles.card, { backgroundColor: t.card }]}>
					<Text style={[styles.eyebrow, { color: t.sub, fontFamily: fontFamily(800) }]}>
						HOUSEHOLD NAME
					</Text>
					<TextInput
						value={name}
						onChangeText={setName}
						onBlur={commitName}
						onSubmitEditing={commitName}
						placeholder="Household name"
						placeholderTextColor={t.sub}
						style={[styles.input, { backgroundColor: t.el, color: t.text }]}
					/>
				</View>

				<View style={[styles.card, styles.cardGap, { backgroundColor: t.card }]}>
					<Text style={[styles.eyebrow, { color: t.sub, fontFamily: fontFamily(800) }]}>
						MEMBERS
					</Text>

					<View style={styles.meRow}>
						<Avatar
							size={40}
							initial={me?.initial ?? '?'}
							bg={me?.profileColor ?? t.el}
							photoUrl={me?.photoUrl}
						/>
						<Text style={[styles.memberName, { color: t.text, fontFamily: fontFamily(700) }]}>
							{me?.displayName ?? 'You'}
						</Text>
						<Text style={[styles.meRole, { color: accent, fontFamily: fontFamily(700) }]}>
							You · {isOwner ? 'Owner' : 'Member'}
						</Text>
					</View>

					{others.map((m) => {
						const confirming = confirmingId === m.userId;
						return (
							<View key={m.userId} style={[styles.memberRow, { borderTopColor: t.line }]}>
								<Avatar size={40} initial={m.initial} bg={m.profileColor} photoUrl={m.photoUrl} />
								<View style={styles.memberText}>
									<Text style={[styles.memberName, { color: t.text, fontFamily: fontFamily(700) }]}>
										{m.displayName}
									</Text>
									<Text style={[styles.memberRole, { color: t.sub }]}>
										{m.role === 'owner' ? 'Owner' : 'Member'}
									</Text>
								</View>
								{isOwner && confirming ? (
									<View style={styles.confirmRow}>
										<Pressable
											onPress={() => setConfirmingId(null)}
											accessibilityRole="button"
											style={[styles.confirmBtn, { backgroundColor: t.el }]}
										>
											<Text
												style={[
													styles.confirmLabel,
													{ color: t.text, fontFamily: fontFamily(800) },
												]}
											>
												Cancel
											</Text>
										</Pressable>
										<Pressable
											onPress={() => handleRemove(m.userId, m.displayName)}
											accessibilityRole="button"
											style={[styles.confirmBtn, { backgroundColor: DANGER_BG }]}
										>
											<Text
												style={[
													styles.confirmLabel,
													styles.removeLabel,
													{ fontFamily: fontFamily(800) },
												]}
											>
												Remove
											</Text>
										</Pressable>
									</View>
								) : null}
								{isOwner && !confirming ? (
									<Pressable
										onPress={() => setConfirmingId(m.userId)}
										accessibilityRole="button"
										accessibilityLabel={`Remove ${m.displayName}`}
										style={[styles.removeBtn, { backgroundColor: t.el }]}
									>
										<Icon name="person_remove" size={18} color={t.sub} />
									</Pressable>
								) : null}
							</View>
						);
					})}

					{others.length === 0 ? (
						<Text style={[styles.emptyMembers, { color: t.sub }]}>
							Just you for now — invite someone below 💛
						</Text>
					) : null}
				</View>

				<View style={[styles.card, styles.cardGap, styles.inviteCard, { backgroundColor: t.card }]}>
					<View style={styles.inviteText}>
						<Text style={[styles.eyebrow, { color: t.sub, fontFamily: fontFamily(800) }]}>
							INVITE CODE
						</Text>
						<Text style={[styles.inviteCode, { color: accent, fontFamily: fontFamily(900) }]}>
							{inviteCode ?? '…'}
						</Text>
					</View>
					<Pressable
						onPress={handleShareInviteCode}
						disabled={!inviteCode}
						accessibilityRole="button"
						style={[styles.shareBtn, { backgroundColor: t.el }]}
					>
						<Text style={[styles.shareLabel, { color: t.text, fontFamily: fontFamily(700) }]}>
							Share ↗
						</Text>
					</Pressable>
				</View>

				<Pressable
					onPress={handleLeave}
					accessibilityRole="button"
					style={[styles.leaveBtn, { borderColor: DANGER_BORDER }]}
				>
					<Text style={[styles.leaveLabel, { color: DANGER, fontFamily: fontFamily(800) }]}>
						Leave household
					</Text>
				</Pressable>
			</ScrollView>
		</Overlay>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	content: {
		padding: 18,
		paddingTop: 12,
		paddingBottom: 40,
	},
	back: {
		paddingVertical: 8,
		paddingHorizontal: 4,
		alignSelf: 'flex-start',
	},
	backLabel: {
		fontSize: 15,
	},
	title: {
		fontSize: 24,
		letterSpacing: -0.4,
		paddingTop: 6,
		paddingHorizontal: 4,
		paddingBottom: 18,
	},
	card: {
		borderRadius: 24,
		padding: 20,
	},
	cardGap: {
		marginTop: 12,
	},
	eyebrow: {
		fontSize: 11,
		letterSpacing: 1,
	},
	input: {
		width: '100%',
		marginTop: 8,
		height: 48,
		borderRadius: 14,
		paddingHorizontal: 14,
		fontSize: 16,
		fontFamily: fontFamily(700),
	},
	meRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		paddingTop: 14,
		paddingBottom: 2,
	},
	memberRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		borderTopWidth: 1,
		marginTop: 12,
		paddingTop: 12,
		paddingBottom: 2,
	},
	avatar: {
		width: 40,
		height: 40,
		borderRadius: 20,
		alignItems: 'center',
		justifyContent: 'center',
	},
	avatarInitial: {
		fontSize: 15,
		color: '#3A1220',
	},
	memberText: {
		flex: 1,
	},
	memberName: {
		flex: 1,
		fontSize: 15,
	},
	memberRole: {
		fontSize: 12,
	},
	meRole: {
		fontSize: 12,
	},
	removeBtn: {
		width: 34,
		height: 34,
		borderRadius: 17,
		alignItems: 'center',
		justifyContent: 'center',
	},
	confirmRow: {
		flexDirection: 'row',
		gap: 6,
	},
	confirmBtn: {
		height: 34,
		paddingHorizontal: 12,
		borderRadius: 999,
		alignItems: 'center',
		justifyContent: 'center',
	},
	confirmLabel: {
		fontSize: 12,
	},
	removeLabel: {
		color: '#FFF3F0',
	},
	emptyMembers: {
		fontSize: 13,
		textAlign: 'center',
		paddingTop: 14,
		paddingBottom: 2,
	},
	inviteCard: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	inviteText: {
		flex: 1,
	},
	inviteCode: {
		fontSize: 22,
		letterSpacing: 1,
		marginTop: 4,
	},
	shareBtn: {
		height: 44,
		paddingHorizontal: 20,
		borderRadius: 999,
		alignItems: 'center',
		justifyContent: 'center',
	},
	shareLabel: {
		fontSize: 14,
	},
	leaveBtn: {
		width: '100%',
		height: 52,
		marginTop: 20,
		borderRadius: 999,
		borderWidth: 1.5,
		alignItems: 'center',
		justifyContent: 'center',
	},
	leaveLabel: {
		fontSize: 14,
	},
});
