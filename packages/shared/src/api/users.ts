import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppUser, ApprovalStatus, UserRole } from "../types/users";

export interface PendingUsersFilters {
  role?: UserRole;
  status?: ApprovalStatus;
}

export async function fetchUserProfile(client: SupabaseClient, userId: string): Promise<AppUser | null> {
  const { data, error } = await client
    .from("users")
    .select("*")
    .eq("id", userId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw error;
  return data as AppUser | null;
}

export async function fetchCurrentUserProfile(client: SupabaseClient): Promise<AppUser | null> {
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) return null;
  return fetchUserProfile(client, user.id);
}

export async function fetchUsersByApproval(
  client: SupabaseClient,
  filters: PendingUsersFilters = {},
): Promise<AppUser[]> {
  let query = client.from("users").select("*").is("deleted_at", null);
  if (filters.role) query = query.eq("role", filters.role);
  if (filters.status) query = query.eq("approval_status", filters.status);

  const { data, error } = await query.order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as AppUser[];
}

export async function updateApprovalStatus(
  client: SupabaseClient,
  userId: string,
  status: ApprovalStatus,
): Promise<AppUser> {
  const { data, error } = await client
    .from("users")
    .update({ approval_status: status, updated_at: new Date().toISOString() })
    .eq("id", userId)
    .select("*")
    .single();
  if (error) throw error;
  return data as AppUser;
}