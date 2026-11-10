import { create } from "zustand";
import type { Role, ApprovalStatus } from "@repo/shared";

interface SessionState {
  userId: string | null;
  fullName: string | null;
  role: Role | null;
  approvalStatus: ApprovalStatus | null;
  hydrated: boolean;

  setSession: (session: {
    userId: string;
    fullName: string;
    role: Role;
    approvalStatus?: ApprovalStatus | null;
  }) => void;
  setRole: (role: Role) => void;
  setFullName: (fullName: string) => void;
  setApprovalStatus: (status: ApprovalStatus) => void;
  setHydrated: (hydrated: boolean) => void;
  clearSession: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  userId: null,
  fullName: null,
  role: null,
  approvalStatus: null,
  hydrated: false,

  setSession: ({ userId, fullName, role, approvalStatus = null }) =>
    set({ userId, fullName, role, approvalStatus: approvalStatus ?? null, hydrated: true }),

  setRole: (role) => set({ role }),
  setFullName: (fullName) => set({ fullName }),
  setApprovalStatus: (approvalStatus) => set({ approvalStatus }),
  setHydrated: (hydrated) => set({ hydrated }),

  clearSession: () =>
    set({ userId: null, fullName: null, role: null, approvalStatus: null, hydrated: true }),
}));