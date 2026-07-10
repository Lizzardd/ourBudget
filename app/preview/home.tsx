import { StyleSheet, View } from 'react-native';

import type { CategoryCard, SummaryVM } from '../../src/budget/cards';
import { HomeView, type HomeSection } from '../../src/screens/HomeView';

/**
 * Headless preview route for the Home dashboard's PRESENTATION —
 * `HomeView` fed with hardcoded mock data matching the design prototype's
 * "Al-Marri home". Deliberately does NOT touch Convex or auth (no
 * `useSummary` / `useSettings` / `useHouseholdMembers` / household context),
 * so it can be rendered headlessly (e.g. via Playwright) without a signed-in
 * session. Not linked from any in-app nav; reachable only by navigating
 * directly to `/preview/home`.
 */

const GREETING = {
	firstName: 'Sara',
	householdName: 'The Al-Marri Home',
	monthLabel: 'July 2026',
	members: [
		{ userId: 'sara', initial: 'S', profileColor: '#D98BA4', isMe: true },
		{ userId: 'omar', initial: 'O', profileColor: '#7FA8A0', isMe: false },
	],
};

const SUMMARY: SummaryVM = {
	ringPct: 86,
	ringLabel: '86%',
	ringColor: '#86B478',
	totalSpentFmt: 'Đ10,295',
	totalLimitFmt: 'Đ12,000',
	summaryLine1: 'Đ1,705 left',
	summaryLine2: "you've got this 🌿",
	summaryColor: '#8FBF7E',
};

function card(input: {
	id: string;
	emoji: string;
	name: string;
	color: string;
	amtFmt: string;
	ofFmt: string;
	pctW: string;
	bar: { from: string; to: string | null };
	sub1: string;
	sub2: string;
	subColor: string;
	isAnnual?: boolean;
}): CategoryCard {
	return {
		id: input.id,
		emoji: input.emoji,
		name: input.name,
		isAnnual: input.isAnnual ?? false,
		amtFmt: input.amtFmt,
		ofFmt: input.ofFmt,
		pctW: input.pctW,
		bar: input.bar,
		sub1: input.sub1,
		sub2: input.sub2,
		subColor: input.subColor,
	};
}

const SECTIONS: HomeSection[] = [
	{
		title: 'This month',
		hint: 'resets on the 1st',
		cards: [
			card({
				id: 'groceries',
				emoji: 'grocery',
				name: 'Groceries',
				color: '#86B478',
				amtFmt: 'Đ1,720',
				ofFmt: 'of Đ2,500',
				pctW: '69%',
				bar: { from: '#86B478', to: null },
				sub1: 'Đ780 left',
				sub2: '',
				subColor: '#8FBF7E',
			}),
			card({
				id: 'dining-out',
				emoji: 'restaurant',
				name: 'Dining out',
				color: '#DD7A5E',
				amtFmt: 'Đ1,340',
				ofFmt: 'of Đ1,200',
				pctW: '100%',
				bar: { from: '#CE4B3A', to: '#B7301F' },
				sub1: 'Đ140 over',
				sub2: 'it happens 💛',
				subColor: '#DE4B37',
			}),
			card({
				id: 'transport',
				emoji: 'local_taxi',
				name: 'Transport',
				color: '#7FA8A0',
				amtFmt: 'Đ385',
				ofFmt: 'of Đ600',
				pctW: '64%',
				bar: { from: '#86B478', to: null },
				sub1: 'Đ215 left',
				sub2: '',
				subColor: '#8FBF7E',
			}),
			card({
				id: 'kids',
				emoji: 'toys',
				name: 'Kids',
				color: '#D98BA4',
				amtFmt: 'Đ610',
				ofFmt: 'of Đ900',
				pctW: '68%',
				bar: { from: '#86B478', to: null },
				sub1: 'Đ290 left',
				sub2: '',
				subColor: '#8FBF7E',
			}),
			card({
				id: 'housing',
				emoji: 'home',
				name: 'Housing',
				color: '#C9A66B',
				amtFmt: 'Đ6,000',
				ofFmt: 'of Đ6,000',
				pctW: '100%',
				bar: { from: '#86B478', to: null },
				sub1: 'Đ0 left',
				sub2: 'nearly there 🌿',
				subColor: '#8FBF7E',
			}),
			card({
				id: 'everything-else',
				emoji: 'auto_awesome',
				name: 'Everything else',
				color: '#B79FD1',
				amtFmt: 'Đ240',
				ofFmt: 'of Đ800',
				pctW: '30%',
				bar: { from: '#86B478', to: null },
				sub1: 'Đ560 left',
				sub2: '',
				subColor: '#8FBF7E',
			}),
		],
	},
	{
		title: 'Annual budgets',
		hint: 'build up all year',
		cards: [
			card({
				id: 'household-maintenance',
				emoji: 'handyman',
				name: 'Household maintenance',
				color: '#8FA6C9',
				amtFmt: 'Đ950',
				ofFmt: 'of Đ2,400',
				pctW: '40%',
				bar: { from: '#86B478', to: null },
				sub1: 'Đ1,450 left',
				sub2: '',
				subColor: '#8FBF7E',
				isAnnual: true,
			}),
			card({
				id: 'car-service',
				emoji: 'directions_car',
				name: 'Car service',
				color: '#C97F5E',
				amtFmt: 'Đ1,200',
				ofFmt: 'of Đ1,800',
				pctW: '67%',
				bar: { from: '#86B478', to: null },
				sub1: 'Đ600 left',
				sub2: '',
				subColor: '#8FBF7E',
				isAnnual: true,
			}),
			card({
				id: 'gifts',
				emoji: 'redeem',
				name: 'Gifts',
				color: '#D9A8C9',
				amtFmt: 'Đ880',
				ofFmt: 'of Đ1,000',
				pctW: '88%',
				bar: { from: '#86B478', to: null },
				sub1: 'Đ120 left',
				sub2: 'nearly there 🌿',
				subColor: '#8FBF7E',
				isAnnual: true,
			}),
		],
	},
];

export default function HomePreview() {
	return (
		<View style={styles.root}>
			<HomeView
				greeting={GREETING}
				summary={SUMMARY}
				sections={SECTIONS}
				layout="cozy-cards"
				onOpenCategory={() => {}}
				onOpenNewCategory={() => {}}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	root: {
		flex: 1,
	},
});
