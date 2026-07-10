import { useRouter, useSegments } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { fontFamily } from '../theme/fonts';
import { useTheme } from '../theme/useTheme';

export type TabKey = 'home' | 'reports' | 'settings';

const TABS: ReadonlyArray<{ key: TabKey; label: string }> = [
	{ key: 'home', label: 'Home' },
	{ key: 'reports', label: 'Reports' },
	{ key: 'settings', label: 'Settings' },
];

const TAB_ROW_HEIGHT = 56;

function TabIcon({ tab, color }: { tab: TabKey; color: string }) {
	switch (tab) {
		case 'home':
			return (
				<Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
					<Path
						d="M4 11 L12 4.5 L20 11 V19.5 H4 Z"
						stroke={color}
						strokeWidth={2}
						strokeLinejoin="round"
					/>
				</Svg>
			);
		case 'reports':
			return (
				<Svg width={22} height={22} viewBox="0 0 24 24" fill={color}>
					<Rect x={4} y={12} width={4} height={8} rx={1.5} />
					<Rect x={10} y={7} width={4} height={13} rx={1.5} />
					<Rect x={16} y={10} width={4} height={10} rx={1.5} />
				</Svg>
			);
		case 'settings':
			return (
				<Svg width={22} height={22} viewBox="0 0 24 24" fill={color}>
					<Circle cx={6} cy={7} r={2} />
					<Rect x={10} y={6} width={10} height={2} rx={1} />
					<Circle cx={16} cy={13} r={2} />
					<Rect x={4} y={12} width={8} height={2} rx={1} />
					<Circle cx={9} cy={19} r={2} />
					<Rect x={13} y={18} width={7} height={2} rx={1} />
				</Svg>
			);
		default:
			return null;
	}
}

/**
 * Custom bottom tab bar for the `(app)` shell — Home / Reports / Settings,
 * icon + label. The active tab is tinted with the theme accent
 * (matches the prototype's `tabColor`), inactive tabs use `t.sub`.
 * Navigates with `router.replace` so switching tabs never grows the
 * history stack. Includes the system nav-bar inset strip below the row so
 * the bar reads as one solid surface down to the bottom of the screen.
 */
export function TabBar() {
	const { t, accent } = useTheme();
	const segments = useSegments();
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const active = segments[segments.length - 1] as TabKey;

	return (
		<View style={[styles.wrap, { backgroundColor: t.card, borderTopColor: t.line }]}>
			<View style={styles.row}>
				{TABS.map(({ key, label }) => {
					const isActive = active === key;
					const color = isActive ? accent : t.sub;
					return (
						<TouchableOpacity
							key={key}
							accessibilityRole="button"
							accessibilityLabel={label}
							accessibilityState={{ selected: isActive }}
							style={styles.tab}
							onPress={() => router.replace(`/${key}`)}
						>
							<TabIcon tab={key} color={color} />
							<Text style={[styles.label, { color, fontFamily: fontFamily(700) }]}>{label}</Text>
						</TouchableOpacity>
					);
				})}
			</View>
			<View style={{ height: 6 + insets.bottom, backgroundColor: t.card }} />
		</View>
	);
}

const styles = StyleSheet.create({
	wrap: {
		borderTopWidth: 1,
	},
	row: {
		height: TAB_ROW_HEIGHT,
		flexDirection: 'row',
		alignItems: 'stretch',
	},
	tab: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		gap: 3,
	},
	label: {
		fontSize: 10,
	},
});
