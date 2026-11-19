// /packages/shared/src/api/admin-users.ts

import type { SupabaseClient } from "@supabase/supabase-js";
import { applyFilters } from "../filtering/apply-filters";
import { applySort } from "../filtering/apply-sort";
import { USER_ROLE_FIELD_DEFS, USER_POD_FIELD_DEFS } from "../filtering/admin-user-fields";
import type { FilterState, SortState } from "../types/filtering";
import { UserRole, ApprovalStatus } from "../types";

export interface AdminUserRow {
  id: string;
  fullName: string | null;
  email: string | null;
  schoolOrOrg: string | null;
  role: UserRole;
  approvalStatus: ApprovalStatus;
  createdAt: string;
}

export interface AdminUserPodRow {
  userId: string;
  fullName: string | null;
  email: string | null;
  role: UserRole;
  approvalStatus: ApprovalStatus;
  podId: string | null;
  podName: string | null;
  cohortId: string | null;
}

export interface PodOption {
  value: string;
  label: string;
}

export interface CohortOption {
  value: string;
  label: string;
}

export interface PodFirstMentor {
  podId: string;
  mentorId: string;
}

export interface PodMemberSummary {
  userId: string;
  fullName: string | null;
  email: string | null;
  role: UserRole;
}

export interface PodOverview {
  id: string;
  name: string;
  cohortId: string;
  cohortName: string | null;
  skillLevel: string | null;
  mentors: PodMemberSummary[];
  mentees: PodMemberSummary[];
  associatesAndPms: PodMemberSummary[];
}

export interface CreatePodInput {
  name: string;
  cohortId: string;
  skillLevel?: string;
  description?: string;
}

export interface CreateCohortInput {
  name: string;
  startDate: string | null;
  endDate: string | null;
}

function toAdminUserRow(row: Record<string, unknown>): AdminUserRow {
  return {
    id: row.id as string,
    fullName: (row.full_name as string) ?? null,
    email: (row.email as string) ?? null,
    schoolOrOrg: (row.school_or_org as string) ?? null,
    role: row.role as UserRole,
    approvalStatus: row.approval_status as ApprovalStatus,
    createdAt: row.created_at as string,
  };
}

function toAdminUserPodRow(row: Record<string, unknown>): AdminUserPodRow {
  return {
    userId: row.user_id as string,
    fullName: (row.full_name as string) ?? null,
    email: (row.email as string) ?? null,
    role: row.role as UserRole,
    approvalStatus: row.approval_status as ApprovalStatus,
    podId: (row.pod_id as string) ?? null,
    podName: (row.pod_name as string) ?? null,
    cohortId: (row.cohort_id as string) ?? null,
  };
}

/**
 * Factory: pass in the platform's Supabase client. Web and mobile each
 * create their own client; this file never imports one.
 */
