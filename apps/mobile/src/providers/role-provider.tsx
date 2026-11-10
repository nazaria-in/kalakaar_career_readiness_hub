// apps/mobile/src/providers/role-provider.tsx

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import {
  permissionLevelFor,
  resolveActiveRole,
  resolveAvailableRoles,
  type ApprovalStatus,
  type PermissionLevel,
  type Role,
} from "@repo/shared";
import { useSessionStore } from "../store/session-store";

interface RoleContextValue {
  role: Role | null;
  permissionLevel: PermissionLevel;
  setRole: (role: Role) => void;
  canSwitchRole: boolean;
  availableRoles: Role[];
  isDebug: boolean;
  approvalStatus: ApprovalStatus | null;
  isAuthenticated: boolean;
}

const RoleContext = createContext<RoleContextValue | null>(null);

export function RoleProvider({
  children,
  availableRoles,
  isDebug = false,
}: {
  children: ReactNode;
  availableRoles?: Role[];
  isDebug?: boolean;
}) {
  const sessionRole = useSessionStore((s) => s.role);
  const userId = useSessionStore((s) => s.userId);
  const approvalStatus = useSessionStore((s) => s.approvalStatus);

  const [override, setOverride] = useState<Role | null>(null);

  const isAuthenticated = isDebug || Boolean(userId && sessionRole);

  const roles = useMemo(
    () => resolveAvailableRoles({ isDebug, availableRoles, sessionRole }),
    [isDebug, availableRoles, sessionRole]
  );

  const activeRole = useMemo(
    () => resolveActiveRole({ override, sessionRole, roles, isDebug }),
    [override, sessionRole, roles, isDebug]
  );

  const value = useMemo<RoleContextValue>(
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
    [activeRole, roles, isDebug, approvalStatus, isAuthenticated]
  );

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole(): RoleContextValue {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRole must be used within a RoleProvider");
  return ctx;
}