// packages/shared/src/api/pods.ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserRole, ApprovalStatus } from "../types/users";
import type { PodWithMembers } from "../types/pods";

interface PodRow {
  id: string;
  name: string;
  cohort_id: string;
  cohorts: { name: string } | null;
}

interface PodMemberRow {
  pod_id: string;
  user: { id: string; full_name: string | null; role: UserRole; approval_status: ApprovalStatus } | null;
}



export interface FetchPodMemberGroupsParams {
  /** Only members with this role are surfaced inside each pod. */
  role: UserRole;
  /** Scope to one mentor's own pods. Ignored if podId is set. */
  mentorId?: string;
  /** Scope to a single pod. */
  podId?: string;
  /** Default true: only approved members are selectable. */
  onlyApproved?: boolean;
  /** Default false: pods with zero matching members are dropped. */
  includeEmptyPods?: boolean;
}

export async function fetchPodMemberGroups(
  client: SupabaseClient,
  params: FetchPodMemberGroupsParams,
): Promise<PodWithMembers[]> {
  const { role, mentorId, podId, onlyApproved = true, includeEmptyPods = false } = params;

  let podIds: string[] | undefined;

  if (podId) {
    podIds = [podId];
  } else if (mentorId) {
    const { data: mentorPodRows, error: mentorPodError } = await client
      .from("pod_members")
      .select("pod_id")
      .eq("user_id", mentorId);
    if (mentorPodError) throw mentorPodError;
    podIds = (mentorPodRows ?? []).map((r) => r.pod_id as string);
    if (podIds.length === 0) return [];
  }

  let podsQuery = client.from("pods").select("id, name, cohort_id, cohorts(name)").is("deleted_at", null);
  if (podIds) podsQuery = podsQuery.in("id", podIds);
  const { data: pods, error: podsError } = await podsQuery.order("name", { ascending: true });
  if (podsError) throw podsError;
  const typedPods = (pods ?? []) as unknown as PodRow[];
  if (typedPods.length === 0) return [];

  const { data: memberRows, error: membersError } = await client
    .from("pod_members")
    .select("pod_id, user:users!pod_members_user_id_fkey(id, full_name, role, approval_status)")
    .in("pod_id", typedPods.map((p) => p.id));
  if (membersError) throw membersError;

  const membersByPod = new Map<string, PodWithMembers["members"]>();
  for (const row of (memberRows ?? []) as unknown as PodMemberRow[]) {
    if (!row.user) continue;
    if (row.user.role !== role) continue;
    if (onlyApproved && row.user.approval_status !== "approved") continue;
    const list = membersByPod.get(row.pod_id) ?? [];
    list.push({ id: row.user.id, full_name: row.user.full_name?.trim() || "Unnamed" });
    membersByPod.set(row.pod_id, list);
  }

  return typedPods
    .map((p) => ({
      id: p.id,
      name: p.name,
      cohortId: p.cohort_id,
      cohortName: p.cohorts?.name,
      members: (membersByPod.get(p.id) ?? []).sort((a, b) => a.full_name.localeCompare(b.full_name)),
    }))
    .filter((pod) => includeEmptyPods || pod.members.length > 0);
}

export interface PodGroupMemberWithRole {
  id: string;
  full_name: string;
  role: UserRole;
}

export interface PodGroupWithRoles extends Omit<PodWithMembers, "members"> {
  members: PodGroupMemberWithRole[];
}

/**
 * Every non-deleted pod, including empty ones, with members restricted to
 * `roles`. Each member carries its role so callers don't need a placeholder.
 */
export async function fetchAllPodGroupsForRoles(
  client: SupabaseClient,
  roles: UserRole[],
): Promise<PodGroupWithRoles[]> {
  const { data: pods, error: podsError } = await client
    .from("pods")
    .select("id, name, cohort_id, cohorts(name)")
    .is("deleted_at", null)
    .order("name", { ascending: true });
  if (podsError) throw podsError;
  const typedPods = (pods ?? []) as unknown as PodRow[];
  if (typedPods.length === 0) return [];

  const { data: memberRows, error: membersError } = await client
    .from("pod_members")
    .select("pod_id, user:users!pod_members_user_id_fkey(id, full_name, role, approval_status)")
    .in("pod_id", typedPods.map((p) => p.id));
  if (membersError) throw membersError;

  const membersByPod = new Map<string, PodGroupMemberWithRole[]>();
  for (const row of (memberRows ?? []) as unknown as PodMemberRow[]) {
    if (!row.user) continue;
    if (!roles.includes(row.user.role)) continue;
    if (row.user.approval_status !== "approved") continue;
    const list = membersByPod.get(row.pod_id) ?? [];
    list.push({
      id: row.user.id,
      full_name: row.user.full_name?.trim() || "Unnamed",
      role: row.user.role,
    });
    membersByPod.set(row.pod_id, list);
  }

  return typedPods.map((p) => ({
    id: p.id,
    name: p.name,
    cohortId: p.cohort_id,
    cohortName: p.cohorts?.name,
    members: (membersByPod.get(p.id) ?? []).sort((a, b) => a.full_name.localeCompare(b.full_name)),
  }));
}

/** Mentee ids in any pod this mentor belongs to. */
export async function getMenteeIdsForMentor(client: SupabaseClient, mentorId: string): Promise<string[]> {
  const { data: mentorPodRows, error: mentorPodError } = await client
    .from("pod_members")
    .select("pod_id")
    .eq("user_id", mentorId);
  if (mentorPodError) throw mentorPodError;

  const podIds = Array.from(new Set((mentorPodRows ?? []).map((r) => r.pod_id as string)));
  if (podIds.length === 0) return [];

  const { data: memberRows, error: membersError } = await client
    .from("pod_members")
    .select("user:users!pod_members_user_id_fkey(id, role)")
    .in("pod_id", podIds);
  if (membersError) throw membersError;

  const typedRows = (memberRows ?? []) as unknown as { user: { id: string; role: string } | null }[];
  return Array.from(
    new Set(typedRows.filter((r) => r.user?.role === "mentee").map((r) => r.user!.id)),
  );
}

/** Mentor ids in any pod this mentee belongs to. */
export async function getMentorIdsForMentee(client: SupabaseClient, menteeId: string): Promise<string[]> {
  const { data: menteePodRows, error: menteePodError } = await client
    .from("pod_members")
    .select("pod_id")
    .eq("user_id", menteeId);
  if (menteePodError) throw menteePodError;

  const podIds = Array.from(new Set((menteePodRows ?? []).map((r) => r.pod_id as string)));
  if (podIds.length === 0) return [];

  const { data: memberRows, error: membersError } = await client
    .from("pod_members")
    .select("user:users!pod_members_user_id_fkey(id, role)")
    .in("pod_id", podIds);
  if (membersError) throw membersError;

  const typedRows = (memberRows ?? []) as unknown as { user: { id: string; role: string } | null }[];
  return Array.from(
    new Set(typedRows.filter((r) => r.user?.role === "mentor").map((r) => r.user!.id)),
  );
}