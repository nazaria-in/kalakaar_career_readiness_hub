// /components/content/ContentSubmissionTemplateEditor.tsx
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
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
} from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
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

// Re-exported so existing imports keep working during the migration.
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

const COMPONENT_META: Record<ContentQuestionComponent, { label: string; icon: LucideIcon }> = {
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

const inputClass =
  "rounded border border-border bg-card px-2 py-1.5 text-xs text-text-primary placeholder:text-text-muted    ";

const numberInputClass =
  "rounded-lg border border-border bg-card-alt px-3 py-1.5 text-sm text-text-primary   ";

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
    <View className="gap-6">
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
    </View>
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
  const hint = REQUIREMENT_OPTIONS.find((o) => o.value === requirement)?.hint;

  return (
    <View className="gap-2 rounded-2xl border border-border bg-card p-4  ">
      <Text className="text-sm font-semibold uppercase tracking-wide text-text-muted ">
        Submission
      </Text>
      <View className="flex-row flex-wrap gap-1 self-start rounded-full border border-border bg-card-alt p-1  ">
        {REQUIREMENT_OPTIONS.map((option) => {
          const isActive = requirement === option.value;
          return (
            <Pressable
              key={option.value}
              onPress={() => onRequirementChange(option.value)}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              accessibilityHint={option.hint}
              className={`rounded-full px-3 py-1.5 active:opacity-70 ${
                isActive ? "bg-primary " : ""
              }`}
            >
              <Text
                className={`text-xs font-medium ${
                  isActive
                    ? "text-primary-foreground "
                    : "text-text-muted "
                }`}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View className="flex-row items-center gap-1">
        <Info size={14} className="text-text-muted " />
        <Text className="text-xs text-text-muted ">{hint}</Text>
      </View>
    </View>
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
    <View className="gap-4 rounded-2xl border border-border bg-card p-4  ">
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-semibold uppercase tracking-wide text-text-muted ">
          External links
        </Text>
        <Pressable
          onPress={() => onChange([...links, emptyLink()])}
          accessibilityRole="button"
          className="flex-row items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 active:opacity-70 "
        >
          <Plus size={14} className="text-text-primary " />
          <Text className="text-xs font-medium text-text-primary ">Add link</Text>
        </Pressable>
      </View>

      {links.length === 0 && (
        <Text className="text-xs text-text-muted ">No external links attached yet.</Text>
      )}

      <View className="gap-3">
        {links.map((link, index) => (
          <View
            key={index}
            className="gap-2 rounded-xl border border-border bg-card-alt p-3  "
          >
            <View className="flex-row items-center gap-2">
              <Link2 size={16} className="text-text-muted " />
              <TextInput
                value={link.link}
                onChangeText={(text) => patchLink(index, { link: text })}
                placeholder="https://..."
                autoCapitalize="none"
                keyboardType="url"
                className={`${inputClass} flex-1`}
              />
              <Pressable
                onPress={() => removeLink(index)}
                accessibilityRole="button"
                accessibilityLabel="Remove link"
                className="rounded p-1 active:opacity-60"
              >
                <Trash2 size={14} className="text-text-muted " />
              </Pressable>
            </View>
            <TextInput
              value={link.title}
              onChangeText={(text) => patchLink(index, { title: text })}
              placeholder="Link title"
              className={inputClass}
            />
            <TextInput
              value={link.description}
              onChangeText={(text) => patchLink(index, { description: text })}
              placeholder="Short description (optional)"
              className={inputClass}
            />
          </View>
        ))}
      </View>
    </View>
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
    <View className="gap-4 rounded-2xl border border-border bg-card p-4  ">
      <Text className="text-sm font-semibold uppercase tracking-wide text-text-muted ">
        {contentType === "assignment" ? "Assignment settings" : "Course settings"}
      </Text>

      {contentType === "assignment" && (
        <View className="gap-4">
          <View className="gap-1.5">
            <Text className="text-xs font-medium text-text-muted ">Max revisions allowed</Text>
            <TextInput
              keyboardType="number-pad"
              value={String(typeSpecific.assignment.submission_links.max_revisions)}
              onChangeText={(text) =>
                onPatchAssignment({
                  submission_links: {
                    ...typeSpecific.assignment.submission_links,
                    max_revisions: Number(text) || 0,
                  },
                })
              }
              className={`w-24 ${numberInputClass}`}
            />
          </View>
          <ReadOnlyNote label="Difficulty level" note="Set by the mentee after they submit an attempt." />
        </View>
      )}

      {contentType === "course" && (
        <View className="gap-4">
          <View className="gap-1.5">
            <Text className="text-xs font-medium text-text-muted ">Total modules</Text>
            <TextInput
              keyboardType="number-pad"
              value={String(typeSpecific.course.modules_total ?? "")}
              onChangeText={(text) =>
                onPatchCourse({ modules_total: text === "" ? null : Number(text) })
              }
              className={`w-24 ${numberInputClass}`}
            />
          </View>
          <ReadOnlyNote label="Modules completed" note="Filled in by the mentee as they progress." />
          <ReadOnlyNote label="Difficulty level" note="Set by the mentee once they start the course." />
        </View>
      )}
    </View>
  );
}

function ReadOnlyNote({ label, note }: { label: string; note: string }) {
  return (
    <View className="flex-row items-center justify-between gap-2 rounded-lg border border-dashed border-border bg-card-alt px-3 py-2  ">
      <Text className="text-xs font-medium text-text-muted ">{label}</Text>
      <View className="flex-1 flex-row items-center justify-end gap-1">
        <Info size={14} className="text-text-muted " />
        <Text className="text-xs text-text-muted ">{note}</Text>
      </View>
    </View>
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
    <View className="gap-4 rounded-2xl border border-border bg-card p-4  ">
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-semibold uppercase tracking-wide text-text-muted ">
          Additional questions
        </Text>
        <Text className="text-xs text-text-muted ">
          {questions.length} question{questions.length === 1 ? "" : "s"}
        </Text>
      </View>

      <View className="gap-3">
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
          <Text className="text-xs text-text-muted ">
            No additional questions yet. Add one below.
          </Text>
        )}
      </View>

      <View className="flex-row flex-wrap gap-2">
        {(Object.keys(COMPONENT_META) as ContentQuestionComponent[]).map((component) => {
          const meta = COMPONENT_META[component];
          const Icon = meta.icon;
          return (
            <Pressable
              key={component}
              onPress={() => addQuestion(component)}
              accessibilityRole="button"
              accessibilityLabel={`Add ${meta.label} question`}
              className="w-[48%] items-center gap-1.5 rounded-xl border border-dashed border-border bg-card-alt px-3 py-3 active:opacity-70  "
            >
              <Icon size={16} className="text-text-accent " />
              <Text className="text-center text-[11px] font-medium leading-tight text-text-primary ">
                {meta.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
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
  const showIf = question.showIf;
  const parentQuestion = showIf
    ? priorQuestions.find((p) => p.id === showIf.questionId)
    : undefined;
  const parentChoice =
    parentQuestion &&
    (parentQuestion.component === "single_select" || parentQuestion.component === "multi_select")
      ? parentQuestion
      : undefined;

  function updateOptions(options: string[]) {
    if (question.component === "single_select" || question.component === "multi_select") {
      onPatch({ options } as Partial<ContentQuestionEntry>);
    }
  }

  function handleParentSelect(parentId: string | null) {
    if (!parentId) {
      onPatch({ showIf: undefined });
      return;
    }
    const parent = priorQuestions.find((p) => p.id === parentId);
    if (parent?.component === "rating") {
      onPatch({ showIf: { questionId: parentId, atLeast: Math.ceil(parent.scale / 2) } });
    } else if (parent?.component === "single_select" || parent?.component === "multi_select") {
      onPatch({ showIf: { questionId: parentId, equals: parent.options[0] } });
    } else {
      onPatch({ showIf: { questionId: parentId } });
    }
  }

  return (
    <View className="gap-3 rounded-xl border border-border bg-card-alt p-3  ">
      <View className="flex-row items-start gap-2">
        <View className="mt-1.5 h-6 w-6 shrink-0 items-center justify-center rounded-full bg-card ">
          <Text className="text-[10px] font-semibold text-text-muted ">{index + 1}</Text>
        </View>

        <View className="flex-1 gap-2">
          <View className="flex-row items-center gap-2">
            <Icon size={14} className="text-text-accent " />
            <TextInput
              value={question.question}
              onChangeText={(text) => onPatch({ question: text })}
              className={`flex-1 ${inputClass}`}
            />
          </View>
          <View className="w-fit self-start rounded-full bg-card px-2 py-0.5 ">
            <Text className="text-[10px] font-medium text-text-muted ">{meta.label}</Text>
          </View>
        </View>

        <View className="shrink-0 flex-row items-center gap-0.5">
          <Pressable
            onPress={onMoveUp}
            disabled={isFirst}
            accessibilityRole="button"
            accessibilityLabel="Move question up"
            accessibilityState={{ disabled: isFirst }}
            className={`rounded p-1 active:opacity-60 ${isFirst ? "opacity-30" : ""}`}
          >
            <ChevronUp size={14} className="text-text-muted " />
          </Pressable>
          <Pressable
            onPress={onMoveDown}
            disabled={isLast}
            accessibilityRole="button"
            accessibilityLabel="Move question down"
            accessibilityState={{ disabled: isLast }}
            className={`rounded p-1 active:opacity-60 ${isLast ? "opacity-30" : ""}`}
          >
            <ChevronDown size={14} className="text-text-muted " />
          </Pressable>
          <Pressable
            onPress={onRemove}
            accessibilityRole="button"
            accessibilityLabel="Remove question"
            className="rounded p-1 active:opacity-60"
          >
            <Trash2 size={14} className="text-text-muted " />
          </Pressable>
        </View>
      </View>

      {(question.component === "single_select" || question.component === "multi_select") && (
        <View className="gap-1.5 pl-8">
          {question.options.map((option, i) => (
            <View key={i} className="flex-row items-center gap-2">
              <TextInput
                value={option}
                onChangeText={(text) => {
                  const next = [...question.options];
                  next[i] = text;
                  updateOptions(next);
                }}
                className={`flex-1 ${inputClass}`}
              />
              <Pressable
                onPress={() => updateOptions(question.options.filter((_, oi) => oi !== i))}
                disabled={question.options.length <= 1}
                accessibilityRole="button"
                accessibilityLabel="Remove option"
                accessibilityState={{ disabled: question.options.length <= 1 }}
                className={`rounded p-1 active:opacity-60 ${question.options.length <= 1 ? "opacity-30" : ""}`}
              >
                <Trash2 size={12} className="text-text-muted " />
              </Pressable>
            </View>
          ))}
          <Pressable
            onPress={() => updateOptions([...question.options, `Option ${question.options.length + 1}`])}
            accessibilityRole="button"
            className="flex-row items-center gap-1 self-start active:opacity-70"
          >
            <Plus size={12} className="text-text-accent " />
            <Text className="text-xs font-medium text-text-accent ">Add option</Text>
          </Pressable>
        </View>
      )}

      {question.component === "rating" && (
        <View className="flex-row items-center gap-2 pl-8">
          <Text className="text-xs text-text-muted ">Scale (out of):</Text>
          <TextInput
            keyboardType="number-pad"
            value={String(question.scale)}
            onChangeText={(text) => onPatch({ scale: Number(text) || 5 } as Partial<ContentQuestionEntry>)}
            className="w-16 rounded border border-border bg-card px-2 py-1 text-xs text-text-primary   "
          />
        </View>
      )}

      {/* Conditional visibility */}
      <View className="gap-2 border-t border-border pt-2 pl-8 ">
        <Text className="text-xs text-text-muted ">Only show this if:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
          <Chip label="Always show" active={!showIf} onPress={() => handleParentSelect(null)} />
          {priorQuestions.map((p) => (
            <Chip
              key={p.id}
              label={`${p.question} (${COMPONENT_META[p.component].label})`}
              active={showIf?.questionId === p.id}
              onPress={() => handleParentSelect(p.id)}
            />
          ))}
        </ScrollView>

        {showIf && parentChoice && (
          <View className="gap-2">
            <Text className="text-xs text-text-muted ">
              {parentChoice.component === "multi_select" ? "includes" : "equals"}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
              {parentChoice.options.map((option) => (
                <Chip
                  key={option}
                  label={option}
                  active={typeof showIf.equals === "string" && showIf.equals === option}
                  onPress={() => onPatch({ showIf: { questionId: showIf.questionId, equals: option } })}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {showIf && parentQuestion?.component === "rating" && (
          <View className="flex-row items-center gap-2">
            <Text className="text-xs text-text-muted ">rated at least</Text>
            <TextInput
              keyboardType="number-pad"
              value={String(showIf.atLeast ?? 1)}
              onChangeText={(text) =>
                onPatch({ showIf: { questionId: showIf.questionId, atLeast: Number(text) || 1 } })
              }
              className="w-14 rounded border border-border bg-card px-2 py-1 text-xs text-text-primary   "
            />
            <Text className="text-xs text-text-muted ">/ {parentQuestion.scale}</Text>
          </View>
        )}
      </View>

      {/* Analytics opt-in */}
      <View className="gap-2 pl-8">
        <Pressable
          onPress={() => onPatch({ analyticsEnabled: !question.analyticsEnabled })}
          accessibilityRole="switch"
          accessibilityState={{ checked: !!question.analyticsEnabled }}
          accessibilityHint="Groups this question's answers with every other question using the same metric key. A key used on only one question tracks that item on its own."
          className={`flex-row items-center gap-1.5 self-start rounded-full px-2.5 py-1 active:opacity-70 ${
            question.analyticsEnabled
              ? "bg-accent "
              : "border border-border "
          }`}
        >
          <BarChart3
            size={12}
            className={
              question.analyticsEnabled
                ? "text-accent-foreground "
                : "text-text-muted "
            }
          />
          <Text
            className={`text-[11px] font-medium ${
              question.analyticsEnabled
                ? "text-accent-foreground "
                : "text-text-muted "
            }`}
          >
            Track in analytics
          </Text>
        </Pressable>
        {question.analyticsEnabled && (
          <TextInput
            value={question.metricKey ?? ""}
            onChangeText={(text) => onPatch({ metricKey: text })}
            placeholder="metric key, e.g. confidence_rating"
            autoCapitalize="none"
            className="rounded border border-border bg-card px-2 py-1 text-[11px] text-text-primary placeholder:text-text-muted    "
          />
        )}
      </View>
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      className={`rounded-full px-2.5 py-1 active:opacity-70 ${
        active ? "bg-primary " : "border border-border bg-card  "
      }`}
    >
      <Text
        numberOfLines={1}
        className={`text-xs ${
          active
            ? "text-primary-foreground "
            : "text-text-muted "
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}