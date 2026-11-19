// apps/mobile/src/lib/api/users.ts
import * as shared from "@repo/shared";
import { supabase } from "../supabase/client";

export const updateMyProfile = (input: shared.UserProfileInput) =>
  shared.updateUserProfile(supabase, input);

export async function fetchMyApprovalStatus(userId: string): Promise<shared.ApprovalStatus> {
  const { data, error } = await supabase
    .from("users")
    .select("approval_status")
    .eq("id", userId)
    .single();
  if (error) throw error;
  return data.approval_status as shared.ApprovalStatus;
}