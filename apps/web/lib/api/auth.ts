// apps/web/lib/api/auth.ts
import { createClient } from "@/lib/supabase/client";
import { useSessionStore } from "@/store/session-store";
import * as shared from "@repo/shared";
import type { UserRole, Role } from "@repo/shared";

export type { SignUpInput, SignInInput } from "@repo/shared";

export const signUp = (input: Omit<shared.SignUpInput, "emailRedirectTo">) =>
  shared.signUp(createClient(), {
    ...input,
    emailRedirectTo: `${window.location.origin}/auth/callback`,
  });

export const signIn = (input: shared.SignInInput) => shared.signIn(createClient(), input);

export const setUserRole = (userId: string, role: UserRole) => shared.setUserRole(createClient(), userId, role);

export const updateUserProfile = (input: shared.UserProfileInput) => shared.updateUserProfile(createClient(), input);

export const requestPasswordReset = (email: string) =>
  shared.requestPasswordReset(createClient(), email, `${window.location.origin}/auth/reset-password`);

export const updatePassword = (newPassword: string) => shared.updatePassword(createClient(), newPassword);

/** Web-only: writes into the Zustand session store, so it never moves to shared. */
export async function refetchSession(): Promise<string | null> {
  const supabase = createClient();
  const { data } = await supabase.auth.getUser();
  const authUser = data.user;

  if (!authUser) {
    useSessionStore.getState().clearSession();
    return null;
  }

  const { data: profile } = await supabase
    .from("users")
    .select("id, role, full_name")
    .eq("id", authUser.id)
    .single();

  if (!profile) return null;

  useSessionStore.getState().setSession({
    userId: profile.id,
    fullName: profile.full_name ?? "Anonymous User",
    role: profile.role as Role,
  });
  return profile.id;
}