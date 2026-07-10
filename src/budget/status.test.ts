import { describe, it, expect } from 'vitest';
import { status } from './status';

describe('status()', () => {
	describe('good band (pct < 0.85)', () => {
		it('returns level good with correct sub1/sub2 and colors', () => {
			const result = status(500000, 1000000, false, 'AED');
			expect(result.level).toBe('good');
			expect(result.barFrom).toBe('#86B478');
			expect(result.barTo).toBeNull();
			expect(result.sub1).toBe('Đ5,000 left');
			expect(result.sub2).toBe('');
			expect(result.subColor).toBe('#8FBF7E');
			expect(result.pct).toBeCloseTo(0.5);
		});

		it('ignores annual flag (no " this year" suffix)', () => {
			const result = status(500000, 1000000, true, 'AED');
			expect(result.level).toBe('good');
			expect(result.sub1).toBe('Đ5,000 left');
		});

		it('works with different currencies', () => {
			const result = status(500000, 1000000, false, 'USD');
			expect(result.sub1).toBe('$5,000 left');
		});
	});

	describe('warn band (0.85 <= pct <= 1)', () => {
		it('returns level warn at pct=0.85 with correct sub1/sub2 and colors', () => {
			const result = status(850000, 1000000, false, 'AED');
			expect(result.level).toBe('warn');
			expect(result.barFrom).toBe('#86B478');
			expect(result.barTo).toBeNull();
			expect(result.sub1).toBe('Đ1,500 left');
			expect(result.sub2).toBe('nearly there 🌿');
			expect(result.subColor).toBe('#8FBF7E');
			expect(result.pct).toBeCloseTo(0.85);
		});

		it('returns level warn at pct=0.95', () => {
			const result = status(950000, 1000000, false, 'AED');
			expect(result.level).toBe('warn');
			expect(result.sub1).toBe('Đ500 left');
			expect(result.sub2).toBe('nearly there 🌿');
		});

		it('ignores annual flag (no " this year" suffix)', () => {
			const result = status(850000, 1000000, true, 'AED');
			expect(result.level).toBe('warn');
			expect(result.sub1).toBe('Đ1,500 left');
		});

		it('works at pct=1 boundary', () => {
			const result = status(1000000, 1000000, false, 'AED');
			expect(result.level).toBe('warn');
			expect(result.sub1).toBe('Đ0 left');
		});
	});

	describe('over band (pct > 1)', () => {
		it('returns level over with correct sub1/sub2 and colors', () => {
			const result = status(1340000, 1200000, false, 'AED');
			expect(result.level).toBe('over');
			expect(result.barFrom).toBe('#CE4B3A');
			expect(result.barTo).toBe('#B7301F');
			expect(result.sub1).toBe('Đ1,400 over');
			expect(result.sub2).toBe('it happens 💛');
			expect(result.subColor).toBe('#DE4B37');
			expect(result.pct).toBeCloseTo(1.1167);
		});

		it('works with small overages', () => {
			const result = status(1010000, 1000000, false, 'AED');
			expect(result.level).toBe('over');
			expect(result.sub1).toBe('Đ100 over');
			expect(result.sub2).toBe('it happens 💛');
		});

		it('ignores annual flag (no " this year" suffix)', () => {
			const result = status(1340000, 1200000, true, 'AED');
			expect(result.level).toBe('over');
			expect(result.sub1).toBe('Đ1,400 over');
		});

		it('works with different currencies', () => {
			const result = status(1340000, 1200000, false, 'GBP');
			expect(result.sub1).toBe('£1,400 over');
		});
	});

	describe('pct calculation', () => {
		it('correctly calculates pct as spent/limit', () => {
			const result1 = status(250000, 1000000, false, 'AED');
			expect(result1.pct).toBe(0.25);

			const result2 = status(500000, 2000000, false, 'AED');
			expect(result2.pct).toBeCloseTo(0.25);

			const result3 = status(1500000, 1000000, false, 'AED');
			expect(result3.pct).toBe(1.5);
		});
	});
});
