import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useHousehold } from './useHousehold';

/**
 * Lists the active household's non-archived categories, sorted by
 * `sortOrder` (as returned by `categories.listCategories`).
 */
export function useCategories() {
	const { householdId, loading: householdLoading } = useHousehold();
	const categories = useQuery(
		api.categories.listCategories,
		householdId ? { householdId } : 'skip'
	);

	return {
		categories: categories ?? [],
		loading: householdLoading || categories === undefined,
	};
}

/** Thin wrapper over the `createCategory` mutation. */
export function useCreateCategory() {
	return useMutation(api.categories.createCategory);
}

/** Thin wrapper over the `updateCategoryLimit` mutation. */
export function useUpdateCategoryLimit() {
	return useMutation(api.categories.updateCategoryLimit);
}

/** Thin wrapper over the `archiveCategory` mutation. */
export function useArchiveCategory() {
	return useMutation(api.categories.archiveCategory);
}
