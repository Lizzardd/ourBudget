import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { USE_NATIVE_DRIVER } from '../lib/animation';
import { fontFamily } from '../theme/fonts';
import { useTheme } from '../theme/useTheme';

export interface ToastProps {
	/** The message to show, or `null` to render nothing. */
	message: string | null;
}

/**
 * Bottom-anchored toast pill. Purely presentational — mount/unmount and
 * the 2400ms auto-dismiss timer live in `useToast()` /
 * `src/lib/toast.tsx`. Animates in with the prototype's `toastPop` feel
 * (rises + scales up while fading in) whenever `message` changes.
 */
export function Toast({ message }: ToastProps) {
	const { t } = useTheme();
	const translateY = useRef(new Animated.Value(14)).current;
	const scale = useRef(new Animated.Value(0.92)).current;
	const opacity = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		if (!message) {
			return;
		}
		translateY.setValue(14);
		scale.setValue(0.92);
		opacity.setValue(0);
		Animated.parallel([
			Animated.timing(translateY, {
				toValue: 0,
				duration: 300,
				easing: Easing.bezier(0.2, 0.8, 0.3, 1),
				useNativeDriver: USE_NATIVE_DRIVER,
			}),
			Animated.timing(scale, {
				toValue: 1,
				duration: 300,
				easing: Easing.bezier(0.2, 0.8, 0.3, 1),
				useNativeDriver: USE_NATIVE_DRIVER,
			}),
			Animated.timing(opacity, {
				toValue: 1,
				duration: 300,
				easing: Easing.bezier(0.2, 0.8, 0.3, 1),
				useNativeDriver: USE_NATIVE_DRIVER,
			}),
		]).start();
	}, [message, translateY, scale, opacity]);

	if (!message) {
		return null;
	}

	return (
		<View style={[styles.wrap, { pointerEvents: 'none' }]}>
			<Animated.View
				style={[
					styles.pill,
					{
						backgroundColor: t.el,
						opacity,
						transform: [{ translateY }, { scale }],
					},
				]}
			>
				<Text style={[styles.label, { color: t.text }]}>{message}</Text>
			</Animated.View>
		</View>
	);
}

const styles = StyleSheet.create({
	wrap: {
		position: 'absolute',
		left: 0,
		right: 0,
		bottom: 160,
		alignItems: 'center',
		zIndex: 60,
	},
	pill: {
		borderRadius: 999,
		paddingVertical: 12,
		paddingHorizontal: 22,
		borderWidth: 1,
		borderColor: 'rgba(201, 98, 135, 0.35)',
	},
	label: {
		fontFamily: fontFamily(700),
		fontSize: 14,
	},
});
