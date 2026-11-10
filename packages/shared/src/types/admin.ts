// /packages/shared/src/types/admin.ts
import type { ExitSurveySignal, ExitSurveyUrgency } from "./exit-survey";

export interface Escalation {
  exit_survey_id: string;
  subject_user_id: string | null;
  reported_by: string;
  signal: ExitSurveySignal | null;
  follow_up_urgency: ExitSurveyUrgency;
  needs_follow_up: boolean;
  concern_tags: string[];
  created_at: string;
}

export interface PodStats {
  pod_id: string;
  pod_name: string;
  cohort_id: string;
  mentee_count: number;
  mentor_count: number;
  completed_assignments: number;
  total_assignments: number;
  open_escalations: number;
  pending_exit_survey_count: number;
}

export interface MentorStats {
  mentor_id: string;
  mentor_name: string | null;
  mentee_count: number;
  completed_assignments: number;
  total_assignments: number;
  open_escalations_among_mentees: number;
  pending_exit_survey_count: number;
}

/** One outstanding exit_surveys row within a PendingExitSurveySummaryRow. */
export interface PendingExitSurveySummaryEntry {
  exitSurveyId: string;
  meetingTitle: string;
  createdAt: string;
}

/**
 * Per-person rollup of currently-unfilled exit surveys, for the staff
 * dashboard's ExitSurveyCompletionSection. Built client-side from
 * v_pending_exit_surveys grouped by user_id + enriched with v_user_pods
 * (name/role/pod/cohort).
 */
export interface PendingExitSurveySummaryRow {
  userId: string;
  fullName: string | null;
  role: "mentor" | "mentee";
  podId: string | null;
  podName: string | null;
  cohortId: string | null;
  pendingCount: number;
  oldestCreatedAt: string;
  surveys: PendingExitSurveySummaryEntry[];
}