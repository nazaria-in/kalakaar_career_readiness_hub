// apps/mobile/src/components/meetings/meeting-timeline-adapter.tsx

import * as React from "react";
import { Alert, Pressable, Text, View } from "react-native";
import * as Linking from "expo-linking";
import {
  canManageMeeting,
  isPendingParticipant,
  meetingStatusLabel,
  type MeetingWithParticipants,
  type TimelineEvent,
  type UserRole,
} from "@repo/shared";
import { meetingMutations } from "../../lib/api/meetings";

export interface MeetingTimelineEventOptions {
  currentUserId: string;
  currentUserRole: UserRole;
  /** Opens the Accept/Decline sheet for this meeting (see RespondSheet). */
  onRespond?: (meeting: MeetingWithParticipants) => void;
  /** Opens the edit screen/sheet for this meeting. Edit button hidden when omitted. */
  onEdit?: (meeting: MeetingWithParticipants) => void;
  /** Called after a successful cancel so the screen can invalidate its queries. */
  onCancelled?: (meeting: MeetingWithParticipants) => void;
}

export function meetingToTimelineEvent(
  meeting: MeetingWithParticipants,
  options: MeetingTimelineEventOptions,
): TimelineEvent {
  const { currentUserId, currentUserRole, onRespond, onEdit, onCancelled } = options;
  const canManage = canManageMeeting(meeting, currentUserId, currentUserRole);
  const isCancelled = meeting.status === "cancelled";
  const canRespond = isPendingParticipant(meeting, currentUserId) && !isCancelled && Boolean(onRespond);

  function confirmCancel() {
    Alert.alert(
      "Cancel meeting?",
      `"${meeting.title}" will be removed from everyone's calendar. This can't be undone.`,
      [
        { text: "Keep", style: "cancel" },
        {
          text: "Cancel meeting",
          style: "destructive",
          onPress: async () => {
            try {
              await meetingMutations.cancel(meeting.id);
              onCancelled?.(meeting);
            } catch (err) {
              Alert.alert("Couldn't cancel", err instanceof Error ? err.message : "Try again.");
            }
          },
        },
      ],
    );
  }

  return {
    id: meeting.id,
    type: "meeting",
    title: meeting.title,
    startsAt: meeting.starts_at,
    endsAt: meeting.ends_at,
    isMuted: isCancelled,
    statusLabel: meetingStatusLabel(meeting, currentUserId),
    renderDetails: () => (
      <View style={{ gap: 12 }}>
        {meeting.description ? <Text>{meeting.description}</Text> : null}
        <Text style={{ fontWeight: "600" }}>Participants</Text>
        {meeting.participants.map((p) => (
          <View key={p.id} style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text>{p.user?.full_name ?? "Unknown"}</Text>
            <Text style={{ textTransform: "capitalize", opacity: 0.6 }}>{p.status}</Text>
          </View>
        ))}
        {canRespond ? (
          <Pressable onPress={() => onRespond?.(meeting)} style={buttonStyles.outline}>
            <Text style={{ textAlign: "center" }}>Respond to invite</Text>
          </Pressable>
        ) : null}
      </View>
    ),
    renderActions: () => (
      <View style={{ gap: 8 }}>
        {meeting.meet_link && !isCancelled ? (
          <Pressable onPress={() => Linking.openURL(meeting.meet_link!)} style={buttonStyles.primary}>
            <Text style={buttonStyles.primaryText}>Join meeting</Text>
          </Pressable>
        ) : null}

        {canManage && !isCancelled && onEdit ? (
          <Pressable onPress={() => onEdit(meeting)} style={buttonStyles.outline}>
            <Text style={{ textAlign: "center" }}>Edit</Text>
          </Pressable>
        ) : null}

        {canManage && !isCancelled ? (
          <Pressable onPress={confirmCancel} style={buttonStyles.destructive}>
            <Text style={buttonStyles.destructiveText}>Cancel meeting</Text>
          </Pressable>
        ) : null}
      </View>
    ),
  };
}

const buttonStyles = {
  primary: { padding: 12, borderRadius: 8, backgroundColor: "#7a1f3d" },
  primaryText: { color: "white", textAlign: "center" as const },
  outline: { padding: 12, borderRadius: 8, borderWidth: 1, borderColor: "#d4d4d8" },
  destructive: { padding: 12, borderRadius: 8, borderWidth: 1, borderColor: "#b91c1c" },
  destructiveText: { color: "#b91c1c", textAlign: "center" as const },
};