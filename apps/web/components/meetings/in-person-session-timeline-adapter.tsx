// apps/web/components/meetings/in-person-session-timeline-adapter.tsx
"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { adaptInPersonSessionToTimelineEvent } from "@repo/shared";
import { cancelSingleOccurrence } from "@/lib/api/in-person-sessions";
import {
  canCancelSession,
  sessionSeriesNote,
  type InPersonSession,
  type TimelineEvent,
} from "@repo/shared";

interface InPersonSessionDetailsProps {
  session: InPersonSession;
  canManage: boolean;
  invalidateQueryKeys: unknown[][];
}

function InPersonSessionDetails({ session }: InPersonSessionDetailsProps): React.JSX.Element {
  const seriesNote = sessionSeriesNote(session);
  return (
    <div className="flex flex-col gap-2 text-sm text-text-primary">
      {session.location && <p className="text-text-muted">{session.location}</p>}
      {session.description && <p>{session.description}</p>}
      {session.status === "cancelled" && <p className="text-destructive">This session is cancelled.</p>}
      {seriesNote && <p className="text-xs text-text-muted">{seriesNote}</p>}
    </div>
  );
}

function InPersonSessionActions({ session, canManage, invalidateQueryKeys }: InPersonSessionDetailsProps): React.JSX.Element | null {
  const queryClient = useQueryClient();

  const cancelMutation = useMutation({
    mutationFn: () => cancelSingleOccurrence({ sessionId: session.id }),
    onSuccess: () => {
      for (const key of invalidateQueryKeys) {
        queryClient.invalidateQueries({ queryKey: key });
      }
    },
  });

  if (!canCancelSession(session, canManage)) return null;

  return (
    <button
      type="button"
      onClick={() => cancelMutation.mutate()}
      disabled={cancelMutation.isPending}
      className="rounded-lg border border-destructive px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10 disabled:opacity-50"
    >
      {cancelMutation.isPending ? "Cancelling…" : "Cancel this occurrence"}
    </button>
  );
}

export function inPersonSessionToTimelineEvent(
  session: InPersonSession,
  canManage: boolean,
  invalidateQueryKeys: unknown[][],
): TimelineEvent {
  return adaptInPersonSessionToTimelineEvent(session, {
    renderDetails: () => (
      <InPersonSessionDetails session={session} canManage={canManage} invalidateQueryKeys={invalidateQueryKeys} />
    ),
    renderActions: () =>
      canManage ? (
        <InPersonSessionActions session={session} canManage={canManage} invalidateQueryKeys={invalidateQueryKeys} />
      ) : undefined,
  });
}