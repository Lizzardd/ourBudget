import { describe, expect, it } from 'vitest';

import { flipMode, tokensForMode } from './mode';
import { ACCENT, dark, light } from './tokens';

describe('ThemeProvider mode/token logic', () => {
	it('flipMode toggles dark <-> light and back', () => {
		expect(flipMode('dark')).toBe('light');
		expect(flipMode('light')).toBe('dark');
		expect(flipMode(flipMode('dark'))).toBe('dark');
	});

	it('tokensForMode exposes the correct token set for each mode', () => {
		expect(tokensForMode('dark')).toEqual(dark);
		expect(tokensForMode('light')).toEqual(light);
		expect(tokensForMode('dark')).not.toEqual(tokensForMode('light'));
	});

	it('token sets contain the exact hex/rgba values from the brief', () => {
		expect(dark).toEqual({
			bg: '#17120E',
			card: '#221B16',
			el: '#2D251F',
			text: '#F6EDE3',
			sub: '#B5A493',
			line: 'rgba(246,237,227,0.12)',
			track: 'rgba(246,237,227,0.15)',
		});
		expect(light).toEqual({
			bg: '#F7F0E6',
			card: '#FFFDF9',
			el: '#F0E5D6',
			text: '#37291F',
			sub: '#8A7663',
			line: 'rgba(55,41,31,0.08)',
			track: 'rgba(55,41,31,0.10)',
		});
		expect(ACCENT).toBe('#C96287');
	});
});
