import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useJoinHousehold } from '../../src/hooks/useHousehold';
import { fontFamily } from '../../src/theme/fonts';
import { useTheme } from '../../src/theme/useTheme';

/**
 * "Join with a code" branch of the fork. Codes are uppercased and stripped of
 * anything non-alphanumeric as the user types (matching the prototype's
 * `joinChange` handler), so a pasted `sunny-0790` from the old hyphenated
 * format still lands on `SUNNY0790`. Join failures surface inline rather than
 * failing silently, since a mistyped or expired code is an expected,
 * recoverable error.
 */
export default function Join() {
	const { t, accent } = useTheme();
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const joinHousehold = useJoinHousehold();

	const [code, setCode] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [joining, setJoining] = useState(false);

	const submit = async () => {
		const trimmed = code.trim();
		if (!trimmed || joining) {
			return;
		}
		setJoining(true);
		setError(null);
		try {
			await joinHousehold({ code: trimmed });
			router.replace('/(app)/home');
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Could not join that household');
		} finally {
			setJoining(false);
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
				Enter your invite code
			</Text>
			<Text style={[styles.body, { color: t.sub }]}>
				It looks like SUNNY0790 — check your messages.
			</Text>
			<TextInput
				value={code}
				onChangeText={(next) => {
					setError(null);
					setCode(next.toUpperCase().replace(/[^A-Z0-9]/g, ''));
				}}
				placeholder="SUNNY0790"
				placeholderTextColor={t.sub}
				autoCapitalize="characters"
				autoCorrect={false}
				style={[
					styles.input,
					{
						backgroundColor: t.card,
						color: t.text,
						borderColor: error ? '#DD7A5E' : `${accent}66`,
					},
				]}
			/>
			{error ? <Text style={styles.error}>{error}</Text> : null}
			<View style={styles.spacer} />
			<Pressable
				accessibilityRole="button"
				accessibilityLabel="Join household"
				disabled={joining || code.trim().length === 0}
				onPress={submit}
				style={({ pressed }) => [
					styles.primaryButton,
					{ backgroundColor: accent, opacity: joining || code.trim().length === 0 ? 0.6 : 1 },
					pressed ? styles.pressed : null,
				]}
			>
				<Text style={styles.primaryLabel}>{joining ? 'Joining…' : 'Join household'}</Text>
			</Pressable>
			<Pressable
				accessibilityRole="button"
				accessibilityLabel="Back"
				onPress={() => router.back()}
				style={styles.backButton}
			>
				<Text style={[styles.backLabel, { color: t.sub, fontFamily: fontFamily(600) }]}>
					Back
				</Text>
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
		marginTop: 8,
	},
	input: {
		marginTop: 32,
		height: 64,
		borderRadius: 20,
		borderWidth: 1.5,
		fontSize: 26,
		fontWeight: '800',
		letterSpacing: 2,
		textAlign: 'center',
	},
	error: {
		marginTop: 12,
		fontSize: 13,
		color: '#DD7A5E',
		textAlign: 'center',
	},
	spacer: {
		flex: 1,
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
	backButton: {
		height: 44,
		alignItems: 'center',
		justifyContent: 'center',
		marginTop: 6,
	},
	backLabel: {
		fontSize: 14,
	},
});
