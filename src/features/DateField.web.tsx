import { createElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '../components/Icon';
import { fontFamily } from '../theme/fonts';
import { useTheme } from '../theme/useTheme';
import type { DateFieldProps } from './DateField.types';

const pad = (n: number) => String(n).padStart(2, '0');

/** Local YYYY-MM-DD, the value format <input type="date"> expects. */
function toYMD(ms: number): string {
	const d = new Date(ms);
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Stamp a picked YYYY-MM-DD day onto the existing instant, keeping its time of
 * day. Changing only the date shouldn't reset the time — and it sidesteps the
 * UTC-midnight day-shift a naive `new Date(ymd)` would cause east of UTC.
 */
function applyYMD(ymd: string, baseMs: number): number {
	const [y, m, d] = ymd.split('-').map(Number);
	const next = new Date(baseMs);
	next.setFullYear(y, m - 1, d);
	return next.getTime();
}

/**
 * The date pill, backed by the browser's own date picker.
 *
 * @react-native-community/datetimepicker is native-only (see DateField.tsx), so
 * on web we render a real <input type="date"> overlaid transparently on the
 * pill: the pill shows the label, and clicking it opens the OS/browser date
 * picker via `showPicker()`. This is a genuine web control, not a shim — the
 * app is meant to work natively on both platforms.
 */
export function DateField({ spentAtMs, onChange, label, maximumMs }: DateFieldProps) {
	const { t, accent } = useTheme();

	return (
		<View style={[styles.pill, { backgroundColor: t.el }]}>
			<Icon name="calendar_today" size={16} color={accent} />
			<Text style={[styles.text, { color: t.text, fontFamily: fontFamily(700) }]}>{label}</Text>
			{createElement('input', {
				type: 'date',
				value: toYMD(spentAtMs),
				max: maximumMs !== undefined ? toYMD(maximumMs) : undefined,
				'aria-label': 'Date',
				// Clicking the field only focuses it; showPicker() opens the calendar.
				onClick: (e: React.MouseEvent<HTMLInputElement>) => {
					e.currentTarget.showPicker?.();
				},
				onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
					if (e.target.value) {
						onChange(applyYMD(e.target.value, spentAtMs));
					}
				},
				style: {
					position: 'absolute',
					top: 0,
					left: 0,
					width: '100%',
					height: '100%',
					opacity: 0,
					cursor: 'pointer',
					border: 0,
					padding: 0,
					margin: 0,
				},
			})}
		</View>
	);
}

const styles = StyleSheet.create({
	pill: {
		// The transparent <input> is positioned against this.
		position: 'relative',
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		borderRadius: 999,
		paddingVertical: 6,
		paddingHorizontal: 12,
	},
	text: {
		fontSize: 12,
	},
});
