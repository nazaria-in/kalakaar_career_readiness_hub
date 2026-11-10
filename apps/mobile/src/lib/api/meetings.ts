// apps/mobile/src/lib/api/meetings.ts

import { useQuery } from "@tanstack/react-query";
import {
  fetchMeetingsInRange,
  fetchPendingInvitesForUser,
  respondToMeetingInvite,
  updateMeeting,
  cancelMeeting,
  type ApiRequest,
  type UpdateMeetingInput,
  type UserRole,
} from "@repo/shared";
import { supabase } from "../supabase/client";
import { mobileApiRequest } from "./raw";

export function useMeetingsInRange(
  userId: string | null,
  role: UserRole | null,
  rangeStart?: string,
  rangeEnd?: string,
) {
  return useQuery({
    queryKey: ["meetings", userId, role, rangeStart, rangeEnd],
    queryFn: () =>
      fetchMeetingsInRange(supabase, { userId, role: role!, rangeStart: rangeStart!, rangeEnd: rangeEnd! }),
    enabled: Boolean(role && rangeStart && rangeEnd && (userId || role === "pm" || role === "associate")),
  });
}

export function usePendingInvites(userId: string | null) {
  return useQuery({
    queryKey: ["meeting-pending-invites", userId],
    queryFn: () => fetchPendingInvitesForUser(supabase, userId!),
    enabled: Boolean(userId),
  });
}

export const meetingMutations = {
  apiRequest: mobileApiRequest as ApiRequest,
  respond: (meetingId: string, status: "accepted" | "declined") =>
    respondToMeetingInvite(supabase, meetingId, status),
  update: (meetingId: string, input: UpdateMeetingInput) => updateMeeting(mobileApiRequest, meetingId, input),
  cancel: (meetingId: string) => cancelMeeting(mobileApiRequest, meetingId),
};