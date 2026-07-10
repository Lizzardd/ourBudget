import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Icon } from '../../src/components/Icon';
import { fontFamily } from '../../src/theme/fonts';
import { useTheme } from '../../src/theme/useTheme';

/**
 * Headless preview route for the Month Transactions sheet's PRESENTATION —
 * mirrors `MonthTransactionsSheet` (src/features/MonthTransactionsSheet.tsx)
 * with hardcoded mock data matching the design prototype's "─── MONTH
 * TRANSACTIONS SHEET ───". Rendered inline (not inside `Sheet`'s
 * animated/absolute overlay) so it's visible without opening it, and
 * deliberately does NOT touch Convex/auth. Not linked from any in-app
 * nav; reachable only by navigating directly to `/preview/month-txns`.
 */

const PARAMS = {
	emoji: 'grocery',
	name: 'Groceries',
	monthLabel: 'July 2026',
	totalFmt: 'Đ1,720',
};

const ROWS = [
	{ id: '1', whoBg: '#D98BA4', whoColor: '#3A1220', whoInitial: 'S', note: 'Carrefour run', meta: 'Sara · Today', amtFmt: 'Đ312' },
	{ id: '2', whoBg: '#7FA8A0', whoColor: '#0F2B26', whoInitial: 'O', note: 'Fresh produce', meta: 'Omar · Yesterday', amtFmt: 'Đ84' },
	{ id: '3', whoBg: '#D98BA4', whoColor: '#3A1220', whoInitial: 'S', note: 'Weekly shop', meta: 'Sara · Jul 5', amtFmt: 'Đ428' },
	{ id: '4', whoBg: '#7FA8A0', whoColor: '#0F2B26', whoInitial: 'O', note: 'Costco stock-up', meta: 'Omar · Jul 2', amtFmt: 'Đ896' },
];

export default function MonthTxnsPreview() {
	const { t } = useTheme();

	return (
		<View style={[styles.root, { backgroundColor: t.bg }]}>
			<View style={[styles.panel, { backgroundColor: t.card }]}>
				<View style={[styles.grabber, { backgroundColor: t.track }]} />
				<View style={styles.header}>
					<View style={styles.tile}>
						<Icon name={PARAMS.emoji} size={26} color={t.text} />
					</View>
					<View style={styles.headerText}>
						<Text style={[styles.name, { color: t.text, fontFamily: fontFamily(800) }]}>
							{PARAMS.name}
						</Text>
						<Text style={[styles.sub, { color: t.sub }]}>
							{PARAMS.monthLabel} · {PARAMS.totalFmt}
						</Text>
					</View>
				</View>
				<ScrollView style={styles.list}>
					{ROWS.map((row, i) => (
						<View
							key={row.id}
							style={[
								styles.row,
								i < ROWS.length - 1 ? { borderBottomColor: t.line, borderBottomWidth: 1 } : null,
							]}
						>
							<View style={[styles.avatar, { backgroundColor: row.whoBg }]}>
								<Text style={[styles.avatarText, { color: row.whoColor }]}>{row.whoInitial}</Text>
							</View>
							<View style={styles.rowMid}>
								<Text
									style={[styles.rowNote, { color: t.text, fontFamily: fontFamily(700) }]}
									numberOfLines={1}
								>
									{row.note}
								</Text>
								<Text style={[styles.rowMeta, { color: t.sub }]}>{row.meta}</Text>
							</View>
							<Text style={[styles.rowAmt, { color: t.text, fontFamily: fontFamily(800) }]}>
								{row.amtFmt}
							</Text>
						</View>
					))}
				</ScrollView>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	root: {
		flex: 1,
		justifyContent: 'flex-end',
	},
	panel: {
		borderTopLeftRadius: 28,
		borderTopRightRadius: 28,
		paddingTop: 10,
		paddingHorizontal: 20,
		paddingBottom: 28,
		gap: 12,
		maxHeight: '75%',
	},
	grabber: {
		width: 40,
		height: 4,
		borderRadius: 99,
		alignSelf: 'center',
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	tile: {
		width: 44,
		height: 44,
		alignItems: 'center',
		justifyContent: 'center',
	},
	headerText: {
		flex: 1,
	},
	name: {
		fontSize: 17,
	},
	sub: {
		fontSize: 12,
		marginTop: 1,
	},
	list: {
		flexShrink: 1,
		marginHorizontal: -4,
		paddingHorizontal: 4,
	},
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		paddingVertical: 13,
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
	rowMid: {
		flex: 1,
		minWidth: 0,
	},
	rowNote: {
		fontSize: 14,
	},
	rowMeta: {
		fontSize: 12,
		marginTop: 1,
	},
	rowAmt: {
		fontSize: 15,
	},
});
