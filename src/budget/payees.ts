/**
 * Autocomplete for the Add-expense sheet's "Where?" field, over the
 * household's previously-used payee names.
 */

/** The prototype shows at most four suggestions. */
export const MAX_PAYEE_SUGGESTIONS = 4;

/**
 * The suggestions to show for what the user has typed so far — copy of the
 * prototype's `payeeSuggestions`.
 *
 * Three rules, all of them deliberate:
 *
 * - **Nothing until they type.** An empty field offers no suggestions. An
 *   earlier version of the design listed every past payee up front; it now
 *   waits, so the dropdown never covers the fields below it unasked.
 * - **An exact match is not a suggestion.** Once what they have typed IS the
 *   name, there is nothing left to complete, and offering it back would just
 *   sit there daring them to tap it.
 * - **Substring, not prefix.** "four" finds "Carrefour" — you rarely remember
 *   how a shop's name starts.
 */
export function filterPayeeSuggestions(
	history: readonly string[],
	typed: string,
	max: number = MAX_PAYEE_SUGGESTIONS
): string[] {
	const query = typed.trim().toLowerCase();
	if (query === '') {
		return [];
	}
	return history
		.filter((name) => {
			const candidate = name.toLowerCase();
			return candidate.includes(query) && candidate !== query;
		})
		.slice(0, max);
}
