import { expect, test } from 'vitest';
import { applyNumpadKey } from './numpad';

test('appends digits in sequence', () => {
	let amount = '';
	for (const key of ['1', '2', '3']) {
		amount = applyNumpadKey(amount, key);
	}
	expect(amount).toBe('123');
});

test('appends a single decimal point', () => {
	expect(applyNumpadKey('12', '.')).toBe('12.');
});

test('ignores a second decimal point', () => {
	expect(applyNumpadKey('12.5', '.')).toBe('12.5');
});

test('starting with a decimal point prefixes a leading 0', () => {
	expect(applyNumpadKey('', '.')).toBe('0.');
});

test('backspace drops the last character', () => {
	expect(applyNumpadKey('12.5', '⌫')).toBe('12.');
});

test('backspace on empty string stays empty', () => {
	expect(applyNumpadKey('', '⌫')).toBe('');
});

test('caps digit-only length at 6, decimal point excluded', () => {
	expect(applyNumpadKey('123456', '7')).toBe('123456');
	expect(applyNumpadKey('123.456', '7')).toBe('123.456');
});

test('allows the 6th digit before capping', () => {
	expect(applyNumpadKey('12345', '6')).toBe('123456');
});

test('a lone leading 0 is replaced rather than extended', () => {
	// Reachable by typing '.', backspacing the fraction back down to '0',
	// then pressing a digit — should not produce a leading-zero string.
	let amount = applyNumpadKey('', '.'); // '0.'
	amount = applyNumpadKey(amount, '⌫'); // '0'
	expect(amount).toBe('0');
	amount = applyNumpadKey(amount, '5');
	expect(amount).toBe('5');
});
