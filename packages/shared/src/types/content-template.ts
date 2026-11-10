// packages/shared/src/types/content-template.ts
// Shared between web and mobile. No React, no lucide, no DOM APIs.

export type ContentType = "assignment" | "course" | "resource";
export type ContentSubmissionType = "single" | "recurring_update";
export type SubmissionReviewStatus = "pending" | "revision_requested" | "approved";
export type SubmissionRequirement = "required" | "optional" | "disabled";

export interface ContentResourceLink {
  link: string;
  title: string;
  description: string;
}

export interface ContentSubmissionRevision {
  submission_link: string;
  mentor_review: SubmissionReviewStatus;
}

export interface AssignmentTypeSpecific {
  submission_links: {
    max_revisions: number;
    revisions: ContentSubmissionRevision[];
  };
  /** Set by the mentee at submission time — not editable by the creator. */
  difficulty_level: number | null;
}

export interface CourseTypeSpecific {
  /** Set by the creator. */
  modules_total: number | null;
  /** Set by the mentee as they progress — not editable by the creator. */
  modules_completed: number | null;
  /** Set by the mentee — not editable by the creator. */
  difficulty_level: number | null;
}

export type ResourceTypeSpecific = Record<string, never>;

export interface ContentTypeSpecific {
  assignment: AssignmentTypeSpecific;
  course: CourseTypeSpecific;
  resource: ResourceTypeSpecific;
}

export interface ContentTemplateMetadata {
  content_type: ContentType;
  submission_type: ContentSubmissionType;
  /** true = mentees must submit to complete this item */
  is_required: boolean;
  /** true = mentees have no submission option at all */
  is_not_required: boolean;
}

export type ContentQuestionComponent = "single_select" | "multi_select" | "rating" | "short_answer";

export interface ContentQuestionBase {
  id: string;
  question: string;
  /** Opt this question into pod/cohort analytics rollups. */
  analyticsEnabled?: boolean;
  /**
   * Key dashboards aggregate on when analyticsEnabled is true. Reuse the exact
   * same string across every question meant to roll up together. The rollup
   * groups strictly by this string.
   */
  metricKey?: string;
  showIf?: {
    questionId: string;
    equals?: string;
    atLeast?: number;
  };
}

export interface SingleSelectQuestion extends ContentQuestionBase {
  component: "single_select";
  options: string[];
}
export interface MultiSelectQuestion extends ContentQuestionBase {
  component: "multi_select";
  options: string[];
}
export interface RatingQuestion extends ContentQuestionBase {
  component: "rating";
  scale: number;
}
export interface ShortAnswerQuestion extends ContentQuestionBase {
  component: "short_answer";
}

export type ContentQuestionEntry =
  | SingleSelectQuestion
  | MultiSelectQuestion
  | RatingQuestion
  | ShortAnswerQuestion;

export interface ContentSubmissionTemplate {
  metadata: ContentTemplateMetadata;
  resource_links: ContentResourceLink[];
  type_specific: ContentTypeSpecific;
  additional_questions: ContentQuestionEntry[];
}

// ---------------------------------------------------------------------------
// Pure helpers (no UI)
// ---------------------------------------------------------------------------

export function createDefaultSubmissionTemplate(contentType: ContentType): ContentSubmissionTemplate {
  return {
    metadata: {
      content_type: contentType,
      submission_type: contentType === "course" ? "recurring_update" : "single",
      is_required: contentType !== "resource",
      is_not_required: contentType === "resource",
    },
    resource_links: [],
    type_specific: {
      assignment: { submission_links: { max_revisions: 4, revisions: [] }, difficulty_level: null },
      course: { modules_total: null, modules_completed: null, difficulty_level: null },
      resource: {},
    },
    additional_questions: [],
  };
}

export function getSubmissionRequirement(metadata: ContentTemplateMetadata): SubmissionRequirement {
  if (metadata.is_not_required) return "disabled";
  if (metadata.is_required) return "required";
  return "optional";
}

export function requirementFlags(
  requirement: SubmissionRequirement
): Pick<ContentTemplateMetadata, "is_required" | "is_not_required"> {
  switch (requirement) {
    case "required":
      return { is_required: true, is_not_required: false };
    case "optional":
      return { is_required: false, is_not_required: false };
    case "disabled":
      return { is_required: false, is_not_required: true };
  }
}

/** Creates a question with a fresh id. Pure except for the id; pass in an id generator if you need determinism in tests. */
export function newQuestion(
  component: ContentQuestionComponent,
  id: string = (typeof globalThis !== "undefined" && (globalThis as any).crypto?.randomUUID)
    ? (globalThis as any).crypto.randomUUID()
    : Math.random().toString(36).substring(2, 11)
): ContentQuestionEntry {
  switch (component) {
    case "single_select":
      return { id, component, question: "New question", options: ["Yes", "No"] };
    case "multi_select":
      return { id, component, question: "New question", options: ["Option A"] };
    case "rating":
      return { id, component, question: "New question", scale: 5 };
    case "short_answer":
      return { id, component, question: "New question" };
  }
}