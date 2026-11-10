// packages/shared/src/api/notifications.ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CreateNotificationInput, NotificationWithDelivery } from "../types/notifications";

export async function createNotification(client: SupabaseClient, input: CreateNotificationInput): Promise<string> {
  if (input.recipientUserIds.length === 0) {
    throw new Error("createNotification requires at least one recipient.");
  }
  const scheduledFor = input.scheduledFor ?? new Date();

  const { data: notification, error } = await client
    .from("notifications")
    .insert({
      created_by: input.createdBy,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      meeting_id: input.meetingId ?? null,
      content_dispatch_id: input.contentDispatchId ?? null,
      content_submission_id: input.contentSubmissionId ?? null,
      exit_survey_id: input.exitSurveyId ?? null,
      message_id: input.messageId ?? null,
      scheduled_for: scheduledFor.toISOString(),
    })
    .select("id")
    .single();

  if (error || !notification) {
    throw new Error(`Failed to create notification: ${error?.message ?? "unknown error"}`);
  }

  const { error: fanOutError } = await client.from("user_notifications").insert(
    input.recipientUserIds.map((userId) => ({
      notification_id: notification.id as string,
      user_id: userId,
      status: "pending" as const,
    }))
  );
  if (fanOutError) throw new Error(`Notification created but fan-out failed: ${fanOutError.message}`);

  return notification.id as string;
}

export interface CancelPendingFilter {
  meetingId?: string;
  contentDispatchId?: string;
  userId?: string;
}

export async function cancelPendingNotifications(client: SupabaseClient, filter: CancelPendingFilter): Promise<void> {
  if (!filter.meetingId && !filter.contentDispatchId) {
    throw new Error("cancelPendingNotifications requires meetingId or contentDispatchId.");
  }

  let q = client.from("notifications").select("id");
  if (filter.meetingId) q = q.eq("meeting_id", filter.meetingId);
  if (filter.contentDispatchId) q = q.eq("content_dispatch_id", filter.contentDispatchId);

  const { data: matches, error: matchError } = await q;
  if (matchError) throw matchError;
  if (!matches?.length) return;

  let cancel = client
    .from("user_notifications")
    .update({ deleted_at: new Date().toISOString() })
    .in("notification_id", matches.map((n) => n.id as string))
    .eq("status", "pending");
  if (filter.userId) cancel = cancel.eq("user_id", filter.userId);

  const { error } = await cancel;
  if (error) throw error;
}

export async function markNotificationRead(client: SupabaseClient, userNotificationId: string): Promise<void> {
  const { error } = await client
    .from("user_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", userNotificationId);
  if (error) throw error;
}

export async function markAllNotificationsRead(
  client: SupabaseClient,
  userId: string,
  scopedNotificationIds?: string[],
): Promise<void> {
  let q = client
    .from("v_visible_user_notifications")
    .select("user_notification_id")
    .eq("user_id", userId)
    .is("read_at", null);
  if (scopedNotificationIds?.length) q = q.in("id", scopedNotificationIds);

  const { data, error } = await q;
  if (error) throw error;

  const ids = (data ?? []).map((r) => r.user_notification_id as string);
  if (ids.length === 0) return;

  const { error: updateError } = await client
    .from("user_notifications")
    .update({ read_at: new Date().toISOString() })
    .in("id", ids);
  if (updateError) throw updateError;
}

export interface FetchNotificationsParams {
  userId: string;
  onlyUnread?: boolean;
  types?: NotificationWithDelivery["type"][];
  limit?: number;
  before?: string;
}

export async function fetchNotificationsForUser(
  client: SupabaseClient,
  params: FetchNotificationsParams,
): Promise<NotificationWithDelivery[]> {
  let q = client
    .from("v_visible_user_notifications")
    .select("*")
    .eq("user_id", params.userId)
    .order("created_at", { ascending: false })
    .limit(params.limit ?? 20);
  if (params.onlyUnread) q = q.is("read_at", null);
  if (params.before) q = q.lt("created_at", params.before);

  const { data, error } = await q;
  if (error) throw error;

  const rows = (data ?? []) as Array<NotificationWithDelivery & { user_notification_id: string; read_at: string | null }>;
  const filtered = params.types ? rows.filter((r) => params.types!.includes(r.type)) : rows;

  return filtered.map((r) => ({
    ...r,
    userNotificationId: r.user_notification_id,
    readAt: r.read_at,
  }));
}

export async function fetchUnreadNotificationCount(client: SupabaseClient, userId: string): Promise<number> {
  const { count, error } = await client
    .from("v_visible_user_notifications")
    .select("user_notification_id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);
  if (error) throw error;
  return count ?? 0;
}