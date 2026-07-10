import { expect, test } from 'vitest';
import {
	monthRange,
	yearRange,
	yearProgressPct,
	monthLabel,
	monthShort,
} from './periods';

test('monthRange returns startMs and endMs for a given month', () => {
	// July 2026 (month 6, 0-indexed)
	const july = monthRange(2026, 6);
	expect(july.startMs).toBe(Date.UTC(2026, 6, 1));
	expect(july.endMs).toBe(Date.UTC(2026, 7, 1)); // Start of August (exclusive)
});

test('monthRange works for different months', () => {
	// January 2026
	const jan = monthRange(2026, 0);
	expect(jan.startMs).toBe(Date.UTC(2026, 0, 1));
	expect(jan.endMs).toBe(Date.UTC(2026, 1, 1));

	// December 2026
	const dec = monthRange(2026, 11);
	expect(dec.startMs).toBe(Date.UTC(2026, 11, 1));
	expect(dec.endMs).toBe(Date.UTC(2027, 0, 1)); // Wraps to next year
});

test('monthRange covers the full calendar month', () => {
	const july = monthRange(2026, 6);
	// July 1 at start of day
	const julStart = Date.UTC(2026, 6, 1, 0, 0, 0, 0);
	expect(july.startMs).toBe(julStart);

	// July 31 at 23:59:59.999 should be before endMs
	const julEnd = Date.UTC(2026, 6, 31, 23, 59, 59, 999);
	expect(julEnd).toBeLessThan(july.endMs);
});

test('yearRange returns startMs and endMs for a full year', () => {
	const year2026 = yearRange(2026);
	expect(year2026.startMs).toBe(Date.UTC(2026, 0, 1)); // Jan 1
	expect(year2026.endMs).toBe(Date.UTC(2027, 0, 1)); // Jan 1 of next year (exclusive)
});

test('yearRange covers the full calendar year', () => {
	const year2026 = yearRange(2026);
	// Dec 31 at 23:59:59.999 should be before endMs
	const decEnd = Date.UTC(2026, 11, 31, 23, 59, 59, 999);
	expect(decEnd).toBeLessThan(year2026.endMs);
});

test('yearProgressPct returns 0 at start of year', () => {
	// Jan 1, 2026 at 00:00:00
	const janStart = Date.UTC(2026, 0, 1, 0, 0, 0);
	const progress = yearProgressPct(janStart);
	expect(progress).toBe(0);
});

test('yearProgressPct returns 100 at end of year', () => {
	// Dec 31, 2026 at 23:59:59 (end of the year)
	const dec31End = Date.UTC(2026, 11, 31, 23, 59, 59);
	const progress = yearProgressPct(dec31End);
	expect(progress).toBe(100);
});

test('yearProgressPct returns ~50 at mid-year', () => {
	// July 2, 2026 (day 183 of 365)
	// 183 / 365 * 100 ≈ 50.1%
	const july2 = Date.UTC(2026, 6, 2, 0, 0, 0);
	const progress = yearProgressPct(july2);
	// Should be between 50 and 51
	expect(progress).toBeGreaterThanOrEqual(50);
	expect(progress).toBeLessThanOrEqual(51);
});

test('yearProgressPct is an integer', () => {
	const july2 = Date.UTC(2026, 6, 2, 0, 0, 0);
	const progress = yearProgressPct(july2);
	expect(Number.isInteger(progress)).toBe(true);
});

test('yearProgressPct handles leap years', () => {
	// 2024 is a leap year
	// Jan 1, 2024 at 00:00:00
	const jan1_2024 = Date.UTC(2024, 0, 1, 0, 0, 0);
	expect(yearProgressPct(jan1_2024)).toBe(0);

	// July 2, 2024 (day 184 of 366)
	// 184 / 366 * 100 ≈ 50.3%
	const july2_2024 = Date.UTC(2024, 6, 2, 0, 0, 0);
	const progress = yearProgressPct(july2_2024);
	expect(progress).toBeGreaterThanOrEqual(50);
	expect(progress).toBeLessThanOrEqual(51);
});

test('monthLabel returns full month name with year', () => {
	expect(monthLabel(2026, 6)).toBe('July 2026');
	expect(monthLabel(2026, 0)).toBe('January 2026');
	expect(monthLabel(2026, 11)).toBe('December 2026');
});

test('monthShort returns abbreviated month name', () => {
	expect(monthShort(2026, 6)).toBe('Jul');
	expect(monthShort(2026, 0)).toBe('Jan');
	expect(monthShort(2026, 11)).toBe('Dec');
	expect(monthShort(2026, 1)).toBe('Feb');
	expect(monthShort(2026, 2)).toBe('Mar');
});

test('monthShort is consistent across different years', () => {
	expect(monthShort(2024, 6)).toBe('Jul');
	expect(monthShort(2025, 6)).toBe('Jul');
	expect(monthShort(2026, 6)).toBe('Jul');
});
