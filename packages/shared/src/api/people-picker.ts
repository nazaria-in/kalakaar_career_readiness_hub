// /packages/shared/src/api/people-picker.ts

import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchPodMemberGroups, type FetchPodMemberGroupsParams } from "./pods";
import type { UserCardPerson } from "../types/people";

export interface SelectablePerson extends UserCardPerson {
  podName: string;
  podId: string;
  cohortId: string | null;
  cohortName: string | null;
}

export interface FetchSelectablePeopleParams extends FetchPodMemberGroupsParams {
  /**
   * Scopes to one mentor's pods. Omit for staff (associate/pm) to get every
   * pod across every cohort. Requires fetchPodMemberGroups to treat a missing
   * mentorId as unscoped.
   */
  mentorId?: string;
  /** Narrows to one cohort. Omit to fetch across all cohorts. */
  cohortId?: string;
}

/**
 * Flattens pod-grouped members into one list PeopleGrid can group either by
 * pod or by cohort without a second fetch.
 *
 * approvalStatus is hardcoded "approved" because fetchPodMemberGroups defaults
 * to onlyApproved: true. Revisit if that default changes.
 */
export function createPeoplePickerApi(supabase: SupabaseClient) {
  async function fetchSelectablePeople(
    params: FetchSelectablePeopleParams,
    search?: string
  ): Promise<SelectablePerson[]> {
    const pods = await fetchPodMemberGroups(supabase, params);
    const term = search?.trim().toLowerCase();
    const people: SelectablePerson[] = [];

    for (const pod of pods) {
      for (const member of pod.members) {
        if (term && !member.full_name.toLowerCase().includes(term)) continue;
        people.push({
          id: member.id,
          fullName: member.full_name,
          role: params.role,
          approvalStatus: "approved",
          podName: pod.cohortName ? `${pod.cohortName} — ${pod.name}` : pod.name,
          podId: pod.id,
          cohortId: pod.cohortId ?? null,
          cohortName: pod.cohortName ?? null,
        });
      }
    }

    return people;
  }

  return { fetchSelectablePeople };
}

export type PeoplePickerApi = ReturnType<typeof createPeoplePickerApi>;