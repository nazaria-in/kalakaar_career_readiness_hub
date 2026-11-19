// packages/shared/src/api/content-dispatches.ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CompletionStatus,
  ContentDispatch,
  ContentItemWithMeta,
  ContentType,
  MenteeContentDispatch,
  Tag,
} from "../types/content";
import { normalizeJoinedContentItem } from "./content-timeline";
import { notifyContentCompleted } from "../notifications/content-notifications";

export interface AssignedMenteeRef {
  menteeId: string;
  contentDispatchId: string;
}

export interface DispatchContentItemInput {
  contentItemId: string;
  menteeIds: string[];
  assignedBy: string;
  dueAt: string | null;
}

export interface DispatchRosterRow {
  id: string;
  mentee_id: string;
  mentee_name: string;
  due_at: string | null;
  completed_at: string | null;
  completed_by: string | null;
  completion_status: CompletionStatus;
  latest_submission_status: "pending_review" | "revision_requested" | "approved" | null;
  total_submissions: number;
}

export interface MarkCompleteWarnings {
  notificationError: unknown | null;
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
  content_item: ContentItemWithMeta & { content_item_tags?: { tag: Tag }[] };
}

interface RawAssignmentStatusRow {
  content_dispatch_id: string;
  completion_status: string;
  latest_submission_status: "pending_review" | "revision_requested" | "approved" | null;
  total_submissions: number;
}

interface RawRosterRow {
  id: string;
  mentee_id: string;
  due_at: string | null;
  completed_at: string | null;
  completed_by: string | null;
  mentee: { full_name: string | null } | null;
}

/** Completion status for assignments comes from the view. Other types use completed_at only. */
function statusFromRow(
  contentType: ContentType,
  completedAt: string | null,
  view: RawAssignmentStatusRow | undefined,
): Pick<MenteeContentDispatch, "completion_status" | "latest_submission_status" | "total_submissions"> {
  if (contentType === "assignment") {
    return {
      completion_status: (view?.completion_status ?? "not_started") as CompletionStatus,
      latest_submission_status: view?.latest_submission_status ?? null,
      total_submissions: view?.total_submissions ?? 0,
    };
  }
  return {
    completion_status: (completedAt ? "completed" : "not_started") as CompletionStatus,
    latest_submission_status: null,
    total_submissions: 0,
  };
}

