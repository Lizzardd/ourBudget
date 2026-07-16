import { useQuery } from 'convex/react';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { api } from '../../convex/_generated/api';
import { Avatar } from '../components/Avatar';
import { Icon } from '../components/Icon';
import { Overlay } from '../components/Overlay';
import { useHousehold } from '../hooks/useHousehold';
import { useSettings, useUpdateSettings } from '../hooks/useSettings';
import { useToast } from '../lib/toast';
import { fontFamily } from '../theme/fonts';
import { useTheme } from '../theme/useTheme';

export interface ProfileOverlayProps {
	open: boolean;
	onClose: () => void;
}

/** Swatch order matches the prototype's `profSwatches`, left to right, wrapping. */
const SWATCHES = [
	'#D98BA4', '#7FA8A0', '#E3B063', '#9C8FC7', '#86B478', '#C96287',
	'#E08B6F', '#8AA3C4', '#B98AD4', '#5FA9A0', '#D97A8F', '#C7A15A',
];

/**
 * Profile overlay — editable display name, an avatar that previews either the
 * chosen Google photo or the name's initial on the selected `profileColor`, the
 * 12 wrapping colour swatches, and "Use Google photo" / "Remove photo" controls.
 * Every field patches through `useUpdateSettings` (per-user, per-household), so
 * the change — colour, name, or photo — is visible to the rest of the household
 * as soon as it lands (`householdMemberProfiles` reads `settings.photoUrl`). The
 * Google photo is the caller's `user.image`, read via `account.myGooglePhoto`.
 *
 * Fidelity source: `docs/design/BudgetApp-Prototype.dc.html`'s
 * `─── PROFILE OVERLAY ───`. That markup also has an editable EMAIL field,
 * but `settings` has no email column and no query anywhere in this app
 * exposes the auth user's email — inventing a schema field for it is out
 * of scope here, so this overlay omits the email row entirely rather than
 * wiring an input to nothing. See task-25-report.md for detail.
 */
