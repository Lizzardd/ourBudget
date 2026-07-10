import { useQuery } from 'convex/react';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { useCreateHousehold } from '../../src/hooks/useHousehold';
import { useToast } from '../../src/lib/toast';
import { fontFamily } from '../../src/theme/fonts';
import { useTheme } from '../../src/theme/useTheme';

const DEFAULT_HOUSEHOLD_NAME = 'Our Household';

/**
 * Creates a fresh household on mount (the "Create a household" branch of
 * the fork) and shows its generated invite code. `createHousehold` only
 * returns the id, so the code itself is read back via `myHouseholds` —
 * matching the freshly created id — rather than adding a bespoke query.
 */
export default function Invite() {
	const { t, accent } = useTheme();
	const router = useRouter();
	const { toast } = useToast();
	const insets = useSafeAreaInsets();
	const createHousehold = useCreateHousehold();
	const households = useQuery(api.households.myHouseholds, {});

	const [householdId, setHouseholdId] = useState<Id<'households'> | null>(null);
	const [error, setError] = useState<string | null>(null);
	const creating = useRef(false);

	useEffect(() => {
		if (creating.current || householdId !== null) {
			return;
		}
		creating.current = true;
		createHousehold({ name: DEFAULT_HOUSEHOLD_NAME, currency: 'AED' })
			.then((id) => setHouseholdId(id))
			.catch((err) => {
				creating.current = false;
				setError(err instanceof Error ? err.message : 'Could not create your household');
			});
	}, [createHousehold, householdId]);

	const household = households?.find((entry) => entry._id === householdId);
	const inviteCode = household?.inviteCode;

	const shareInvite = () => {
		toast('Invite link copied 📋');
	};

	if (error) {
		return (
			<View style={[styles.container, styles.centered, { paddingTop: insets.top + 56 }]}>
				<Text style={[styles.errorText, { color: t.text }]}>{error}</Text>
				<Pressable
					accessibilityRole="button"
					onPress={() => router.back()}
					style={[styles.backButton, { backgroundColor: t.el }]}
				>
					<Text style={[styles.backButtonLabel, { color: t.text, fontFamily: fontFamily(700) }]}>
						Back
					</Text>
				</Pressable>
			</View>
		);
	}

	if (!inviteCode) {
		return (
			<View style={[styles.container, styles.centered]}>
				<ActivityIndicator color={accent} />
			</View>
		);
	}

	return (
		<View
			style={[
				styles.container,
				{ paddingTop: insets.top + 56, paddingBottom: insets.bottom + 24 },
			]}
		>
			<Text style={[styles.title, { color: t.text, fontFamily: fontFamily(800) }]}>
				Your household is ready 🎉
			</Text>
			<Text style={[styles.body, { color: t.sub }]}>
				Share this code so your partner can join. Everything you both add stays perfectly in
				sync.
			</Text>
			<View style={styles.codeArea}>
				<View style={[styles.codeCard, { backgroundColor: t.card, borderColor: hexAlpha(accent) }]}>
					<Text style={[styles.codeLabel, { color: t.sub, fontFamily: fontFamily(700) }]}>
						INVITE CODE
					</Text>
					<Text style={[styles.codeValue, { color: accent, fontFamily: fontFamily(900) }]}>
						{inviteCode}
					</Text>
				</View>
				<Pressable
					accessibilityRole="button"
					accessibilityLabel="Share invite"
					onPress={shareInvite}
					style={({ pressed }) => [
						styles.shareButton,
						{ backgroundColor: t.el },
						pressed ? styles.pressed : null,
					]}
				>
					<Text style={[styles.shareLabel, { color: t.text, fontFamily: fontFamily(700) }]}>
						Share invite ↗
					</Text>
				</Pressable>
			</View>
			<Pressable
				accessibilityRole="button"
				accessibilityLabel="Enter our budget"
				onPress={() => router.replace('/(app)/home')}
				style={({ pressed }) => [
					styles.primaryButton,
					{ backgroundColor: accent },
					pressed ? styles.pressed : null,
				]}
			>
				<Text style={styles.primaryLabel}>Enter our budget</Text>
			</Pressable>
		</View>
	);
}

function hexAlpha(hex: string): string {
	return `${hex}80`;
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		paddingHorizontal: 24,
	},
	centered: {
		alignItems: 'center',
		justifyContent: 'center',
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
	codeArea: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		gap: 20,
	},
	codeCard: {
		borderRadius: 28,
		paddingVertical: 32,
		paddingHorizontal: 40,
		alignItems: 'center',
		borderWidth: 1,
		borderStyle: 'dashed',
	},
	codeLabel: {
		fontSize: 12,
		letterSpacing: 2,
	},
	codeValue: {
		fontSize: 40,
		letterSpacing: 2,
		marginTop: 8,
	},
	shareButton: {
		height: 52,
		paddingHorizontal: 32,
		borderRadius: 999,
		alignItems: 'center',
		justifyContent: 'center',
	},
	shareLabel: {
		fontSize: 15,
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
	errorText: {
		fontSize: 16,
		textAlign: 'center',
		marginBottom: 20,
		paddingHorizontal: 24,
	},
	backButton: {
		height: 48,
		paddingHorizontal: 28,
		borderRadius: 999,
		alignItems: 'center',
		justifyContent: 'center',
	},
	backButtonLabel: {
		fontSize: 15,
	},
});
