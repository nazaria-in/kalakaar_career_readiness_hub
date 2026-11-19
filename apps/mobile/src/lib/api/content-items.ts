// /src/lib/api/content-items.ts
import { createContentItemsApi } from "@repo/shared";
import { supabase } from "@/lib/supabase/client";

const api = createContentItemsApi(supabase);

// Destructured so the existing named imports (fetchWeeks, createTag, ...)
// keep working unchanged at every call site.
export const {
  fetchContentItems,
  fetchPortionClusters,
  fetchContentItem,
  fetchWeeks,
  createWeek,
  fetchTags,
  createTag,
  deleteTag,
  createContentItem,
  updateContentItem,
  softDeleteContentItem,
  defaultTemplateFor,
} = api;

export {
  CONTENT_TYPE_LABEL,
  type CreateWeekInput,
  type CreateContentItemInput,
  type UpdateContentItemInput,
  type FetchContentItemsParams,
} from "@repo/shared";