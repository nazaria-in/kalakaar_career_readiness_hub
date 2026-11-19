// apps/web/lib/api/content-items.ts
import { createClient } from "@/lib/supabase/client";
import * as shared from "@repo/shared";

export type { CreateWeekInput } from "@repo/shared";

export const fetchContentItems = (params: shared.FetchContentItemsParams) =>
  shared.fetchContentItems(createClient(), params);
export const fetchPortionClusters = () => shared.fetchPortionClusters(createClient());
export const fetchContentItem = (id: string) => shared.fetchContentItem(createClient(), id);
export const fetchWeeks = () => shared.fetchWeeks(createClient());
export const fetchTags = () => shared.fetchTags(createClient());
export const defaultTemplateFor = shared.defaultTemplateFor;