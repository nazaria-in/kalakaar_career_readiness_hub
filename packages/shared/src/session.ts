// packages/shared/src/session.ts
import { ApprovalStatus } from "./types/users";

export interface ProfileRow {
  id: string;
  role: string;
  full_name: string | null;
  approval_status: ApprovalStatus;
}

export interface SessionSnapshot {
  userId: string;
  fullName: string;
  role: string;
  approvalStatus: ApprovalStatus;
}

/** Maps a users-table row to the session shape. Pure, so web and mobile share it. */
export function profileToSession(profile: ProfileRow): SessionSnapshot {
  return {
    userId: profile.id,
    fullName: profile.full_name ?? "Anonymous User",
    role: profile.role,
    approvalStatus: profile.approval_status,
  };
}

/** Name for PostHog identify, pulled from Supabase user_metadata. */
export function displayNameFromMetadata(meta: Record<string, unknown>): string | undefined {
  return typeof meta.full_name === "string" ? meta.full_name : undefined;
}