// /src/lib/api/admin-users.ts
import { createAdminUsersApi } from "@repo/shared";
import { supabase } from "@/lib/supabase/client";

const api = createAdminUsersApi(supabase);

export const {
  fetchUsersForRolesTab,
  fetchUsersForPodsTab,
  fetchPodOptions,
  fetchCohortOptions,
  createPod,
  fetchPodsOverview,
  updateUserRole,
  assignUserToPod,
  removeUserFromPod,
  fetchPodFirstMentors,
  createCohort,
  deleteCohortCascade,
  deletePodCascade,
} = api;

export type {
  AdminUserRow,
  AdminUserPodRow,
  PodOption,
  CohortOption,
  PodFirstMentor,
  PodMemberSummary,
  PodOverview,
  CreatePodInput,
  CreateCohortInput,
} from "@repo/shared";