import { fmt } from './money';

export interface StatusResult {
	level: 'good' | 'warn' | 'over';
	barFrom: string;
	barTo: string | null;
	sub1: string;
	sub2: string;
	subColor: string;
	pct: number;
}

export function status(
	spentMinor: number,
	limitMinor: number,
	annual: boolean,
	cur: string
): StatusResult {
	const pct = limitMinor <= 0 ? 0 : spentMinor / limitMinor;
	const left = limitMinor - spentMinor;
	const over = spentMinor - limitMinor;

	if (pct > 1) {
		// Over band
		return {
			level: 'over',
			barFrom: '#CE4B3A',
			barTo: '#B7301F',
			sub1: fmt(over, cur) + ' over',
			sub2: 'it happens 💛',
			subColor: '#DE4B37',
			pct,
		};
	} else if (pct >= 0.85) {
		// Warn band
		return {
			level: 'warn',
			barFrom: '#86B478',
			barTo: null,
			sub1: fmt(left, cur) + ' left',
			sub2: 'nearly there 🌿',
			subColor: '#8FBF7E',
			pct,
		};
	} else {
		// Good band
		return {
			level: 'good',
			barFrom: '#86B478',
			barTo: null,
			sub1: fmt(left, cur) + ' left',
			sub2: '',
			subColor: '#8FBF7E',
			pct,
		};
	}
}
