import type { MeetingWithParticipants } from "../types/meetings";
import type { InPersonSession } from "../types/in-person-sessions";
import type { UserRole } from "../types/users";

/** Mirrors the server check in PATCH /api/meetings/[meetingId]: creator or staff, and not yet started. */
export function canManageMeeting(
  meeting: Pick<MeetingWithParticipants, "created_by" | "starts_at">,
  currentUserId: string,
  currentUserRole: UserRole,
  now: Date = new Date(),
): boolean {
  const isCreator = meeting.created_by === currentUserId;
  const isStaff = currentUserRole === "pm" || currentUserRole === "associate";
  const hasStarted = new Date(meeting.starts_at) <= now;
  return (isCreator || isStaff) && !hasStarted;
}

/** Pure status label for the meeting card: "Pending" only when the current user hasn't responded. */
export function meetingStatusLabel(
  meeting: Pick<MeetingWithParticipants, "participants">,
  currentUserId: string,
): string | undefined {
  const mine = meeting.participants.find((p) => p.user_id === currentUserId);
  return mine?.status === "pending" ? "Pending" : undefined;
}

/** True when the current user is a pending participant, i.e. Accept/Decline should show. */
export function isPendingParticipant(
  meeting: Pick<MeetingWithParticipants, "participants">,
  currentUserId: string,
): boolean {
  return meeting.participants.some((p) => p.user_id === currentUserId && p.status === "pending");
}

/** Whether the in-person session can be cancelled from the timeline. */
export function canCancelSession(session: Pick<InPersonSession, "status">, canManage: boolean): boolean {
  return canManage && session.status !== "cancelled";
}

/** Human-readable seriesness line for session details. */
export function sessionSeriesNote(session: Pick<InPersonSession, "seriesId">): string | null {
  return session.seriesId ? "Part of a weekly series — editing here only affects this week." : null;
}