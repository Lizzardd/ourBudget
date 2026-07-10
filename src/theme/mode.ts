import { dark, light, type Tokens } from './tokens';

export type ThemeMode = 'dark' | 'light';

/**
 * Flips dark <-> light. Pure and platform-free so it (and
 * {@link tokensForMode}) can be unit tested without pulling in
 * `react-native`.
 */
export function flipMode(mode: ThemeMode): ThemeMode {
	return mode === 'dark' ? 'light' : 'dark';
}

/**
 * Maps a mode to its token set.
 */
export function tokensForMode(mode: ThemeMode): Tokens {
	return mode === 'dark' ? dark : light;
}
