/**
 * Pure input logic for the Add-Expense numpad. Given the current amount
 * string and a pressed key, returns the next amount string. No React —
 * kept pure and colocated with the other budget-math modules so it is
 * trivially unit-testable.
 *
 * Rules (verbatim from the prototype's `padKeys` handler):
 * - `⌫` drops the last character.
 * - `.` appends a decimal point, but only once (`0.5.` is not reachable).
 * - Digits append, but the digit-only length (decimal point excluded) is
 *   capped at 6 — once at the cap, further digit presses are no-ops.
 * - A lone leading `0` is replaced rather than extended (`0` + `5` → `5`,
 *   not `05`); this only matters right after backspacing a `0.x` down to
 *   `0`.
 */

const MAX_DIGITS = 6;

export function applyNumpadKey(current: string, key: string): string {
	if (key === '⌫') {
		return current.slice(0, -1);
	}
	if (key === '.') {
		return current.includes('.') ? current : (current || '0') + '.';
	}
	const digitCount = current.replace('.', '').length;
	if (digitCount >= MAX_DIGITS) {
		return current;
	}
	return current === '0' ? key : current + key;
}