export function ProfileOverlay({ open, onClose }: ProfileOverlayProps) {
	const { t, accent } = useTheme();
	const { householdId } = useHousehold();
	const { settings } = useSettings();
	const updateSettings = useUpdateSettings();
	const { toast } = useToast();

	const [name, setName] = useState('');
	const [color, setColor] = useState(SWATCHES[0]);
	const [photoUrl, setPhotoUrl] = useState<string | undefined>(undefined);

	// The caller's Google account picture, offered as their avatar.
	const googlePhoto = useQuery(api.account.myGooglePhoto);

	// Re-seed local (live-preview) state from the loaded settings each time
	// the overlay opens, so edits always start from the current value.
	useEffect(() => {
		if (open && settings) {
			setName(settings.displayName);
			setColor(settings.profileColor);
			setPhotoUrl(settings.photoUrl ?? undefined);
		}
	}, [open, settings]);

	const patch = (next: Parameters<typeof updateSettings>[0]['patch']) => {
		if (!householdId) {
			return;
		}
		updateSettings({ householdId, patch: next }).catch(() => {
			toast("Couldn't save your profile — try again");
		});
	};

	const commitName = () => {
		const trimmed = name.trim();
		if (settings && trimmed && trimmed !== settings.displayName) {
			patch({ displayName: trimmed });
		}
	};

	const handlePickColor = (next: string) => {
		setColor(next);
		if (settings && next !== settings.profileColor) {
			patch({ profileColor: next });
		}
	};

	const handleUseGooglePhoto = () => {
		if (!googlePhoto) {
			toast('No Google photo found on your account');
			return;
		}
		setPhotoUrl(googlePhoto);
		patch({ photoUrl: googlePhoto });
	};

	const handleRemovePhoto = () => {
		setPhotoUrl(undefined);
		patch({ photoUrl: null });
	};

	const handleDone = () => {
		commitName();
		onClose();
	};

	const initial = name.trim().charAt(0).toUpperCase() || '?';

	return (
		<Overlay open={open} onClose={handleDone}>
			<ScrollView
				style={styles.container}
				contentContainerStyle={styles.content}
			>
				<Pressable
					onPress={handleDone}
					accessibilityRole="button"
					accessibilityLabel="Back"
					style={styles.back}
				>
					<Text style={[styles.backLabel, { color: t.sub, fontFamily: fontFamily(700) }]}>
						‹ Back
					</Text>
				</Pressable>

				<View style={styles.avatarBlock}>
					<Avatar size={84} initial={initial} bg={color} photoUrl={photoUrl} />
					<Pressable
						onPress={handleUseGooglePhoto}
						accessibilityRole="button"
						accessibilityLabel={photoUrl ? 'Change photo' : 'Use Google photo'}
						style={({ pressed }) => [
							styles.photoBtn,
							{ backgroundColor: t.el },
							pressed ? styles.photoBtnPressed : null,
						]}
					>
						<Icon name="photo_camera" size={17} color={t.text} />
						<Text style={[styles.photoBtnLabel, { color: t.text, fontFamily: fontFamily(700) }]}>
							{photoUrl ? 'Change photo' : 'Use Google photo'}
						</Text>
					</Pressable>
					{photoUrl ? (
						<Pressable
							onPress={handleRemovePhoto}
							accessibilityRole="button"
							style={styles.removePhoto}
						>
							<Text style={[styles.removePhotoLabel, { color: t.sub, fontFamily: fontFamily(700) }]}>
								Remove photo
							</Text>
						</Pressable>
					) : null}
					<View style={styles.swatchRow}>
						{SWATCHES.map((sw) => {
							const selected = sw === color;
							return (
								<Pressable
									key={sw}
									onPress={() => handlePickColor(sw)}
									accessibilityRole="button"
									accessibilityLabel={`Pick color ${sw}`}
									accessibilityState={{ selected }}
									style={[
										styles.swatch,
										{
											backgroundColor: sw,
											borderColor: selected ? accent : 'transparent',
										},
									]}
								/>
							);
						})}
					</View>
				</View>

				<View style={[styles.card, { backgroundColor: t.card }]}>
					<View>
						<Text style={[styles.fieldLabel, { color: t.sub, fontFamily: fontFamily(800) }]}>
							NAME
						</Text>
						<TextInput
							value={name}
							onChangeText={setName}
							onBlur={commitName}
							onSubmitEditing={commitName}
							placeholder="Your name"
							placeholderTextColor={t.sub}
							style={[styles.input, { backgroundColor: t.el, color: t.text }]}
						/>
					</View>
				</View>

				<View style={[styles.card, styles.remindersCard, { backgroundColor: t.card }]}>
					<Text style={[styles.fieldLabel, styles.remindersLabel, { color: t.sub, fontFamily: fontFamily(800) }]}>
						REMINDERS
					</Text>
					<Text style={[styles.remindersBody, { color: t.sub }]}>
						Manage weekly check-ins, over-budget nudges and the monthly recap in{' '}
						<Text style={[styles.remindersStrong, { color: t.text, fontFamily: fontFamily(700) }]}>
							Settings → Notifications
						</Text>
						.
					</Text>
				</View>

				<Pressable
					onPress={handleDone}
					accessibilityRole="button"
					style={[styles.doneButton, { backgroundColor: accent }]}
				>
					<Text style={[styles.doneLabel, { fontFamily: fontFamily(800) }]}>Done</Text>
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
	avatarBlock: {
		alignItems: 'center',
		gap: 14,
		paddingVertical: 20,
	},
	photoBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 7,
		borderRadius: 999,
		paddingVertical: 9,
		paddingHorizontal: 15,
	},
	photoBtnPressed: {
		transform: [{ scale: 0.97 }],
	},
	photoBtnLabel: {
		fontSize: 13,
	},
	removePhoto: {
		marginTop: -6,
	},
	removePhotoLabel: {
		fontSize: 12,
	},
	swatchRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		justifyContent: 'center',
		gap: 10,
		maxWidth: 240,
	},
	swatch: {
		width: 30,
		height: 30,
		borderRadius: 15,
		borderWidth: 2.5,
	},
	card: {
		borderRadius: 24,
		padding: 20,
	},
	remindersCard: {
		paddingVertical: 8,
		marginTop: 12,
	},
	fieldLabel: {
		fontSize: 11,
		letterSpacing: 1,
	},
	remindersLabel: {
		paddingTop: 12,
		paddingBottom: 2,
	},
	remindersBody: {
		fontSize: 13,
		lineHeight: 20,
		paddingTop: 4,
		paddingBottom: 14,
	},
	remindersStrong: {
		fontSize: 13,
	},
	input: {
		width: '100%',
		marginTop: 6,
		height: 46,
		borderRadius: 14,
		paddingHorizontal: 14,
		fontSize: 15,
		fontFamily: fontFamily(700),
	},
	doneButton: {
		width: '100%',
		height: 54,
		marginTop: 16,
		borderRadius: 999,
		alignItems: 'center',
		justifyContent: 'center',
	},
	doneLabel: {
		fontSize: 16,
		color: '#2B0E1A',
	},
});
