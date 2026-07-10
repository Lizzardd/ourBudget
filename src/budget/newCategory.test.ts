import { expect, test } from 'vitest';

import {
	decLimitMinor,
	defaultLimitMinor,
	editName,
	incLimitMinor,
	NEW_CATEGORY_EMOJIS,
	pickPreset,
	stepLimitMinor,
	visibleEmojiPresets,
} from './newCategory';

test('has 14 emoji presets, ending in Ad Hoc then Custom', () => {
	expect(NEW_CATEGORY_EMOJIS).toHaveLength(14);
	expect(NEW_CATEGORY_EMOJIS[12]).toEqual({ emoji: 'bolt', label: 'Ad Hoc' });
	expect(NEW_CATEGORY_EMOJIS[13]).toEqual({ emoji: 'add_circle', label: 'Custom', custom: true });
});

test('the curated categories lead the list, in order', () => {
	expect(NEW_CATEGORY_EMOJIS.slice(0, 6)).toEqual([
		{ emoji: 'grocery', label: 'Groceries' },
		{ emoji: 'movie', label: 'Entertainment' },
		{ emoji: 'local_taxi', label: 'Transport' },
		{ emoji: 'lightbulb', label: 'Utilities' },
		{ emoji: 'school', label: 'Education' },
		{ emoji: 'subscriptions', label: 'Subscriptions' },
	]);
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

test('picking the Custom preset clears the name and disables auto-fill', () => {
	const custom = { emoji: 'add_circle', label: 'Custom', custom: true as const };

	const fromAuto = pickPreset({ name: 'Health', auto: true }, custom);
	expect(fromAuto).toEqual({ name: '', auto: false });

	const fromTyped = pickPreset({ name: 'Ski trip', auto: false }, custom);
	expect(fromTyped).toEqual({ name: '', auto: false });
});

test('visibleEmojiPresets hides presets matching an existing category name, case-insensitively', () => {
	const visible = visibleEmojiPresets(['groceries', 'Travel', 'HOUSING']);
	const labels = visible.map((p) => p.label);

	expect(labels).not.toContain('Groceries');
	expect(labels).not.toContain('Travel');
	expect(labels).not.toContain('Housing');
	expect(labels).toContain('Entertainment');
	expect(labels).toContain('Ad Hoc');
});

test('visibleEmojiPresets never hides Custom', () => {
	const allNames = NEW_CATEGORY_EMOJIS.map((p) => p.label);
	const visible = visibleEmojiPresets(allNames);

	expect(visible).toHaveLength(1);
	expect(visible[0]).toEqual({ emoji: 'add_circle', label: 'Custom', custom: true });
});

test('visibleEmojiPresets shows everything when there are no existing categories', () => {
	expect(visibleEmojiPresets([])).toEqual(NEW_CATEGORY_EMOJIS);
});
