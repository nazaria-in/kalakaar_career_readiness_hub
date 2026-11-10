// packages/shared/src/api/content-timeline.ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ContentItemWithMeta,
  ContentType,
  MenteeContentDispatch,
  Tag,
  Week,
} from "../types/content";
import type { ContentSubmissionTemplate } from "../types/content-template";

type RawTagJoinRow = { tag: Tag };

interface RawContentItemRow {
  id: string;
  content_type: ContentType;
  title: string;
  description: string | null;
  instructions: string | null;
  week_id: string | null;
  portion_cluster: string | null;
  submission_template: ContentSubmissionTemplate;
  is_active: boolean;
  created_by: string;
  created_at: string;
  deleted_at: string | null;
  submission_starts_at: string | null;
  submission_ends_at: string | null;
  week: Week | null;
  content_item_tags: RawTagJoinRow[] | null;
}

interface RawDispatchRow {
  id: string;
  content_item_id: string;
  mentee_id: string;
  assigned_by: string;
  due_at: string | null;
  pushed_at: string;
  completed_at: string | null;
  completed_by: string | null;
  content_item: RawContentItemRow;
}

export function normalizeContentItemRow(row: RawContentItemRow): ContentItemWithMeta {
  return {
    id: row.id,
    content_type: row.content_type,
    title: row.title,
    description: row.description,
    instructions: row.instructions,
    week_id: row.week_id,
    portion_cluster: row.portion_cluster,
    submission_template: row.submission_template,
    is_active: row.is_active,
    created_by: row.created_by,
    created_at: row.created_at,
    deleted_at: row.deleted_at,
    submission_starts_at: row.submission_starts_at,
    submission_ends_at: row.submission_ends_at,
    week: row.week,
    tags: (row.content_item_tags ?? []).map((join) => join.tag),
  };
}

/**
 * Binary fallback status. Known gap: assignments can have richer states via
 * v_mentee_assignment_status. Wire through content-dispatches if that exists.
 */
export function normalizeDispatchRow(row: RawDispatchRow): MenteeContentDispatch {
  return {
    id: row.id,
    content_item_id: row.content_item_id,
    mentee_id: row.mentee_id,
    assigned_by: row.assigned_by,
    due_at: row.due_at,
    pushed_at: row.pushed_at,
    completed_at: row.completed_at,
    completed_by: row.completed_by,
    content_item: normalizeContentItemRow(row.content_item),
    completion_status: row.completed_at !== null ? "completed" : "not_started",
    latest_submission_status: null,
    total_submissions: 0,
  };
}

/** Staff/mentor view: one node per content_item due date. */
export async function fetchContentItemsDueInRange(
  client: SupabaseClient,
  rangeStartIso: string,
  rangeEndIso: string,
  scopeToCreatedBy?: string,
): Promise<ContentItemWithMeta[]> {
  let query = client
    .from("content_items")
    .select("*, week:weeks(*), content_item_tags(tag:tags(*))")
    .is("deleted_at", null)
    .not("submission_starts_at", "is", null)
    .not("submission_ends_at", "is", null)
    .gte("submission_ends_at", rangeStartIso)
    .lt("submission_ends_at", rangeEndIso);

  if (scopeToCreatedBy) query = query.eq("created_by", scopeToCreatedBy);

  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as unknown as RawContentItemRow[]).map(normalizeContentItemRow);
}

/** Mentee view: own dispatches whose content_item is due inside the range. */
export async function fetchMenteeContentDispatchesInRange(
  client: SupabaseClient,
  menteeId: string,
  rangeStartIso: string,
  rangeEndIso: string,
): Promise<MenteeContentDispatch[]> {
  const { data, error } = await client
    .from("content_dispatches")
    .select("*, content_item:content_items(*, week:weeks(*), content_item_tags(tag:tags(*)))")
    .eq("mentee_id", menteeId);

  if (error) throw error;

  const dispatches = ((data ?? []) as unknown as RawDispatchRow[]).map(normalizeDispatchRow);
  const rangeStartMs = new Date(rangeStartIso).getTime();
  const rangeEndMs = new Date(rangeEndIso).getTime();

  return dispatches.filter((d) => {
    const endsAt = d.content_item.submission_ends_at;
    if (!endsAt) return false;
    const endsMs = new Date(endsAt).getTime();
    return endsMs >= rangeStartMs && endsMs < rangeEndMs;
  });
}