/// <reference lib="dom" />
// packages/shared/src/api/meetings.ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  InviteCandidate,
  MeetingParticipant,
  MeetingWithParticipants,
  ParticipantStatus,
} from "../types/meetings";
import type { UserRole } from "../types/users";
import { fetchPodMemberGroups, fetchAllPodGroupsForRoles } from "./pods";
import { cancelMeetingRemindersForParticipant } from "../notifications/meeting-notifications";

/**
 * Performs an authenticated request against the API.
 * Web:    (path, init) => fetch(path, init)            (cookies)
 * Mobile: (path, init) => fetch(BASE + path, { ...init, headers: bearer })
 */
export type ApiRequest = (path: string, init: RequestInit) => Promise<Response>;

interface RawParticipantRow {
  id: string;
  meeting_id: string;
  user_id: string;
  status: ParticipantStatus;
  invited_by: string | null;
  responded_at: string | null;
  user: { id: string; full_name: string | null; role: UserRole } | null;
}

interface RawMeetingRow {
  id: string;
  [key: string]: unknown;
  meeting_participants: RawParticipantRow[];
}

const MEETING_SELECT = `*, meeting_participants(
  id, meeting_id, user_id, status, invited_by, responded_at,
  user:users!meeting_participants_user_id_fkey(id, full_name, role)
)`;

function hydrateMeeting(row: RawMeetingRow): MeetingWithParticipants {
  return {
    ...row,
    participants: row.meeting_participants.map((p) => ({
      id: p.id,
      meeting_id: p.meeting_id,
      user_id: p.user_id,
      status: p.status,
      invited_by: p.invited_by,
      responded_at: p.responded_at,
      user: p.user
        ? { id: p.user.id, full_name: p.user.full_name?.trim() || "Unnamed", role: p.user.role }
        : undefined,
    })),
  } as unknown as MeetingWithParticipants;
}

export async function fetchMeetingsInRange(
  client: SupabaseClient,
  params: { userId: string | null; role: UserRole; rangeStart: string; rangeEnd: string },
): Promise<MeetingWithParticipants[]> {
  const { userId, role, rangeStart, rangeEnd } = params;
  const isStaff = role === "pm" || role === "associate";
  if (!isStaff && !userId) return [];

  let query = client
    .from("meetings")
    .select(MEETING_SELECT)
    .is("deleted_at", null)
    .lt("starts_at", rangeEnd)
    .gt("ends_at", rangeStart)
    .order("starts_at", { ascending: true });

  if (!isStaff) {
    const { data: participantRows, error } = await client
      .from("meeting_participants")
      .select("meeting_id")
      .eq("user_id", userId as string);
    if (error) throw error;

    const meetingIds = (participantRows ?? []).map((r) => r.meeting_id as string);
    if (meetingIds.length === 0) return [];
    query = query.in("id", meetingIds);
  }

  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as unknown as RawMeetingRow[]).map(hydrateMeeting);
}

export async function fetchPendingInvitesForUser(
  client: SupabaseClient,
  userId: string,
): Promise<MeetingWithParticipants[]> {
  const { data: participantRows, error: participantError } = await client
    .from("meeting_participants")
    .select("meeting_id")
    .eq("user_id", userId)
    .eq("status", "pending");
  if (participantError) throw participantError;

  const meetingIds = (participantRows ?? []).map((r) => r.meeting_id as string);
  if (meetingIds.length === 0) return [];

  const { data, error } = await client
    .from("meetings")
    .select(MEETING_SELECT)
    .in("id", meetingIds)
    .is("deleted_at", null)
    .order("starts_at", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as unknown as RawMeetingRow[]).map(hydrateMeeting);
}

export async function fetchMeetingById(
  client: SupabaseClient,
  meetingId: string,
): Promise<MeetingWithParticipants | null> {
  const { data, error } = await client
    .from("meetings")
    .select(MEETING_SELECT)
    .eq("id", meetingId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return hydrateMeeting(data as unknown as RawMeetingRow);
}

export async function updateParticipantStatus(
  client: SupabaseClient,
  participantId: string,
  status: Extract<ParticipantStatus, "accepted" | "declined">,
): Promise<MeetingParticipant> {
  const { data, error } = await client
    .from("meeting_participants")
    .update({ status, responded_at: new Date().toISOString() })
    .eq("id", participantId)
    .select("id, meeting_id, user_id, status, invited_by, responded_at")
    .single();
  if (error) throw error;
  return data as MeetingParticipant;
}

/**
 * Preferred RSVP entry point: takes meetingId (what notification cards carry).
 * On decline, cancels that user's pending reminders for this meeting.
 */
export async function respondToMeetingInvite(
  client: SupabaseClient,
  meetingId: string,
  status: Extract<ParticipantStatus, "accepted" | "declined">,
): Promise<MeetingParticipant> {
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError) throw userError;
  if (!userData.user) throw new Error("Not authenticated.");

  const { data: participant, error: participantError } = await client
    .from("meeting_participants")
    .select("id")
    .eq("meeting_id", meetingId)
    .eq("user_id", userData.user.id)
    .single();
  if (participantError || !participant) {
    throw new Error(participantError?.message ?? "Participant record not found for this meeting.");
  }

  const updated = await updateParticipantStatus(client, participant.id as string, status);

  if (status === "declined") {
    try {
      await cancelMeetingRemindersForParticipant(client, meetingId, userData.user.id);
    } catch (notificationError) {
      // Shared code must not log. Surface the failure to the caller instead
      // of swallowing it, so the app wrapper can decide how to report it.
      throw notificationError;
    }
  }

  return updated;
}

