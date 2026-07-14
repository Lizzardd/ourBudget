import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { FadeIn } from '../components/FadeIn';
import { Icon } from '../components/Icon';
import { ProgressBar } from '../components/ProgressBar';
import type { AnnualPaceRow, CategoryBar, TrendCol } from '../budget/reports';
import { fontFamily } from '../theme/fonts';
import { useTheme } from '../theme/useTheme';

/**
 * Parses a 'NN%' width/height string into its numeric percentage. Used to
 * feed `ProgressBar`, which wants a plain 0..100 number rather than the
 * pre-formatted string the reports hook hands back.
 */
function pctNum(w: string): number {
	return parseInt(w, 10) || 0;
}

/**
 * `annualPace` rows' bar color is either a plain hex (under budget) or a
 * `linear-gradient(90deg, from, to)` CSS string (over budget, per spec D).
 * `ProgressBar` doesn't parse CSS gradients — it renders one itself via
 * `from`/`to` props — so split the gradient string into its two stops here.
 */
function barColor(color: string): { from: string; to?: string } {
	const match = color.match(/linear-gradient\([^,]+,\s*([^,]+),\s*([^)]+)\)/);
	return match ? { from: match[1].trim(), to: match[2].trim() } : { from: color };
}

export interface ReportsRow {
	id: string;
	emoji: string;
	name: string;
	color: string;
}

export interface ReportsViewProps {
	categoryBars: CategoryBar[];
	trendCols: TrendCol[];
	annualPace: AnnualPaceRow[];
	selectedLabel: string;
	selectedTotalFmt: string;
	selectedLimitFmt: string;
	yearTick: string;
	onSelectMonth: (index: number) => void;
	onOpenCategory: (row: ReportsRow) => void;
	onOpenAnnual: (row: ReportsRow) => void;
}

/**
 * Pure presentation for the Reports tab: a "Month by Month Comparison"
 * trend (spend-vs-budget columns, tap to select a month), a spend-by-category
 * breakdown for the selected month, and an "Annual Budgets" year-to-date
 * pace list. Takes all its data and callbacks as props; no Convex/hook
 * data-fetching lives here — see `app/(app)/reports.tsx` for the container
 * that supplies them.
 */
