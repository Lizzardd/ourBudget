import { Authenticated, AuthLoading, Unauthenticated, useQuery } from 'convex/react';
import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { api } from '../convex/_generated/api';
import { POLICY_VERSION } from '../src/lib/policy';
import { useTheme } from '../src/theme/useTheme';

/**
 * Root auth gate. `<Unauthenticated>` sends visitors to the onboarding
 * welcome screen; `<Authenticated>` defers to `PostAuthGate`, which first
 * checks GDPR sign-up consent (redirecting to the consent screen if the
 * caller hasn't agreed to the current `POLICY_VERSION`), then whether the
 * signed-in user already belongs to a household, routing to the fork
 * (none yet) or straight into the app (has one). `<AuthLoading>` covers
 * the brief window before Convex Auth resolves.
 */
export default function Index() {
	return (
		<>
			<AuthLoading>
				<LoadingScreen />
			</AuthLoading>
			<Unauthenticated>
				<Redirect href="/(onboarding)/welcome" />
			</Unauthenticated>
			<Authenticated>
				<PostAuthGate />
			</Authenticated>
		</>
	);
}

function PostAuthGate() {
	const consent = useQuery(api.consent.myConsent, {});

	if (consent === undefined) {
		return <LoadingScreen />;
	}

	if (consent === null || consent.policyVersion !== POLICY_VERSION) {
		return <Redirect href="/(onboarding)/consent" />;
	}

	return <PostConsentGate />;
}

function PostConsentGate() {
	const households = useQuery(api.households.myHouseholds, {});

	if (households === undefined) {
		return <LoadingScreen />;
	}

	if (households.length === 0) {
		return <Redirect href="/(onboarding)/fork" />;
	}

	return <Redirect href="/(app)/home" />;
}

function LoadingScreen() {
	const { t, accent } = useTheme();

	return (
		<View style={[styles.container, { backgroundColor: t.bg }]}>
			<ActivityIndicator color={accent} />
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
	},
});
