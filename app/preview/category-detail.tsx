import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { Icon } from '../../src/components/Icon';
import { ProgressBar } from '../../src/components/ProgressBar';
import { fontFamily } from '../../src/theme/fonts';
import { useTheme } from '../../src/theme/useTheme';

/**
 * Headless preview route for the Category Detail screen's PRESENTATION —
 * mirrors `app/(app)/category/[id].tsx` with hardcoded mock data matching
 * the design prototype's "─── CATEGORY DETAIL OVERLAY ───" (Dining out,
 * over budget). Deliberately does NOT touch Convex or auth. Not linked
 * from any in-app nav; reachable only by navigating directly to
 * `/preview/category-detail`.
 */

const DET = {
	emoji: 'restaurant',
	name: 'Dining out',
	isAnnual: false,
	periodLabel: 'Monthly budget · July 2026',
	amtFmt: 'Đ1,340',
	ofFmt: 'of 1,200 this month',
	pctW: '100%',
	bar: { from: '#CE4B3A', to: '#B7301F' },
	sub1: 'Đ140 over',
	sub2: 'it happens 💛',
	subColor: '#DE4B37',
	limitLabel: 'MONTHLY LIMIT',
	curSym: 'Đ',
	addLabel: '+ Add to Dining out',
};

const TXNS = [
	{ id: '1', whoBg: '#D98BA4', whoColor: '#3A1220', whoInitial: 'S', note: 'Tagine Nights', meta: 'Sara · Today', amtFmt: 'Đ210' },
	{ id: '2', whoBg: '#7FA8A0', whoColor: '#0F2B26', whoInitial: 'O', note: 'Coffee run', meta: 'Omar · Yesterday', amtFmt: 'Đ38' },
	{ id: '3', whoBg: '#D98BA4', whoColor: '#3A1220', whoInitial: 'S', note: 'Team lunch', meta: 'Sara · Jul 3', amtFmt: 'Đ96' },
];

