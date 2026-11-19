// apps/mobile/src/app/(app)/assignments_and_courses/[id].tsx
import * as React from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import {
  defaultAnswersFor,
  getSubmissionRequirement,
  isQuestionVisible,
  maxSubmissionsFor,
  normalizeExternalUrl,
  type ContentDispatch,
  type ContentItemWithMeta,
  type ContentQuestionEntry,
  type ContentSubmission,
  type ContentSubmissionAnswers,
  type CompletionStatus,
} from "@repo/shared";
import { useRole } from "../../../providers/role-provider";
import { useSessionStore } from "../../../store/session-store";
import {
  useContentItem,
  useDispatchRoster,
  useMarkComplete,
  useMyDispatchForItem,
} from "../../../hooks/use-content";
import {
  useReviewSubmission,
  useSubmissions,
  useSubmitWork,
} from "../../../hooks/use-content-submissions";
import { EmptyState } from "../../../components/shared/EmptyState";

const STATUS_META: Record<CompletionStatus, { label: string; className: string; textClassName: string }> = {
  completed: { label: "Completed", className: "bg-primary/10", textClassName: "text-text-accent" },
  approved_awaiting_completion: { label: "Approved", className: "bg-primary/10", textClassName: "text-text-accent" },
  pending_review: { label: "Waiting on review", className: "bg-card-alt", textClassName: "text-text-muted" },
  needs_revision: { label: "Needs revision", className: "bg-destructive/10", textClassName: "text-destructive" },
  not_started: { label: "Not started", className: "bg-card-alt", textClassName: "text-text-muted" },
};

