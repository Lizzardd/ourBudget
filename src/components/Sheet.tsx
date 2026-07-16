import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
	Animated,
	Easing,
	PanResponder,
	Pressable,
	StyleSheet,
	View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { USE_NATIVE_DRIVER } from '../lib/animation';
import { useKeyboardInset } from '../hooks/useKeyboardInset';
import { useTheme } from '../theme/useTheme';

export interface SheetProps {
	open: boolean;
	onClose: () => void;
	children: ReactNode;
	/** Caps the panel's height (e.g. '75%') for sheets with long, scrollable content. */
	maxHeight?: `${number}%`;
}

const CLOSED_OFFSET = 90;
const DISMISS_THRESHOLD = 80;

/**
 * Bottom sheet — scrim + a card-colored panel with a large top radius that
 * slides up and fades in on open (matching the prototype's `sheetUp`
 * keyframes). Dismiss by tapping the scrim or dragging the panel down past
 * the threshold; either way the panel animates back out before unmounting.
 */
export function Sheet({ open, onClose, children, maxHeight }: SheetProps) {
	const { t } = useTheme();
	const insets = useSafeAreaInsets();
	const keyboardInset = useKeyboardInset();
	const [mounted, setMounted] = useState(open);
	const translateY = useRef(new Animated.Value(CLOSED_OFFSET)).current;
	const opacity = useRef(new Animated.Value(0)).current;
	const drag = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		if (open) {
			setMounted(true);
			translateY.setValue(CLOSED_OFFSET);
			opacity.setValue(0);
			drag.setValue(0);
			Animated.parallel([
				Animated.timing(translateY, {
					toValue: 0,
					duration: 350,
					easing: Easing.bezier(0.2, 0.8, 0.3, 1),
					useNativeDriver: USE_NATIVE_DRIVER,
				}),
				Animated.timing(opacity, {
					toValue: 1,
					duration: 250,
					easing: Easing.ease,
					useNativeDriver: USE_NATIVE_DRIVER,
				}),
			]).start();
		} else if (mounted) {
			Animated.timing(opacity, {
				toValue: 0,
				duration: 200,
				easing: Easing.ease,
				useNativeDriver: USE_NATIVE_DRIVER,
			}).start(({ finished }) => {
				if (finished) {
					setMounted(false);
				}
			});
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open]);

	const panResponder = useMemo(
		() =>
			PanResponder.create({
				onMoveShouldSetPanResponder: (_evt, gesture) => gesture.dy > 4,
				onPanResponderMove: (_evt, gesture) => {
					if (gesture.dy > 0) {
						drag.setValue(gesture.dy);
					}
				},
				onPanResponderRelease: (_evt, gesture) => {
					if (gesture.dy > DISMISS_THRESHOLD) {
						onClose();
					} else {
						Animated.timing(drag, {
							toValue: 0,
							duration: 200,
							easing: Easing.ease,
							useNativeDriver: USE_NATIVE_DRIVER,
						}).start();
					}
				},
			}),
		[drag, onClose],
	);

	if (!mounted) {
		return null;
	}

	return (
		<View style={[StyleSheet.absoluteFill, styles.layer, { pointerEvents: 'box-none' }]}>
			<Pressable
				accessibilityRole="button"
				accessibilityLabel="Close"
				onPress={onClose}
				style={StyleSheet.absoluteFill}
			>
				<Animated.View style={[styles.scrim, { opacity }]} />
			</Pressable>
			<Animated.View
				{...panResponder.panHandlers}
				style={[
					styles.panel,
					{
						backgroundColor: t.card,
						opacity,
						// Lift above the on-screen keyboard on web; 0 on native,
						// where Android's resize mode already does this (see
						// useKeyboardInset). Keep the safe-area gap at the bottom.
						bottom: keyboardInset,
						paddingBottom: 28 + insets.bottom,
						transform: [{ translateY: Animated.add(translateY, drag) }],
						...(maxHeight ? { maxHeight } : null),
					},
				]}
			>
				<View style={[styles.grabber, { backgroundColor: t.track }]} />
				{children}
			</Animated.View>
		</View>
	);
}

const styles = StyleSheet.create({
	/**
	 * Sit above the FAB and the tab bar, matching the prototype's stacking
	 * (`z-index: 40` on the sheet, `20` on the "+ Add expense" pill, `15` on the
	 * tab bar).
	 *
	 * `elevation` is what actually matters on Android: it beats sibling paint
	 * order, so the FAB — which sets `elevation: 6` for its shadow — drew on top
	 * of the sheet even though the sheet renders after it, covering the numpad's
	 * "9" key. Setting `zIndex` alone would not have fixed it.
	 */
	layer: {
		zIndex: 40,
		elevation: 40,
	},
	scrim: {
		...StyleSheet.absoluteFill,
		backgroundColor: 'rgba(15, 9, 5, 0.6)',
	},
	panel: {
		position: 'absolute',
		left: 0,
		right: 0,
		bottom: 0,
		borderTopLeftRadius: 28,
		borderTopRightRadius: 28,
		paddingTop: 10,
		paddingHorizontal: 20,
		paddingBottom: 28,
		gap: 12,
	},
	grabber: {
		width: 40,
		height: 4,
		borderRadius: 99,
		alignSelf: 'center',
	},
});
