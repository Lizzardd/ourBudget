import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { fontFamily } from '../theme/fonts';
import { useTheme } from '../theme/useTheme';

export interface ProgressRingProps {
	/** 0..100. Values above 100 are clamped. */
	pct: number;
	/** Outer diameter in px. Defaults to the prototype's 96px ring. */
	size?: number;
	/** Text centered in the ring, e.g. "78%". */
	label: string;
	/** Small caption under the label, e.g. "spent". */
	caption?: string;
	strokeWidth?: number;
	/** Stroke color of the progress arc. Defaults to the theme accent. */
	color?: string;
}

/**
 * Circular progress indicator — an accent-colored stroke over a
 * track-colored ring, animating from 0 to `pct` on mount to match the
 * prototype's `--rp` conic-gradient transition. The prototype's ring is a
 * 96px conic-gradient with a 76px inner "hole", i.e. a 10px band — the
 * default `strokeWidth` matches that.
 */
export function ProgressRing({ pct, size = 96, label, caption, strokeWidth = 10, color }: ProgressRingProps) {
	const { t, accent } = useTheme();
	const strokeColor = color ?? accent;
	const clamped = Math.max(0, Math.min(100, pct));
	const progress = useRef(new Animated.Value(0)).current;
	const radius = (size - strokeWidth) / 2;
	const circumference = 2 * Math.PI * radius;
	const [strokeDashoffset, setStrokeDashoffset] = useState(circumference);

	useEffect(() => {
		const id = progress.addListener(({ value }) => {
			setStrokeDashoffset(circumference - (value / 100) * circumference);
		});
		const anim = Animated.timing(progress, {
			toValue: clamped,
			duration: 1400,
			easing: Easing.bezier(0.25, 0.8, 0.3, 1),
			useNativeDriver: false,
		});
		anim.start();
		return () => {
			anim.stop();
			progress.removeListener(id);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [clamped]);

	return (
		<View style={{ width: size, height: size }}>
			<Svg width={size} height={size}>
				<Circle
					cx={size / 2}
					cy={size / 2}
					r={radius}
					stroke={t.track}
					strokeWidth={strokeWidth}
					fill="none"
				/>
				<Circle
					cx={size / 2}
					cy={size / 2}
					r={radius}
					stroke={strokeColor}
					strokeWidth={strokeWidth}
					fill="none"
					strokeDasharray={`${circumference}, ${circumference}`}
					strokeDashoffset={strokeDashoffset}
					strokeLinecap="round"
					transform={`rotate(-90 ${size / 2} ${size / 2})`}
				/>
			</Svg>
			<View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}>
				<View style={styles.labelWrap}>
					<Text style={[styles.label, { color: t.text }]}>{label}</Text>
					{caption ? (
						<Text style={[styles.caption, { color: t.sub }]}>{caption}</Text>
					) : null}
				</View>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	labelWrap: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
	},
	label: {
		fontFamily: fontFamily(900),
		fontSize: 21,
		letterSpacing: -0.5,
	},
	caption: {
		fontFamily: fontFamily(600),
		fontSize: 10,
	},
});
