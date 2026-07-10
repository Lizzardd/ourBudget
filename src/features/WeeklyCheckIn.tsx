/**
 * IN-APP SIMULATION ONLY.
 *
 * This sheet is the "weekly check-in" surfaced entirely inside the app —
 * there is no OS push notification and no email behind it. `MondayNotification`
 * (the banner) opens this sheet in-app when tapped; a later phase can add a
 * real scheduled push/email that deep-links here, but that is out of scope
 * for this task.
 *
 * Fidelity source: `docs/design/BudgetApp-Prototype.dc.html`, the
 * `─── WEEKLY CHECK-IN SHEET ───` block. The four `weeklyRows` there are
 * mocked placeholders in the prototype; here they're computed for real from
 * `transactions.weeklySummary` (last 7 days, see that query's docblock for
 * the "over vs. on track" rule).
 */
import { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { fmt } from '../budget/money';
import { Icon } from '../components/Icon';
import { Sheet } from '../components/Sheet';
import { useHousehold } from '../hooks/useHousehold';
import { useWeeklySummary } from '../hooks/useSummary';
import { useToast } from '../lib/toast';
import { fontFamily } from '../theme/fonts';
import { useTheme } from '../theme/useTheme';

export interface WeeklyCheckInProps {
	open: boolean;
	onClose: () => void;
	/**
	 * Anchor time for the 7-day window — passed in (rather than read via
	 * `Date.now()` here) so the sheet and the `MondayNotification` banner
	 * that opens it always agree on the same week.
	 */
	nowMs: number;
}

interface WeeklyRow {
	/** Material Symbols Rounded ligature name (see src/components/Icon.tsx). */
	emoji: string;
	title: string;
	line: string;
}

function weekOfLabel(startMs: number): string {
	const d = new Date(startMs);
	const month = d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
	return `Week of ${month} ${d.getUTCDate()}`;
}

/**
 * The weekly check-in sheet: 4 rows summarizing the last 7 days of spend,
 * plus a warm close button that hands off to a toast. Real aggregation
 * comes from `useWeeklySummary` (backed by `transactions.weeklySummary`).
 */
export function WeeklyCheckIn({ open, onClose, nowMs }: WeeklyCheckInProps) {
	const { t, accent } = useTheme();
	const { currency } = useHousehold();
	const { weekly, loading } = useWeeklySummary(nowMs);
	const { toast } = useToast();

	const cur = currency ?? 'AED';

	const rows: WeeklyRow[] = useMemo(() => {
		if (!weekly) {
			return [];
		}

		const spentRow: WeeklyRow = {
			emoji: 'payments',
			title: 'Spent last week',
			line:
				weekly.txnCount > 0
					? `${fmt(weekly.totalSpent, cur)} across ${weekly.txnCount} purchase${weekly.txnCount === 1 ? '' : 's'}`
					: 'Nothing logged yet this week',
		};

		const biggestRow: WeeklyRow = weekly.biggest
			? {
					emoji: 'grocery',
					title: `Biggest: ${weekly.biggest.name}`,
					line: `${fmt(weekly.biggest.spent, cur)} was your top spend this week`,
				}
			: {
					emoji: 'grocery',
					title: 'Biggest spend',
					line: 'No purchases yet this week',
				};

		const watchRow: WeeklyRow = weekly.watch
			? {
					emoji: 'restaurant',
					title: `Watch: ${weekly.watch.name}`,
					line: `${fmt(weekly.watch.overBy, cur)} over its monthly limit already — worth a look`,
				}
			: {
					emoji: 'restaurant',
					title: 'Nothing to watch',
					line: 'Every category is within its monthly limit — nice work',
				};

		const onTrackNames = weekly.onTrack.map((c) => c.name);
		const cruisingLine =
			onTrackNames.length === 0
				? 'Nothing cruising this week yet'
				: onTrackNames.length <= 3
					? `${onTrackNames.join(', ')} ${onTrackNames.length === 1 ? 'is' : 'are'} comfortably under budget`
					: `${onTrackNames.slice(0, 3).join(', ')}, and ${onTrackNames.length - 3} more are comfortably under budget`;
		const cruisingRow: WeeklyRow = {
			emoji: 'eco',
			title: 'Cruising',
			line: cruisingLine,
		};

		return [spentRow, biggestRow, watchRow, cruisingRow];
	}, [weekly, cur]);

	const handleClose = () => {
		toast('Have a lovely week 🌿');
		onClose();
	};

	return (
		<Sheet open={open} onClose={onClose}>
			<View style={styles.header}>
				<View style={styles.headerText}>
					<Text style={[styles.title, { color: t.text, fontFamily: fontFamily(800) }]}>
						Your Monday check-in ☀️
					</Text>
					<Text style={[styles.subtitle, { color: t.sub }]}>
						{weekly ? weekOfLabel(weekly.startMs) : 'Week of…'}
					</Text>
				</View>
				<TouchableOpacity
					accessibilityRole="button"
					accessibilityLabel="Close"
					onPress={onClose}
					style={[styles.closeButton, { backgroundColor: t.el }]}
				>
					<Text style={[styles.closeButtonText, { color: t.sub }]}>✕</Text>
				</TouchableOpacity>
			</View>

			<View style={styles.rows}>
				{loading || rows.length === 0 ? (
					<View style={[styles.row, { backgroundColor: t.el }]}>
						<Text style={[styles.rowLine, { color: t.sub }]}>Crunching your week…</Text>
					</View>
				) : (
					rows.map((row) => (
						<View key={row.title} style={[styles.row, { backgroundColor: t.el }]}>
							<Icon name={row.emoji} size={24} color={t.text} />
							<View style={styles.rowText}>
								<Text style={[styles.rowTitle, { color: t.text, fontFamily: fontFamily(800) }]}>
									{row.title}
								</Text>
								<Text style={[styles.rowLine, { color: t.sub }]}>{row.line}</Text>
							</View>
						</View>
					))
				)}
			</View>

			<TouchableOpacity
				accessibilityRole="button"
				accessibilityLabel="Have a lovely week"
				onPress={handleClose}
				style={[styles.closeCta, { backgroundColor: accent }]}
			>
				<Text style={styles.closeCtaText}>Have a lovely week 🌿</Text>
			</TouchableOpacity>
		</Sheet>
	);
}

const styles = StyleSheet.create({
	header: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	headerText: {
		flex: 1,
	},
	title: {
		fontSize: 19,
	},
	subtitle: {
		fontSize: 13,
		marginTop: 2,
	},
	closeButton: {
		width: 32,
		height: 32,
		borderRadius: 16,
		alignItems: 'center',
		justifyContent: 'center',
	},
	closeButtonText: {
		fontSize: 14,
	},
	rows: {
		gap: 10,
	},
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		borderRadius: 18,
		paddingVertical: 13,
		paddingHorizontal: 16,
	},
	rowText: {
		flex: 1,
		minWidth: 0,
	},
	rowTitle: {
		fontSize: 14,
	},
	rowLine: {
		fontSize: 13,
		marginTop: 1,
		lineHeight: 18,
	},
	closeCta: {
		height: 56,
		borderRadius: 999,
		alignItems: 'center',
		justifyContent: 'center',
	},
	closeCtaText: {
		fontSize: 16,
		fontFamily: fontFamily(800),
		color: '#2B0E1A',
	},
});
