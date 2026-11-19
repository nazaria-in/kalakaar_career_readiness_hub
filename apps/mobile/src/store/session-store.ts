// apps/mobile/src/store/session-store.ts
import { create } from "zustand";
import type { Role, ApprovalStatus } from "@repo/shared";

interface SessionState {
  userId: string | null;
  fullName: string | null;
  role: Role | null;
  approvalStatus: ApprovalStatus | null;
  onboardingCompleted: boolean;
  hydrated: boolean;

  setSession: (session: {
    userId: string;
    fullName: string;
    role: Role | null;
    approvalStatus?: ApprovalStatus | null;
    onboardingCompleted?: boolean;
  }) => void;
  setRole: (role: Role) => void;
  setFullName: (fullName: string) => void;
  setApprovalStatus: (status: ApprovalStatus) => void;
  setOnboardingCompleted: (done: boolean) => void;
  setHydrated: (hydrated: boolean) => void;
  clearSession: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  userId: null,
  fullName: null,
  role: null,
  approvalStatus: null,
  onboardingCompleted: false,
  hydrated: false,

  setSession: ({ userId, fullName, role, approvalStatus = null, onboardingCompleted = false }) =>
    set({ userId, fullName, role, approvalStatus, onboardingCompleted, hydrated: true }),

  setRole: (role) => set({ role }),
  setFullName: (fullName) => set({ fullName }),
  setApprovalStatus: (approvalStatus) => set({ approvalStatus }),
  setOnboardingCompleted: (onboardingCompleted) => set({ onboardingCompleted }),
  setHydrated: (hydrated) => set({ hydrated }),

  clearSession: () =>
    set({
      userId: null,
      fullName: null,
      role: null,
      approvalStatus: null,
      onboardingCompleted: false,
      hydrated: true,
    }),
}));