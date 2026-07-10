import { StyleSheet, View } from 'react-native';

import Fork from '../(onboarding)/fork';
import { useTheme } from '../../src/theme/useTheme';

/**
 * Headless preview route for the Onboarding Fork screen — `Fork` has no
 * Convex/auth data dependencies (just theme + router), so this simply
 * re-renders it directly for a stable screenshot target. Mirrors the
 * themed background the real `(onboarding)/_layout.tsx` shell applies
 * (Fork itself sets no background, relying on that shell). Not linked
 * from any in-app nav; reachable only by navigating directly to
 * `/preview/fork`.
 */
export default function ForkPreview() {
	const { t } = useTheme();
	return (
		<View style={[styles.root, { backgroundColor: t.bg }]}>
			<Fork />
		</View>
	);
}

const styles = StyleSheet.create({
	root: {
		flex: 1,
	},
});
