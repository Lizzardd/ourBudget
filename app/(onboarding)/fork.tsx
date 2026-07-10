import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '../../src/components/Icon';
import { fontFamily } from '../../src/theme/fonts';
import { useTheme } from '../../src/theme/useTheme';

/**
 * Shown right after sign-in when the user has no household yet. Matches
 * the prototype's "ONBOARDING: FORK" section — a fork between creating a
 * new household or joining one with a code.
 */
export default function Fork() {
	const { t, accent } = useTheme();
	const router = useRouter();
	const insets = useSafeAreaInsets();

	return (
		<View style={[styles.container, { paddingTop: insets.top + 56, paddingBottom: insets.bottom + 24 }]}>
			<Text style={[styles.title, { color: t.text, fontFamily: fontFamily(800) }]}>
				Welcome 👋
			</Text>
			<Text style={[styles.body, { color: t.sub }]}>
				A household shares one pool of budgets. Start yours, or join one that&rsquo;s waiting for you.
			</Text>
			<View style={styles.cards}>
				<Pressable
					accessibilityRole="button"
					accessibilityLabel="Create a household"
					onPress={() => router.push('/(onboarding)/invite')}
					style={({ pressed }) => [
						styles.card,
						{ backgroundColor: accent },
						pressed ? styles.cardPressed : null,
					]}
				>
					<Icon name="add_home" size={30} color="#2B0E1A" />
					<View style={styles.cardText}>
						<Text style={[styles.cardTitle, { color: '#2B0E1A', fontFamily: fontFamily(800) }]}>
							Create a household
						</Text>
						<Text style={[styles.cardSubtitle, { color: '#2B0E1A' }]}>
							Set up budgets and invite your partner
						</Text>
					</View>
				</Pressable>
				<Pressable
					accessibilityRole="button"
					accessibilityLabel="Join with a code"
					onPress={() => router.push('/(onboarding)/join')}
					style={({ pressed }) => [
						styles.card,
						{ backgroundColor: t.card },
						pressed ? styles.cardPressed : null,
					]}
				>
					<Icon name="key" size={30} color={t.text} />
					<View style={styles.cardText}>
						<Text style={[styles.cardTitle, { color: t.text, fontFamily: fontFamily(800) }]}>
							Join with a code
						</Text>
						<Text style={[styles.cardSubtitle, { color: t.sub }]}>
							Someone sent you an invite code
						</Text>
					</View>
				</Pressable>
			</View>
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
	cards: {
		gap: 14,
		marginTop: 36,
	},
	card: {
		borderRadius: 24,
		padding: 22,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 16,
	},
	cardPressed: {
		transform: [{ scale: 0.98 }],
	},
	cardText: {
		flex: 1,
	},
	cardTitle: {
		fontSize: 18,
	},
	cardSubtitle: {
		fontSize: 13,
		marginTop: 2,
	},
});
