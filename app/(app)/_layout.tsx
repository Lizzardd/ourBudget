import { Authenticated, AuthLoading, Unauthenticated } from 'convex/react';
import { Redirect, Slot, usePathname } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Fab } from '../../src/components/Fab';
import { TabBar } from '../../src/components/TabBar';
import { AddExpenseProvider } from '../../src/features/AddExpenseProvider';
import { MonthTransactionsProvider } from '../../src/features/MonthTransactionsProvider';
import { NewCategoryProvider } from '../../src/features/NewCategoryProvider';
import { useHousehold } from '../../src/hooks/useHousehold';
import { useTheme } from '../../src/theme/useTheme';

/**
 * Shell for the three main tabs (Home / Reports / Settings):
 * renders the active tab via `Slot`, a floating `Fab`, and the custom
 * bottom `TabBar`. The `Fab` and `TabBar` are siblings of the tab content
 * rather than nested inside it, so sheets/overlays a tab screen opens
 * (via the shared `Sheet`/`Overlay` primitives) render as further
 * siblings and stack visually above this whole shell.
 *
 * `AddExpenseProvider` wraps all three so both the `Fab` and the
 * category-detail "+ Add to <name>" button (rendered via `Slot`) can open
 * the single, app-wide Add-Expense sheet via `useAddExpenseSheet()`.
 * `NewCategoryProvider` similarly lets the Home "+ New category" row and
 * the Settings row open the app-wide New-category sheet via
 * `useNewCategorySheet()`. `MonthTransactionsProvider` lets Reports'
 * trend/category/annual rows open the app-wide Month Transactions sheet
 * via `useMonthTransactionsSheet()`.
 */
/**
 * Auth gate for the whole `(app)` group.
 *
 * This layout used to call `useHousehold()` (a `myHouseholds` query) directly,
 * on the assumption that anyone reaching an `(app)` route had already passed the
 * root gate in `app/index.tsx`. That holds for the native app, which always
 * boots at `/` — but NOT for the static web export, where every route is its own
 * HTML file. Loading `/home` directly there mounts this layout without ever
 * running the root gate, so `myHouseholds` fires unauthenticated, throws "Not
 * authenticated", and (before the error boundary) blanked the whole page. A
 * signed-in user simply refreshing on a tab hit exactly this.
 *
 * So the group gates itself: `myHouseholds` only runs once auth is confirmed.
 * Unauthenticated visitors go to the welcome screen; the brief auth-resolving
 * window shows a spinner instead of firing the query.
 */
export default function AppLayout() {
	return (
		<>
			<AuthLoading>
				<LoadingScreen />
			</AuthLoading>
			<Unauthenticated>
				<Redirect href="/(onboarding)/welcome" />
			</Unauthenticated>
			<Authenticated>
				<AppShell />
			</Authenticated>
		</>
	);
}

function AppShell() {
	const { t } = useTheme();
	const insets = useSafeAreaInsets();
	const { householdId, loading: householdLoading } = useHousehold();
	// The prototype shows the "+ Add expense" pill on the Home tab only
	// (`<sc-if value="{{ tabHome }}">`); mount the Fab conditionally to match.
	const onHome = usePathname() === '/home';

	// If the signed-in user has no household (e.g. their membership was
	// removed while they were inside the app), route to the fork instead of
	// leaving a tab screen spinning on a query that will never resolve.
	if (!householdLoading && !householdId) {
		return <Redirect href="/(onboarding)/fork" />;
	}

	return (
		<View style={[styles.root, { backgroundColor: t.bg }]}>
			<NewCategoryProvider>
				<AddExpenseProvider>
					<MonthTransactionsProvider>
						<View style={[styles.content, { paddingTop: insets.top }]}>
							<Slot />
						</View>
						{onHome ? <Fab /> : null}
						<TabBar />
					</MonthTransactionsProvider>
				</AddExpenseProvider>
			</NewCategoryProvider>
		</View>
	);
}

function LoadingScreen() {
	const { t, accent } = useTheme();

	return (
		<View style={[styles.loading, { backgroundColor: t.bg }]}>
			<ActivityIndicator color={accent} />
		</View>
	);
}

const styles = StyleSheet.create({
	loading: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
	},
	root: {
		flex: 1,
	},
	content: {
		flex: 1,
	},
});
