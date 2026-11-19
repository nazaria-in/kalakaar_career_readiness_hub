// packages/shared/src/api/content-submissions.ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ContentSubmission,
  ContentSubmissionAnswers,
  SubmissionStatus,
} from "../types/content";
import type { ContentQuestionEntry } from "../types/content-template";
import {
  notifyContentReviewed,
  notifyContentSubmitted,
} from "../notifications/content-notifications";

export async function fetchSubmissionsForDispatch(
  client: SupabaseClient,
  dispatchId: string,
): Promise<ContentSubmission[]> {
  const { data, error } = await client
    .from("content_submissions")
    .select("*")
    .eq("dispatch_id", dispatchId)
    .order("version_number", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as ContentSubmission[];
}

export async function fetchLatestSubmission(
  client: SupabaseClient,
  dispatchId: string,
): Promise<ContentSubmission | null> {
  const { data, error } = await client
    .from("content_submissions")
    .select("*")
    .eq("dispatch_id", dispatchId)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as ContentSubmission) ?? null;
}

export interface CreateSubmissionInput {
  dispatchId: string;
  contentItemId: string;
  answers: ContentSubmissionAnswers;
  priorVersionCount: number;
  questionDefs: ContentQuestionEntry[];
  /** Pod mentors of the mentee, plus the item's creator. Deduped by the caller. */
  recipientMentorIds: string[];
  menteeName: string;
  contentItemTitle: string;
}

export interface SubmissionWarnings {
  analyticsError: unknown | null;
  notificationError: unknown | null;
}

export async function createSubmission(
  client: SupabaseClient,
  input: CreateSubmissionInput,
): Promise<{ submission: ContentSubmission } & SubmissionWarnings> {
  const { data, error } = await client
    .from("content_submissions")
    .insert({
      dispatch_id: input.dispatchId,
      version_number: input.priorVersionCount + 1,
      answers: input.answers,
      status: "pending_review" as SubmissionStatus,
    })
    .select()
    .single();
  if (error) throw error;

  const submission = data as unknown as ContentSubmission;
  const analyticsError = await writeAnalyticsAnswers(client, submission, input.contentItemId, input.questionDefs);

  let notificationError: unknown | null = null;
  try {
    await notifyContentSubmitted(client, {
      contentDispatchId: input.dispatchId,
      contentItemTitle: input.contentItemTitle,
      recipientMentorIds: input.recipientMentorIds,
      menteeName: input.menteeName,
    });
  } catch (err) {
    notificationError = err;
  }

  return { submission, analyticsError, notificationError };
}

/** One row per analytics-enabled question. Returns the error instead of throwing, so a missing table never blocks a submission. */
async function writeAnalyticsAnswers(
  client: SupabaseClient,
  submission: ContentSubmission,
  contentItemId: string,
  questionDefs: ContentQuestionEntry[],
): Promise<unknown | null> {
  const rows = questionDefs
    .filter((q) => q.analyticsEnabled && q.metricKey && submission.answers.additional_questions[q.id] !== undefined)
    .map((q) => ({
      content_submission_id: submission.id,
      content_item_id: contentItemId,
      question_id: q.id,
      metric_key: q.metricKey as string,
      value: submission.answers.additional_questions[q.id],
    }));
  if (rows.length === 0) return null;

  const { error } = await client.from("content_analytics_answers").insert(rows);
  return error ?? null;
}

export interface ReviewSubmissionInput {
  submissionId: string;
  status: Extract<SubmissionStatus, "approved" | "revision_requested">;
  reviewedBy: string;
  feedback: string | null;
  contentDispatchId: string;
  menteeId: string;
  contentItemTitle: string;
}

export async function reviewSubmission(
  client: SupabaseClient,
  input: ReviewSubmissionInput,
): Promise<{ notificationError: unknown | null }> {
  const { error } = await client
    .from("content_submissions")
    .update({
      status: input.status,
      reviewed_by: input.reviewedBy,
      reviewed_at: new Date().toISOString(),
      feedback: input.feedback,
    })
    .eq("id", input.submissionId);
  if (error) throw error;

  let notificationError: unknown | null = null;
  try {
    await notifyContentReviewed(client, {
      contentDispatchId: input.contentDispatchId,
      contentItemTitle: input.contentItemTitle,
      menteeId: input.menteeId,
      status: input.status,
    });
  } catch (err) {
    notificationError = err;
  }
  return { notificationError };
}