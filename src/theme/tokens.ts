/**
 * Raw theme token values. This module is pure data — no React, no
 * platform APIs — so it can be imported anywhere (including tests)
 * without side effects.
 */

export const ACCENT = '#C96287';

export interface Tokens {
	bg: string;
	card: string;
	el: string;
	text: string;
	sub: string;
	line: string;
	track: string;
}

export const dark: Tokens = {
	bg: '#17120E',
	card: '#221B16',
	el: '#2D251F',
	text: '#F6EDE3',
	sub: '#B5A493',
	line: 'rgba(246,237,227,0.12)',
	track: 'rgba(246,237,227,0.15)',
};

export const light: Tokens = {
	bg: '#F7F0E6',
	card: '#FFFDF9',
	el: '#F0E5D6',
	text: '#37291F',
	sub: '#8A7663',
	line: 'rgba(55,41,31,0.08)',
	track: 'rgba(55,41,31,0.10)',
};

export const STATUS = {
	good: '#86B478',
	goodSub: '#8FBF7E',
	warn: '#E3A55C',
	warnSub: '#E3B063',
	overFrom: '#E3A55C',
	overTo: '#DD7A5E',
	overSub: '#E9967D',
};

export const GLYPH = {
	AED: 'Đ',
	USD: '$',
	GBP: '£',
	EUR: '€',
	ZAR: 'R',
} as const;