export default function ContentItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { permissionLevel } = useRole();
  const userId = useSessionStore((s) => s.userId);

  const canReview = permissionLevel === "mentor" || permissionLevel === "staff";
  const isMentee = permissionLevel === "mentee";

  const { data: item, isLoading: loadingItem, isError: itemErrored } = useContentItem(id);
  const { data: roster, isLoading: loadingRoster, isError: rosterErrored } = useDispatchRoster(
    canReview ? id : undefined,
    item?.content_type ?? "assignment"
  );
  const { data: myDispatch, isLoading: loadingMyDispatch } = useMyDispatchForItem(id, isMentee ? userId : null);
  const { data: mySubmissions, isLoading: loadingMySubmissions } = useSubmissions(myDispatch?.id);
  const markComplete = useMarkComplete(id, item?.content_type ?? "assignment");

  if (loadingItem) {
    return (
      <View className="flex-1 items-center justify-center bg-surface">
        <ActivityIndicator />
      </View>
    );
  }
  if (itemErrored || !item) {
    return (
      <View className="flex-1 bg-surface p-4">
        <EmptyState title="Couldn't load this item" />
      </View>
    );
  }

  const template = item.submission_template;
  const requirement = getSubmissionRequirement(template.metadata);

  return (
    <>
      <Stack.Screen options={{ title: item.title || "Details" }} />
      <ScrollView className="flex-1 bg-surface" contentContainerClassName="gap-4 p-4 pb-12">
        {/* --- Details --- */}
        <View className="gap-3 rounded-2xl border border-border bg-card p-4">
          <View className="flex-row items-start justify-between gap-3">
            <View className="flex-1 gap-0.5">
              <Text className="text-lg font-medium text-text-primary">{item.title}</Text>
              {item.week && <Text className="text-xs text-text-muted">{item.week.name}</Text>}
            </View>
            <RequirementBadge requirement={requirement} />
          </View>

          {item.description && <Text className="text-sm text-text-primary">{item.description}</Text>}
          {item.instructions && (
            <View className="gap-1 rounded-xl bg-card-alt p-3">
              <Text className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                Instructions for mentees
              </Text>
              <Text className="text-sm text-text-primary">{item.instructions}</Text>
            </View>
          )}

          {item.tags.length > 0 && (
            <View className="flex-row flex-wrap gap-1.5">
              {item.tags.map((tag) => (
                <View key={tag.id} className="rounded-full border border-border px-2 py-0.5">
                  <Text className="text-[11px] text-text-muted">{tag.name}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* --- Type-specific meta --- */}
        <TypeSpecificMeta item={item} />

        {/* --- Resource links --- */}
        {template.resource_links.length > 0 && (
          <View className="gap-2 rounded-2xl border border-border bg-card p-4">
            <Text className="text-sm font-semibold uppercase tracking-wide text-text-muted">External links</Text>
            {template.resource_links.map((link, i) => (
              <Pressable
                key={i}
                onPress={() => Linking.openURL(normalizeExternalUrl(link.link || ""))}
                className="flex-row items-center gap-2 rounded-lg bg-card-alt p-3"
              >
                <View className="flex-1 gap-0.5">
                  <Text className="text-sm font-medium text-text-primary">{link.title || link.link}</Text>
                  {link.description ? <Text className="text-xs text-text-muted">{link.description}</Text> : null}
                </View>
              </Pressable>
            ))}
          </View>
        )}

        {/* --- Mentee: their own submission + history --- */}
        {isMentee && (
          <MySubmissionSection
            item={item}
            requirement={requirement}
            dispatch={myDispatch ?? null}
            submissions={mySubmissions ?? []}
            isLoading={loadingMyDispatch || loadingMySubmissions}
          />
        )}

        {/* --- Roster / per-mentee review (staff/mentor only) --- */}
        {canReview && (
          <View className="gap-3 rounded-2xl border border-border bg-card p-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-semibold uppercase tracking-wide text-text-muted">Roster</Text>
              <Text className="text-xs text-text-muted">{roster?.length ?? 0} mentees</Text>
            </View>

            {loadingRoster ? (
              <Text className="text-xs text-text-muted">Loading roster…</Text>
            ) : rosterErrored ? (
              <Text className="text-xs text-destructive">Couldn't load the roster. Try refreshing.</Text>
            ) : !roster || roster.length === 0 ? (
              <EmptyState title="No mentees assigned yet" description="Edit this item to assign it to mentees." />
            ) : (
              roster.map((row) => (
                <RosterRow
                  key={row.id}
                  row={row}
                  requirement={requirement}
                  currentUserId={userId ?? ""}
                  contentItemTitle={item.title}
                  onToggleComplete={(complete) =>
                    markComplete.mutate({
                      dispatchId: row.id,
                      complete,
                      actorId: userId ?? "",
                      menteeId: row.mentee_id,
                      contentItemTitle: item.title,
                    })
                  }
                />
              ))
            )}
          </View>
        )}
      </ScrollView>
    </>
  );
}

function RequirementBadge({ requirement }: { requirement: "required" | "optional" | "disabled" }) {
  const label = requirement === "required" ? "Required" : requirement === "optional" ? "Optional" : "No submission";
  return (
    <View className="shrink-0 rounded-full border border-border px-2.5 py-1">
      <Text className="text-[11px] font-medium text-text-muted">{label}</Text>
    </View>
  );
}

function TypeSpecificMeta({ item }: { item: ContentItemWithMeta }) {
  const template = item.submission_template;
  if (item.content_type === "assignment") {
    return (
      <View className="gap-2 rounded-2xl border border-border bg-card p-4">
        <Text className="text-sm font-semibold uppercase tracking-wide text-text-muted">Assignment settings</Text>
        <Text className="text-sm text-text-primary">
          Max revisions: {template.type_specific.assignment.submission_links.max_revisions}
        </Text>
      </View>
    );
  }
  if (item.content_type === "course") {
    return (
      <View className="gap-2 rounded-2xl border border-border bg-card p-4">
        <Text className="text-sm font-semibold uppercase tracking-wide text-text-muted">Course settings</Text>
        <Text className="text-sm text-text-primary">
          Total modules: {template.type_specific.course.modules_total ?? "Not set"}
        </Text>
      </View>
    );
  }
  return null;
}

// ---------------------------------------------------------------------------
// Mentee-facing submission section (port of MySubmissionSection)
// ---------------------------------------------------------------------------

function MySubmissionSection({
  item,
  requirement,
  dispatch,
  submissions,
  isLoading,
}: {
  item: ContentItemWithMeta;
  requirement: "required" | "optional" | "disabled";
  dispatch: ContentDispatch | null;
  submissions: ContentSubmission[];
  isLoading: boolean;
}) {
  if (requirement === "disabled") return null;

  if (isLoading) {
    return (
      <View className="rounded-2xl border border-border bg-card p-4">
        <Text className="text-xs text-text-muted">Loading your submission…</Text>
      </View>
    );
  }

  if (!dispatch) {
    return (
      <View className="rounded-2xl border border-border bg-card p-4">
        <Text className="text-xs text-text-muted">This item hasn't been assigned to you yet.</Text>
      </View>
    );
  }

  const latest = submissions[0] ?? null;
  const maxRevisions = maxSubmissionsFor(item);
  const revisionLimitReached = maxRevisions !== null && submissions.length >= maxRevisions;
  const isPendingReview = latest?.status === "pending_review";
  const isMarkedComplete = !!dispatch.completed_at;
  const canSubmit = !isMarkedComplete && !revisionLimitReached;

  return (
    <View className="gap-4 rounded-2xl border border-border bg-card p-4">
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-semibold uppercase tracking-wide text-text-muted">Your submission</Text>
        {isMarkedComplete && (
          <View className="rounded-full bg-primary/10 px-2 py-0.5">
            <Text className="text-[11px] font-medium text-text-accent">Marked complete</Text>
          </View>
        )}
      </View>

      {latest && (
        <View className="gap-2 rounded-xl bg-card-alt p-3">
          <View className="flex-row items-center justify-between">
            <Text className="text-xs font-semibold text-text-primary">
              Version {latest.version_number} — {latest.status.replace("_", " ")}
            </Text>
            <Text className="text-[11px] text-text-muted">{new Date(latest.submitted_at).toLocaleString()}</Text>
          </View>
          {latest.feedback && <Text className="text-xs text-text-primary">Feedback: "{latest.feedback}"</Text>}
        </View>
      )}

      {isMarkedComplete ? (
        <Text className="text-xs text-text-muted">
          This item has been marked complete — you can't submit a new version.
        </Text>
      ) : (
        <>
          {revisionLimitReached && (
            <Text className="text-xs text-text-muted">
              You've used all {maxRevisions} allowed submissions for this assignment.
            </Text>
          )}
          {isPendingReview && (
            <Text className="text-xs text-text-muted">
              Your latest submission is waiting on review — you can still submit a new version below.
            </Text>
          )}
        </>
      )}

      {canSubmit && (
        <MenteeSubmissionForm
          item={item}
          dispatch={dispatch}
          priorVersionCount={submissions.length}
          latestAnswers={latest?.answers ?? null}
        />
      )}
    </View>
  );
}

function MenteeSubmissionForm({
  item,
  dispatch,
  priorVersionCount,
  latestAnswers,
}: {
  item: ContentItemWithMeta;
  dispatch: ContentDispatch;
  priorVersionCount: number;
  latestAnswers: ContentSubmissionAnswers | null;
}) {
  const menteeFullName = useSessionStore((s) => s.fullName);
  const [answers, setAnswers] = React.useState<ContentSubmissionAnswers>(
    () => latestAnswers ?? defaultAnswersFor(item.content_type)
  );
  const submitWork = useSubmitWork();

  // TODO(port): recipients should be pod mentors from getMentorIdsForMentee
  // plus item.created_by, matching web. Needs a mobile pods wrapper first.
  const submitMutation = submitWork;

  function patchAdditional(questionId: string, value: string | string[] | number) {
    setAnswers((prev) => ({
      ...prev,
      additional_questions: { ...prev.additional_questions, [questionId]: value },
    }));
  }

  function patchAssignment(patch: Partial<{ submission_link: string; difficulty_level: number | null }>) {
    setAnswers((prev) => ({
      ...prev,
      type_specific: {
        ...prev.type_specific,
        assignment: {
          submission_link: prev.type_specific?.assignment?.submission_link ?? "",
          difficulty_level: prev.type_specific?.assignment?.difficulty_level ?? null,
          ...patch,
        },
      },
    }));
  }

  function patchCourse(patch: Partial<{ modules_completed: number | null; difficulty_level: number | null }>) {
    setAnswers((prev) => ({
      ...prev,
      type_specific: {
        ...prev.type_specific,
        course: {
          modules_completed: prev.type_specific?.course?.modules_completed ?? null,
          difficulty_level: prev.type_specific?.course?.difficulty_level ?? null,
          ...patch,
        },
      },
    }));
  }

  const canSubmitForm =
    item.content_type !== "assignment" || (answers.type_specific?.assignment?.submission_link ?? "").trim() !== "";

  return (
    <View className="gap-4 border-t border-border pt-4">
      {item.content_type === "assignment" && (
        <View className="gap-3">
          <View className="gap-1.5">
            <Text className="text-xs font-medium text-text-muted">Submission link</Text>
            <TextInput
              value={answers.type_specific?.assignment?.submission_link ?? ""}
              onChangeText={(v) => patchAssignment({ submission_link: v })}
              placeholder="https://..."
              autoCapitalize="none"
              keyboardType="url"
              className="rounded-lg border border-border bg-card-alt px-3 py-2 text-sm text-text-primary"
            />
          </View>
          <RatingInput
            label="How difficult was this?"
            scale={5}
            value={answers.type_specific?.assignment?.difficulty_level ?? null}
            onChange={(v) => patchAssignment({ difficulty_level: v })}
          />
        </View>
      )}

      {item.content_type === "course" && (
        <View className="gap-3">
          <View className="gap-1.5">
            <Text className="text-xs font-medium text-text-muted">Modules completed</Text>
            <TextInput
              value={String(answers.type_specific?.course?.modules_completed ?? "")}
              onChangeText={(v) => patchCourse({ modules_completed: v === "" ? null : Number(v) })}
              keyboardType="number-pad"
              className="w-24 rounded-lg border border-border bg-card-alt px-3 py-2 text-sm text-text-primary"
            />
          </View>
          <RatingInput
            label="How difficult is this course?"
            scale={5}
            value={answers.type_specific?.course?.difficulty_level ?? null}
            onChange={(v) => patchCourse({ difficulty_level: v })}
          />
        </View>
      )}

      {item.submission_template.additional_questions
        .filter((q) => isQuestionVisible(q, answers.additional_questions))
        .map((question) => (
          <AdditionalQuestionInput
            key={question.id}
            question={question}
            value={answers.additional_questions[question.id]}
            onChange={(v) => patchAdditional(question.id, v)}
          />
        ))}

      {submitMutation.isError && (
        <Text className="text-xs text-destructive">Something went wrong submitting. Please try again.</Text>
      )}

      <Pressable
        disabled={!canSubmitForm || submitMutation.isPending}
        onPress={() =>
          submitMutation.mutate({
            dispatchId: dispatch.id,
            contentItemId: item.id,
            answers,
            priorVersionCount,
            questionDefs: item.submission_template.additional_questions,
            recipientMentorIds: [item.created_by],
            menteeName: menteeFullName || "A mentee",
            contentItemTitle: item.title,
          })
        }
        className={`w-fit rounded-full bg-primary px-4 py-2 ${!canSubmitForm || submitMutation.isPending ? "opacity-50" : ""}`}
      >
        <Text className="text-xs font-medium text-primary-foreground">
          {submitMutation.isPending ? "Submitting…" : "Submit"}
        </Text>
      </Pressable>
    </View>
  );
}

function RatingInput({
  label,
  scale,
  value,
  onChange,
}: {
  label: string;
  scale: number;
  value: number | null;
  onChange: (value: number) => void;
}) {
  return (
    <View className="gap-1.5">
      <Text className="text-xs font-medium text-text-muted">{label}</Text>
      <View className="flex-row gap-1">
        {Array.from({ length: scale }, (_, i) => i + 1).map((n) => {
          const active = value === n;
          return (
            <Pressable
              key={n}
              onPress={() => onChange(n)}
              accessibilityState={{ selected: active }}
              className={`h-7 w-7 items-center justify-center rounded-full border ${
                active ? "border-primary bg-primary" : "border-border"
              }`}
            >
              <Text className={`text-xs font-medium ${active ? "text-primary-foreground" : "text-text-muted"}`}>{n}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function AdditionalQuestionInput({
  question,
  value,
  onChange,
}: {
  question: ContentQuestionEntry;
  value: string | string[] | number | undefined;
  onChange: (value: string | string[] | number) => void;
}) {
  if (question.component === "short_answer") {
    return (
      <View className="gap-1.5">
        <Text className="text-xs font-medium text-text-muted">{question.question}</Text>
        <TextInput
          value={typeof value === "string" ? value : ""}
          onChangeText={onChange}
          multiline
          textAlignVertical="top"
          className="min-h-16 rounded-lg border border-border bg-card-alt px-3 py-2 text-sm text-text-primary"
        />
      </View>
    );
  }

  if (question.component === "rating") {
    return (
      <RatingInput
        label={question.question}
        scale={question.scale}
        value={typeof value === "number" ? value : null}
        onChange={onChange}
      />
    );
  }

  if (question.component === "single_select") {
    return (
      <View className="gap-1.5">
        <Text className="text-xs font-medium text-text-muted">{question.question}</Text>
        <View className="flex-row flex-wrap gap-1.5">
          {question.options.map((option) => {
            const active = value === option;
            return (
              <Pressable
                key={option}
                onPress={() => onChange(option)}
                className={`rounded-full border px-3 py-1 ${active ? "border-primary bg-primary" : "border-border"}`}
              >
                <Text className={`text-xs font-medium ${active ? "text-primary-foreground" : "text-text-muted"}`}>
                  {option}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  }

  // multi_select
  const selected = Array.isArray(value) ? value : [];
  return (
    <View className="gap-1.5">
      <Text className="text-xs font-medium text-text-muted">{question.question}</Text>
      <View className="flex-row flex-wrap gap-1.5">
        {question.options.map((option) => {
          const active = selected.includes(option);
          return (
            <Pressable
              key={option}
              onPress={() => onChange(active ? selected.filter((o) => o !== option) : [...selected, option])}
              className={`rounded-full border px-3 py-1 ${active ? "border-primary bg-primary" : "border-border"}`}
            >
              <Text className={`text-xs font-medium ${active ? "text-primary-foreground" : "text-text-muted"}`}>
                {option}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Staff/mentor roster row (port of RosterRow + SubmissionReviewPanel)
// ---------------------------------------------------------------------------

function RosterRow({
  row,
  requirement,
  currentUserId,
  contentItemTitle,
  onToggleComplete,
}: {
  row: {
    id: string;
    mentee_id: string;
    mentee_name: string;
    due_at: string | null;
    completed_at: string | null;
    completion_status: CompletionStatus;
  };
  requirement: "required" | "optional" | "disabled";
  currentUserId: string;
  contentItemTitle: string;
  onToggleComplete: (complete: boolean) => void;
}) {
  const [expanded, setExpanded] = React.useState(false);
  const status = STATUS_META[row.completion_status];
  const isComplete = !!row.completed_at;
  const canExpandReview = requirement !== "disabled";

  return (
    <View className="gap-2 rounded-xl bg-card-alt p-3">
      <Pressable
        onPress={() => canExpandReview && setExpanded((e) => !e)}
        className="flex-row items-center justify-between gap-2"
      >
        <View className="flex-1 gap-0.5">
          <Text className="text-sm font-medium text-text-primary">{row.mentee_name}</Text>
          {row.due_at && (
            <Text className="text-xs text-text-muted">Due {new Date(row.due_at).toLocaleDateString()}</Text>
          )}
        </View>
        <View className={`rounded-full px-2 py-0.5 ${status.className}`}>
          <Text className={`text-[11px] font-medium ${status.textClassName}`}>{status.label}</Text>
        </View>
      </Pressable>

      {expanded && (
        <View className="gap-3 border-t border-border pt-3">
          {canExpandReview && (
            <SubmissionReviewPanel
              dispatchId={row.id}
              menteeId={row.mentee_id}
              contentItemTitle={contentItemTitle}
              currentUserId={currentUserId}
            />
          )}
          <Pressable
            onPress={() => onToggleComplete(!isComplete)}
            className={`self-end rounded-lg px-2.5 py-1.5 ${isComplete ? "border border-border" : "bg-primary"}`}
          >
            <Text className={`text-xs font-medium ${isComplete ? "text-text-muted" : "text-primary-foreground"}`}>
              {isComplete ? "Unmark complete" : "Mark complete"}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function SubmissionReviewPanel({
  dispatchId,
  menteeId,
  contentItemTitle,
  currentUserId,
}: {
  dispatchId: string;
  menteeId: string;
  contentItemTitle: string;
  currentUserId: string;
}) {
  const { data: submissions, isLoading } = useSubmissions(dispatchId);
  const review = useReviewSubmission();
  const [feedback, setFeedback] = React.useState("");

  if (isLoading) return <Text className="text-xs text-text-muted">Loading submissions…</Text>;
  const latest = submissions?.[0] ?? null;
  if (!latest) return <Text className="text-xs text-text-muted">No submission yet.</Text>;
  const older = submissions?.slice(1) ?? [];

  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between">
        <Text className="text-xs font-semibold text-text-primary">Version {latest.version_number} (latest)</Text>
        <Text className="text-[11px] text-text-muted">{new Date(latest.submitted_at).toLocaleString()}</Text>
      </View>

      <SubmissionAnswersReadout submission={latest} />

      {latest.status === "pending_review" ? (
        <View className="gap-2">
          <TextInput
            value={feedback}
            onChangeText={setFeedback}
            placeholder="Feedback (optional)"
            multiline
            textAlignVertical="top"
            className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs text-text-primary"
          />
          <View className="flex-row gap-2">
            <Pressable
              disabled={review.isPending}
              onPress={() =>
                review.mutate({
                  submissionId: latest.id,
                  status: "approved",
                  reviewedBy: currentUserId,
                  feedback: feedback || null,
                  contentDispatchId: dispatchId,
                  menteeId,
                  contentItemTitle,
                })
              }
              className={`rounded-full bg-primary px-3 py-1.5 ${review.isPending ? "opacity-50" : ""}`}
            >
              <Text className="text-xs font-medium text-primary-foreground">Approve</Text>
            </Pressable>
            <Pressable
              disabled={review.isPending}
              onPress={() =>
                review.mutate({
                  submissionId: latest.id,
                  status: "revision_requested",
                  reviewedBy: currentUserId,
                  feedback: feedback || null,
                  contentDispatchId: dispatchId,
                  menteeId,
                  contentItemTitle,
                })
              }
              className={`rounded-full border border-border px-3 py-1.5 ${review.isPending ? "opacity-50" : ""}`}
            >
              <Text className="text-xs font-medium text-text-primary">Request revision</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Text className="text-xs text-text-muted">
          Already {latest.status === "approved" ? "approved" : "sent back for revision"}
          {latest.feedback ? ` — "${latest.feedback}"` : ""}.
        </Text>
      )}

      {older.length > 0 && (
        <View className="gap-2 border-t border-border pt-3">
          <Text className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">
            Previous versions ({older.length})
          </Text>
          {older.map((s) => (
            <View key={s.id} className="gap-2 rounded-lg bg-card-alt p-2.5">
              <View className="flex-row items-center justify-between">
                <Text className="text-xs font-semibold text-text-primary">
                  Version {s.version_number} — {s.status.replace("_", " ")}
                </Text>
                <Text className="text-[11px] text-text-muted">{new Date(s.submitted_at).toLocaleString()}</Text>
              </View>
              <SubmissionAnswersReadout submission={s} />
              {s.feedback && <Text className="text-xs text-text-primary">Feedback: "{s.feedback}"</Text>}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function SubmissionAnswersReadout({ submission }: { submission: ContentSubmission }) {
  const answers = submission.answers;
  return (
    <View className="gap-1.5">
      {answers.type_specific?.assignment && (
        <>
          <Pressable onPress={() => Linking.openURL(normalizeExternalUrl(answers.type_specific!.assignment!.submission_link))}>
            <Text className="text-xs text-text-accent underline">
              Submission link: {answers.type_specific.assignment.submission_link}
            </Text>
          </Pressable>
          {answers.type_specific.assignment.difficulty_level !== null && (
            <Text className="text-xs text-text-primary">Difficulty: {answers.type_specific.assignment.difficulty_level}</Text>
          )}
        </>
      )}
      {answers.type_specific?.course && (
        <>
          <Text className="text-xs text-text-primary">
            Modules completed: {answers.type_specific.course.modules_completed ?? "—"}
          </Text>
          {answers.type_specific.course.difficulty_level !== null && (
            <Text className="text-xs text-text-primary">Difficulty: {answers.type_specific.course.difficulty_level}</Text>
          )}
        </>
      )}
      {Object.entries(answers.additional_questions).map(([questionId, value]) => (
        <Text key={questionId} className="text-xs text-text-muted">
          {questionId}: {Array.isArray(value) ? value.join(", ") : String(value)}
        </Text>
      ))}
    </View>
  );
}