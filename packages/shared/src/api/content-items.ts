// /packages/shared/src/api/content-items.ts
import type { SupabaseClient } from "@supabase/supabase-js";
import { applyFilters } from "../filtering/apply-filters";
import { applySort } from "../filtering/apply-sort";
import type { FilterFieldDef, FilterState, SortState } from "../types/filtering";
import type { ContentItemWithMeta, ContentType, Tag, Week } from "../types/content";
import {
  createDefaultSubmissionTemplate,
  type ContentSubmissionTemplate,
} from "../types/content-template";
import { uniqueClusters } from "../content/portion-cluster";
import { cancelContentReminders } from "../notifications/content-notifications";
import { normalizeContentItemRow, type RawContentItemRow } from "./content-timeline";

export interface FetchContentItemsParams {
  contentType: ContentType;
  fieldDefs: FilterFieldDef[];
  filterState: FilterState;
  sortState: SortState;
  /** null/undefined = no cluster filter. */
  portionCluster?: string | null;
  /**
   * Mentor scope: items either created by this user OR dispatched to at least
   * one mentee in podMenteeIds. Both conditions are OR'd together.
   */
  scopeToMentor?: {
    mentorId: string;
    podMenteeIds: string[];
  };
}

export interface CreateWeekInput {
  name: string;
  start_date: string | null;
  end_date: string | null;
}

export interface CreateContentItemInput {
  content_type: ContentType;
  portion_cluster: string | null;
  title: string;
  description: string | null;
  instructions: string | null;
  week_id: string | null;
  submission_template: ContentSubmissionTemplate;
  created_by: string;
  tag_ids: string[];
  /**
   * Required by content_items_submission_window_check whenever
   * submission_template.metadata.is_not_required is false. Pass null/null
   * for "No submission" content.
   */
  submission_starts_at: string | null;
  submission_ends_at: string | null;
}

export interface UpdateContentItemInput {
  id: string;
  portion_cluster: string | null;
  title: string;
  description: string | null;
  instructions: string | null;
  week_id: string | null;
  submission_template: ContentSubmissionTemplate;
  tag_ids: string[];
  submission_starts_at: string | null;
  submission_ends_at: string | null;
}

/**
 * The tags embed needs `!inner` for a `content_item_tags` filter clause to
 * narrow results, but a permanent `!inner` would hide untagged items. The join
 * type is chosen per request. The "tags" relation field is single-select, so
 * its value is a plain string (one tag id) or undefined.
 */
function isTagFilterActive(filterState: FilterState): boolean {
  const tagsFilter = filterState.values["tags"];
  return typeof tagsFilter === "string" && tagsFilter !== "";
}

export const CONTENT_TYPE_LABEL: Record<ContentType, string> = {
  assignment: "Assignment",
  course: "Course",
  resource: "Resource",
};

export function defaultTemplateFor(contentType: ContentType): ContentSubmissionTemplate {
  return createDefaultSubmissionTemplate(contentType);
}

/**
 * Factory: pass in the platform's Supabase client. Web and mobile each create
 * their own client; this file never imports one.
 */
