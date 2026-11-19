// packages/shared/src/onboarding/route.ts
import type { Role } from "../roles";
import type { ApprovalStatus } from "../types/users";
import { ROLES_REQUIRING_APPROVAL } from "../nav/nav-config";

export type OnboardingStep = "login" | "role" | "not-approved" | "profile" | "complete";

export interface OnboardingState {
  userId: string | null;
  role: Role | null;
  approvalStatus: ApprovalStatus | null;
  onboardingCompleted: boolean;
}

/** Returns the one step this user belongs on. Call only after the session has hydrated. */
export function resolveOnboardingStep(s: OnboardingState): OnboardingStep {
  if (!s.userId) return "login";
  if (!s.role) return "role";
  if (ROLES_REQUIRING_APPROVAL.includes(s.role) && s.approvalStatus !== "approved") return "not-approved";
  if (!s.onboardingCompleted) return "profile";
  return "complete";
}

/** Route for each step. Change `complete` here if you later want a per-role landing page. */
export const ONBOARDING_PATHS: Record<OnboardingStep, string> = {
  login: "/login",
  role: "/onboarding/role",
  "not-approved": "/onboarding/not-approved",
  profile: "/onboarding/profile",
  complete: "/dashboard",
};