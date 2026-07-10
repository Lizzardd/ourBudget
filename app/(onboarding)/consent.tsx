import { useMutation } from 'convex/react';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api } from '../../convex/_generated/api';
import { useToast } from '../../src/lib/toast';
import { POLICY_VERSION, PRIVACY_POLICY_URL, TERMS_URL } from '../../src/lib/policy';
import { fontFamily } from '../../src/theme/fonts';
import { useTheme } from '../../src/theme/useTheme';

/**
 * GDPR sign-up consent gate. Shown right after Google sign-in, before the
 * household fork, whenever the caller hasn't yet consented to the current
 * `POLICY_VERSION` (see `app/index.tsx`'s `PostAuthGate`). Continue stays
 * disabled until the checkbox is ticked, and recording consent happens
 * before routing into the fork — there's no way to reach a household
 * without going through this screen first.
 */
export default function Consent() {
	const { t, accent } = useTheme();
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const { toast } = useToast();
	const recordConsent = useMutation(api.consent.recordConsent);

	const [agreed, setAgreed] = useState(false);
	const [submitting, setSubmitting] = useState(false);

	const continueOnward = async () => {
		if (!agreed || submitting) {
			return;
		}
		setSubmitting(true);
		try {
			await recordConsent({ policyVersion: POLICY_VERSION });
			router.replace('/(onboarding)/fork');
		} catch (err) {
			toast(err instanceof Error ? err.message : 'Could not record your consent');
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<View
			style={[
				styles.container,
				{ paddingTop: insets.top + 56, paddingBottom: insets.bottom + 24 },
			]}
		>
			<Text style={[styles.title, { color: t.text, fontFamily: fontFamily(800) }]}>
				Before we start 🔒
			</Text>
			<Text style={[styles.body, { color: t.sub }]}>
				We only use your data to run your household&rsquo;s shared budget. Have a
				read of how that works, then tick below to continue.
			</Text>

			<View style={styles.links}>
				<Pressable
					accessibilityRole="link"
					accessibilityLabel="Read the app's Privacy Policy"
					onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}
				>
					<Text style={[styles.linkLabel, { color: accent, fontFamily: fontFamily(700) }]}>
						Privacy Policy
					</Text>
				</Pressable>
				<Pressable
					accessibilityRole="link"
					accessibilityLabel="Read the app's Terms"
					onPress={() => Linking.openURL(TERMS_URL)}
				>
					<Text style={[styles.linkLabel, { color: accent, fontFamily: fontFamily(700) }]}>
						Terms
					</Text>
				</Pressable>
			</View>

			<View style={styles.spacer} />

			<Pressable
				accessibilityRole="checkbox"
				accessibilityState={{ checked: agreed }}
				accessibilityLabel="I agree to the Privacy Policy and Terms"
				onPress={() => setAgreed((prev) => !prev)}
				style={[styles.checkboxRow, { backgroundColor: t.card }]}
			>
				<View
					style={[
						styles.checkbox,
						{
							borderColor: agreed ? accent : t.line,
							backgroundColor: agreed ? accent : 'transparent',
						},
					]}
				>
					{agreed ? <Text style={styles.checkboxTick}>✓</Text> : null}
				</View>
				<Text style={[styles.checkboxLabel, { color: t.text }]}>
					I agree to the Privacy Policy and Terms
				</Text>
			</Pressable>

			<Pressable
				accessibilityRole="button"
				accessibilityLabel="Continue"
				accessibilityState={{ disabled: !agreed || submitting }}
				disabled={!agreed || submitting}
				onPress={continueOnward}
				style={({ pressed }) => [
					styles.primaryButton,
					{ backgroundColor: accent, opacity: !agreed || submitting ? 0.5 : 1 },
					pressed ? styles.pressed : null,
				]}
			>
				<Text style={styles.primaryLabel}>{submitting ? 'Continuing…' : 'Continue'}</Text>
			</Pressable>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		paddingHorizontal: 24,
	},
	title: {
		fontSize: 28,
		letterSpacing: -0.5,
	},
	body: {
		fontSize: 15,
		lineHeight: 22,
		marginTop: 8,
	},
	links: {
		flexDirection: 'row',
		gap: 20,
		marginTop: 20,
	},
	linkLabel: {
		fontSize: 15,
		textDecorationLine: 'underline',
	},
	spacer: {
		flex: 1,
	},
	checkboxRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 14,
		borderRadius: 20,
		padding: 18,
		marginBottom: 16,
	},
	checkbox: {
		width: 26,
		height: 26,
		borderRadius: 8,
		borderWidth: 2,
		alignItems: 'center',
		justifyContent: 'center',
	},
	checkboxTick: {
		color: '#2B0E1A',
		fontSize: 16,
		fontWeight: '900',
	},
	checkboxLabel: {
		flex: 1,
		fontSize: 15,
		lineHeight: 20,
	},
	primaryButton: {
		height: 58,
		borderRadius: 999,
		alignItems: 'center',
		justifyContent: 'center',
	},
	primaryLabel: {
		fontSize: 17,
		fontWeight: '800',
		color: '#2B0E1A',
	},
	pressed: {
		transform: [{ scale: 0.98 }],
	},
});
