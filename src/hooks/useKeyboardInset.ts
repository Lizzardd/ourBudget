import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/**
 * Height (px) the on-screen keyboard currently covers at the bottom of the
 * viewport, or 0 when it's hidden. Bottom sheets add this to their `bottom`
 * offset so the field being edited stays above the keyboard.
 *
 * Both platforms need an explicit lift:
 *
 * - Web/PWA: a bottom-anchored element does NOT move when the soft keyboard
 *   opens, so we mirror the prototype's `visualViewport` math — the shrink
 *   between the layout viewport and the visual viewport is the keyboard,
 *   ignored below 90px to skip browser-chrome jitter.
 *
 * - Native: Expo (SDK 57 / RN 0.86) renders Android edge-to-edge, so the
 *   window does NOT resize when the IME opens — the keyboard overlaps content
 *   regardless of `softwareKeyboardLayoutMode`. We read the keyboard height
 *   from the RN Keyboard events and lift by it, exactly like web.
 */
export function useKeyboardInset(): number {
	const [inset, setInset] = useState(0);

	useEffect(() => {
		if (Platform.OS === 'web') {
			if (typeof window === 'undefined') {
				return;
			}
			const vv = window.visualViewport;
			if (!vv) {
				return;
			}
			const onChange = () => {
				const kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
				setInset(kb > 90 ? kb : 0);
			};
			vv.addEventListener('resize', onChange);
			vv.addEventListener('scroll', onChange);
			onChange();
			return () => {
				vv.removeEventListener('resize', onChange);
				vv.removeEventListener('scroll', onChange);
			};
		}
		// iOS emits the "will" events (smoother, ahead of the animation);
		// Android only reliably emits the "did" events.
		const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
		const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
		const showSub = Keyboard.addListener(showEvt, (e) => {
			setInset(e.endCoordinates?.height ?? 0);
		});
		const hideSub = Keyboard.addListener(hideEvt, () => setInset(0));
		return () => {
			showSub.remove();
			hideSub.remove();
		};
	}, []);

	return inset;
}
