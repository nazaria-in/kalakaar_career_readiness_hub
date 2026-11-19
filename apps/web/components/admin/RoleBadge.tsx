// /components/admin/RoleBadge.tsx

import type { UserRole } from "@/lib/api/admin-users";

// Distinct color per role so mentee/mentor are never ambiguous in a list —
// this is the "clearly visible who is mentee/mentor" requirement.
const ROLE_STYLES: Record<UserRole, string> = {
  mentee: "bg-nazaria-pale-teal text-nazaria-teal  ",
  mentor: "bg-nazaria-pale-pink text-nazaria-burgundy  ",
  associate: "bg-nazaria-pale-gold text-text-primary  ",
  pm: "bg-accent text-accent-foreground  ",
};

const ROLE_LABELS: Record<UserRole, string> = {
  mentee: "Mentee",
  mentor: "Mentor",
  associate: "Associate",
  pm: "P.M",
};

interface RoleBadgeProps {
  role: UserRole;
}

export function RoleBadge({ role }: RoleBadgeProps) {
  return (
    <span className={`w-fit rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_STYLES[role]}`}>
      {ROLE_LABELS[role]}
    </span>
  );
}