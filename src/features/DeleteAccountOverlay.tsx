import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useConvex } from 'convex/react';

import { Overlay } from '../components/Overlay';
import { useAuth } from '../hooks/useAuth';
import { fontFamily } from '../theme/fonts';
import { useTheme } from '../theme/useTheme';
import { useToast } from '../lib/toast';
import { api } from '../../convex/_generated/api';

export interface DeleteAccountOverlayProps {
	open: boolean;
	onClose: () => void;
}

const CONFIRM_WORD = 'DELETE';

/**
 * GDPR "right to be forgotten" flow. Explains, in plain language, exactly
 * what leaves and what stays behind (shared household data keeps a
 * tombstoned payer label, never a link back to this account), then gates
 * the destructive action behind typing the literal word "DELETE" — the
 * button stays disabled until the text matches exactly, so there is no
 * accidental one-tap deletion.
 *
 * On confirm: calls `account.deleteMyAccount`, signs the device out, and
 * lets the root auth gate (`app/index.tsx`) redirect to onboarding once
 * `<Unauthenticated>` takes over — no manual navigation needed here.
 */
export function DeleteAccountOverlay({ open, onClose }: DeleteAccountOverlayProps) {
	const { t, accent } = useTheme();
	const convex = useConvex();
	const { signOut } = useAuth();
	const { toast } = useToast();

	const [confirmText, setConfirmText] = useState('');
	const [deleting, setDeleting] = useState(false);

	useEffect(() => {
		if (open) {
			setConfirmText('');
			setDeleting(false);
		}
	}, [open]);

	const canDelete = confirmText === CONFIRM_WORD && !deleting;

	const handleClose = () => {
		if (deleting) {
			return;
		}
		onClose();
	};

	const handleDelete = async () => {
		if (!canDelete) {
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
					disabled={deleting}
				>
					<Text style={[styles.backLabel, { color: t.sub, fontFamily: fontFamily(700) }]}>
						‹ Back
					</Text>
				</Pressable>

				<Text style={[styles.title, { color: t.text, fontFamily: fontFamily(800) }]}>
					Delete your account
				</Text>
				<Text style={[styles.body, { color: t.sub }]}>
					This permanently erases your profile, your notification settings, and
					your membership in every household. If you are the only member of a
					household, its categories and transactions are deleted with it, too.
				</Text>
				<Text style={[styles.body, { color: t.sub }]}>
					If you share a household with others, they keep their categories and
					transactions — your name simply stays on past entries as a plain
					label, no longer linked to any account of yours.
				</Text>
				<Text
					style={[
						styles.body,
						styles.warning,
						{ color: t.text, fontFamily: fontFamily(800) },
					]}
				>
					This cannot be undone.
				</Text>

				<View style={[styles.card, { backgroundColor: t.card }]}>
					<Text style={[styles.fieldLabel, { color: t.sub, fontFamily: fontFamily(800) }]}>
						TYPE {CONFIRM_WORD} TO CONFIRM
					</Text>
					<TextInput
						value={confirmText}
						onChangeText={setConfirmText}
						placeholder={CONFIRM_WORD}
						placeholderTextColor={t.sub}
						autoCapitalize="characters"
						autoCorrect={false}
						editable={!deleting}
						style={[styles.input, { backgroundColor: t.el, color: t.text }]}
					/>
				</View>

				<Pressable
					onPress={handleDelete}
					disabled={!canDelete}
					accessibilityRole="button"
					accessibilityState={{ disabled: !canDelete }}
					style={[
						styles.deleteButton,
						{ backgroundColor: canDelete ? '#D14343' : t.el },
					]}
				>
					{deleting ? (
						<ActivityIndicator color="#FFFFFF" />
					) : (
						<Text
							style={[
								styles.deleteLabel,
								{ color: canDelete ? '#FFFFFF' : t.sub, fontFamily: fontFamily(800) },
							]}
						>
							Delete my account
						</Text>
					)}
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
		fontSize: 22,
		letterSpacing: -0.4,
		marginTop: 12,
	},
	body: {
		fontSize: 14,
		lineHeight: 20,
		marginTop: 12,
	},
	warning: {
		marginTop: 12,
	},
	card: {
		borderRadius: 24,
		padding: 20,
		marginTop: 20,
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
	},
	deleteButton: {
		width: '100%',
		height: 54,
		marginTop: 20,
		borderRadius: 999,
		alignItems: 'center',
		justifyContent: 'center',
	},
	deleteLabel: {
		fontSize: 16,
	},
});