export function createAdminUsersApi(supabase: SupabaseClient) {
  async function fetchUsersForRolesTab(
    filterState: FilterState,
    sortState: SortState
  ): Promise<AdminUserRow[]> {
    let query = supabase.from("users").select().is("deleted_at", null);
    query = applyFilters(query, USER_ROLE_FIELD_DEFS, filterState);
    query = applySort(query, USER_ROLE_FIELD_DEFS, sortState);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []).map(toAdminUserRow);
  }

  async function fetchUsersForPodsTab(
    filterState: FilterState,
    sortState: SortState
  ): Promise<AdminUserPodRow[]> {
    let query = supabase.from("v_user_pods").select();
    query = applyFilters(query, USER_POD_FIELD_DEFS, filterState);
    query = applySort(query, USER_POD_FIELD_DEFS, sortState);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []).map(toAdminUserPodRow);
  }

  async function fetchPodOptions(): Promise<PodOption[]> {
    const { data, error } = await supabase
      .from("pods")
      .select("id, name")
      .is("deleted_at", null)
      .order("name");
    if (error) throw new Error(error.message);
    return (data ?? []).map((pod) => ({ value: pod.id as string, label: pod.name as string }));
  }

  async function fetchCohortOptions(): Promise<CohortOption[]> {
    const { data, error } = await supabase
      .from("cohorts")
      .select("id, name")
      .is("deleted_at", null)
      .order("name");
    if (error) throw new Error(error.message);
    return (data ?? []).map((cohort) => ({
      value: cohort.id as string,
      label: cohort.name as string,
    }));
  }

  async function createPod(input: CreatePodInput): Promise<PodOption> {
    const { data, error } = await supabase
      .from("pods")
      .insert({
        name: input.name,
        cohort_id: input.cohortId,
        skill_level: input.skillLevel ?? null,
        description: input.description ?? null,
      })
      .select("id, name")
      .single();

    if (error || !data) throw new Error(error?.message ?? "Failed to create pod.");
    return { value: data.id as string, label: data.name as string };
  }

  /**
   * Pods with members split by role. Two queries (pods, then memberships via
   * v_user_pods) rather than a nested select, which is fine at this data scale.
   */
  async function fetchPodsOverview(): Promise<PodOverview[]> {
    const { data: pods, error: podsError } = await supabase
      .from("pods")
      .select("id, name, skill_level, cohort_id, cohorts(name)")
      .is("deleted_at", null)
      .order("name");
    if (podsError) throw new Error(podsError.message);

    const { data: members, error: membersError } = await supabase
      .from("v_user_pods")
      .select("user_id, full_name, email, role, pod_id")
      .not("pod_id", "is", null);
    if (membersError) throw new Error(membersError.message);

    const memberRows = (members ?? []) as Record<string, unknown>[];

    return (pods ?? []).map((pod: Record<string, unknown>) => {
      const podId = pod.id as string;
      const podMembers = memberRows.filter((m) => m.pod_id === podId);

      const toSummary = (m: Record<string, unknown>): PodMemberSummary => ({
        userId: m.user_id as string,
        fullName: (m.full_name as string) ?? null,
        email: (m.email as string) ?? null,
        role: m.role as UserRole,
      });

      const cohort = pod.cohorts as { name: string } | null;

      return {
        id: podId,
        name: pod.name as string,
        cohortId: pod.cohort_id as string,
        cohortName: cohort?.name ?? null,
        skillLevel: (pod.skill_level as string) ?? null,
        mentors: podMembers.filter((m) => m.role === "mentor").map(toSummary),
        mentees: podMembers.filter((m) => m.role === "mentee").map(toSummary),
        associatesAndPms: podMembers
          .filter((m) => m.role === "associate" || m.role === "pm")
          .map(toSummary),
      };
    });
  }

  /**
   * UI-gated to PM only. Not yet enforced by RLS: add a policy on users.role
   * updates before this ships past internal testing.
   */
  async function updateUserRole(userId: string, role: UserRole): Promise<void> {
    const { error } = await supabase.from("users").update({ role }).eq("id", userId);
    if (error) throw new Error(error.message);
  }

  /** Enforces "exactly one pod" by clearing any existing membership first. */
  async function assignUserToPod(userId: string, podId: string): Promise<void> {
    const { error: deleteError } = await supabase
      .from("pod_members")
      .delete()
      .eq("user_id", userId);
    if (deleteError) throw new Error(deleteError.message);

    const { error: insertError } = await supabase
      .from("pod_members")
      .insert({ user_id: userId, pod_id: podId });
    if (insertError) throw new Error(insertError.message);
  }

  async function removeUserFromPod(userId: string): Promise<void> {
    const { error } = await supabase.from("pod_members").delete().eq("user_id", userId);
    if (error) throw new Error(error.message);
  }

  /** One mentor id per pod (first found), so dashboard pod rows have a link target. */
  async function fetchPodFirstMentors(): Promise<PodFirstMentor[]> {
    const { data, error } = await supabase
      .from("v_user_pods")
      .select("pod_id, user_id")
      .eq("role", "mentor")
      .not("pod_id", "is", null);
    if (error) throw new Error(error.message);

    const seen = new Set<string>();
    const result: PodFirstMentor[] = [];
    for (const row of (data ?? []) as { pod_id: string; user_id: string }[]) {
      if (seen.has(row.pod_id)) continue;
      seen.add(row.pod_id);
      result.push({ podId: row.pod_id, mentorId: row.user_id });
    }
    return result;
  }

  async function createCohort(input: CreateCohortInput): Promise<void> {
    const { error } = await supabase.from("cohorts").insert({
      name: input.name,
      start_date: input.startDate,
      end_date: input.endDate,
    });
    if (error) throw new Error(error.message);
  }

  /**
   * Removes pod_members rows, then soft-deletes pods, then soft-deletes the
   * cohort. Users are never touched. Order matters so nothing points at a
   * deleted row.
   */
  async function deleteCohortCascade(cohortId: string): Promise<void> {
    const { data: pods, error: podsError } = await supabase
      .from("pods")
      .select("id")
      .eq("cohort_id", cohortId)
      .is("deleted_at", null);
    if (podsError) throw new Error(podsError.message);

    const podIds = (pods ?? []).map((p) => p.id as string);
    if (podIds.length > 0) {
      const { error: membersError } = await supabase
        .from("pod_members")
        .delete()
        .in("pod_id", podIds);
      if (membersError) throw new Error(membersError.message);

      const { error: podsDeleteError } = await supabase
        .from("pods")
        .update({ deleted_at: new Date().toISOString() })
        .in("id", podIds);
      if (podsDeleteError) throw new Error(podsDeleteError.message);
    }

    const { error: cohortError } = await supabase
      .from("cohorts")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", cohortId);
    if (cohortError) throw new Error(cohortError.message);
  }

  /** Removes membership rows, then soft-deletes the pod. */
  async function deletePodCascade(podId: string): Promise<void> {
    const { error: membersError } = await supabase
      .from("pod_members")
      .delete()
      .eq("pod_id", podId);
    if (membersError) throw new Error(membersError.message);

    const { error: podError } = await supabase
      .from("pods")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", podId);
    if (podError) throw new Error(podError.message);
  }

  return {
    fetchUsersForRolesTab,
    fetchUsersForPodsTab,
    fetchPodOptions,
    fetchCohortOptions,
    createPod,
    fetchPodsOverview,
    updateUserRole,
    assignUserToPod,
    removeUserFromPod,
    fetchPodFirstMentors,
    createCohort,
    deleteCohortCascade,
    deletePodCascade,
  };
}

export type AdminUsersApi = ReturnType<typeof createAdminUsersApi>;