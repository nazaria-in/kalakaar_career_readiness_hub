// /components/content/ContentSubmissionTemplateEditor.tsx
"use client";

import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  CircleDot,
  CheckSquare,
  Star,
  MessageSquare,
  Link2,
  BarChart3,
  Info,
} from "lucide-react";
import {
  type AssignmentTypeSpecific,
  type ContentQuestionComponent,
  type ContentQuestionEntry,
  type ContentResourceLink,
  type ContentSubmissionTemplate,
  type ContentTemplateMetadata,
  type ContentType,
  type ContentTypeSpecific,
  type CourseTypeSpecific,
  type SubmissionRequirement,
  createDefaultSubmissionTemplate,
  getSubmissionRequirement,
  newQuestion,
  requirementFlags,
} from "@repo/shared";

// Re-exported so existing web imports (`from "@/components/content/ContentSubmissionTemplateEditor"`)
// keep working during the migration. Remove once all call sites import from @repo/shared.
export {
  createDefaultSubmissionTemplate,
  type ContentType,
  type ContentSubmissionTemplate,
  type ContentQuestionEntry,
  type ContentQuestionComponent,
  type ContentResourceLink,
  type ContentTemplateMetadata,
  type ContentTypeSpecific,
  type AssignmentTypeSpecific,
  type CourseTypeSpecific,
  type ContentSubmissionType,
  type SubmissionReviewStatus,
  type ContentSubmissionRevision,
  type ContentQuestionBase,
} from "@repo/shared";

// ---------------------------------------------------------------------------
// UI-only metadata (icons can't live in shared code)
// ---------------------------------------------------------------------------

const COMPONENT_META: Record<
  ContentQuestionComponent,
  { label: string; icon: typeof CircleDot }
> = {
  single_select: { label: "Single choice", icon: CircleDot },
  multi_select: { label: "Multiple choice", icon: CheckSquare },
  rating: { label: "Star rating", icon: Star },
  short_answer: { label: "Short answer", icon: MessageSquare },
};

const REQUIREMENT_OPTIONS: { value: SubmissionRequirement; label: string; hint: string }[] = [
  { value: "required", label: "Required", hint: "Mentee must submit to complete this item" },
  { value: "optional", label: "Optional", hint: "Mentee can submit if they want to" },
  { value: "disabled", label: "No submission", hint: "Mentees can't submit anything for this item" },
];

// ---------------------------------------------------------------------------
// Root component
// ---------------------------------------------------------------------------

interface ContentSubmissionTemplateEditorProps {
  contentType: ContentType;
  value: ContentSubmissionTemplate;
  onChange: (next: ContentSubmissionTemplate) => void;
}

