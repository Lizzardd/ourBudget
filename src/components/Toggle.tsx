import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet } from 'react-native';

import { useTheme } from '../theme/useTheme';

export interface ToggleProps {
	value: boolean;
	onValueChange: (next: boolean) => void;
	disabled?: boolean;
}

const WIDTH = 52;
const HEIGHT = 30;
const PADDING = 3;
const KNOB = HEIGHT - PADDING * 2;

/**
 * Pill switch — accent-colored track when on, `track`-colored when off,
 * with the knob sliding between the two ends (matches the prototype's
 * settings toggles).
 */
export function Toggle({ value, onValueChange, disabled }: ToggleProps) {
	const { t, accent } = useTheme();
	const progress = useRef(new Animated.Value(value ? 1 : 0)).current;

	useEffect(() => {
		Animated.timing(progress, {
			toValue: value ? 1 : 0,
			duration: 300,
			easing: Easing.out(Easing.cubic),
			useNativeDriver: false,
		}).start();
	}, [value, progress]);

	const trackColor = progress.interpolate({
		inputRange: [0, 1],
		outputRange: [t.track, accent],
	});
	const knobTranslate = progress.interpolate({
		inputRange: [0, 1],
		outputRange: [0, WIDTH - KNOB - PADDING * 2],
	});

	return (
		<Pressable
			onPress={() => onValueChange(!value)}
			disabled={disabled}
			accessibilityRole="switch"
			accessibilityState={{ checked: value, disabled }}
			style={{ opacity: disabled ? 0.5 : 1 }}
		>
			<Animated.View style={[styles.track, { backgroundColor: trackColor }]}>
				<Animated.View
					style={[styles.knob, { transform: [{ translateX: knobTranslate }] }]}
				/>
			</Animated.View>
		</Pressable>
	);
}

const styles = StyleSheet.create({
	track: {
		width: WIDTH,
		height: HEIGHT,
		borderRadius: 999,
		padding: PADDING,
		justifyContent: 'center',
	},
	knob: {
		width: KNOB,
		height: KNOB,
		borderRadius: KNOB / 2,
		backgroundColor: '#FFFFFF',
	},
});
