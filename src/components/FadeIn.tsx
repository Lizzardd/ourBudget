import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Easing, type StyleProp, type ViewStyle } from 'react-native';

export interface FadeInProps {
	children: ReactNode;
	style?: StyleProp<ViewStyle>;
	/** Matches the prototype's per-screen `animation: fadeIn 0.3s ease`. */
	duration?: number;
}

/**
 * Fades screen content in (opacity 0 → 1) on first mount, matching the
 * prototype's `@keyframes fadeIn` used on every main tab (Home / Reports /
 * History / Settings). Each tab is a fresh mount under expo-router's
 * `Slot`, so this fires every time the user switches into the tab — same
 * as the prototype re-triggering the CSS animation on screen swap.
 */
export function FadeIn({ children, style, duration = 300 }: FadeInProps) {
	const opacity = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		const anim = Animated.timing(opacity, {
			toValue: 1,
			duration,
			easing: Easing.ease,
			useNativeDriver: true,
		});
		anim.start();
		return () => anim.stop();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return <Animated.View style={[style, { opacity }]}>{children}</Animated.View>;
}
