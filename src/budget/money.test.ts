import { expect, test } from 'vitest';
import { fmt, fmtK, fmtN, glyph, parseAmountToMinor } from './money';

test('fmt rounds and groups with glyph', () => {
	expect(fmt(134000, 'AED')).toBe('Đ1,340');
	expect(fmt(500, 'USD')).toBe('$5');
});

test('fmtN has no glyph', () => expect(fmtN(1200000)).toBe('12,000'));

test('glyph maps currencies', () => expect(glyph('ZAR')).toBe('R'));

test('fmtK formats minor units as thousands with one decimal', () => {
	expect(fmtK(214000)).toBe('2.1k');
	expect(fmtK(0)).toBe('0.0k');
});

test('parseAmountToMinor handles decimals', () => {
	expect(parseAmountToMinor('12.5')).toBe(1250);
	expect(parseAmountToMinor('')).toBe(0);
});
