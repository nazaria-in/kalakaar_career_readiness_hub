// apps/mobile/src/lib/api/content-submissions.ts
import * as shared from "@repo/shared";
import { supabase } from "../supabase/client";

export const fetchSubmissionsForDispatch = (dispatchId: string) =>
  shared.fetchSubmissionsForDispatch(supabase, dispatchId);

export const fetchLatestSubmission = (dispatchId: string) =>
  shared.fetchLatestSubmission(supabase, dispatchId);

export const createSubmission = (input: shared.CreateSubmissionInput) =>
  shared.createSubmission(supabase, input);

export const reviewSubmission = (input: shared.ReviewSubmissionInput) =>
  shared.reviewSubmission(supabase, input);