export interface EmojiPreset {
	/** Material Symbols Rounded ligature name (see src/components/Icon.tsx). */
	emoji: string;
	label: string;
}

/**
 * The 12 icon/name presets from the prototype's `ncEmojis`, in display
 * order (4-column grid, 3 rows). `emoji` holds a Material Symbols Rounded
 * ligature name (e.g. "flight"), not an emoji character.
 */
export const NEW_CATEGORY_EMOJIS: EmojiPreset[] = [
	{ emoji: 'flight', label: 'Travel' },
	{ emoji: 'lightbulb', label: 'Utilities' },
	{ emoji: 'wifi', label: 'Phone & internet' },
	{ emoji: 'medical_services', label: 'Health' },
	{ emoji: 'checkroom', label: 'Clothes' },
	{ emoji: 'spa', label: 'Personal care' },
	{ emoji: 'movie', label: 'Entertainment' },
	{ emoji: 'school', label: 'Education' },
	{ emoji: 'pets', label: 'Pets' },
	{ emoji: 'chair', label: 'Furniture' },
	{ emoji: 'volunteer_activism', label: 'Charity' },
	{ emoji: 'fitness_center', label: 'Fitness' },
];

export type NewCategoryPeriod = 'monthly' | 'annual';

/** Default limit (minor units) applied when a period is selected. */
const DEFAULT_LIMIT_MINOR: Record<NewCategoryPeriod, number> = {
	monthly: 100_000,
	annual: 500_000,
};

/** Stepper increment (minor units) for each period. */
const STEP_MINOR: Record<NewCategoryPeriod, number> = {
	monthly: 10_000,
	annual: 50_000,
};

export function defaultLimitMinor(period: NewCategoryPeriod): number {
	return DEFAULT_LIMIT_MINOR[period];
}

export function stepLimitMinor(period: NewCategoryPeriod): number {
	return STEP_MINOR[period];
}

/** One step up, no ceiling. */
export function incLimitMinor(limitMinor: number, period: NewCategoryPeriod): number {
	return limitMinor + stepLimitMinor(period);
}

/** One step down, floored at a single step so the limit never reaches 0. */
export function decLimitMinor(limitMinor: number, period: NewCategoryPeriod): number {
	const step = stepLimitMinor(period);
	return Math.max(step, limitMinor - step);
}

export interface NameAutoFillState {
	name: string;
	auto: boolean;
}

/**
 * Applied when the user picks an emoji preset. The name field auto-fills
 * with the preset's label as long as `auto` is still true (nothing typed
 * yet) or the current name is blank — matching the prototype's
 * `st.ncAuto || !st.ncName.trim()` gate. Once the user has typed a name of
 * their own, further preset picks only change the emoji.
 */
export function pickPreset(state: NameAutoFillState, preset: EmojiPreset): NameAutoFillState {
	const auto = state.auto || state.name.trim() === '';
	return {
		name: auto ? preset.label : state.name,
		auto,
	};
}

/**
 * Applied on every keystroke in the name field. Typing anything disables
 * auto-fill; clearing the field back to empty re-enables it, mirroring the
 * prototype's `ncNameChange`.
 */
export function editName(nextName: string): NameAutoFillState {
	return { name: nextName, auto: nextName.trim() === '' };
}
