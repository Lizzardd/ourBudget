import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../../src/hooks/useAuth';
import { useToast } from '../../src/lib/toast';
import { versionLabel } from '../../src/lib/version';
import { fontFamily } from '../../src/theme/fonts';
import { useTheme } from '../../src/theme/useTheme';

/**
 * First screen an unauthenticated visitor sees. Matches the prototype's
 * "ONBOARDING: WELCOME" section — brand lockup, tagline, and the two
 * sign-in options. Google is wired to the real Convex Auth action; Apple
 * is deferred (see task brief) so it's shown disabled with a "coming
 * soon" acknowledgement instead of failing silently.
 */
export default function Welcome() {
	const { t, accent } = useTheme();
	const { signInWithGoogle } = useAuth();
	const { toast } = useToast();
	const insets = useSafeAreaInsets();
	const [signingIn, setSigningIn] = useState(false);

	const continueWithGoogle = async () => {
		if (signingIn) {
			return;
		}
		setSigningIn(true);
		try {
			await signInWithGoogle();
		} catch (err) {
			toast(err instanceof Error ? err.message : 'Could not start Google sign-in');
		} finally {
			setSigningIn(false);
		}
	};

	return (
		<View
			style={[
				styles.container,
				{ paddingTop: insets.top + 32, paddingBottom: insets.bottom + 24 },
			]}
		>
			<View style={styles.hero}>
				<View style={[styles.badge, { backgroundColor: accent }]}>
					<Text style={styles.badgeText}>
						ob<Text style={styles.badgeDot}>.</Text>
					</Text>
				</View>
				<Text style={[styles.title, { color: t.text, fontFamily: fontFamily(900) }]}>
					ourbudget<Text style={{ color: accent }}>.</Text>
				</Text>
				<Text style={[styles.tagline, { color: accent, fontFamily: fontFamily(800) }]}>
					money. sorted. together.
				</Text>
				<Text style={[styles.body, { color: t.sub }]}>
					One shared budget for your household. Same numbers, live, for everyone.
				</Text>
			</View>
			<View style={styles.actions}>
				<Pressable
					accessibilityRole="button"
					accessibilityLabel="Continue with Google"
					disabled={signingIn}
					onPress={continueWithGoogle}
					style={({ pressed }) => [
						styles.button,
						{ backgroundColor: t.el, opacity: signingIn ? 0.6 : 1 },
						pressed ? styles.buttonPressed : null,
					]}
				>
					<Text style={[styles.buttonGlyph, { color: accent }]}>G</Text>
					<Text style={[styles.buttonLabel, { color: t.text, fontFamily: fontFamily(700) }]}>
						{signingIn ? 'Continuing…' : 'Continue with Google'}
					</Text>
				</Pressable>
				<View
					accessibilityLabel="Apple sign-in coming soon"
					style={[styles.button, styles.applePill, { backgroundColor: t.el }]}
				>
					<Text style={[styles.buttonLabel, { color: t.sub, fontFamily: fontFamily(700) }]}>
						Apple
					</Text>
					<View style={[styles.comingSoon, { backgroundColor: t.track }]}>
						<Text style={[styles.comingSoonText, { color: t.sub, fontFamily: fontFamily(800) }]}>
							COMING SOON
						</Text>
					</View>
				</View>
				<Text style={[styles.footer, { color: t.sub }]}>Free for households of any size</Text>
				<Text style={[styles.version, { color: t.sub }]}>{versionLabel()}</Text>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: 'space-between',
		paddingHorizontal: 28,
	},
	hero: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		gap: 20,
	},
	badge: {
		width: 84,
		height: 84,
		borderRadius: 28,
		alignItems: 'center',
		justifyContent: 'center',
	},
	badgeText: {
		fontSize: 38,
		fontWeight: '900',
		letterSpacing: -2,
		color: '#FFF3F0',
	},
	badgeDot: {
		color: '#2B0E1A',
	},
	title: {
		fontSize: 38,
		letterSpacing: -1.2,
		lineHeight: 42,
	},
	tagline: {
		fontSize: 14,
		letterSpacing: 2,
	},
	body: {
		fontSize: 16,
		lineHeight: 24,
		textAlign: 'center',
		maxWidth: 280,
	},
	actions: {
		gap: 12,
	},
	button: {
		height: 56,
		borderRadius: 999,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 10,
	},
	buttonPressed: {
		transform: [{ scale: 0.98 }],
	},
	// Apple sign-in is deferred — the prototype shows a static, non-interactive
	// "Apple  COMING SOON" pill rather than a tappable button.
	applePill: {
		opacity: 0.5,
		gap: 8,
	},
	comingSoon: {
		borderRadius: 999,
		paddingHorizontal: 8,
		paddingVertical: 3,
	},
	comingSoonText: {
		fontSize: 11,
		letterSpacing: 1,
	},
	buttonGlyph: {
		fontSize: 18,
		fontWeight: '800',
	},
	buttonLabel: {
		fontSize: 16,
	},
	footer: {
		textAlign: 'center',
		fontSize: 12,
		marginTop: 4,
	},
	version: {
		textAlign: 'center',
		fontSize: 11,
		opacity: 0.7,
		marginTop: 6,
	},
});
