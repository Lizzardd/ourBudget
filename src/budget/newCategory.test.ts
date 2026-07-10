import { expect, test } from 'vitest';

import {
	decLimitMinor,
	defaultLimitMinor,
	editName,
	incLimitMinor,
	NEW_CATEGORY_EMOJIS,
	pickPreset,
	stepLimitMinor,
} from './newCategory';

test('has 12 emoji presets', () => {
	expect(NEW_CATEGORY_EMOJIS).toHaveLength(12);
});

test('default limits are 1000/5000 major units in minor units', () => {
	expect(defaultLimitMinor('monthly')).toBe(100_000);
	expect(defaultLimitMinor('annual')).toBe(500_000);
});

test('step sizes are 100/500 major units in minor units', () => {
	expect(stepLimitMinor('monthly')).toBe(10_000);
	expect(stepLimitMinor('annual')).toBe(50_000);
});

test('inc/dec step by the period-appropriate amount', () => {
	expect(incLimitMinor(100_000, 'monthly')).toBe(110_000);
	expect(decLimitMinor(100_000, 'monthly')).toBe(90_000);
	expect(incLimitMinor(500_000, 'annual')).toBe(550_000);
	expect(decLimitMinor(500_000, 'annual')).toBe(450_000);
});

test('dec floors at one step, never reaching 0', () => {
	expect(decLimitMinor(10_000, 'monthly')).toBe(10_000);
	expect(decLimitMinor(50_000, 'annual')).toBe(50_000);
});

test('picking a preset auto-fills the blank name', () => {
	const state = pickPreset({ name: '', auto: true }, { emoji: 'medical_services', label: 'Health' });
	expect(state).toEqual({ name: 'Health', auto: true });
});

test('picking a preset overwrites a name that was itself auto-filled', () => {
	const afterFirst = pickPreset({ name: '', auto: true }, { emoji: 'medical_services', label: 'Health' });
	const afterSecond = pickPreset(afterFirst, { emoji: 'checkroom', label: 'Clothes' });
	expect(afterSecond).toEqual({ name: 'Clothes', auto: true });
});

test('typing a custom name disables auto-fill for future preset picks', () => {
	const typed = editName('Ski trip');
	expect(typed).toEqual({ name: 'Ski trip', auto: false });

	const afterPick = pickPreset(typed, { emoji: 'lightbulb', label: 'Utilities' });
	expect(afterPick).toEqual({ name: 'Ski trip', auto: false });
});

test('clearing the name field back to empty re-enables auto-fill', () => {
	const cleared = editName('');
	expect(cleared).toEqual({ name: '', auto: true });

	const afterPick = pickPreset(cleared, { emoji: 'lightbulb', label: 'Utilities' });
	expect(afterPick).toEqual({ name: 'Utilities', auto: true });
});
