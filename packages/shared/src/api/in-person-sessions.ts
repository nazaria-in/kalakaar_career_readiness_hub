import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  InPersonSession,
  InPersonSessionSeries,
  CreateInPersonSessionSeriesInput,
  UpdateSingleOccurrenceInput,
  CancelSingleOccurrenceInput,
} from "../types/in-person-sessions";

type Row = Record<string, unknown>;

export function rowToSession(row: Row): InPersonSession {
  return {
    id: row.id as string,
    seriesId: (row.series_id as string | null) ?? null,
    createdBy: row.created_by as string,
    title: row.title as string,
    location: (row.location as string | null) ?? null,
    description: (row.description as string | null) ?? null,
    startsAt: row.starts_at as string,
    endsAt: row.ends_at as string,
    status: row.status as InPersonSession["status"],
    cohortId: (row.cohort_id as string | null) ?? null,
    createdAt: row.created_at as string,
    deletedAt: (row.deleted_at as string | null) ?? null,
  };
}

export function rowToSeries(row: Row): InPersonSessionSeries {
  return {
    id: row.id as string,
    createdBy: row.created_by as string,
    title: row.title as string,
    location: (row.location as string | null) ?? null,
    description: (row.description as string | null) ?? null,
    recurrence: row.recurrence as InPersonSessionSeries["recurrence"],
    recurrenceUntil: (row.recurrence_until as string | null) ?? null,
    dayOfWeek: (row.day_of_week as number | null) ?? null,
    defaultStartsAt: row.default_starts_at as string,
    defaultEndsAt: row.default_ends_at as string,
    cohortId: (row.cohort_id as string | null) ?? null,
    createdAt: row.created_at as string,
    deletedAt: (row.deleted_at as string | null) ?? null,
  };
}

/**
 * Next `count` dates for a weekly series, starting from `fromIso`.
 * Works in UTC-day arithmetic so the result doesn't depend on the
 * device's timezone. dayOfWeek: 0 = Sunday ... 6 = Saturday.
 */
export function computeUpcomingWeeklyDates(fromIso: string, dayOfWeek: number, count: number): string[] {
  const start = new Date(fromIso);
  const daysUntilTarget = (dayOfWeek - start.getUTCDay() + 7) % 7;
  const first = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate() + daysUntilTarget);

  const out: string[] = [];
  for (let i = 0; i < count; i += 1) {
    out.push(new Date(first + i * 7 * 86_400_000).toISOString().slice(0, 10)); // YYYY-MM-DD
  }
  return out;
}

/**
 * Combines a YYYY-MM-DD date with an HH:MM[:SS] time-of-day, interpreted
 * in the given IANA timezone offset in minutes (e.g. +330 for Asia/Calcutta).
 * Pass the series' timezone explicitly rather than trusting the device.
 */
export function combineDateAndTime(dateYmd: string, time: string, offsetMinutes: number): string {
  const [h = 0, m = 0, s = 0] = time.split(":").map(Number);
  const [y, mo, d] = dateYmd.split("-").map(Number);
  const utcMs = Date.UTC(y, mo - 1, d, h, m, s) - offsetMinutes * 60_000;
  return new Date(utcMs).toISOString();
}

export interface InPersonSessionsDeps {
  client: SupabaseClient;
  /** Minutes east of UTC for the series' local time. Asia/Calcutta = 330. */
  tzOffsetMinutes?: number;
}

export async function createInPersonSessionSeries(
  deps: InPersonSessionsDeps,
  createdBy: string,
  input: CreateInPersonSessionSeriesInput,
  nowIso: string = new Date().toISOString(),
): Promise<{ series: InPersonSessionSeries; occurrences: InPersonSession[] }> {
  const { client, tzOffsetMinutes = 330 } = deps;

  const { data: seriesRow, error: seriesError } = await client
    .from("in_person_session_series")
    .insert({
      created_by: createdBy,
      title: input.title,
      location: input.location,
      description: input.description,
      recurrence: input.recurrence,
      recurrence_until: input.recurrenceUntil,
      day_of_week: input.dayOfWeek,
      default_starts_at: input.defaultStartsAt,
      default_ends_at: input.defaultEndsAt,
      cohort_id: input.cohortId,
    })
    .select()
    .single();

  if (seriesError || !seriesRow) {
    throw seriesError ?? new Error("Failed to create in-person session series");
  }

  const series = rowToSeries(seriesRow as Row);
  if (series.recurrence === "none" || input.dayOfWeek === null) {
    return { series, occurrences: [] };
  }

  const dates = computeUpcomingWeeklyDates(nowIso, input.dayOfWeek, input.initialOccurrenceCount);

  const occurrenceRows = dates.map((ymd) => ({
    series_id: series.id,
    created_by: series.createdBy,
    title: series.title,
    location: series.location,
    description: series.description,
    starts_at: combineDateAndTime(ymd, series.defaultStartsAt, tzOffsetMinutes),
    ends_at: combineDateAndTime(ymd, series.defaultEndsAt, tzOffsetMinutes),
    status: "scheduled" as const,
    cohort_id: series.cohortId,
  }));

  const { data: insertedRows, error: occurrencesError } = await client
    .from("in_person_sessions")
    .insert(occurrenceRows)
    .select();

  if (occurrencesError || !insertedRows) {
    throw occurrencesError ?? new Error("Failed to materialize session occurrences");
  }

  return {
    series,
    occurrences: (insertedRows as Row[]).map(rowToSession),
  };
}

export async function fetchInPersonSessions(
  client: SupabaseClient,
  rangeStartIso: string,
  rangeEndIso: string,
): Promise<InPersonSession[]> {
  const { data, error } = await client
    .from("in_person_sessions")
    .select("*")
    .is("deleted_at", null)
    .gte("starts_at", rangeStartIso)
    .lt("starts_at", rangeEndIso)
    .order("starts_at", { ascending: true });

  if (error) throw error;
  return (data as Row[]).map(rowToSession);
}

export async function updateSingleOccurrence(
  client: SupabaseClient,
  input: UpdateSingleOccurrenceInput,
): Promise<InPersonSession> {
  const patch: Row = {};
  if (input.title !== undefined) patch.title = input.title;
  if (input.location !== undefined) patch.location = input.location;
  if (input.description !== undefined) patch.description = input.description;
  if (input.startsAt !== undefined) patch.starts_at = input.startsAt;
  if (input.endsAt !== undefined) patch.ends_at = input.endsAt;

  const { data, error } = await client
    .from("in_person_sessions")
    .update(patch)
    .eq("id", input.sessionId)
    .select()
    .single();

  if (error || !data) throw error ?? new Error("Failed to update session occurrence");
  return rowToSession(data as Row);
}

export async function cancelSingleOccurrence(
  client: SupabaseClient,
  input: CancelSingleOccurrenceInput,
): Promise<InPersonSession> {
  const { data, error } = await client
    .from("in_person_sessions")
    .update({ status: "cancelled" })
    .eq("id", input.sessionId)
    .select()
    .single();

  if (error || !data) throw error ?? new Error("Failed to cancel session occurrence");
  return rowToSession(data as Row);
}