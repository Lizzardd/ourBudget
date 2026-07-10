import { useContext } from 'react';

import { ThemeContext, type ThemeContextValue } from './ThemeProvider';

/**
 * Reads the current theme from context. Must be used within a
 * `ThemeProvider` (mounted once near the app root in `_layout.tsx`).
 */
export function useTheme(): ThemeContextValue {
	const ctx = useContext(ThemeContext);
	if (!ctx) {
		throw new Error('useTheme must be used within a ThemeProvider');
	}
	return ctx;
}
