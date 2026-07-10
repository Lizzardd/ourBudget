import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, BackHandler, Easing, Platform, StyleSheet } from 'react-native';

import { useTheme } from '../theme/useTheme';

export interface OverlayProps {
	open: boolean;
	onClose: () => void;
	children: ReactNode;
}

const CLOSED_OFFSET = 28;

/**
 * Full-screen panel that slides in from the right and fades in on open,
 * matching the prototype's `slideIn` keyframes (used for category detail
 * and profile). Renders no chrome of its own — screens keep control of
 * their header/close button — but wires the Android hardware back button
 * to `onClose` while open.
 */
export function Overlay({ open, onClose, children }: OverlayProps) {
	const { t } = useTheme();
	const [mounted, setMounted] = useState(open);
	const translateX = useRef(new Animated.Value(open ? 0 : CLOSED_OFFSET)).current;
	const opacity = useRef(new Animated.Value(open ? 1 : 0)).current;

	useEffect(() => {
		if (open) {
			setMounted(true);
			translateX.setValue(CLOSED_OFFSET);
			opacity.setValue(0);
			Animated.timing(translateX, {
				toValue: 0,
				duration: 300,
				easing: Easing.ease,
				useNativeDriver: true,
			}).start();
			Animated.timing(opacity, {
				toValue: 1,
				duration: 300,
				easing: Easing.ease,
				useNativeDriver: true,
			}).start();
		} else if (mounted) {
			setMounted(false);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open]);

	useEffect(() => {
		if (Platform.OS !== 'android' || !open) {
			return;
		}
		const sub = BackHandler.addEventListener('hardwareBackPress', () => {
			onClose();
			return true;
		});
		return () => sub.remove();
	}, [open, onClose]);

	if (!mounted) {
		return null;
	}

	return (
		<Animated.View
			style={[
				styles.panel,
				{ backgroundColor: t.bg, opacity, transform: [{ translateX }] },
			]}
		>
			{children}
		</Animated.View>
	);
}

const styles = StyleSheet.create({
	panel: {
		...StyleSheet.absoluteFill,
		// Sit above everything in the host screen. On Android `elevation`
		// (not just zIndex) decides stacking, so the elevated Settings cards
		// would otherwise paint over this full-screen overlay.
		zIndex: 100,
		elevation: 100,
	},
});