export function ContentSubmissionTemplateEditor({
  contentType,
  value,
  onChange,
}: ContentSubmissionTemplateEditorProps) {
  function patchMetadata(patch: Partial<ContentTemplateMetadata>) {
    onChange({ ...value, metadata: { ...value.metadata, content_type: contentType, ...patch } });
  }

  function patchTypeSpecific<K extends ContentType>(key: K, patch: Partial<ContentTypeSpecific[K]>) {
    onChange({
      ...value,
      type_specific: { ...value.type_specific, [key]: { ...value.type_specific[key], ...patch } },
    });
  }

  function setResourceLinks(links: ContentResourceLink[]) {
    onChange({ ...value, resource_links: links });
  }

  function setQuestions(questions: ContentQuestionEntry[]) {
    onChange({ ...value, additional_questions: questions });
  }

  const requirement = getSubmissionRequirement(value.metadata);
  const canHaveQuestions = requirement !== "disabled";

  return (
    <div className="flex flex-col gap-6">
      <SubmissionRequirementSection
        requirement={requirement}
        onRequirementChange={(req) => patchMetadata(requirementFlags(req))}
      />

      <ResourceLinksSection links={value.resource_links} onChange={setResourceLinks} />

      <TypeSpecificSection
        contentType={contentType}
        typeSpecific={value.type_specific}
        onPatchAssignment={(patch) => patchTypeSpecific("assignment", patch)}
        onPatchCourse={(patch) => patchTypeSpecific("course", patch)}
      />

      {canHaveQuestions && (
        <AdditionalQuestionsSection questions={value.additional_questions} onChange={setQuestions} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Submission requirement
// ---------------------------------------------------------------------------

function SubmissionRequirementSection({
  requirement,
  onRequirementChange,
}: {
  requirement: SubmissionRequirement;
  onRequirementChange: (requirement: SubmissionRequirement) => void;
}) {
  return (
    <section className="surface-card flex flex-col gap-2 dark:surface-card">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-text-muted dark:text-text-muted">
        Submission
      </h3>
      <div className="inline-flex w-fit flex-wrap gap-1 rounded-full border border-border bg-card-alt p-1 dark:border-border dark:bg-card-alt">
        {REQUIREMENT_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onRequirementChange(option.value)}
            title={option.hint}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              requirement === option.value
                ? "bg-primary text-primary-foreground dark:bg-primary dark:text-primary-foreground"
                : "text-text-muted hover:text-text-primary dark:text-text-muted dark:hover:text-text-primary"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
      <p className="flex items-center gap-1 text-xs text-text-muted dark:text-text-muted">
        <Info className="h-3.5 w-3.5 shrink-0" />
        {REQUIREMENT_OPTIONS.find((o) => o.value === requirement)?.hint}
      </p>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Resource links section
// ---------------------------------------------------------------------------

function emptyLink(): ContentResourceLink {
  return { link: "", title: "", description: "" };
}

function ResourceLinksSection({
  links,
  onChange,
}: {
  links: ContentResourceLink[];
  onChange: (links: ContentResourceLink[]) => void;
}) {
  function patchLink(index: number, patch: Partial<ContentResourceLink>) {
    onChange(links.map((link, i) => (i === index ? { ...link, ...patch } : link)));
  }

  function removeLink(index: number) {
    onChange(links.filter((_, i) => i !== index));
  }

  return (
    <section className="surface-card flex flex-col gap-4 dark:surface-card">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-text-muted dark:text-text-muted">
          External links
        </h3>
        <button
          type="button"
          onClick={() => onChange([...links, emptyLink()])}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-primary transition-colors hover:bg-card-alt dark:border-border dark:text-text-primary dark:hover:bg-card-alt"
        >
          <Plus className="h-3.5 w-3.5" />
          Add link
        </button>
      </div>

      {links.length === 0 && (
        <p className="text-xs text-text-muted dark:text-text-muted">No external links attached yet.</p>
      )}

      <div className="flex flex-col gap-3">
        {links.map((link, index) => (
          <div key={index} className="surface-card-alt flex flex-col gap-2 dark:surface-card-alt">
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 shrink-0 text-text-muted dark:text-text-muted" />
              <input
                value={link.link}
                onChange={(e) => patchLink(index, { link: e.target.value })}
                placeholder="https://..."
                className="flex-1 rounded border border-border bg-card px-2 py-1.5 text-xs text-text-primary dark:border-border dark:bg-card dark:text-text-primary"
              />
              <button
                type="button"
                onClick={() => removeLink(index)}
                aria-label="Remove link"
                className="rounded p-1 text-text-muted transition-colors hover:bg-card hover:text-destructive dark:text-text-muted dark:hover:bg-card dark:hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <input
              value={link.title}
              onChange={(e) => patchLink(index, { title: e.target.value })}
              placeholder="Link title"
              className="rounded border border-border bg-card px-2 py-1.5 text-xs text-text-primary dark:border-border dark:bg-card dark:text-text-primary"
            />
            <input
              value={link.description}
              onChange={(e) => patchLink(index, { description: e.target.value })}
              placeholder="Short description (optional)"
              className="rounded border border-border bg-card px-2 py-1.5 text-xs text-text-primary dark:border-border dark:bg-card dark:text-text-primary"
            />
          </div>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Type-specific section
// ---------------------------------------------------------------------------

interface TypeSpecificSectionProps {
  contentType: ContentType;
  typeSpecific: ContentTypeSpecific;
  onPatchAssignment: (patch: Partial<AssignmentTypeSpecific>) => void;
  onPatchCourse: (patch: Partial<CourseTypeSpecific>) => void;
}

function TypeSpecificSection({
  contentType,
  typeSpecific,
  onPatchAssignment,
  onPatchCourse,
}: TypeSpecificSectionProps) {
  if (contentType === "resource") return null;

  return (
    <section className="surface-card flex flex-col gap-4 dark:surface-card">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-text-muted dark:text-text-muted">
        {contentType === "assignment" ? "Assignment settings" : "Course settings"}
      </h3>

      {contentType === "assignment" && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-muted dark:text-text-muted">
              Max revisions allowed
            </label>
            <input
              type="number"
              min={0}
              value={typeSpecific.assignment.submission_links.max_revisions}
              onChange={(e) =>
                onPatchAssignment({
                  submission_links: {
                    ...typeSpecific.assignment.submission_links,
                    max_revisions: Number(e.target.value) || 0,
                  },
                })
              }
              className="w-24 rounded-lg border border-border bg-card-alt px-3 py-1.5 text-sm text-text-primary dark:border-border dark:bg-card-alt dark:text-text-primary"
            />
          </div>
          <ReadOnlyNote label="Difficulty level" note="Set by the mentee after they submit an attempt." />
        </div>
      )}

      {contentType === "course" && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-muted dark:text-text-muted">
              Total modules
            </label>
            <input
              type="number"
              min={0}
              value={typeSpecific.course.modules_total ?? ""}
              onChange={(e) =>
                onPatchCourse({ modules_total: e.target.value === "" ? null : Number(e.target.value) })
              }
              className="w-24 rounded-lg border border-border bg-card-alt px-3 py-1.5 text-sm text-text-primary dark:border-border dark:bg-card-alt dark:text-text-primary"
            />
          </div>
          <ReadOnlyNote label="Modules completed" note="Filled in by the mentee as they progress." />
          <ReadOnlyNote label="Difficulty level" note="Set by the mentee once they start the course." />
        </div>
      )}
    </section>
  );
}

function ReadOnlyNote({ label, note }: { label: string; note: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-dashed border-border bg-card-alt px-3 py-2 dark:border-border dark:bg-card-alt">
      <span className="text-xs font-medium text-text-muted dark:text-text-muted">{label}</span>
      <span className="flex items-center gap-1 text-xs text-text-muted dark:text-text-muted">
        <Info className="h-3.5 w-3.5 shrink-0" />
        {note}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Additional questions section
// ---------------------------------------------------------------------------

function AdditionalQuestionsSection({
  questions,
  onChange,
}: {
  questions: ContentQuestionEntry[];
  onChange: (questions: ContentQuestionEntry[]) => void;
}) {
  function addQuestion(component: ContentQuestionComponent) {
    onChange([...questions, newQuestion(component)]);
  }

  function removeQuestion(id: string) {
    onChange(
      questions
        .filter((q) => q.id !== id)
        .map((q) => (q.showIf?.questionId === id ? { ...q, showIf: undefined } : q))
    );
  }

  function patchQuestion(id: string, patch: Partial<ContentQuestionEntry>) {
    onChange(questions.map((q) => (q.id === id ? ({ ...q, ...patch } as ContentQuestionEntry) : q)));
  }

  function moveQuestion(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= questions.length) return;
    const next = [...questions];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    onChange(next);
  }

  return (
    <section className="surface-card flex flex-col gap-4 dark:surface-card">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-text-muted dark:text-text-muted">
          Additional questions
        </h3>
        <span className="text-xs text-text-muted dark:text-text-muted">
          {questions.length} question{questions.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="flex flex-col gap-3">
        {questions.map((question, index) => (
          <ContentQuestionEditor
            key={question.id}
            question={question}
            index={index}
            isFirst={index === 0}
            isLast={index === questions.length - 1}
            priorQuestions={questions.slice(0, index).filter((p) => p.component !== "short_answer")}
            onPatch={(patch) => patchQuestion(question.id, patch)}
            onRemove={() => removeQuestion(question.id)}
            onMoveUp={() => moveQuestion(index, -1)}
            onMoveDown={() => moveQuestion(index, 1)}
          />
        ))}

        {questions.length === 0 && (
          <p className="text-xs text-text-muted dark:text-text-muted">
            No additional questions yet — add one below.
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {(Object.keys(COMPONENT_META) as ContentQuestionComponent[]).map((component) => {
          const meta = COMPONENT_META[component];
          const Icon = meta.icon;
          return (
            <button
              key={component}
              type="button"
              onClick={() => addQuestion(component)}
              className="flex flex-col items-center gap-1.5 rounded-xl border border-dashed border-border bg-card-alt px-3 py-3 text-center transition-colors hover:border-solid hover:border-primary hover:bg-accent dark:border-border dark:bg-card-alt dark:hover:border-primary dark:hover:bg-accent"
            >
              <Icon className="h-4 w-4 text-text-accent dark:text-text-accent" />
              <span className="text-[11px] font-medium leading-tight text-text-primary dark:text-text-primary">
                {meta.label}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

interface ContentQuestionEditorProps {
  question: ContentQuestionEntry;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  priorQuestions: ContentQuestionEntry[];
  onPatch: (patch: Partial<ContentQuestionEntry>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

function ContentQuestionEditor({
  question,
  index,
  isFirst,
  isLast,
  priorQuestions,
  onPatch,
  onRemove,
  onMoveUp,
  onMoveDown,
}: ContentQuestionEditorProps) {
  const meta = COMPONENT_META[question.component];
  const Icon = meta.icon;
  const parentQuestion = question.showIf
    ? priorQuestions.find((p) => p.id === question.showIf?.questionId)
    : undefined;

  function updateOptions(options: string[]) {
    if (question.component === "single_select" || question.component === "multi_select") {
      onPatch({ options } as Partial<ContentQuestionEntry>);
    }
  }

  return (
    <div className="surface-card-alt flex flex-col gap-3 dark:surface-card-alt">
      <div className="flex items-start gap-2">
        <span className="mt-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-card text-[10px] font-semibold text-text-muted dark:bg-card dark:text-text-muted">
          {index + 1}
        </span>

        <div className="flex flex-1 flex-col gap-2">
          <div className="flex items-center gap-2">
            <Icon className="h-3.5 w-3.5 shrink-0 text-text-accent dark:text-text-accent" />
            <input
              value={question.question}
              onChange={(e) => onPatch({ question: e.target.value })}
              className="flex-1 rounded border border-border bg-card px-2 py-1 text-sm text-text-primary dark:border-border dark:bg-card dark:text-text-primary"
            />
          </div>
          <span className="w-fit rounded-full bg-card px-2 py-0.5 text-[10px] font-medium text-text-muted dark:bg-card dark:text-text-muted">
            {meta.label}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={isFirst}
            aria-label="Move question up"
            className="rounded p-1 text-text-muted transition-colors hover:bg-card hover:text-text-primary disabled:opacity-30 dark:text-text-muted dark:hover:bg-card dark:hover:text-text-primary"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={isLast}
            aria-label="Move question down"
            className="rounded p-1 text-text-muted transition-colors hover:bg-card hover:text-text-primary disabled:opacity-30 dark:text-text-muted dark:hover:bg-card dark:hover:text-text-primary"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onRemove}
            aria-label="Remove question"
            className="rounded p-1 text-text-muted transition-colors hover:bg-card hover:text-destructive dark:text-text-muted dark:hover:bg-card dark:hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {(question.component === "single_select" || question.component === "multi_select") && (
        <div className="flex flex-col gap-1.5 pl-8">
          {question.options.map((option, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={option}
                onChange={(e) => {
                  const next = [...question.options];
                  next[i] = e.target.value;
                  updateOptions(next);
                }}
                className="flex-1 rounded border border-border bg-card px-2 py-1 text-xs text-text-primary dark:border-border dark:bg-card dark:text-text-primary"
              />
              <button
                type="button"
                onClick={() => updateOptions(question.options.filter((_, oi) => oi !== i))}
                disabled={question.options.length <= 1}
                aria-label="Remove option"
                className="rounded p-1 text-text-muted transition-colors hover:bg-card hover:text-destructive disabled:opacity-30 dark:text-text-muted dark:hover:bg-card dark:hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => updateOptions([...question.options, `Option ${question.options.length + 1}`])}
            className="flex w-fit items-center gap-1 text-xs font-medium text-text-accent transition-opacity hover:opacity-80 dark:text-text-accent"
          >
            <Plus className="h-3 w-3" />
            Add option
          </button>
        </div>
      )}

      {question.component === "rating" && (
        <div className="flex items-center gap-2 pl-8">
          <label className="text-xs text-text-muted dark:text-text-muted">Scale (out of):</label>
          <input
            type="number"
            min={2}
            value={question.scale}
            onChange={(e) => onPatch({ scale: Number(e.target.value) || 5 } as Partial<ContentQuestionEntry>)}
            className="w-16 rounded border border-border bg-card px-2 py-1 text-xs text-text-primary dark:border-border dark:bg-card dark:text-text-primary"
          />
        </div>
      )}

      {/* Conditional visibility */}
      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-2 pl-8 dark:border-border">
        <label className="text-xs text-text-muted dark:text-text-muted">Only show this if:</label>
        <select
          value={question.showIf?.questionId ?? ""}
          onChange={(e) => {
            if (!e.target.value) {
              onPatch({ showIf: undefined });
              return;
            }
            const parent = priorQuestions.find((p) => p.id === e.target.value);
            if (parent?.component === "rating") {
              onPatch({ showIf: { questionId: e.target.value, atLeast: Math.ceil(parent.scale / 2) } });
            } else if (parent?.component === "single_select" || parent?.component === "multi_select") {
              onPatch({ showIf: { questionId: e.target.value, equals: parent.options[0] } });
            } else {
              onPatch({ showIf: { questionId: e.target.value } });
            }
          }}
          disabled={priorQuestions.length === 0}
          className="rounded border border-border bg-card px-2 py-1 text-xs text-text-primary disabled:opacity-40 dark:border-border dark:bg-card dark:text-text-primary"
        >
          <option value="">Always show</option>
          {priorQuestions.map((p) => (
            <option key={p.id} value={p.id}>
              {p.question} ({COMPONENT_META[p.component].label})
            </option>
          ))}
        </select>

        {question.showIf &&
          (parentQuestion?.component === "single_select" || parentQuestion?.component === "multi_select") && (
            <>
              <label className="text-xs text-text-muted dark:text-text-muted">
                {parentQuestion.component === "multi_select" ? "includes" : "equals"}
              </label>
              <select
                value={typeof question.showIf.equals === "string" ? question.showIf.equals : ""}
                onChange={(e) => onPatch({ showIf: { questionId: question.showIf!.questionId, equals: e.target.value } })}
                className="rounded border border-border bg-card px-2 py-1 text-xs text-text-primary dark:border-border dark:bg-card dark:text-text-primary"
              >
                {parentQuestion.options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </>
          )}

        {question.showIf && parentQuestion?.component === "rating" && (
          <>
            <label className="text-xs text-text-muted dark:text-text-muted">rated at least</label>
            <input
              type="number"
              min={1}
              max={parentQuestion.scale}
              value={question.showIf.atLeast ?? 1}
              onChange={(e) =>
                onPatch({ showIf: { questionId: question.showIf!.questionId, atLeast: Number(e.target.value) || 1 } })
              }
              className="w-14 rounded border border-border bg-card px-2 py-1 text-xs text-text-primary dark:border-border dark:bg-card dark:text-text-primary"
            />
            <span className="text-xs text-text-muted dark:text-text-muted">/ {parentQuestion.scale}</span>
          </>
        )}
      </div>

      {/* Analytics opt-in */}
      <div className="flex flex-wrap items-center gap-2 pl-8">
        <button
          type="button"
          onClick={() => onPatch({ analyticsEnabled: !question.analyticsEnabled })}
          title={
            "Groups this question's answers with every other question across any assignment/course/resource that uses the same metric key below. A metric key used on only one question just tracks that item on its own — reuse the same key wherever you want combined numbers."
          }
          className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
            question.analyticsEnabled
              ? "bg-accent text-accent-foreground dark:bg-accent dark:text-accent-foreground"
              : "border border-border text-text-muted hover:text-text-primary dark:border-border dark:text-text-muted dark:hover:text-text-primary"
          }`}
        >
          <BarChart3 className="h-3 w-3" />
          Track in analytics
        </button>
        {question.analyticsEnabled && (
          <input
            value={question.metricKey ?? ""}
            onChange={(e) => onPatch({ metricKey: e.target.value })}
            placeholder="metric key, e.g. confidence_rating"
            title="Reuse this exact key on other questions to combine their answers into one rollup — different keys never get grouped together."
            className="rounded border border-border bg-card px-2 py-1 text-[11px] text-text-primary dark:border-border dark:bg-card dark:text-text-primary"
          />
        )}
      </div>
    </div>
  );
}