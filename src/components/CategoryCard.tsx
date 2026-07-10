import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { CategoryCard as CategoryCardVM } from '../budget/cards';
import { fontFamily } from '../theme/fonts';
import { useTheme } from '../theme/useTheme';
import { Icon } from './Icon';
import { ProgressBar } from './ProgressBar';

/** Dashboard layouts a household can choose in Settings. */
export type DashboardLayout = 'cozy-cards' | 'grid' | 'compact';

export interface CategoryCardProps {
	card: CategoryCardVM;
	layout: DashboardLayout;
	onPress: () => void;
}


/**
 * Renders one category's summary tile on the Home dashboard, in whichever
 * shape the household's `layout` setting calls for — roomy cozy-cards,
 * a 2-column grid tile, or a dense compact row. All three share the same
 * view-model (`CategoryCard` from `src/budget/cards.ts`) so the choice is
 * purely presentational.
 */
export function CategoryCard({ card, layout, onPress }: CategoryCardProps) {
	if (layout === 'grid') {
		return <GridCard card={card} onPress={onPress} />;
	}
	if (layout === 'compact') {
		return <CompactCard card={card} onPress={onPress} />;
	}
	return <CozyCard card={card} onPress={onPress} />;
}

function CozyCard({ card, onPress }: { card: CategoryCardVM; onPress: () => void }) {
	const { t } = useTheme();

	return (
		<Pressable
			onPress={onPress}
			accessibilityRole="button"
			accessibilityLabel={card.name}
			style={({ pressed }) => [
				styles.cozyCard,
				{ backgroundColor: t.card, transform: [{ scale: pressed ? 0.985 : 1 }] },
			]}
		>
			<View style={styles.cozyRow}>
				<View style={styles.cozyTile}>
					<Icon name={card.emoji} size={26} color={t.text} />
				</View>
				<View style={styles.cozyMid}>
					<View style={styles.nameRow}>
						<Text
							style={[styles.cozyName, { color: t.text, fontFamily: fontFamily(700) }]}
							numberOfLines={1}
						>
							{card.name}
						</Text>
					</View>
					<Text
						style={[styles.cozySub, { color: card.subColor, fontFamily: fontFamily(700) }]}
						numberOfLines={1}
					>
						{card.sub1}
					</Text>
					{card.sub2 ? (
						<Text
							style={[styles.cozySub2, { color: card.subColor, fontFamily: fontFamily(700) }]}
							numberOfLines={1}
						>
							{card.sub2}
						</Text>
					) : null}
				</View>
				<View style={styles.cozyAmts}>
					<Text style={[styles.cozyAmt, { color: t.text, fontFamily: fontFamily(800) }]}>
						{card.amtFmt}
					</Text>
					<Text style={[styles.cozyOf, { color: t.sub, fontFamily: fontFamily(400) }]}>
						{card.ofFmt}
					</Text>
				</View>
			</View>
			<View style={styles.cozyBar}>
				<ProgressBar pct={parseInt(card.pctW, 10)} from={card.bar.from} to={card.bar.to ?? undefined} />
			</View>
		</Pressable>
	);
}

function GridCard({ card, onPress }: { card: CategoryCardVM; onPress: () => void }) {
	const { t } = useTheme();

	return (
		<Pressable
			onPress={onPress}
			accessibilityRole="button"
			accessibilityLabel={card.name}
			style={({ pressed }) => [
				styles.gridCard,
				{ backgroundColor: t.card, transform: [{ scale: pressed ? 0.97 : 1 }] },
			]}
		>
			<View style={styles.gridTop}>
				<View style={styles.gridTile}>
					<Icon name={card.emoji} size={24} color={t.text} />
				</View>
			</View>
			<View>
				<Text
					style={[styles.gridName, { color: t.text, fontFamily: fontFamily(700) }]}
					numberOfLines={1}
				>
					{card.name}
				</Text>
				<Text style={[styles.gridAmt, { color: t.text, fontFamily: fontFamily(800) }]}>
					{card.amtFmt}
				</Text>
				<Text style={[styles.gridOf, { color: t.sub, fontFamily: fontFamily(400) }]}>
					{card.ofFmt}
				</Text>
			</View>
			<ProgressBar
				pct={parseInt(card.pctW, 10)}
				from={card.bar.from}
				to={card.bar.to ?? undefined}
				height={6}
			/>
		</Pressable>
	);
}

function CompactCard({ card, onPress }: { card: CategoryCardVM; onPress: () => void }) {
	const { t } = useTheme();

	return (
		<Pressable
			onPress={onPress}
			accessibilityRole="button"
			accessibilityLabel={card.name}
			style={[styles.compactRow, { borderBottomColor: t.line }]}
		>
			<View style={styles.compactTop}>
				<Icon name={card.emoji} size={22} color={t.text} />
				<Text
					style={[styles.compactName, { color: t.text, fontFamily: fontFamily(700) }]}
					numberOfLines={1}
				>
					{card.name}
				</Text>
				<Text style={[styles.compactAmt, { color: t.text, fontFamily: fontFamily(800) }]}>
					{card.amtFmt}
				</Text>
				<Text style={[styles.compactOf, { color: t.sub, fontFamily: fontFamily(400) }]}>
					{card.ofFmt}
				</Text>
			</View>
			<View style={styles.compactBar}>
				<ProgressBar
					pct={parseInt(card.pctW, 10)}
					from={card.bar.from}
					to={card.bar.to ?? undefined}
					height={4}
				/>
			</View>
		</Pressable>
	);
}

const styles = StyleSheet.create({
	// Cozy cards
	cozyCard: {
		borderRadius: 22,
		padding: 16,
	},
	cozyRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	cozyTile: {
		width: 44,
		height: 44,
		alignItems: 'center',
		justifyContent: 'center',
	},
	cozyEmoji: {
		fontSize: 26,
	},
	cozyMid: {
		flex: 1,
		minWidth: 0,
	},
	nameRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 7,
	},
	cozyName: {
		fontSize: 15,
	},
	cozySub: {
		fontSize: 14,
		marginTop: 2,
	},
	cozySub2: {
		fontSize: 14,
		marginTop: 1,
	},
	cozyAmts: {
		alignItems: 'flex-end',
	},
	cozyAmt: {
		fontSize: 16,
		letterSpacing: -0.3,
	},
	cozyOf: {
		fontSize: 11,
	},
	cozyBar: {
		marginTop: 12,
	},
	// Grid
	gridCard: {
		flexBasis: '48%',
		flexGrow: 1,
		borderRadius: 22,
		padding: 14,
		gap: 10,
	},
	gridTop: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	gridTile: {
		width: 40,
		height: 40,
		alignItems: 'center',
		justifyContent: 'center',
	},
	gridEmoji: {
		fontSize: 24,
	},
	gridName: {
		fontSize: 13,
	},
	gridAmt: {
		fontSize: 15,
		marginTop: 2,
	},
	gridOf: {
		fontSize: 11,
	},
	// Compact
	compactRow: {
		paddingVertical: 13,
		borderBottomWidth: 1,
	},
	compactTop: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
	},
	compactEmoji: {
		fontSize: 22,
	},
	compactName: {
		fontSize: 14,
		flex: 1,
	},
	compactAmt: {
		fontSize: 13,
	},
	compactOf: {
		fontSize: 11,
	},
	compactBar: {
		marginTop: 9,
	},
});
