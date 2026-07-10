import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

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

/** Swatch order matches the prototype's `profSwatches`, left to right. */
const SWATCHES = ['#D98BA4', '#7FA8A0', '#E3B063', '#9C8FC7', '#86B478', '#C96287'];

/**
 * Profile overlay — editable display name, an avatar that previews the
 * name's initial in the selected `profileColor` live, and the 6 color
 * swatches from the prototype's Profile screen. Both fields patch through
 * `useUpdateSettings` (per-user, per-household), so the change is visible
 * to the rest of the household as soon as it lands.
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

	// Re-seed local (live-preview) state from the loaded settings each time
	// the overlay opens, so edits always start from the current value.
	useEffect(() => {
		if (open && settings) {
			setName(settings.displayName);
			setColor(settings.profileColor);
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
					<View style={[styles.avatar, { backgroundColor: color }]}>
						<Text style={[styles.avatarInitial, { fontFamily: fontFamily(900) }]}>
							{initial}
						</Text>
					</View>
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
		gap: 10,
		paddingVertical: 20,
	},
	avatar: {
		width: 84,
		height: 84,
		borderRadius: 42,
		alignItems: 'center',
		justifyContent: 'center',
	},
	avatarInitial: {
		fontSize: 34,
		color: '#3A1220',
	},
	swatchRow: {
		flexDirection: 'row',
		gap: 10,
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
	fieldLabel: {
		fontSize: 11,
		letterSpacing: 1,
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
