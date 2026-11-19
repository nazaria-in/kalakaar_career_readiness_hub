// packages/shared/src/api/auth.ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserRole } from "../types/users";

export interface SignUpInput {
  fullName: string;
  email: string;
  password: string;
  /** Absolute URL the confirmation email links back to. Web passes window.location.origin + /auth/callback, mobile passes its deep link. */
  emailRedirectTo: string;
}

export async function signUp(client: SupabaseClient, input: SignUpInput) {
  const { data, error } = await client.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      emailRedirectTo: input.emailRedirectTo,
      data: { full_name: input.fullName },
    },
  });
  if (error) throw error;
  if (!data.user) throw new Error("Failed to create user.");
  return data;
}

export interface SignInInput {
  email: string;
  password: string;
}

export async function signIn(client: SupabaseClient, input: SignInInput) {
  const { data, error } = await client.auth.signInWithPassword(input);
  if (error) throw error;
  return data;
}

export async function signOut(client: SupabaseClient): Promise<void> {
  const { error } = await client.auth.signOut();
  if (error) throw error;
}

/** Mentee: approved immediately. Mentor / associate: pending until PM approval. */
export async function setUserRole(client: SupabaseClient, userId: string, role: UserRole) {
  const needsApproval = role === "mentor" || role === "associate";
  const { error } = await client
    .from("users")
    .update({ role, approval_status: needsApproval ? "pending" : "approved" })
    .eq("id", userId);
  if (error) throw error;
}

export interface UserProfileInput {
  userId: string;
  fullName?: string;
  bio?: string;
  backgroundNotes?: string;
  goals?: string[];
  interests?: string[];
  schoolOrOrg?: string;
  /** Set true only from the onboarding profile step. */
  markOnboardingComplete?: boolean;
}


export async function updateUserProfile(client: SupabaseClient, input: UserProfileInput): Promise<void> {
  const updates: Record<string, unknown> = {};
  if (input.fullName !== undefined) updates.full_name = input.fullName;
  if (input.bio !== undefined) updates.bio = input.bio || null;
  if (input.backgroundNotes !== undefined) updates.background_notes = input.backgroundNotes;
  if (input.goals !== undefined) updates.goals = input.goals;
  if (input.interests !== undefined) updates.interests = input.interests;
  if (input.schoolOrOrg !== undefined) updates.school_or_org = input.schoolOrOrg;
  if (input.markOnboardingComplete) updates.onboarding_completed_at = new Date().toISOString();
  if (Object.keys(updates).length === 0) return;

  updates.updated_at = new Date().toISOString();
  const { error } = await client.from("users").update(updates).eq("id", input.userId);
  if (error) throw error;
}

export async function requestPasswordReset(client: SupabaseClient, email: string, redirectTo: string): Promise<void> {
  const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) {
    if (error.status === 429 || /rate limit/i.test(error.message)) {
      throw new Error("We've hit our email limit for the moment. Please try again after 1 hour.");
    }
    throw new Error(error.message);
  }
}

export async function updatePassword(client: SupabaseClient, newPassword: string): Promise<void> {
  const { error } = await client.auth.updateUser({ password: newPassword });
  if (error) throw new Error(error.message);
}