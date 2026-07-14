import { describe, expect, it } from 'vitest';

import { filterPayeeSuggestions, MAX_PAYEE_SUGGESTIONS } from './payees';

const history = ['Carrefour', 'Carrefour Market', 'Spinneys', 'Costa Coffee', 'Careem', 'Talabat'];

describe('filterPayeeSuggestions()', () => {
	it('offers nothing until the user types', () => {
		expect(filterPayeeSuggestions(history, '')).toEqual([]);
		expect(filterPayeeSuggestions(history, '   ')).toEqual([]);
	});

	it('matches anywhere in the name, not just the start', () => {
		// You rarely remember how a shop's name begins.
		expect(filterPayeeSuggestions(history, 'four')).toEqual(['Carrefour', 'Carrefour Market']);
	});

	it('is case-insensitive', () => {
		expect(filterPayeeSuggestions(history, 'CARRE')).toEqual(['Carrefour', 'Carrefour Market']);
	});

	it('drops an exact match — there is nothing left to complete', () => {
		const out = filterPayeeSuggestions(history, 'Carrefour');
		expect(out).not.toContain('Carrefour');
		expect(out).toEqual(['Carrefour Market']);
	});

	it('caps the list at four', () => {
		const many = ['aa1', 'aa2', 'aa3', 'aa4', 'aa5', 'aa6'];
		expect(filterPayeeSuggestions(many, 'aa')).toHaveLength(MAX_PAYEE_SUGGESTIONS);
		expect(MAX_PAYEE_SUGGESTIONS).toBe(4);
	});

	it('returns nothing when nothing matches', () => {
		expect(filterPayeeSuggestions(history, 'zzz')).toEqual([]);
	});
});
