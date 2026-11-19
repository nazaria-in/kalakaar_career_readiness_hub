// packages/shared/src/content/status-filter.ts
import type { CompletionStatus, MenteeContentDispatch } from "../types/content";

export type StatusFilter = "all" | "not_started" | "has_started" | "completed" | "overdue";

export const STATUS_FILTER_DEFS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "has_started", label: "Has started" },
  { value: "not_started", label: "Not started" },
  { value: "completed", label: "Completed" },
  { value: "overdue", label: "Overdue" },
];

export const DONE_STATUSES: readonly CompletionStatus[] = ["completed", "approved_awaiting_completion"];

export function isDispatchDone(d: MenteeContentDispatch): boolean {
  return DONE_STATUSES.includes(d.completion_status);
}

/** Pure, derived from fields already on the dispatch. No fetch. */
export function matchesStatusFilter(d: MenteeContentDispatch, filter: StatusFilter, now: number = Date.now()): boolean {
  if (filter === "all") return true;

  const done = isDispatchDone(d);
  if (filter === "completed") return done;

  const deadline = d.due_at ?? d.content_item.submission_ends_at;
  const overdue = !done && !!deadline && new Date(deadline).getTime() < now;
  if (filter === "overdue") return overdue;

  const startsAt = d.content_item.submission_starts_at;
  const started = !startsAt || new Date(startsAt).getTime() <= now;
  if (filter === "has_started") return started && !done;
  if (filter === "not_started") return !started;
  return true;
}