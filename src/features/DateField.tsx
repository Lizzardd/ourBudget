import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { Icon } from '../components/Icon';
import { fontFamily } from '../theme/fonts';
import { useTheme } from '../theme/useTheme';
import type { DateFieldProps } from './DateField.types';

/**
 * The date pill and the native date dialog.
 *
 * Web has its own variant (DateField.web.tsx) because
 * @react-native-community/datetimepicker is a native module with no web build —
 * on web this component's <DateTimePicker> renders nothing, which is why the
 * pill did nothing there. Metro resolves the platform file automatically.
 */
export function DateField({ spentAtMs, onChange, label, maximumMs }: DateFieldProps) {
	const { t, accent } = useTheme();
	const [showPicker, setShowPicker] = useState(false);

	// The Android dialog is fire-and-forget: it fires onChange once — set+date, or
	// dismissed and none — and closes itself, so the picker must be unmounted
	// either way or it re-opens on the next render. The iOS spinner stays until we
	// take it down, which the same unmount does the moment a date lands.
	const handleChange = (event: DateTimePickerEvent, date?: Date) => {
		setShowPicker(false);
		if (event.type === 'set' && date) {
			onChange(date.getTime());
		}
	};

	return (
		<>
			<Pressable
				accessibilityRole="button"
				accessibilityLabel={`Date: ${label}. Change date`}
				onPress={() => setShowPicker(true)}
				style={[styles.pill, { backgroundColor: t.el }]}
			>
				<Icon name="calendar_today" size={16} color={accent} />
				<Text style={[styles.text, { color: t.text, fontFamily: fontFamily(700) }]}>{label}</Text>
			</Pressable>
			{showPicker ? (
				<DateTimePicker
					value={new Date(spentAtMs)}
					mode="date"
					maximumDate={maximumMs !== undefined ? new Date(maximumMs) : undefined}
					onChange={handleChange}
				/>
			) : null}
		</>
	);
}

const styles = StyleSheet.create({
	pill: {
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