/**
 * Invite candidates for the creation form.
 * - mentor/mentee: members of the requester's own pods (empty pods included),
 *   plus all associate/pm staff (ungrouped).
 * - pm/associate: every approved mentor/mentee across every pod, plus staff.
 * Self is always excluded.
 *
 * KNOWN GAP: role for pod members on the staff path is hardcoded to "mentee"
 * until fetchAllPodGroupsForRoles returns role per member.
 */
export async function fetchInviteCandidates(
  client: SupabaseClient,
  requesterId: string,
  requesterRole: UserRole,
): Promise<InviteCandidate[]> {
  if (requesterRole === "pm" || requesterRole === "associate") {
    const groups = await fetchAllPodGroupsForRoles(client, ["mentor", "mentee"]);

    const podById = new Map<string, { podId: string; podName: string }>();
    for (const pod of groups) {
      const podName = pod.cohortName ? `${pod.cohortName} — ${pod.name}` : pod.name;
      for (const m of pod.members) {
        if (m.id === requesterId || podById.has(m.id)) continue;
        podById.set(m.id, { podId: pod.id, podName });
      }
    }

    // Full approved roster. Role comes from users.role, the single source of truth.
    const { data, error } = await client
      .from("users")
      .select("id, full_name, role")
      .is("deleted_at", null)
      .eq("approval_status", "approved")
      .neq("id", requesterId)
      .order("full_name", { ascending: true });
    if (error) throw error;

    return (data ?? []).map((u) => {
      const pod = podById.get(u.id as string);
      return {
        id: u.id as string,
        full_name: (u.full_name as string | null)?.trim() || "Unnamed",
        role: u.role as UserRole,
        podId: pod?.podId,
        podName: pod?.podName,
      } as InviteCandidate;
    });
  }

  // mentor / mentee path: roles are passed explicitly per group, so they're already correct.
  const [mentorGroups, menteeGroups] = await Promise.all([
    fetchPodMemberGroups(client, { role: "mentor", mentorId: requesterId, includeEmptyPods: true }),
    fetchPodMemberGroups(client, { role: "mentee", mentorId: requesterId, includeEmptyPods: true }),
  ]);

  const byId = new Map<string, InviteCandidate>();
  const addGroups = (groups: typeof mentorGroups, role: UserRole) => {
    for (const pod of groups) {
      const podName = pod.cohortName ? `${pod.cohortName} — ${pod.name}` : pod.name;
      for (const m of pod.members) {
        if (m.id === requesterId) continue;
        byId.set(m.id, { id: m.id, full_name: m.full_name, role, podId: pod.id, podName } as InviteCandidate);
      }
    }
  };
  addGroups(mentorGroups, "mentor");
  addGroups(menteeGroups, "mentee");

  const { data: staffRows, error: staffError } = await client
    .from("users")
    .select("id, full_name, role")
    .in("role", ["associate", "pm"])
    .is("deleted_at", null)
    .neq("id", requesterId)
    .order("full_name", { ascending: true });
  if (staffError) throw staffError;

  for (const u of staffRows ?? []) {
    byId.set(u.id as string, {
      id: u.id as string,
      full_name: (u.full_name as string | null)?.trim() || "Unnamed",
      role: u.role as UserRole,
    } as InviteCandidate);
  }

  return Array.from(byId.values()).sort((a, b) => a.full_name.localeCompare(b.full_name));
}

export interface UpdateMeetingInput {
  title?: string;
  description?: string;
  startsAt?: string;
  endsAt?: string;
}

async function patchMeeting(
  apiRequest: ApiRequest,
  meetingId: string,
  body: UpdateMeetingInput | { cancel: true },
): Promise<void> {
  const response = await apiRequest(`/api/meetings/${meetingId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const errorBody = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(errorBody.error ?? "Failed to update meeting");
  }
}

export function updateMeeting(apiRequest: ApiRequest, meetingId: string, input: UpdateMeetingInput) {
  return patchMeeting(apiRequest, meetingId, input);
}

export function cancelMeeting(apiRequest: ApiRequest, meetingId: string) {
  return patchMeeting(apiRequest, meetingId, { cancel: true });
}