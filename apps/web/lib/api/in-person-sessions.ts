// /lib/api/in-person-sessions.ts
import { createClient } from "@/lib/supabase/client";
import * as shared from "@repo/shared";
import type { InPersonSession, InPersonSessionSeries, CreateInPersonSessionSeriesInput, UpdateSingleOccurrenceInput, CancelSingleOccurrenceInput } from "@repo/shared";

// Note: the original file created the client at module load. Creating it per call
// is safe on web (createClient reuses the browser singleton) and removes the module-load side effect.
export const createInPersonSessionSeries = (createdBy: string, input: CreateInPersonSessionSeriesInput) =>
  shared.createInPersonSessionSeries({ client: createClient() }, createdBy, input);

export const fetchInPersonSessions = (start: string, end: string) =>
  shared.fetchInPersonSessions(createClient(), start, end);

export const updateSingleOccurrence = (input: UpdateSingleOccurrenceInput) =>
  shared.updateSingleOccurrence(createClient(), input);

export const cancelSingleOccurrence = (input: CancelSingleOccurrenceInput) =>
  shared.cancelSingleOccurrence(createClient(), input);

export type { InPersonSession, InPersonSessionSeries };