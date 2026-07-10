/**
 * IN-APP SIMULATION ONLY.
 *
 * This banner is a purely in-app stand-in for a "Monday morning" nudge —
 * there is no OS push notification and no email involved, and no actual
 * scheduling: it simply renders whenever `settings.weeklyCheckin` is on and
 * the user is on Home. A later phase can wire a real scheduled push/email
 * that deep-links into the `WeeklyCheckIn` sheet this banner opens; that is
 * out of scope here.
 *
 * Fidelity source: `docs/design/BudgetApp-Prototype.dc.html`, the
 * `─── MONDAY NOTIFICATION ───` block (the `notifDown` slide-in). Ported to
 * an `Animated.View` with `useNativeDriver: false` for react-native-web
 * compatibility (no CSS-string transforms, no native-driver web support).
 */
import { useQuery } from 'convex/react';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { api } from '../../convex/_generated/api';
import { fmt } from '../budget/money';
import { useHousehold } from '../hooks/useHousehold';
import { useSettings } from '../hooks/useSettings';
import { useWeeklySummary } from '../hooks/useSummary';
import { fontFamily } from '../theme/fonts';
import { useTheme } from '../theme/useTheme';
import { WeeklyCheckIn } from './WeeklyCheckIn';

const HIDDEN_OFFSET = -90;

/**
 * The Home-only Monday banner + the `WeeklyCheckIn` sheet it opens. Reads
 * `settings.weeklyCheckin` to decide whether to show at all, and combines
 * this month's overall total (via `transactions.summary`) with the last
 * 7 days' "watch" category (via `transactions.weeklySummary`) for its body
 * copy: "<left> left overall. <cat> is <over> over — tap for your week."
 *
 * State here is deliberately local (dismissed / sheet-open) rather than a
 * new provider — Home is the only mount point for this task, so a context
 * would be premature plumbing.
 */
export function MondayNotification() {
	const { t, accent } = useTheme();
	const { householdId, currency } = useHousehold();
	const { settings, loading: settingsLoading } = useSettings();

	const [dismissed, setDismissed] = useState(false);
	const [sheetOpen, setSheetOpen] = useState(false);
	// Stable for the component's lifetime so the banner and the sheet it
	// opens always agree on the same 7-day window.
	const [nowMs] = useState(() => Date.now());

	const now = new Date(nowMs);
	const monthSummary = useQuery(
		api.transactions.summary,
		householdId ? { householdId, year: now.getFullYear(), month: now.getMonth() + 1 } : 'skip'
	);
	const { weekly } = useWeeklySummary(nowMs);

	const translateY = useRef(new Animated.Value(HIDDEN_OFFSET)).current;
	const opacity = useRef(new Animated.Value(0)).current;

	const cur = currency ?? 'AED';
	const ready = !settingsLoading && !!householdId && !!monthSummary && !!weekly;
	// Only surface the "Monday check-in" on an actual Monday (getDay: 0=Sun, 1=Mon).
	const isMonday = now.getDay() === 1;
	const visible = !!settings?.weeklyCheckin && isMonday && !dismissed && ready;

	useEffect(() => {
		if (visible) {
			Animated.parallel([
				Animated.timing(translateY, {
					toValue: 0,
					duration: 450,
					easing: Easing.bezier(0.2, 0.8, 0.3, 1),
					useNativeDriver: false,
				}),
				Animated.timing(opacity, {
					toValue: 1,
					duration: 350,
					easing: Easing.ease,
					useNativeDriver: false,
				}),
			]).start();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [visible]);

	if (!visible || !monthSummary || !weekly) {
		return null;
	}

	const leftOverall = Math.max(monthSummary.totalLimit - monthSummary.totalSpent, 0);
	const body = weekly.watch
		? `${fmt(leftOverall, cur)} left overall. ${weekly.watch.name} is ${fmt(weekly.watch.overBy, cur)} over — tap for your week.`
		: `${fmt(leftOverall, cur)} left overall. Nothing's over budget this week — tap for your week.`;

	return (
		<>
			<Animated.View
				style={[
					styles.wrap,
					{
						opacity,
						transform: [{ translateY }],
					},
				]}
			>
				<View style={[styles.banner, { backgroundColor: t.el, borderColor: t.line }]}>
					<TouchableOpacity
						accessibilityRole="button"
						accessibilityLabel="Open your weekly check-in"
						activeOpacity={0.9}
						onPress={() => setSheetOpen(true)}
						style={styles.bannerTap}
					>
						<View style={[styles.icon, { backgroundColor: accent }]}>
							<Text style={styles.iconText}>
								ob<Text style={styles.iconDot}>.</Text>
							</Text>
						</View>
						<View style={styles.textBlock}>
							<Text style={[styles.eyebrow, { color: t.sub }]}>ourbudget. · Mon 8:00</Text>
							<Text style={[styles.headline, { color: t.text, fontFamily: fontFamily(800) }]}>
								Your Monday check-in ☀️
							</Text>
							<Text style={[styles.body, { color: t.sub }]}>{body}</Text>
						</View>
					</TouchableOpacity>
					<TouchableOpacity
						accessibilityRole="button"
						accessibilityLabel="Dismiss"
						onPress={() => setDismissed(true)}
						style={styles.dismiss}
					>
						<Text style={[styles.dismissText, { color: t.sub }]}>✕</Text>
					</TouchableOpacity>
				</View>
			</Animated.View>

			<WeeklyCheckIn open={sheetOpen} onClose={() => setSheetOpen(false)} nowMs={nowMs} />
		</>
	);
}

const styles = StyleSheet.create({
	wrap: {
		position: 'absolute',
		top: 8,
		left: 10,
		right: 10,
		zIndex: 50,
	},
	banner: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		gap: 8,
		borderRadius: 22,
		borderWidth: 1,
		padding: 14,
		shadowColor: '#000',
		shadowOpacity: 0.35,
		shadowRadius: 24,
		shadowOffset: { width: 0, height: 12 },
		elevation: 8,
	},
	bannerTap: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'flex-start',
		gap: 12,
		minWidth: 0,
	},
	icon: {
		width: 34,
		height: 34,
		borderRadius: 11,
		alignItems: 'center',
		justifyContent: 'center',
	},
	iconText: {
		fontSize: 15,
		fontWeight: '900',
		letterSpacing: -1,
		color: '#FFF3F0',
	},
	iconDot: {
		color: '#2B0E1A',
	},
	textBlock: {
		flex: 1,
		minWidth: 0,
	},
	eyebrow: {
		fontSize: 11,
		fontWeight: '700',
	},
	headline: {
		fontSize: 14,
		marginTop: 2,
	},
	body: {
		fontSize: 13,
		marginTop: 2,
		lineHeight: 18,
	},
	dismiss: {
		paddingHorizontal: 4,
		paddingVertical: 2,
	},
	dismissText: {
		fontSize: 13,
	},
});
