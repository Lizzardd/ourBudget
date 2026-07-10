import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { useTheme } from '../theme/useTheme';

export interface ProgressBarProps {
	/** 0..100. Values above 100 are clamped to a full bar. */
	pct: number;
	/** Fill color when under budget (or the gradient start when `to` is set). */
	from: string;
	/** Gradient end color — provide this to render the over-budget gradient. */
	to?: string;
	/** Track/fill height in px. Prototype uses 8px on cards, 6px in the sheet. */
	height?: number;
}

/**
 * Rounded progress track with an animated fill. Solid `from` color normally;
 * a `from` → `to` gradient when `to` is provided, matching the prototype's
 * over-budget bar treatment.
 */
export function ProgressBar({ pct, from, to, height = 8 }: ProgressBarProps) {
	const { t } = useTheme();
	const clamped = Math.max(0, Math.min(100, pct));
	const width = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		const anim = Animated.timing(width, {
			toValue: clamped,
			duration: 900,
			easing: Easing.bezier(0.25, 0.8, 0.3, 1),
			useNativeDriver: false,
		});
		anim.start();
		return () => anim.stop();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [clamped]);

	const animatedWidth = width.interpolate({
		inputRange: [0, 100],
		outputRange: ['0%', '100%'],
	});

	return (
		<View style={[styles.track, { height, borderRadius: 99, backgroundColor: t.track }]}>
			<Animated.View style={[styles.fill, { width: animatedWidth }]}>
				{to ? (
					<Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
						<Defs>
							<LinearGradient id="fill" x1="0" y1="0" x2="1" y2="0">
								<Stop offset="0" stopColor={from} />
								<Stop offset="1" stopColor={to} />
							</LinearGradient>
						</Defs>
						<Rect x="0" y="0" width="100%" height="100%" fill="url(#fill)" />
					</Svg>
				) : (
					<View style={[StyleSheet.absoluteFill, { backgroundColor: from }]} />
				)}
			</Animated.View>
		</View>
	);
}

const styles = StyleSheet.create({
	track: {
		width: '100%',
		overflow: 'hidden',
	},
	fill: {
		height: '100%',
		overflow: 'hidden',
	},
});
