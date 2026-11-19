// apps/web/providers/role-provider.tsx
"use client";

import * as React from "react";
import { useSessionStore } from "@/store/session-store";
import {
  ALL_ROLES,
  permissionLevelFor,
  resolveActiveRole,
  resolveAvailableRoles,
  type ApprovalStatus,
  type PermissionLevel,
  type Role,
} from "@repo/shared";

export { ROLE_LABELS } from "@repo/shared";
export type { Role, PermissionLevel } from "@repo/shared";

interface RoleContextValue {
  role: Role | null;
  permissionLevel: PermissionLevel;
  setRole: (role: Role) => void;
  canSwitchRole: boolean;
  availableRoles: Role[];
  isDebug: boolean;
  approvalStatus?: ApprovalStatus | null;
  isAuthenticated: boolean;
}

const RoleContext = React.createContext<RoleContextValue | null>(null);

export interface RoleProviderProps {
  children: React.ReactNode;
  availableRoles?: Role[];
  isDebug?: boolean;
}

export function RoleProvider({ children, availableRoles, isDebug = false }: RoleProviderProps) {
  const sessionRole = useSessionStore((s) => s.role);
  const userId = useSessionStore((s) => s.userId);
  const approvalStatus = useSessionStore((s) => s.approvalStatus);

  const [override, setOverride] = React.useState<Role | null>(null);

  const isAuthenticated = isDebug || Boolean(userId && sessionRole);

  const roles = React.useMemo(
    () => resolveAvailableRoles({ isDebug, availableRoles, sessionRole }),
    [isDebug, availableRoles, sessionRole],
  );

  const activeRole = React.useMemo(
    () => resolveActiveRole({ override, sessionRole, roles, isDebug }),
    [override, sessionRole, roles, isDebug],
  );

  const value = React.useMemo<RoleContextValue>(
    () => ({
      role: activeRole,
      permissionLevel: permissionLevelFor(activeRole ?? "mentee"),
      setRole: setOverride,
      canSwitchRole: roles.length > 1,
      availableRoles: roles,
      isDebug,
      approvalStatus,
      isAuthenticated,
    }),
    [activeRole, roles, isDebug, approvalStatus, isAuthenticated],
  );

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole(): RoleContextValue {
  const ctx = React.useContext(RoleContext);
  if (!ctx) throw new Error("useRole must be used within a RoleProvider");
  return ctx;
}