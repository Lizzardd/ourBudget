export interface DateFieldProps {
	/** The currently-selected instant, in ms. */
	spentAtMs: number;
	/** Called with the new instant (ms) when the user picks a date. */
	onChange: (ms: number) => void;
	/** The label shown in the pill (e.g. "Today" or "14 Jul 2026"). */
	label: string;
	/** Latest selectable day, in ms — an expense can't have happened tomorrow. */
	maximumMs?: number;
}
