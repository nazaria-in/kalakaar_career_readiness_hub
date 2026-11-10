import { createClient } from "@/lib/supabase/client";
import * as shared from "@repo/shared";

const webApiRequest: shared.ApiRequest = (path, init) => fetch(path, init);

export const fetchMeetingsInRange = (params: Parameters<typeof shared.fetchMeetingsInRange>[1]) =>
  shared.fetchMeetingsInRange(createClient(), params);

export const fetchPendingInvitesForUser = (userId: string) =>
  shared.fetchPendingInvitesForUser(createClient(), userId);

export const fetchMeetingById = (meetingId: string) =>
  shared.fetchMeetingById(createClient(), meetingId);

export const updateParticipantStatus = (participantId: string, status: Parameters<typeof shared.updateParticipantStatus>[2]) =>
  shared.updateParticipantStatus(createClient(), participantId, status);

export const respondToMeetingInvite = (meetingId: string, status: Parameters<typeof shared.respondToMeetingInvite>[2]) =>
  shared.respondToMeetingInvite(createClient(), meetingId, status);

export const fetchInviteCandidates = (requesterId: string, requesterRole: shared.UserRole) =>
  shared.fetchInviteCandidates(createClient(), requesterId, requesterRole);

export const updateMeeting = (meetingId: string, input: shared.UpdateMeetingInput) =>
  shared.updateMeeting(webApiRequest, meetingId, input);

export const cancelMeeting = (meetingId: string) =>
  shared.cancelMeeting(webApiRequest, meetingId);

export type { UpdateMeetingInput } from "@repo/shared";