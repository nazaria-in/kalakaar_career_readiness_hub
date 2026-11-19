// /packages/shared/src/types/people.ts
import { ApprovalStatus, UserRole } from "./users";
/** Minimal person shape used by lists, cards, and pickers. */
export interface UserCardPerson {
  id: string;
  fullName: string | null;
  role: UserRole;
  approvalStatus: ApprovalStatus;
  schoolOrOrg?: string | null;
  email?: string | null;
}