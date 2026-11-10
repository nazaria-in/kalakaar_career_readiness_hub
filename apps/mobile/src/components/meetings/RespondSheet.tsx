// apps/mobile/src/components/meetings/RespondSheet.tsx

import * as React from "react";
import { ActivityIndicator, Modal, Pressable, Text, View } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import type { MeetingWithParticipants } from "@repo/shared";
import { meetingMutations } from "../../lib/api/meetings";

export interface RespondSheetProps {
  meeting: MeetingWithParticipants | null;
  onClose: () => void;
}

/**
 * Bottom sheet for Accept/Decline. Mount once per screen and pass the
 * meeting you want to respond to; pass null to hide it.
 */
export function RespondSheet({ meeting, onClose }: RespondSheetProps): React.JSX.Element {
  const queryClient = useQueryClient();
  const [pending, setPending] = React.useState<"accepted" | "declined" | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function respond(status: "accepted" | "declined") {
    if (!meeting) return;
    setPending(status);
    setError(null);
    try {
      await meetingMutations.respond(meeting.id, status);
      await queryClient.invalidateQueries({ queryKey: ["meeting-pending-invites"] });
      await queryClient.invalidateQueries({ queryKey: ["meetings"] });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save your response. Try again.");
    } finally {
      setPending(null);
    }
  }

  return (
    <Modal visible={meeting !== null} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }} onPress={onClose} />
      <View style={{ backgroundColor: "white", padding: 20, gap: 12, borderTopLeftRadius: 16, borderTopRightRadius: 16 }}>
        <Text style={{ fontSize: 18, fontWeight: "600" }}>{meeting?.title}</Text>
        <Text style={{ opacity: 0.6 }}>
          {meeting ? new Date(meeting.starts_at).toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : ""}
        </Text>
        {error ? <Text style={{ color: "#b91c1c" }}>{error}</Text> : null}
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable
            onPress={() => respond("declined")}
            disabled={pending !== null}
            style={{ flex: 1, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: "#d4d4d8" }}
          >
            {pending === "declined" ? <ActivityIndicator /> : <Text style={{ textAlign: "center" }}>Decline</Text>}
          </Pressable>
          <Pressable
            onPress={() => respond("accepted")}
            disabled={pending !== null}
            style={{ flex: 1, padding: 12, borderRadius: 8, backgroundColor: "#7a1f3d" }}
          >
            {pending === "accepted" ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={{ color: "white", textAlign: "center" }}>Accept</Text>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}