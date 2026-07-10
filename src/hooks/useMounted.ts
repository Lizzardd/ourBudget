import { useEffect, useState } from 'react';

/**
 * Flips from false to true on the first effect flush after mount. Used to
 * gate progress-bar/ring widths at 0% on first paint so they can animate in
 * to their real value, matching the prototype's mount-in animation.
 */
export function useMounted(): boolean {
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	return mounted;
}
