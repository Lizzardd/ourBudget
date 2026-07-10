/**
 * Converts a `#rrggbb` hex color to an `rgba(...)` string at the given
 * alpha. Used to derive tinted backgrounds (e.g. a selected chip's fill)
 * from the theme accent without hardcoding a second color.
 */
export function hexToRgba(hex: string, alpha: number): string {
	const clean = hex.replace('#', '');
	const r = parseInt(clean.substring(0, 2), 16);
	const g = parseInt(clean.substring(2, 4), 16);
	const b = parseInt(clean.substring(4, 6), 16);
	return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
