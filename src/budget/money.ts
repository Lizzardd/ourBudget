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

/** U+2009 THIN SPACE, between the currency glyph and the figure. */
const THIN_SPACE = ' ';

/**
 * A money figure, exactly as the prototype's `fmt`:
 *
 *     sym() + ' ' + n.toFixed(2).replace('.', ',')
 *
 * Two things about this are deliberate and easy to "fix" by mistake:
 *
 * - **Two decimals, always.** This used to round to whole units, which silently
 *   threw the cents away — an expense of 58.50 displayed as "59". Money is not a
 *   quantity to be approximated; if the user typed cents, the app owes them the
 *   cents back.
 * - **The comma is the DECIMAL POINT, not a thousands separator**, and there is
 *   no grouping. So it is "Đ 5500,00", not "Đ 5,500.00". The two conventions
 *   cannot coexist — a grouped "5,500" would be unreadable next to a decimal
 *   "58,50" — so the prototype picks one, and so do we.
 *
 * Built by hand rather than with `toLocaleString`: Hermes formats it against the
 * DEVICE locale, so the same code renders differently on two phones.
 */
export function fmt(minor: number, cur: string): string {
	return glyph(cur) + THIN_SPACE + (minor / 100).toFixed(2).replace('.', ',');
}

/**
 * A bare figure with no currency and no decimals — the prototype's `fmtN`, used
 * for limits ("of 5500 this month"), where the cents are noise.
 */
export function fmtN(minor: number): string {
	return String(Math.round(minor / 100));
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

/**
 * Keeps the amount field to something that is actually money.
 *
 * The custom numpad could only ever emit valid keys. An OS keypad cannot: it
 * happily produces "1.2.3", a leading ".", or "4.5678". So every keystroke is
 * normalised here rather than trusted — digits only, at most one decimal point,
 * at most two decimal places.
 *
 * A bare "." is allowed to survive as "0." so that typing ".5" works: the user
 * is mid-way through a valid number, and rejecting the keystroke would make the
 * field feel broken.
 */
export function sanitizeAmountInput(str: string): string {
	const cleaned = str.replace(/[^0-9.]/g, '');
	const [whole, ...rest] = cleaned.split('.');

	if (rest.length === 0) {
		return whole;
	}
	// Everything after the first "." is one fractional part; extra dots are dropped.
	const fraction = rest.join('').slice(0, 2);
	return `${whole === '' ? '0' : whole}.${fraction}`;
}
