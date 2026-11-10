// packages/shared/src/roles.ts
export type Role = "mentee" | "mentor" | "associate" | "pm";

export const ALL_ROLES: Role[] = ["mentee", "mentor", "associate", "pm"];

export type PermissionLevel = "mentee" | "mentor" | "staff";

export function permissionLevelFor(role: Role): PermissionLevel {
  if (role === "mentee") return "mentee";
  if (role === "mentor") return "mentor";
  return "staff";
}

export const ROLE_LABELS: Record<Role, string> = {
  mentee: "Mentee",
  mentor: "Mentor",
  associate: "Associate",
  pm: "Program Manager",
};

/** Resolves the role to show: an explicit override if allowed, else the session role, else null (or the first role in debug mode). */
export function resolveActiveRole(opts: {
  override: Role | null;
  sessionRole: Role | null | undefined;
  roles: Role[];
  isDebug: boolean;
}): Role | null {
  const { override, sessionRole, roles, isDebug } = opts;
  if (override && roles.includes(override)) return override;
  if (sessionRole && roles.includes(sessionRole)) return sessionRole;
  if (isDebug) return roles[0] ?? "mentee";
  return null;
}

/** Available roles: all in debug, the explicit list if given, else just the session role. */
export function resolveAvailableRoles(opts: {
  isDebug: boolean;
  availableRoles?: Role[];
  sessionRole: Role | null | undefined;
}): Role[] {
  if (opts.isDebug) return ALL_ROLES;
  if (opts.availableRoles) return opts.availableRoles;
  return opts.sessionRole ? [opts.sessionRole] : [];
}