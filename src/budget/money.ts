const CURRENCY_GLYPHS: Record<string, string> = {
	AED: 'Đ',
	USD: '$',
	GBP: '£',
	EUR: '€',
	ZAR: 'R',
};

export function glyph(cur: string): string {
	return CURRENCY_GLYPHS[cur] ?? '';
}

/**
 * Group an integer with commas every 3 digits, WITHOUT relying on
 * `Number.toLocaleString(locale)`. React Native's Hermes engine formats
 * `toLocaleString('en-US')` with the device locale (e.g. "10295,00" with a
 * comma decimal), so we group manually to guarantee "10,295" on every
 * engine (web + native).
 */
function groupThousands(n: number): string {
	const negative = n < 0;
	const digits = String(Math.abs(Math.trunc(n)));
	let out = '';
	for (let i = 0; i < digits.length; i++) {
		if (i > 0 && (digits.length - i) % 3 === 0) {
			out += ',';
		}
		out += digits[i];
	}
	return (negative ? '-' : '') + out;
}

export function fmt(minor: number, cur: string): string {
	return glyph(cur) + groupThousands(Math.round(minor / 100));
}

export function fmtN(minor: number): string {
	return groupThousands(Math.round(minor / 100));
}

export function fmtK(minor: number): string {
	return ((minor / 100) / 1000).toFixed(1) + 'k';
}

export function parseAmountToMinor(str: string): number {
	if (!str || str.trim() === '') {
		return 0;
	}
	const parsed = parseFloat(str);
	if (isNaN(parsed)) {
		return 0;
	}
	return Math.round(parsed * 100);
}
