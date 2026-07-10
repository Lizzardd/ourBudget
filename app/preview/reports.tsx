import { StyleSheet, View } from 'react-native';

import { ReportsView } from '../../src/screens/ReportsView';
import type { AnnualPaceRow, CategoryBar, TrendCol } from '../../src/budget/reports';

/**
 * Headless preview route for the Reports tab's PRESENTATION —
 * `ReportsView` fed with hardcoded mock data matching REAL production
 * output shape: a monthly budget of ~12k with most months landing close
 * to it (10-13k), one over-budget month (red), and the earliest month
 * near-zero (e.g. a household's first partial month of history — but
 * still non-zero, since `trendCols()` in `budget/reports.ts` drops truly
 * zero-spend leading months). Bars this close to the budget line are the
 * condition that used to push the amount label up into the card subtitle
 * (see `reports-preview.png` in `.superpowers/sdd/`) — this mock
 * reproduces that near-full-bars condition so the screenshot actually
 * exercises the overlap case. Deliberately does NOT touch Convex or auth,
 * so it can be rendered headlessly (e.g. via Playwright) without a
 * signed-in session. Not linked from any in-app nav; reachable only by
 * navigating directly to `/preview/reports`.
 */

const TREND_COLS: TrendCol[] = [
	{
		m: 'Feb',
		amt: '0,3k',
		budgetH: '92%',
		fillH: '3%',
		fillSide: 'flex-end',
		fillRadius: '4px 4px 0 0',
		fillColor: '#86B478',
		selected: false,
	},
	{
		m: 'Mar',
		amt: '10,2k',
		budgetH: '92%',
		fillH: '85%',
		fillSide: 'flex-end',
		fillRadius: '4px 4px 0 0',
		fillColor: '#86B478',
		selected: false,
	},
	{
		m: 'Apr',
		amt: '11,4k',
		budgetH: '92%',
		fillH: '95%',
		fillSide: 'flex-end',
		fillRadius: '4px 4px 0 0',
		fillColor: '#86B478',
		selected: false,
	},
	{
		m: 'May',
		amt: '13,1k',
		budgetH: '100%',
		fillH: '8%',
		fillSide: 'flex-start',
		fillRadius: '0',
		fillColor: '#C8402E',
		selected: false,
	},
	{
		m: 'Jun',
		amt: '10,9k',
		budgetH: '92%',
		fillH: '91%',
		fillSide: 'flex-end',
		fillRadius: '4px 4px 0 0',
		fillColor: '#86B478',
		selected: false,
	},
	{
		m: 'Jul',
		amt: '10,3k',
		budgetH: '92%',
		fillH: '86%',
		fillSide: 'flex-end',
		fillRadius: '4px 4px 0 0',
		fillColor: '#86B478',
		selected: true,
	},
];

const CATEGORY_BARS: CategoryBar[] = [
	{ id: 'groceries', emoji: 'grocery', name: 'Groceries', amtFmt: 'Đ1,720', color: '#86B478', w: '100%' },
	{ id: 'dining-out', emoji: 'restaurant', name: 'Dining out', amtFmt: 'Đ1,340', color: '#DD7A5E', w: '78%' },
	{ id: 'housing', emoji: 'home', name: 'Housing', amtFmt: 'Đ6,000', color: '#C9A66B', w: '35%' },
	{ id: 'transport', emoji: 'local_taxi', name: 'Transport', amtFmt: 'Đ385', color: '#7FA8A0', w: '22%' },
	{ id: 'kids', emoji: 'toys', name: 'Kids', amtFmt: 'Đ610', color: '#D98BA4', w: '35%' },
];

const ANNUAL_PACE: AnnualPaceRow[] = [
	{
		id: 'household-maintenance',
		emoji: 'handyman',
		name: 'Household maintenance',
		color: '#86B478',
		usedFmt: 'Đ950 of Đ2,400',
		w: '40%',
		pace: '40% used · comfortably on pace 🌿',
		paceColor: '#8FBF7E',
	},
	{
		id: 'car-service',
		emoji: 'directions_car',
		name: 'Car service',
		color: 'linear-gradient(90deg,#CE4B3A,#B7301F)',
		usedFmt: 'Đ1,950 of Đ1,800',
		w: '100%',
		pace: '108% used · a little ahead of the year 💛',
		paceColor: '#E3B063',
	},
	{
		id: 'gifts',
		emoji: 'redeem',
		name: 'Gifts',
		color: '#86B478',
		usedFmt: 'Đ880 of Đ1,000',
		w: '88%',
		pace: '88% used · comfortably on pace 🌿',
		paceColor: '#8FBF7E',
	},
];

export default function ReportsPreview() {
	return (
		<View style={styles.root}>
			<ReportsView
				categoryBars={CATEGORY_BARS}
				trendCols={TREND_COLS}
				annualPace={ANNUAL_PACE}
				selectedLabel="July 2026"
				selectedTotalFmt="Đ10,295"
				selectedLimitFmt="12,000"
				yearTick="51%"
				onSelectMonth={() => {}}
				onOpenCategory={() => {}}
				onOpenAnnual={() => {}}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	root: {
		flex: 1,
	},
});
