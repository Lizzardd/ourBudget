/**
 * Pure budget-math module for month/year date ranges and year progress.
 * All timestamps are in UTC milliseconds.
 * All date ranges are [startMs, endMs) — startMs is inclusive, endMs is exclusive.
 */

/**
 * Returns the start and end milliseconds for a given calendar month.
 * Month is 0-indexed (0 = January, 11 = December).
 * Range is [startMs, endMs) — endMs is the first millisecond of the next month.
 */
export function monthRange(year: number, month: number): { startMs: number; endMs: number } {
	const startMs = Date.UTC(year, month, 1);
	const endMs = Date.UTC(year, month + 1, 1);
	return { startMs, endMs };
}

/**
 * Returns the start and end milliseconds for a given calendar year.
 * Range is [startMs, endMs) — endMs is the first millisecond of the next year.
 */
export function yearRange(year: number): { startMs: number; endMs: number } {
	const startMs = Date.UTC(year, 0, 1);
	const endMs = Date.UTC(year + 1, 0, 1);
	return { startMs, endMs };
}

/**
 * Returns the progress through the current year as an integer percentage (0–100).
 * Progress = (dayOfYear / daysInYear) × 100, rounded down to integer.
 * nowMs is a timestamp in UTC milliseconds (e.g., from Date.now() or Date.UTC()).
 */
export function yearProgressPct(nowMs: number): number {
	const date = new Date(nowMs);
	const year = date.getUTCFullYear();

	// Get day of year (1-based: Jan 1 = 1, Dec 31 = 365 or 366)
	const startOfYear = new Date(Date.UTC(year, 0, 1));
	const msElapsed = nowMs - startOfYear.getTime();
	const dayOfYear = Math.floor(msElapsed / (1000 * 60 * 60 * 24)) + 1;

	// Determine if leap year
	const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
	const daysInYear = isLeapYear ? 366 : 365;

	// Calculate progress as integer percentage
	const progress = Math.floor((dayOfYear / daysInYear) * 100);

	// Clamp to 0–100 (in case of rounding edge cases)
	return Math.max(0, Math.min(100, progress));
}

/**
 * Returns the full month name with year (e.g., "July 2026").
 * Month is 0-indexed.
 */
export function monthLabel(year: number, month: number): string {
	const date = new Date(Date.UTC(year, month, 1));
	const monthName = date.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' });
	return `${monthName} ${year}`;
}

/**
 * Returns the abbreviated month name (e.g., "Jul").
 * Month is 0-indexed.
 */
export function monthShort(year: number, month: number): string {
	const date = new Date(Date.UTC(year, month, 1));
	return date.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
}
