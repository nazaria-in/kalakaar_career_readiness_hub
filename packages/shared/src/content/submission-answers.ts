// packages/shared/src/content/submission-answers.ts
import type {
  AdditionalQuestionAnswerValue,
  ContentItemWithMeta,
  ContentSubmissionAnswers,
  ContentType,
} from "../types/content";
import type { ContentQuestionEntry } from "../types/content-template";

export function defaultAnswersFor(contentType: ContentType): ContentSubmissionAnswers {
  const base: ContentSubmissionAnswers = { additional_questions: {} };
  if (contentType === "assignment") {
    base.type_specific = { assignment: { submission_link: "", difficulty_level: null } };
  } else if (contentType === "course") {
    base.type_specific = { course: { modules_completed: null, difficulty_level: null } };
  }
  return base;
}

export function isQuestionVisible(
  question: ContentQuestionEntry,
  answers: Record<string, AdditionalQuestionAnswerValue>,
): boolean {
  if (!question.showIf) return true;
  const parent = answers[question.showIf.questionId];
  const { equals, atLeast } = question.showIf;
  if (equals !== undefined) {
    return Array.isArray(parent) ? parent.includes(equals) : parent === equals;
  }
  if (atLeast !== undefined) {
    return typeof parent === "number" && parent >= atLeast;
  }
  return true;
}

/** null means no limit (courses and resources). */
export function maxSubmissionsFor(item: ContentItemWithMeta): number | null {
  if (item.content_type !== "assignment") return null;
  return item.submission_template.type_specific.assignment.submission_links.max_revisions;
}

/** Adds a protocol so a link opens externally instead of as a relative path. */
export function normalizeExternalUrl(url?: string | null): string {
  if (!url) return "#";
  const trimmed = String(url).trim().replace(/^["']|["']$/g, "");
  if (!trimmed) return "#";
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}