import * as SecureStore from 'expo-secure-store';
import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';

import { flipMode, tokensForMode, type ThemeMode } from './mode';
import { ACCENT, type Tokens } from './tokens';

export type { ThemeMode } from './mode';

export interface ThemeContextValue {
	mode: ThemeMode;
	t: Tokens;
	accent: string;
	toggle: () => void;
}

const STORAGE_KEY = 'theme-mode';

export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

/**
 * Reads the persisted mode. `expo-secure-store` has no native backing on
 * web, so that platform falls back to `localStorage` instead of crashing.
 */
async function readPersistedMode(): Promise<ThemeMode | null> {
	try {
		let raw: string | null = null;
		if (Platform.OS === 'web') {
			raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
		} else {
			raw = await SecureStore.getItemAsync(STORAGE_KEY);
		}
		return raw === 'dark' || raw === 'light' ? raw : null;
	} catch {
		return null;
	}
}

/**
 * Persists the mode. Failures are swallowed — theme persistence is a
 * convenience, not something that should ever crash the app.
 */
async function writePersistedMode(mode: ThemeMode): Promise<void> {
	try {
		if (Platform.OS === 'web') {
			if (typeof localStorage !== 'undefined') {
				localStorage.setItem(STORAGE_KEY, mode);
			}
		} else {
			await SecureStore.setItemAsync(STORAGE_KEY, mode);
		}
	} catch {
		// Persistence is best-effort; ignore failures.
	}
}

export function ThemeProvider({ children }: { children: ReactNode }) {
	const [mode, setMode] = useState<ThemeMode>('dark');

	useEffect(() => {
		let cancelled = false;
		readPersistedMode().then((persisted) => {
			if (!cancelled && persisted) {
				setMode(persisted);
			}
		});
		return () => {
			cancelled = true;
		};
	}, []);

	const toggle = useCallback(() => {
		setMode((prev) => {
			const next = flipMode(prev);
			writePersistedMode(next);
			return next;
		});
	}, []);

	const value = useMemo<ThemeContextValue>(
		() => ({
			mode,
			t: tokensForMode(mode),
			accent: ACCENT,
			toggle,
		}),
		[mode, toggle],
	);

	return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
