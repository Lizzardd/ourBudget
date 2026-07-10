import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CategoryCard } from '../components/CategoryCard';
import type { DashboardLayout } from '../components/CategoryCard';
import { ProgressRing } from '../components/ProgressRing';
import type { CategoryCard as CategoryCardVM, SummaryVM } from '../budget/cards';
import { fontFamily } from '../theme/fonts';
import { useTheme } from '../theme/useTheme';

export interface HomeGreeting {
	firstName: string;
	householdName: string;
	monthLabel: string;
	members: { userId: string; initial: string; profileColor: string; isMe: boolean }[];
}

export interface HomeSection {
	title: string;
	hint: string;
	cards: CategoryCardVM[];
}

export interface HomeViewProps {
	greeting: HomeGreeting | undefined;
	summary: SummaryVM;
	sections: HomeSection[];
	layout: DashboardLayout;
	onOpenCategory: (id: string) => void;
	onOpenNewCategory: () => void;
}

/**
 * Pure presentation for the Home dashboard — the app's centerpiece screen.
 * Shows the month's spend ring + total, then the "This month" and "Annual
 * budgets" sections, each rendered in whichever layout (`cozy-cards` /
 * `grid` / `compact`) the household picked in Settings. Takes ALL its data
 * and callbacks as props; no Convex/hook data-fetching lives here — see
 * `app/(app)/home.tsx` (the real container) and `app/preview/home.tsx` (the
 * mock-data preview route) for the two callers.
 */
export function HomeView({ greeting, summary, sections, layout, onOpenCategory, onOpenNewCategory }: HomeViewProps) {
	const { t, accent } = useTheme();

	return (
		<ScrollView
			style={[styles.container, { backgroundColor: t.bg }]}
			contentContainerStyle={styles.content}
		>
			{greeting ? (
				<View style={styles.greeting}>
					<View style={styles.greetingText}>
						<Text style={[styles.greetingHi, { color: t.text, fontFamily: fontFamily(800) }]}>
							Hi {greeting.firstName} 👋
						</Text>
						<Text style={[styles.greetingSub, { color: t.sub, fontFamily: fontFamily(400) }]}>
							{greeting.monthLabel}
						</Text>
					</View>
					<View style={styles.greetingRight}>
						<Text style={[styles.householdName, { color: t.text, fontFamily: fontFamily(800) }]}>
							{greeting.householdName}
						</Text>
						<View style={styles.avatarStack}>
							{greeting.members.map((member, index) => (
								<View
									key={member.userId}
									style={[
										styles.avatar,
										{
											backgroundColor: member.profileColor,
											borderColor: t.bg,
											marginLeft: index === 0 ? 0 : -10,
										},
									]}
								>
									<Text style={[styles.avatarInitial, { fontFamily: fontFamily(800) }]}>
										{member.initial}
									</Text>
								</View>
							))}
						</View>
					</View>
				</View>
			) : null}

			<View style={[styles.summary, { backgroundColor: t.card }]}>
				<ProgressRing
					pct={summary.ringPct}
					label={summary.ringLabel}
					caption="spent"
					color={summary.ringColor}
				/>
				<View style={styles.summaryText}>
					<View style={styles.summaryAmtBlock}>
							<Text style={[styles.summaryAmt, { color: t.text, fontFamily: fontFamily(900) }]}>
						{summary.totalSpentFmt}
					</Text>
							<Text style={[styles.summaryOf, { color: t.sub, fontFamily: fontFamily(400) }]}>
						of {summary.totalLimitFmt}
					</Text>
						</View>
					<Text style={[styles.summaryLine1, { color: summary.summaryColor, fontFamily: fontFamily(700) }]}>
						{summary.summaryLine1}
					</Text>
					<Text style={[styles.summaryLine2, { color: summary.summaryColor, fontFamily: fontFamily(700) }]}>
						{summary.summaryLine2}
					</Text>
				</View>
			</View>

			{sections.map((sec) => (
				<View key={sec.title}>
					<View style={styles.sectionHeader}>
						<Text style={[styles.sectionTitle, { color: t.text, fontFamily: fontFamily(800) }]}>
							{sec.title}
						</Text>
						<Text style={[styles.sectionHint, { color: t.sub, fontFamily: fontFamily(400) }]}>
							{sec.hint}
						</Text>
					</View>
					<View
						style={[
							layout === 'grid' ? styles.gridList : undefined,
							layout === 'compact' ? [styles.compactList, { backgroundColor: t.card }] : undefined,
							layout === 'cozy-cards' ? styles.cozyList : undefined,
						]}
					>
						{sec.cards.map((card) => (
							<CategoryCard
								key={card.id}
								card={card}
								layout={layout}
								onPress={() => onOpenCategory(card.id)}
							/>
						))}
					</View>
				</View>
			))}

			<Pressable
				onPress={onOpenNewCategory}
				accessibilityRole="button"
				accessibilityLabel="New category"
				style={[styles.newCategory, { borderColor: accent + '80' }]}
			>
				<Text style={[styles.newCategoryLabel, { color: accent, fontFamily: fontFamily(800) }]}>
					+ New category
				</Text>
			</Pressable>
		</ScrollView>
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
	greeting: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		gap: 12,
		paddingTop: 8,
		paddingHorizontal: 4,
		paddingBottom: 16,
	},
	greetingText: {
		flex: 1,
	},
	greetingRight: {
		alignItems: 'flex-end',
		gap: 4,
	},
	householdName: {
		fontSize: 13,
		letterSpacing: -0.2,
	},
	greetingHi: {
		fontSize: 22,
		letterSpacing: -0.4,
	},
	greetingSub: {
		fontSize: 13,
		marginTop: 1,
	},
	avatarStack: {
		flexDirection: 'row',
	},
	avatar: {
		width: 28,
		height: 28,
		borderRadius: 14,
		alignItems: 'center',
		justifyContent: 'center',
		borderWidth: 2,
	},
	avatarInitial: {
		fontSize: 12,
		color: '#2B0E1A',
	},
	summary: {
		borderRadius: 26,
		padding: 20,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 18,
	},
	summaryText: {
		flex: 1,
		alignItems: 'flex-end',
	},
	summaryAmtBlock: {
		alignItems: 'flex-end',
	},
	summaryAmt: {
		fontSize: 26,
		letterSpacing: -0.6,
		marginTop: 2,
	},
	summaryOf: {
		fontSize: 13,
		marginTop: 1,
	},
	summaryLine1: {
		fontSize: 14,
		marginTop: 2,
		alignSelf: 'stretch',
	},
	summaryLine2: {
		fontSize: 13,
		marginTop: 1,
		alignSelf: 'stretch',
	},
	sectionHeader: {
		flexDirection: 'row',
		alignItems: 'baseline',
		gap: 8,
		paddingHorizontal: 4,
		paddingTop: 24,
		paddingBottom: 12,
	},
	sectionTitle: {
		fontSize: 16,
	},
	sectionHint: {
		fontSize: 12,
	},
	cozyList: {
		gap: 10,
	},
	gridList: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 10,
	},
	compactList: {
		borderRadius: 22,
		paddingHorizontal: 16,
		paddingVertical: 4,
	},
	newCategory: {
		height: 54,
		marginTop: 14,
		borderRadius: 999,
		borderWidth: 1.5,
		borderStyle: 'dashed',
		alignItems: 'center',
		justifyContent: 'center',
	},
	newCategoryLabel: {
		fontSize: 15,
	},
});
