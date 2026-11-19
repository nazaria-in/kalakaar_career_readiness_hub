// apps/web/lib/api/content-submissions.ts
import { createClient } from "@/lib/supabase/client";
import * as shared from "@repo/shared";

export const fetchSubmissionsForDispatch = (dispatchId: string) =>
  shared.fetchSubmissionsForDispatch(createClient(), dispatchId);
export const fetchLatestSubmission = (dispatchId: string) =>
  shared.fetchLatestSubmission(createClient(), dispatchId);