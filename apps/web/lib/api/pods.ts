// /lib/api/pods.ts
import { createClient } from "@/lib/supabase/client";
import * as shared from "@repo/shared";

export type { FetchPodMemberGroupsParams } from "@repo/shared";

export const fetchPodMemberGroups = (params: shared.FetchPodMemberGroupsParams) =>
  shared.fetchPodMemberGroups(createClient(), params);

export const fetchAllPodGroupsForRoles = (roles: shared.UserRole[]) =>
  shared.fetchAllPodGroupsForRoles(createClient(), roles);

export const getMenteeIdsForMentor = (mentorId: string) =>
  shared.getMenteeIdsForMentor(createClient(), mentorId);

export const getMentorIdsForMentee = (menteeId: string) =>
  shared.getMentorIdsForMentee(createClient(), menteeId);