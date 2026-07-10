import { Slot } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '../../src/theme/useTheme';

/**
 * Shell for the onboarding route group (welcome / fork / invite / join).
 * Unlike the `(app)` shell there is no tab bar or Fab — just a themed
 * background behind whichever onboarding screen is active.
 */
export default function OnboardingLayout() {
	const { t } = useTheme();

	return (
		<View style={[styles.root, { backgroundColor: t.bg }]}>
			<Slot />
		</View>
	);
}

const styles = StyleSheet.create({
	root: {
		flex: 1,
	},
});
