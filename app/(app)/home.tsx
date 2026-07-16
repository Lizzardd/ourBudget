import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { FadeIn } from '../../src/components/FadeIn';
import { Loading } from '../../src/components/Loading';
import { monthLabel, monthRange } from '../../src/budget/periods';
import { MondayNotification } from '../../src/features/MondayNotification';
import { useMonthTransactionsSheet } from '../../src/features/MonthTransactionsProvider';
import { useNewCategorySheet } from '../../src/features/NewCategoryProvider';
import { useHousehold } from '../../src/hooks/useHousehold';
import { useHouseholdMembers } from '../../src/hooks/useHouseholdMembers';
import { useSettings } from '../../src/hooks/useSettings';
import { useSummary } from '../../src/hooks/useSummary';
import { HomeView } from '../../src/screens/HomeView';

/**
 * Home dashboard container — the app's centerpiece screen. Wires up the
 * Convex-backed hooks (summary, settings, household members) plus the
 * New-category sheet trigger, and hands the resulting view-model to
 * `HomeView` (the pure presentation, in `src/screens/HomeView.tsx`) for
 * rendering.
 *
 * `MondayNotification` is mounted here (see its NOTES on why it's an
 * in-app-only simulation) as an absolute-positioned sibling of the
 * `HomeView`'s `ScrollView`, so it slides in over the Home content rather
 * than scrolling with it.
 */
export default function Home() {
	const router = useRouter();
	const { open: openNewCategory } = useNewCategorySheet();
	const { open: openMonthTransactions } = useMonthTransactionsSheet();
	const { householdId } = useHousehold();
	const now = new Date();
	// `month` is 0-based, matching Date.getMonth() and monthRange()'s Date.UTC()
	// call. Passing `getMonth() + 1` here queried NEXT month, which is empty —
	// so Home showed Đ0 spent while the category screens, which pass getMonth(),
	// showed the real figures.
	const { sections, summary, loading } = useSummary(now.getFullYear(), now.getMonth());
	const { settings } = useSettings();
	const { householdName, members } = useHouseholdMembers();
	const layout = settings?.layout ?? 'cozy-cards';
	const firstName = settings?.displayName?.split(' ')[0] ?? '';
	const monthLbl = monthLabel(now.getFullYear(), now.getMonth());

	if (loading || !summary) {
		return <Loading />;
	}

	const greeting =
		settings && householdName && members
			? { firstName, householdName, monthLabel: monthLbl, members }
			: undefined;

	return (
		<View style={styles.root}>
			<MondayNotification />
			<FadeIn style={styles.container}>
				<HomeView
					greeting={greeting}
					summary={summary}
					sections={sections}
					layout={layout}
					onOpenCategory={(id) => router.push(`/category/${id}`)}
					onOpenNewCategory={openNewCategory}
					onOpenAllTransactions={() => {
						if (!householdId) {
							return;
						}
						const { startMs, endMs } = monthRange(now.getFullYear(), now.getMonth());
						openMonthTransactions({
							mode: 'all',
							householdId,
							monthLabel: monthLbl,
							startMs,
							endMs,
						});
					}}
				/>
			</FadeIn>
		</View>
	);
}

const styles = StyleSheet.create({
	root: {
		flex: 1,
	},
	container: {
		flex: 1,
	},
});
