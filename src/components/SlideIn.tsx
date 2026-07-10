import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Easing, type StyleProp, type ViewStyle } from 'react-native';

export interface SlideInProps {
	children: ReactNode;
	style?: StyleProp<ViewStyle>;
	/** Matches the prototype's `animation: slideIn 0.3s ease` on category detail. */
	duration?: number;
}

const OFFSET = 28;

/**
 * Slides screen content in from the right while fading in, matching the
 * prototype's `@keyframes slideIn` (`translateX(28px)` → none). Used for
 * screens reached by pushing (category detail), as opposed to `FadeIn`
 * which is used for the four main tabs. `Overlay` already implements the
 * same feel for in-app overlays (profile, delete account) — this is the
 * equivalent for a routed push where there's no overlay wrapper.
 */
export function SlideIn({ children, style, duration = 300 }: SlideInProps) {
	const translateX = useRef(new Animated.Value(OFFSET)).current;
	const opacity = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		const anims = [
			Animated.timing(translateX, {
				toValue: 0,
				duration,
				easing: Easing.ease,
				useNativeDriver: true,
			}),
			Animated.timing(opacity, {
				toValue: 1,
				duration,
				easing: Easing.ease,
				useNativeDriver: true,
			}),
		];
		Animated.parallel(anims).start();
		return () => anims.forEach((a) => a.stop());
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return (
		<Animated.View style={[style, { opacity, transform: [{ translateX }] }]}>
			{children}
		</Animated.View>
	);
}
