export interface EmojiPreset {
	/** Material Symbols Rounded ligature name (see src/components/Icon.tsx). */
	emoji: string;
	label: string;
	/**
	 * The "Custom" entry: picking it clears the name field and turns off
	 * auto-fill instead of filling in `label`. Never hidden by
	 * `visibleEmojiPresets`.
	 */
	custom?: boolean;
}

/**
 * The 14 icon/name presets from the prototype's `ncEmojis`, in display
 * order. `emoji` holds a Material Symbols Rounded ligature name (e.g.
 * "flight"), not an emoji character. The final entry is the "Custom"
 * preset, which is always shown regardless of existing categories.
 */
export const NEW_CATEGORY_EMOJIS: EmojiPreset[] = [
	{ emoji: 'grocery', label: 'Groceries' },
	{ emoji: 'movie', label: 'Entertainment' },
	{ emoji: 'local_taxi', label: 'Transport' },
	{ emoji: 'lightbulb', label: 'Utilities' },
	{ emoji: 'school', label: 'Education' },
	{ emoji: 'subscriptions', label: 'Subscriptions' },
	{ emoji: 'flight', label: 'Travel' },
	{ emoji: 'handyman', label: 'Maintenance' },
	{ emoji: 'fitness_center', label: 'Health & Fitness' },
	{ emoji: 'sports_esports', label: 'Hobbies' },
	{ emoji: 'pets', label: 'Pets' },
	{ emoji: 'home', label: 'Housing' },
	{ emoji: 'bolt', label: 'Ad Hoc' },
	{ emoji: 'add_circle', label: 'Custom', custom: true },
];

/**
 * Presets to actually render in the sheet: any preset whose label matches
 * (case-insensitively) an active category's name is hidden, since the
 * household already has that category. "Custom" is never hidden.
 */
export function visibleEmojiPresets(existingCategoryNames: readonly string[]): EmojiPreset[] {
	const existing = new Set(existingCategoryNames.map((name) => name.trim().toLowerCase()));
	return NEW_CATEGORY_EMOJIS.filter(
		(preset) => preset.custom || !existing.has(preset.label.toLowerCase())
	);
}

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
 *
 * Picking the "Custom" preset instead clears the name and turns off
 * auto-fill, so the user's typing isn't overwritten by a later pick —
 * matching the prototype's `o.custom ? { ncEmoji: o.e, ncName: '', ncAuto: false } : ...`.
 */
export function pickPreset(state: NameAutoFillState, preset: EmojiPreset): NameAutoFillState {
	if (preset.custom) {
		return { name: '', auto: false };
	}
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
