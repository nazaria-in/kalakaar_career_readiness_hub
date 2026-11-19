// /lib/api/users.ts
import { createClient } from "@/lib/supabase/client";
import * as shared from "@repo/shared";

export type { PendingUsersFilters } from "@repo/shared";

export const fetchUserProfile = (userId: string) => shared.fetchUserProfile(createClient(), userId);
export const fetchCurrentUserProfile = () => shared.fetchCurrentUserProfile(createClient());
export const fetchUsersByApproval = (filters?: shared.PendingUsersFilters) =>
  shared.fetchUsersByApproval(createClient(), filters);
export const updateApprovalStatus = (userId: string, status: shared.ApprovalStatus) =>
  shared.updateApprovalStatus(createClient(), userId, status);