export function createContentDispatchesApi(supabase: SupabaseClient) {
  async function fetchAssignmentStatusById(dispatchIds: string[]): Promise<Map<string, RawAssignmentStatusRow>> {
    if (dispatchIds.length === 0) return new Map();
    const { data, error } = await supabase
      .from("v_mentee_assignment_status")
      .select("content_dispatch_id, completion_status, latest_submission_status, total_submissions")
      .in("content_dispatch_id", dispatchIds);
    if (error) throw error;
    return new Map((data as RawAssignmentStatusRow[]).map((s) => [s.content_dispatch_id, s]));
  }

  /** Mentee ids already assigned to this item, with their dispatch row ids. */
  async function fetchAssignedMenteeRefs(contentItemId: string): Promise<AssignedMenteeRef[]> {
    const { data, error } = await supabase
      .from("content_dispatches")
      .select("id, mentee_id")
      .eq("content_item_id", contentItemId);
    if (error) throw error;
    return (data ?? []).map((row) => ({
      menteeId: row.mentee_id as string,
      contentDispatchId: row.id as string,
    }));
  }

  /** Insert one dispatch per mentee. Columns match the table: no window or requirement columns. */
  async function dispatchContentItem(input: DispatchContentItemInput): Promise<void> {
    if (input.menteeIds.length === 0) return;
    const rows = input.menteeIds.map((menteeId) => ({
      content_item_id: input.contentItemId,
      mentee_id: menteeId,
      assigned_by: input.assignedBy,
      due_at: input.dueAt,
    }));
    const { error } = await supabase.from("content_dispatches").insert(rows);
    if (error) throw error;
  }

  async function removeContentDispatch(dispatchId: string): Promise<void> {
    const { error } = await supabase.from("content_dispatches").delete().eq("id", dispatchId);
    if (error) throw error;
  }

  /**
   * Mark complete: writes completed_at/completed_by, then fires the
   * achievement notification (which also cancels pending reminders).
   * Matches web's markDispatchComplete. A notification failure is returned,
   * not thrown, because the completion itself already succeeded.
   */
  async function markDispatchComplete(
    dispatchId: string,
    completedBy: string,
    menteeId: string,
    contentItemTitle: string,
  ): Promise<MarkCompleteWarnings> {
    const { error } = await supabase
      .from("content_dispatches")
      .update({ completed_at: new Date().toISOString(), completed_by: completedBy })
      .eq("id", dispatchId);
    if (error) throw error;

    let notificationError: unknown | null = null;
    try {
      await notifyContentCompleted(supabase, { contentDispatchId: dispatchId, menteeId, contentItemTitle });
    } catch (err) {
      notificationError = err;
    }
    return { notificationError };
  }

  async function unmarkDispatchComplete(dispatchId: string): Promise<void> {
    const { error } = await supabase
      .from("content_dispatches")
      .update({ completed_at: null, completed_by: null })
      .eq("id", dispatchId);
    if (error) throw error;
  }

  /** A mentee's dispatches for one content type, with completion status. */
  async function fetchMenteeContentDispatches(
    menteeId: string,
    contentType: ContentType,
  ): Promise<MenteeContentDispatch[]> {
    const { data, error } = await supabase
      .from("content_dispatches")
      .select("*, content_item:content_items!inner(*, week:weeks(*), content_item_tags(tag:tags(*)))")
      .eq("mentee_id", menteeId)
      .eq("content_item.content_type", contentType)
      .is("content_item.deleted_at", null);
    if (error) throw error;

    const rows = (data ?? []) as unknown as RawDispatchRow[];
    const statusById = contentType === "assignment"
      ? await fetchAssignmentStatusById(rows.map((r) => r.id))
      : new Map<string, RawAssignmentStatusRow>();

    return rows.map((row) => ({
      ...row,
      content_item: normalizeJoinedContentItem(row.content_item),
      ...statusFromRow(contentType, row.completed_at, statusById.get(row.id)),
    })) as MenteeContentDispatch[];
  }

  /** One dispatch with completion status. */
  async function fetchDispatchById(dispatchId: string): Promise<MenteeContentDispatch> {
    const { data, error } = await supabase
      .from("content_dispatches")
      .select("*, content_item:content_items(*, week:weeks(*), content_item_tags(tag:tags(*)))")
      .eq("id", dispatchId)
      .single();
    if (error) throw error;

    const row = data as unknown as RawDispatchRow;
    const contentType = row.content_item.content_type;
    const statusById = contentType === "assignment"
      ? await fetchAssignmentStatusById([row.id])
      : new Map<string, RawAssignmentStatusRow>();

    return {
      ...row,
      content_item: normalizeJoinedContentItem(row.content_item),
      ...statusFromRow(contentType, row.completed_at, statusById.get(row.id)),
    } as MenteeContentDispatch;
  }

  /** The signed-in mentee's dispatch for one item, or null if not assigned. */
  async function fetchMyDispatchForItem(
    contentItemId: string,
    menteeId: string,
  ): Promise<ContentDispatch | null> {
    const { data, error } = await supabase
      .from("content_dispatches")
      .select("*")
      .eq("content_item_id", contentItemId)
      .eq("mentee_id", menteeId)
      .maybeSingle();
    if (error) throw error;
    return (data as ContentDispatch | null) ?? null;
  }

  /** Roster for one item, with each mentee's status. Pins the users FK by name because the table has three. */
  async function fetchDispatchesForContentItem(
    contentItemId: string,
    contentType: ContentType,
  ): Promise<DispatchRosterRow[]> {
    const { data, error } = await supabase
      .from("content_dispatches")
      .select("id, mentee_id, due_at, completed_at, completed_by, mentee:users!content_dispatches_mentee_id_fkey(full_name)")
      .eq("content_item_id", contentItemId);
    if (error) throw error;

    const rows = (data ?? []) as unknown as RawRosterRow[];
    const statusById = contentType === "assignment"
      ? await fetchAssignmentStatusById(rows.map((r) => r.id))
      : new Map<string, RawAssignmentStatusRow>();

    return rows.map((row) => ({
      id: row.id,
      mentee_id: row.mentee_id,
      mentee_name: row.mentee?.full_name?.trim() || "Unknown mentee",
      due_at: row.due_at,
      completed_at: row.completed_at,
      completed_by: row.completed_by,
      ...statusFromRow(contentType, row.completed_at, statusById.get(row.id)),
    }));
  }

  return {
    fetchAssignedMenteeRefs,
    dispatchContentItem,
    removeContentDispatch,
    markDispatchComplete,
    unmarkDispatchComplete,
    fetchMenteeContentDispatches,
    fetchDispatchById,
    fetchMyDispatchForItem,
    fetchDispatchesForContentItem,
  };
}

export type ContentDispatchesApi = ReturnType<typeof createContentDispatchesApi>;