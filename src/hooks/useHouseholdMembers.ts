import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { useHousehold } from './useHousehold';

export interface HouseholdMember {
	userId: Id<'users'>;
	displayName: string;
	profileColor: string;
	/** Avatar photo URL, or undefined to show the colour + initial. */
	photoUrl?: string;
	initial: string;
	role: 'owner' | 'member';
	isMe: boolean;
}

export interface UseHouseholdMembersResult {
	householdName: string | undefined;
	members: HouseholdMember[] | undefined;
	loading: boolean;
}

/**
 * Loads the active household's name (from `useHousehold`) plus every
 * member's display info via `households.householdMembers`, caller first.
 * Used by the Home greeting header's avatar stack.
 */
export function useHouseholdMembers(): UseHouseholdMembersResult {
	const { householdId, name, loading: householdLoading } = useHousehold();
	const members = useQuery(
		api.households.householdMembers,
		householdId ? { householdId } : 'skip',
	);

	return {
		householdName: name,
		members,
		loading: householdLoading || members === undefined,
	};
}
