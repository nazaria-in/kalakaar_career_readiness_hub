"use client";

import * as React from "react";
import { AcceptDeclineControls } from "@/components/meetings/AcceptDeclineControls";
import { cancelMeeting } from "@/lib/api/meetings";
import type { MeetingWithParticipants, TimelineEvent, UserRole } from "@repo/shared";
import {
  canManageMeeting,
  meetingStatusLabel,
} from "@repo/shared";

export function formatTimeRange(startsAt: string, endsAt: string): string {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const dateLabel = start.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  const startLabel = start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const endLabel = end.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${dateLabel} · ${startLabel} – ${endLabel}`;
}

export interface MeetingTimelineEventOptions {
  currentUserId: string;
  currentUserRole: UserRole;
  invalidateQueryKeys: string[][];
  onEdit?: (meeting: MeetingWithParticipants) => void;
  onCancelled?: (meeting: MeetingWithParticipants) => void;
}

export function meetingToTimelineEvent(
  meeting: MeetingWithParticipants,
  options: MeetingTimelineEventOptions,
): TimelineEvent {
  const { currentUserId, currentUserRole, invalidateQueryKeys, onEdit, onCancelled } = options;
  const myParticipant = meeting.participants.find((p) => p.user_id === currentUserId);
  const canManage = canManageMeeting(meeting, currentUserId, currentUserRole);

  return {
    id: meeting.id,
    type: "meeting",
    title: meeting.title,
    startsAt: meeting.starts_at,
    endsAt: meeting.ends_at,
    isMuted: meeting.status === "cancelled",
    statusLabel: meetingStatusLabel(meeting, currentUserId),
    renderDetails: () => (
      <div className="flex flex-col gap-3">
        {meeting.description && <p className="text-sm text-text-primary">{meeting.description}</p>}
        <div>
          <p className="text-xs font-semibold uppercase text-text-muted">Participants</p>
          <ul className="mt-1 flex flex-col gap-1">
            {meeting.participants.map((p) => (
              <li key={p.id} className="flex items-center justify-between text-sm text-text-primary">
                <span>{p.user?.full_name ?? "Unknown"}</span>
                <span className="text-xs capitalize text-text-muted">{p.status}</span>
              </li>
            ))}
          </ul>
        </div>
        {myParticipant?.status === "pending" && (
          <AcceptDeclineControls meeting={meeting} currentUserId={currentUserId} invalidateQueryKeys={invalidateQueryKeys} />
        )}
      </div>
    ),
    renderActions: () => (
      <MeetingActions meeting={meeting} canManage={canManage} onEdit={onEdit} onCancelled={onCancelled} />
    ),
  };
}

function MeetingActions({
  meeting,
  canManage,
  onEdit,
  onCancelled,
}: {
  meeting: MeetingWithParticipants;
  canManage: boolean;
  onEdit?: (meeting: MeetingWithParticipants) => void;
  onCancelled?: (meeting: MeetingWithParticipants) => void;
}): React.JSX.Element | null {
  const [isCancelling, setIsCancelling] = React.useState(false);
  const [cancelError, setCancelError] = React.useState<string | null>(null);

  async function handleCancel() {
    const confirmed = window.confirm(
      `Cancel "${meeting.title}"? Participants will no longer see this on their calendar. This can't be undone.`,
    );
    if (!confirmed) return;

    setIsCancelling(true);
    setCancelError(null);
    try {
      await cancelMeeting(meeting.id);
      onCancelled?.(meeting);
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : "Couldn't cancel this meeting. Try again.");
    } finally {
      setIsCancelling(false);
    }
  }

  const joinButton =
    meeting.meet_link && meeting.status !== "cancelled" ? (
      <a
        href={meeting.meet_link}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90"
      >
        Join meeting
      </a>
    ) : null;

  if (!canManage || meeting.status === "cancelled") return joinButton;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-2">
        {joinButton}
        {onEdit && (
          <button
            type="button"
            onClick={() => onEdit(meeting)}
            className="rounded-lg border border-border px-4 py-2 text-sm text-text-primary hover:bg-card-alt"
          >
            Edit
          </button>
        )}
        <button
          type="button"
          onClick={handleCancel}
          disabled={isCancelling}
          className="rounded-lg border border-destructive px-4 py-2 text-sm text-destructive hover:bg-destructive/10 disabled:opacity-50"
        >
          {isCancelling ? "Cancelling…" : "Cancel meeting"}
        </button>
      </div>
      {cancelError && <p className="text-xs text-destructive">{cancelError}</p>}
    </div>
  );
}