export function createContentItemsApi(supabase: SupabaseClient) {
  async function fetchContentItems({
    contentType,
    fieldDefs,
    filterState,
    sortState,
    portionCluster,
    scopeToMentor,
  }: FetchContentItemsParams): Promise<ContentItemWithMeta[]> {
    let dispatchScopedItemIds: string[] = [];

    if (scopeToMentor && scopeToMentor.podMenteeIds.length > 0) {
      const { data: dispatchRows, error: dispatchError } = await supabase
        .from("content_dispatches")
        .select("content_item_id")
        .in("mentee_id", scopeToMentor.podMenteeIds);
      if (dispatchError) throw dispatchError;

      dispatchScopedItemIds = Array.from(
        new Set((dispatchRows ?? []).map((row) => row.content_item_id as string))
      );
    }

    // Mentor scope with no pod-dispatched items and nothing authored would
    // otherwise fall through to an unfiltered query. Short-circuit explicitly.
    if (scopeToMentor && dispatchScopedItemIds.length === 0) {
      const { data: ownRows, error: ownError } = await supabase
        .from("content_items")
        .select("id")
        .eq("created_by", scopeToMentor.mentorId)
        .eq("content_type", contentType)
        .is("deleted_at", null)
        .limit(1);
      if (ownError) throw ownError;
      if ((ownRows ?? []).length === 0) return [];
    }

    const tagsEmbed = isTagFilterActive(filterState)
      ? "content_item_tags!inner(tag:tags(*))"
      : "content_item_tags(tag:tags(*))";

    let query = supabase
      .from("content_items")
      .select(`*, week:weeks(*), ${tagsEmbed}`)
      .eq("content_type", contentType)
      .is("deleted_at", null);

    if (scopeToMentor) {
      const idFilter =
        dispatchScopedItemIds.length > 0 ? `id.in.(${dispatchScopedItemIds.join(",")}),` : "";
      query = query.or(`${idFilter}created_by.eq.${scopeToMentor.mentorId}`);
    }

    if (portionCluster) {
      query = query.eq("portion_cluster", portionCluster);
    }

    query = applyFilters(query, fieldDefs, filterState);
    query = applySort(query, fieldDefs, sortState);

    const { data, error } = await query;
    if (error) throw error;

    return ((data ?? []) as unknown as RawContentItemRow[]).map(normalizeContentItemRow);
  }

  /** Every distinct portion_cluster across live content items (all types). */
  async function fetchPortionClusters(): Promise<string[]> {
    const { data, error } = await supabase
      .from("content_items")
      .select("portion_cluster")
      .is("deleted_at", null)
      .not("portion_cluster", "is", null);
    if (error) throw error;
    return uniqueClusters((data ?? []) as { portion_cluster: string | null }[]);
  }

  async function fetchContentItem(id: string): Promise<ContentItemWithMeta> {
    const { data, error } = await supabase
      .from("content_items")
      .select("*, week:weeks(*), content_item_tags(tag:tags(*))")
      .eq("id", id)
      .single();
    if (error) throw error;
    return normalizeContentItemRow(data as unknown as RawContentItemRow);
  }

  async function fetchWeeks(): Promise<Week[]> {
    const { data, error } = await supabase
      .from("weeks")
      .select("*")
      .is("deleted_at", null)
      .order("order_index", { ascending: true });
    if (error) throw error;
    return (data ?? []) as Week[];
  }

  /**
   * Shared across all content types, since week_id lives on content_items
   * regardless of content_type.
   */
  async function createWeek(input: CreateWeekInput, existingWeeks: Week[]): Promise<Week> {
    const nextOrderIndex =
      existingWeeks.reduce((max, w) => Math.max(max, w.order_index), -1) + 1;

    const { data, error } = await supabase
      .from("weeks")
      .insert({
        name: input.name,
        start_date: input.start_date,
        end_date: input.end_date,
        order_index: nextOrderIndex,
      })
      .select()
      .single();
    if (error) throw error;
    return data as Week;
  }

  async function fetchTags(): Promise<Tag[]> {
    const { data, error } = await supabase
      .from("tags")
      .select("*")
      .order("name", { ascending: true });
    if (error) throw error;
    return (data ?? []) as Tag[];
  }

  async function createTag(name: string): Promise<Tag> {
    const { data, error } = await supabase.from("tags").insert({ name }).select().single();
    if (error) throw error;
    return data as Tag;
  }

  /**
   * Cascades via content_item_tags.tag_id (ON DELETE CASCADE). Only join rows
   * are removed; content_items rows are never touched.
   */
  async function deleteTag(tagId: string): Promise<void> {
    const { error } = await supabase.from("tags").delete().eq("id", tagId);
    if (error) throw error;
  }

  async function createContentItem(input: CreateContentItemInput): Promise<ContentItemWithMeta> {
    const { data: item, error } = await supabase
      .from("content_items")
      .insert({
        content_type: input.content_type,
        portion_cluster: input.portion_cluster,
        title: input.title,
        description: input.description,
        instructions: input.instructions,
        week_id: input.week_id,
        submission_template: input.submission_template,
        created_by: input.created_by,
        submission_starts_at: input.submission_starts_at,
        submission_ends_at: input.submission_ends_at,
      })
      .select()
      .single();
    if (error) throw error;

    if (input.tag_ids.length > 0) {
      const { error: tagError } = await supabase
        .from("content_item_tags")
        .insert(input.tag_ids.map((tag_id) => ({ content_item_id: item.id, tag_id })));
      if (tagError) throw tagError;
    }

    return fetchContentItem(item.id as string);
  }

  async function updateContentItem(input: UpdateContentItemInput): Promise<ContentItemWithMeta> {
    const { error } = await supabase
      .from("content_items")
      .update({
        portion_cluster: input.portion_cluster,
        title: input.title,
        description: input.description,
        instructions: input.instructions,
        week_id: input.week_id,
        submission_template: input.submission_template,
        submission_starts_at: input.submission_starts_at,
        submission_ends_at: input.submission_ends_at,
      })
      .eq("id", input.id);
    if (error) throw error;

    // Replace join rows wholesale rather than diffing. Fine at this scale.
    const { error: deleteError } = await supabase
      .from("content_item_tags")
      .delete()
      .eq("content_item_id", input.id);
    if (deleteError) throw deleteError;

    if (input.tag_ids.length > 0) {
      const { error: insertError } = await supabase
        .from("content_item_tags")
        .insert(input.tag_ids.map((tag_id) => ({ content_item_id: input.id, tag_id })));
      if (insertError) throw insertError;
    }

    return fetchContentItem(input.id);
  }

  /**
   * Cancels pending reminders across every dispatch under this item before
   * soft-deleting it. Reminder cleanup is best-effort: failures are logged,
   * not thrown, so they never block the delete.
   */
  async function softDeleteContentItem(id: string): Promise<void> {
    const { data: dispatches, error: dispatchesError } = await supabase
      .from("content_dispatches")
      .select("id")
      .eq("content_item_id", id);
    if (dispatchesError) throw dispatchesError;

    await Promise.all(
      (dispatches ?? []).map((d) =>
        cancelContentReminders(supabase, d.id as string).catch((err) => {
          console.error(
            "[content-items] Failed to cancel reminders for dispatch during item delete",
            d.id,
            err
          );
        })
      )
    );

    const { error } = await supabase
      .from("content_items")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
  }

  return {
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
  };
}

export type ContentItemsApi = ReturnType<typeof createContentItemsApi>;