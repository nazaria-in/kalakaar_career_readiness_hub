// apps/mobile/src/lib/api/content-dispatches.ts
import { createContentDispatchesApi } from "@repo/shared";
import { supabase } from "../supabase/client";

const api = createContentDispatchesApi(supabase);

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