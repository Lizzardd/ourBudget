import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useHousehold } from './useHousehold';

/**
 * Loads the caller's settings row for the active household via
 * `settings.getSettings`.
 */
export function useSettings() {
	const { householdId, loading: householdLoading } = useHousehold();
	const settings = useQuery(api.settings.getSettings, householdId ? { householdId } : 'skip');

	return {
		settings,
		loading: householdLoading || settings === undefined,
	};
}

/** Thin wrapper over the `updateSettings` mutation. */
export function useUpdateSettings() {
	return useMutation(api.settings.updateSettings);
}

/** Thin wrapper over the `setCurrency` mutation (household-level). */
export function useSetCurrency() {
	return useMutation(api.settings.setCurrency);
}