export function ReportsView({
	categoryBars,
	trendCols,
	annualPace,
	selectedLabel,
	selectedTotalFmt,
	selectedLimitFmt,
	yearTick,
	onSelectMonth,
	onOpenCategory,
	onOpenAnnual,
}: ReportsViewProps) {
	const { t, accent } = useTheme();

	return (
		<FadeIn style={styles.container}>
		<ScrollView
			style={[styles.container, { backgroundColor: t.bg }]}
			contentContainerStyle={styles.content}
		>
			<View style={styles.header}>
				<Text style={[styles.title, { color: t.text, fontFamily: fontFamily(800) }]}>
					Reports
				</Text>
				<Text style={[styles.subtitle, { color: t.text, fontFamily: fontFamily(800) }]}>
					{selectedLabel}
				</Text>
			</View>

			<View style={[styles.card, { backgroundColor: t.card }]}>
				<Text style={[styles.cardTitle, { color: t.text, fontFamily: fontFamily(800) }]}>
					Month by Month Comparison
				</Text>
				<Text style={[styles.cardHint, { color: t.sub }]}>Tap a month to view it below</Text>
				<View style={styles.trendRow}>
					{trendCols.map((col, i) => (
						<Pressable
							key={`${col.m}-${i}`}
							onPress={() => onSelectMonth(i)}
							style={styles.trendCol}
						>
							<Text
								style={[
									styles.trendAmt,
									{ color: t.sub, fontFamily: fontFamily(700) },
								]}
							>
								{col.amt}
							</Text>
							<View style={styles.trendBarArea}>
								<View
									style={[
										styles.trendTrack,
										{
											height: col.budgetH as `${number}%`,
											backgroundColor: t.track,
											justifyContent: col.fillSide,
										},
									]}
								>
									<View
										style={[
											styles.trendFill,
											{
												height: col.fillH as `${number}%`,
												backgroundColor: col.fillColor,
												borderTopLeftRadius: col.fillRadius === '0' ? 0 : 4,
												borderTopRightRadius: col.fillRadius === '0' ? 0 : 4,
											},
										]}
									/>
								</View>
							</View>
							<Text
								style={[
									styles.trendLabel,
									{ color: col.selected ? accent : t.sub, fontFamily: fontFamily(700) },
								]}
							>
								{col.m}
							</Text>
						</Pressable>
					))}
				</View>
			</View>

			<View style={[styles.card, styles.totalsCard, { backgroundColor: t.card }]}>
				<Text style={[styles.totalsAmt, { color: t.text, fontFamily: fontFamily(900) }]}>
					{selectedTotalFmt}
				</Text>
				<Text style={[styles.totalsOf, { color: t.sub }]}>of {selectedLimitFmt} spent</Text>
			</View>

			<View style={[styles.card, styles.categoryCard, { backgroundColor: t.card }]}>
				<View style={styles.barList}>
					{categoryBars.map((r) => (
						<Pressable key={r.id} onPress={() => onOpenCategory(r)} style={styles.barRowWrap}>
							<View style={styles.barRow}>
								<Icon name={r.emoji} size={22} color={t.text} />
								<Text
									style={[styles.rowName, { color: t.text, fontFamily: fontFamily(700) }]}
								>
									{r.name}
								</Text>
								<Text style={[styles.rowAmt, { color: t.text, fontFamily: fontFamily(800) }]}>
									{r.amtFmt}
								</Text>
							</View>
							<View style={styles.barTrack}>
								<ProgressBar pct={pctNum(r.w)} from={r.color} height={10} />
							</View>
						</Pressable>
					))}
				</View>
			</View>

			<View style={[styles.card, { backgroundColor: t.card, marginTop: 12 }]}>
				<View style={styles.annualHeader}>
					<Text style={[styles.cardTitle, { color: t.text, fontFamily: fontFamily(800) }]}>
						Annual Budgets
					</Text>
					<Text style={[styles.annualHint, { color: t.sub }]}>
						as at {selectedLabel} · tick = point in year
					</Text>
				</View>
				<View style={styles.barList}>
					{annualPace.map((a) => (
						<Pressable key={a.id} onPress={() => onOpenAnnual(a)}>
							<View style={styles.barRow}>
								<Icon name={a.emoji} size={20} color={t.text} />
								<Text
									style={[styles.rowName, { color: t.text, fontFamily: fontFamily(700) }]}
								>
									{a.name}
								</Text>
								<Text style={[styles.rowUsed, { color: t.sub, fontFamily: fontFamily(700) }]}>
									{a.usedFmt}
								</Text>
							</View>
							<View style={styles.annualTrackWrap}>
								<View style={styles.barTrack}>
									<ProgressBar
										pct={pctNum(a.w)}
										from={barColor(a.color).from}
										to={barColor(a.color).to}
										height={10}
									/>
								</View>
								<View
									style={[
										styles.yearTick,
										{ left: yearTick as `${number}%`, backgroundColor: t.sub },
									]}
								/>
							</View>
							<Text
								style={[
									styles.paceText,
									{ color: a.paceColor, fontFamily: fontFamily(600) },
								]}
							>
								{a.pace}
							</Text>
						</Pressable>
					))}
				</View>
			</View>
		</ScrollView>
		</FadeIn>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	content: {
		padding: 18,
		paddingTop: 12,
		paddingBottom: 150,
	},
	header: {
		flexDirection: 'row',
		alignItems: 'baseline',
		justifyContent: 'space-between',
		padding: 8,
		paddingBottom: 16,
	},
	title: {
		fontSize: 22,
		letterSpacing: -0.4,
	},
	subtitle: {
		fontSize: 16,
	},
	card: {
		borderRadius: 24,
		padding: 20,
	},
	cardTitle: {
		fontSize: 15,
	},
	cardHint: {
		fontSize: 12,
		marginTop: 2,
	},
	barList: {
		gap: 14,
		marginTop: 16,
	},
	barRowWrap: {
		gap: 6,
	},
	barRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	rowName: {
		fontSize: 13,
		flex: 1,
	},
	rowAmt: {
		fontSize: 13,
	},
	rowUsed: {
		fontSize: 12,
	},
	barTrack: {
		marginTop: 6,
	},
	paceText: {
		fontSize: 11,
		marginTop: 5,
	},
	trendRow: {
		flexDirection: 'row',
		alignItems: 'flex-end',
		gap: 12,
		height: 130,
		marginTop: 18,
	},
	trendCol: {
		flex: 1,
		height: '100%',
		flexDirection: 'column',
		alignItems: 'center',
		gap: 6,
	},
	trendAmt: {
		fontSize: 10,
		lineHeight: 14,
	},
	trendBarArea: {
		flex: 1,
		width: '100%',
		flexDirection: 'column',
		justifyContent: 'flex-end',
		alignItems: 'center',
	},
	trendTrack: {
		width: '100%',
		maxWidth: 40,
		borderTopLeftRadius: 10,
		borderTopRightRadius: 10,
		borderBottomLeftRadius: 4,
		borderBottomRightRadius: 4,
		overflow: 'hidden',
	},
	trendFill: {
		width: '100%',
	},
	trendLabel: {
		fontSize: 11,
	},
	totalsCard: {
		marginTop: 12,
		flexDirection: 'row',
		alignItems: 'baseline',
		gap: 8,
	},
	totalsAmt: {
		fontSize: 24,
		letterSpacing: -0.5,
	},
	totalsOf: {
		fontSize: 13,
	},
	categoryCard: {
		marginTop: 12,
	},
	annualHeader: {
		flexDirection: 'row',
		alignItems: 'baseline',
		gap: 8,
	},
	annualHint: {
		fontSize: 11,
	},
	annualTrackWrap: {
		marginTop: 6,
	},
	yearTick: {
		position: 'absolute',
		top: -3,
		width: 2,
		height: 16,
		borderRadius: 2,
	},
});