export default function CategoryDetailPreview() {
	const { t, accent } = useTheme();
	const [limitInput, setLimitInput] = useState('1200');

	return (
		<View style={[styles.container, { backgroundColor: t.bg }]}>
			<ScrollView contentContainerStyle={styles.content}>
				<TouchableOpacity style={styles.backButton}>
					<Text style={[styles.backText, { color: t.sub, fontFamily: fontFamily(700) }]}>
						‹ Back
					</Text>
				</TouchableOpacity>

				<View style={styles.header}>
					<View style={styles.tile}>
						<Icon name={DET.emoji} size={34} color={t.text} />
					</View>
					<View style={styles.headerText}>
						<View style={styles.nameRow}>
							<Text style={[styles.name, { color: t.text, fontFamily: fontFamily(800) }]}>
								{DET.name}
							</Text>
							{DET.isAnnual ? (
								<View style={[styles.badge, { backgroundColor: accent + '26' }]}>
									<Text style={[styles.badgeText, { color: accent }]}>ANNUAL</Text>
								</View>
							) : null}
						</View>
						<Text style={[styles.periodLabel, { color: t.sub }]}>{DET.periodLabel}</Text>
					</View>
				</View>

				<View style={[styles.card, { backgroundColor: t.card }]}>
					<View style={styles.amtRow}>
						<Text style={[styles.amt, { color: t.text, fontFamily: fontFamily(900) }]}>
							{DET.amtFmt}
						</Text>
						<Text style={[styles.of, { color: t.sub }]}>{DET.ofFmt}</Text>
					</View>
					<View style={styles.barWrap}>
						<ProgressBar pct={100} from={DET.bar.from} to={DET.bar.to} height={10} />
					</View>
					<Text style={[styles.sub, { color: DET.subColor, fontFamily: fontFamily(700) }]}>
						{DET.sub1}
					</Text>
					<Text style={[styles.sub2, { color: DET.subColor, fontFamily: fontFamily(700) }]}>
						{DET.sub2}
					</Text>
				</View>

				<View style={[styles.limitCard, { backgroundColor: t.card }]}>
					<View style={styles.limitText}>
						<Text style={[styles.limitLabel, { color: t.sub, fontFamily: fontFamily(700) }]}>
							{DET.limitLabel}
						</Text>
						<View style={styles.limitInputRow}>
							<Text style={[styles.limitCurSym, { color: t.text, fontFamily: fontFamily(800) }]}>
								{DET.curSym}
							</Text>
							<TextInput
								value={limitInput}
								onChangeText={setLimitInput}
								keyboardType="numeric"
								inputMode="numeric"
								style={[styles.limitInput, { color: t.text, fontFamily: fontFamily(800) }]}
							/>
						</View>
					</View>
					<TouchableOpacity
						accessibilityRole="button"
						accessibilityLabel="Decrease limit"
						style={[styles.limitBtn, { backgroundColor: t.el }]}
					>
						<Text style={[styles.limitBtnText, { color: t.text }]}>−</Text>
					</TouchableOpacity>
					<TouchableOpacity
						accessibilityRole="button"
						accessibilityLabel="Increase limit"
						style={[styles.limitBtn, { backgroundColor: t.el }]}
					>
						<Text style={[styles.limitBtnText, { color: t.text }]}>+</Text>
					</TouchableOpacity>
				</View>

				<Text style={[styles.recentTitle, { color: t.text, fontFamily: fontFamily(800) }]}>
					Recent
				</Text>
				<View style={[styles.txnCard, { backgroundColor: t.card }]}>
					{TXNS.map((row, i) => (
						<View
							key={row.id}
							style={[
								styles.txnRow,
								i < TXNS.length - 1 ? { borderBottomColor: t.line, borderBottomWidth: 1 } : null,
							]}
						>
							<View style={[styles.avatar, { backgroundColor: row.whoBg }]}>
								<Text style={[styles.avatarText, { color: row.whoColor }]}>{row.whoInitial}</Text>
							</View>
							<View style={styles.txnMid}>
								<Text
									style={[styles.txnNote, { color: t.text, fontFamily: fontFamily(700) }]}
									numberOfLines={1}
								>
									{row.note}
								</Text>
								<Text style={[styles.txnMeta, { color: t.sub }]}>{row.meta}</Text>
							</View>
							<Text style={[styles.txnAmt, { color: t.text, fontFamily: fontFamily(800) }]}>
								{row.amtFmt}
							</Text>
						</View>
					))}
				</View>

				<TouchableOpacity
					accessibilityRole="button"
					accessibilityLabel={DET.addLabel}
					style={[styles.addButton, { backgroundColor: accent }]}
				>
					<Text style={styles.addButtonText}>{DET.addLabel}</Text>
				</TouchableOpacity>
			</ScrollView>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	content: {
		padding: 18,
		paddingBottom: 150,
	},
	backButton: {
		alignSelf: 'flex-start',
		paddingVertical: 8,
		paddingHorizontal: 4,
	},
	backText: {
		fontSize: 15,
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 14,
		paddingVertical: 10,
		paddingHorizontal: 4,
	},
	tile: {
		width: 56,
		height: 56,
		alignItems: 'center',
		justifyContent: 'center',
	},
	headerText: {
		flex: 1,
	},
	nameRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	name: {
		fontSize: 20,
		letterSpacing: -0.3,
	},
	badge: {
		borderRadius: 999,
		paddingVertical: 3,
		paddingHorizontal: 7,
	},
	badgeText: {
		fontFamily: fontFamily(800),
		fontSize: 9,
		letterSpacing: 1,
	},
	periodLabel: {
		fontSize: 13,
		marginTop: 2,
	},
	card: {
		borderRadius: 24,
		padding: 20,
		marginTop: 8,
	},
	amtRow: {
		flexDirection: 'row',
		alignItems: 'baseline',
		gap: 8,
	},
	amt: {
		fontSize: 30,
		letterSpacing: -0.7,
	},
	of: {
		fontSize: 14,
	},
	barWrap: {
		marginTop: 14,
	},
	sub: {
		fontSize: 13,
		marginTop: 10,
	},
	sub2: {
		fontSize: 13,
		marginTop: 1,
	},
	limitCard: {
		borderRadius: 24,
		paddingVertical: 16,
		paddingHorizontal: 20,
		marginTop: 12,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	limitText: {
		flex: 1,
	},
	limitLabel: {
		fontSize: 13,
	},
	limitInputRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: 2,
	},
	limitCurSym: {
		fontSize: 18,
	},
	limitInput: {
		fontSize: 18,
		width: 110,
		padding: 0,
		backgroundColor: 'transparent',
		borderWidth: 0,
	},
	limitBtn: {
		width: 42,
		height: 42,
		borderRadius: 21,
		alignItems: 'center',
		justifyContent: 'center',
	},
	limitBtnText: {
		fontSize: 20,
		fontFamily: fontFamily(800),
	},
	recentTitle: {
		fontSize: 16,
		paddingHorizontal: 4,
		paddingTop: 22,
		paddingBottom: 10,
	},
	txnCard: {
		borderRadius: 24,
		paddingHorizontal: 18,
	},
	txnRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		paddingVertical: 14,
	},
	avatar: {
		width: 36,
		height: 36,
		borderRadius: 18,
		alignItems: 'center',
		justifyContent: 'center',
	},
	avatarText: {
		fontSize: 14,
		fontFamily: fontFamily(800),
	},
	txnMid: {
		flex: 1,
		minWidth: 0,
	},
	txnNote: {
		fontSize: 14,
	},
	txnMeta: {
		fontSize: 12,
		marginTop: 1,
	},
	txnAmt: {
		fontSize: 15,
	},
	addButton: {
		width: '100%',
		height: 54,
		marginTop: 16,
		borderRadius: 999,
		alignItems: 'center',
		justifyContent: 'center',
	},
	addButtonText: {
		fontFamily: fontFamily(800),
		fontSize: 16,
		color: '#2B0E1A',
	},
});
