import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useTheme } from '../theme/useTheme';

export interface LoadingProps {
	/**
	 * `true` (default) fills the whole screen with the app background —
	 * for screens that render nothing else while their query is `undefined`.
	 * `false` renders a bounded, transparent placeholder for use *within* a
	 * screen that keeps other chrome (header, switcher) visible while a
	 * narrower piece of it — e.g. History's month cards — is still loading.
	 */
	fill?: boolean;
}

/**
 * Shared "still fetching" placeholder for every screen reading a Convex
 * query. Centralizes the spinner + theme-aware background so every
 * loading state looks the same rather than each screen hand-rolling its
 * own `ActivityIndicator` wrapper.
 */
export function Loading({ fill = true }: LoadingProps) {
	const { t } = useTheme();

	return (
		<View style={[fill ? styles.fill : styles.inline, fill ? { backgroundColor: t.bg } : null]}>
			<ActivityIndicator color={t.text} />
		</View>
	);
}

const styles = StyleSheet.create({
	fill: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
	},
	inline: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 60,
	},
});
