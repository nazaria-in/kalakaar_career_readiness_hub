// apps/web/lib/api/content-dispatches.ts
import { createClient } from "@/lib/supabase/client";
import { createContentDispatchesApi } from "@repo/shared";

const api = createContentDispatchesApi(createClient());

export const {
  fetchAssignedMenteeRefs,
  dispatchContentItem,
  removeContentDispatch,
  markDispatchComplete,
  unmarkDispatchComplete,
  fetchMenteeContentDispatches,
  fetchDispatchById,
  fetchMyDispatchForItem,
  fetchDispatchesForContentItem,
} = api;

export type {
  AssignedMenteeRef,
  DispatchContentItemInput,
  DispatchRosterRow,
  MarkCompleteWarnings,
} from "@repo/shared";