import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import type { Currency } from './types';

export interface UseHouseholdResult {
	householdId: Id<'households'> | undefined;
	name: string | undefined;
	currency: Currency | undefined;
	loading: boolean;
}

/**
 * Resolves the caller's active household — the first of `myHouseholds`,
 * since Phase B does not yet support multi-household switching.
 */
export function useHousehold(): UseHouseholdResult {
	const households = useQuery(api.households.myHouseholds, {});
	const loading = households === undefined;
	const active = households?.[0];

	return {
		householdId: active?._id,
		name: active?.name,
		currency: active?.currency,
		loading,
	};
}

/** Thin wrapper over the `createHousehold` mutation. */
export function useCreateHousehold() {
	return useMutation(api.households.createHousehold);
}

/** Thin wrapper over the `joinHousehold` mutation. */
export function useJoinHousehold() {
	return useMutation(api.households.joinHousehold);
}
