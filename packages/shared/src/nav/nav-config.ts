// packages/shared/src/nav/nav-config.ts
import type { PermissionLevel } from "../roles";

export const NAV_IDS = [
  "dashboard",
  "assignments_and_courses",
  "meetings",
  "exit-surveys",
  "people",
] as const;

export type NavId = (typeof NAV_IDS)[number];

export const NAV_LABELS: Record<NavId, string> = {
  dashboard: "Dashboard",
  assignments_and_courses: "Assignments",
  meetings: "Meetings",
  "exit-surveys": "Exit Surveys",
  people: "People",
};

const PARTICIPANT_NAV: NavId[] = ["dashboard", "assignments_and_courses", "meetings", "exit-surveys"];

export const NAV_BY_PERMISSION: Record<PermissionLevel, NavId[]> = {
  mentee: PARTICIPANT_NAV,
  mentor: PARTICIPANT_NAV,
  staff: [...PARTICIPANT_NAV, "people"],
};

export const ROLES_REQUIRING_APPROVAL = ["associate", "mentor"];