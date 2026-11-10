// apps/web/lib/api/notifications.ts
import { createClient } from "@/lib/supabase/client";
import * as shared from "@repo/shared";

const c = () => createClient();

export const createNotification = (input: shared.CreateNotificationInput) => shared.createNotification(c(), input);
export const cancelPendingNotifications = (filter: shared.CancelPendingFilter) => shared.cancelPendingNotifications(c(), filter);
export const markNotificationRead = (id: string) => shared.markNotificationRead(c(), id);
export const markAllNotificationsRead = (userId: string, ids?: string[]) => shared.markAllNotificationsRead(c(), userId, ids);
export const fetchNotificationsForUser = (params: shared.FetchNotificationsParams) => shared.fetchNotificationsForUser(c(), params);
export const fetchUnreadNotificationCount = (userId: string) => shared.fetchUnreadNotificationCount(c(), userId);