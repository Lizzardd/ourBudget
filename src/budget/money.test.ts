import { expect, test } from 'vitest';
import { fmt, fmtK, fmtN, glyph, parseAmountToMinor, sanitizeAmountInput } from './money';

// The custom numpad could only emit valid keys, so nothing had to be validated.
// An OS keypad can emit anything, so every keystroke is normalised instead.
test('sanitizeAmountInput strips anything that is not money', () => {
	expect(sanitizeAmountInput('45')).toBe('45');
	expect(sanitizeAmountInput('45.5')).toBe('45.5');
	expect(sanitizeAmountInput('4a5x')).toBe('45');
	expect(sanitizeAmountInput('')).toBe('');
});

test('sanitizeAmountInput allows only one decimal point', () => {
	expect(sanitizeAmountInput('1.2.3')).toBe('1.23');
	expect(sanitizeAmountInput('1..')).toBe('1.');
});

test('sanitizeAmountInput caps the fraction at two places', () => {
	expect(sanitizeAmountInput('4.5678')).toBe('4.56');
});

test('sanitizeAmountInput keeps a leading decimal usable', () => {
	// Typing ".5" must work: the user is mid-way through a valid number, and
	// swallowing the keystroke would make the field feel broken.
	expect(sanitizeAmountInput('.')).toBe('0.');
	expect(sanitizeAmountInput('.5')).toBe('0.5');
	expect(parseAmountToMinor(sanitizeAmountInput('.5'))).toBe(50);
});

test('a trailing decimal point survives so the user can keep typing', () => {
	expect(sanitizeAmountInput('45.')).toBe('45.');
	expect(parseAmountToMinor('45.')).toBe(4500);
});

test('fmt prints the glyph, a thin space, and two decimals', () => {
	expect(fmt(134000, 'AED')).toBe('Đ 1340,00');
	expect(fmt(500, 'USD')).toBe('$ 5,00');
});

// The regression this guards: fmt used to round to whole units, so an expense
// entered as 58.50 was displayed as "59". Money the user typed must come back.
test('fmt keeps the cents', () => {
	expect(fmt(5850, 'AED')).toBe('Đ 58,50');
	expect(fmt(5899, 'AED')).toBe('Đ 58,99');
	expect(fmt(1, 'AED')).toBe('Đ 0,01');
});

// The comma is the DECIMAL separator, not a thousands separator, so there is no
// grouping at all: "Đ 5500,00", never "Đ 5,500.00".
test('fmt does not group thousands', () => {
	expect(fmt(550000, 'AED')).toBe('Đ 5500,00');
	expect(fmt(123456789, 'AED')).toBe('Đ 1234567,89');
});

test('fmt handles a negative amount', () => expect(fmt(-5850, 'AED')).toBe('Đ -58,50'));

test('fmtN has no glyph, no decimals, and no grouping', () => {
	expect(fmtN(1200000)).toBe('12000');
	expect(fmtN(550000)).toBe('5500');
});

test('glyph maps currencies', () => expect(glyph('ZAR')).toBe('R'));

test('fmtK formats minor units as thousands with one decimal', () => {
	expect(fmtK(214000)).toBe('2.1k');
	expect(fmtK(0)).toBe('0.0k');
});

test('parseAmountToMinor handles decimals', () => {
	expect(parseAmountToMinor('12.5')).toBe(1250);
	expect(parseAmountToMinor('')).toBe(0);
});
