// /components/content/ContentItemFormModal.tsx
import * as React from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, ClipboardList, FileBox, Plus, X } from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import {
    defaultTemplateFor,
    FilterFieldDef,
    normalizePortionCluster,
  type ContentItemWithMeta,
  type ContentSubmissionTemplate,
  type ContentType,
  type Week,
  type Tag,
} from "@repo/shared";
import { useRole } from "@/providers/role-provider";
import { Modal } from "@/components/shared/Modal";
import { PeopleGrid } from "@/components/shared/PeopleGrid";
import { fetchCohortOptions } from "@/lib/api/admin-users";

import { peoplePickerApi } from "@/lib/api/people-picker";
import { ContentSubmissionTemplateEditor } from "@/components/content/ContentSubmissionTemplateEditor";
import { createContentItem, updateContentItem, createTag, createWeek, deleteTag, fetchContentItem, fetchPortionClusters, fetchTags, fetchWeeks } from "@/lib/api/content-items";
import { dispatchContentItem, fetchAssignedMenteeRefs, removeContentDispatch } from "@/lib/api/content-dispatches";

function buildPickerFieldDefs(
  isStaff: boolean,
  cohortOptions: { value: string; label: string }[]
): FilterFieldDef[] {
  const base: FilterFieldDef[] = [
    { key: "search", kind: "text", columns: ["full_name"], searchable: true },
  ];
  if (!isStaff) return base;
  return [
    ...base,
    { key: "cohort", kind: "entity", label: "Cohort", column: "cohort_id", options: cohortOptions },
  ];
}

const TYPE_OPTIONS: { value: ContentType; label: string; icon: LucideIcon }[] = [
  { value: "assignment", label: "Assignment", icon: ClipboardList },
  { value: "course", label: "Course", icon: BookOpen },
  { value: "resource", label: "Resource", icon: FileBox },
];

export interface ContentItemFormModalProps {
  open: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  /**
   * In create mode this is just the initial selection. The type selector can
   * change it before the first save. In edit mode it's authoritative and
   * immutable: content_type is never sent in updateContentItem.
   */
  contentType: ContentType;
  contentItemId?: string;
  currentUserId: string;
  scopeToMentorId?: string;
  onSaved: () => void;
}

type Step = "details" | "roster";

/** yyyy-mm-dd from an ISO timestamp or null. */
function toDateInputValue(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

function isValidDateString(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(value).getTime());
}

export function ContentItemFormModal({
  open,
  onClose,
  mode,
  contentType: initialContentType,
  contentItemId,
  currentUserId,
  scopeToMentorId,
  onSaved,
}: ContentItemFormModalProps) {
  const queryClient = useQueryClient();

  const [step, setStep] = React.useState<Step>("details");
  const [contentType, setContentType] = React.useState<ContentType>(initialContentType);
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [instructions, setInstructions] = React.useState("");
  const [weekId, setWeekId] = React.useState<string | null>(null);
  const [portionCluster, setPortionCluster] = React.useState("");
  const [tagIds, setTagIds] = React.useState<string[]>([]);
  const [template, setTemplate] = React.useState<ContentSubmissionTemplate>(
    defaultTemplateFor(initialContentType)
  );
  // Plain date strings (YYYY-MM-DD), converted to ISO only at save time.
  const [submissionStartsAt, setSubmissionStartsAt] = React.useState("");
  const [submissionEndsAt, setSubmissionEndsAt] = React.useState("");
  const [workingItem, setWorkingItem] = React.useState<ContentItemWithMeta | null>(null);
  const [selectedMenteeIds, setSelectedMenteeIds] = React.useState<string[]>([]);
  const [dueAt, setDueAt] = React.useState("");
  const [locallyRemovedIds, setLocallyRemovedIds] = React.useState<Set<string>>(new Set());

  // Hydration bookkeeping, held in state so it can be compared during render.
  const [hydratedItemId, setHydratedItemId] = React.useState<string | null>(null);
  const [rosterHydrated, setRosterHydrated] = React.useState(false);

  // Only used to decide whether a type switch needs confirmation before it
  // resets the template. Not rendered, so a ref is correct here.
  const hasEditedTemplate = React.useRef(false);

  const { permissionLevel } = useRole();
  const isStaffScoped = permissionLevel === "staff";

  const { data: cohortOptions } = useQuery({
    queryKey: ["cohort-options"],
    queryFn: fetchCohortOptions,
    enabled: open && isStaffScoped,
  });
  const pickerFieldDefs = buildPickerFieldDefs(isStaffScoped, cohortOptions ?? []);

  const { data: weeks } = useQuery({ queryKey: ["weeks"], queryFn: fetchWeeks, enabled: open });
  const { data: tags, refetch: refetchTags } = useQuery({
    queryKey: ["tags"],
    queryFn: fetchTags,
    enabled: open,
  });
  const { data: portionClusters } = useQuery({
    queryKey: ["portion-clusters"],
    queryFn: fetchPortionClusters,
    enabled: open,
  });

  const { data: existingItem, isLoading: loadingItem } = useQuery({
    queryKey: ["content-item", contentItemId],
    queryFn: () => fetchContentItem(contentItemId!),
    enabled: open && mode === "edit" && !!contentItemId,
  });

  // Hydrate form state from the saved item during render (no effect needed).
  // Runs once per loaded item, guarded by hydratedItemId so it cannot loop.
  if (existingItem && mode === "edit" && hydratedItemId !== existingItem.id) {
    setHydratedItemId(existingItem.id);
    setContentType(existingItem.content_type);
    setTitle(existingItem.title);
    setDescription(existingItem.description ?? "");
    setInstructions(existingItem.instructions ?? "");
    setWeekId(existingItem.week_id);
    setPortionCluster(existingItem.portion_cluster ?? "");
    setTagIds(existingItem.tags.map((t: Tag) => t.id));
    setTemplate(existingItem.submission_template);
    setSubmissionStartsAt(toDateInputValue(existingItem.submission_starts_at));
    setSubmissionEndsAt(toDateInputValue(existingItem.submission_ends_at));
  }

  const { data: assignedRefs, isLoading: loadingRoster } = useQuery({
    queryKey: ["content-item-roster", contentItemId],
    queryFn: () => fetchAssignedMenteeRefs(contentItemId!),
    enabled: open && mode === "edit" && !!contentItemId && step === "roster",
  });

  // Hydrate selected mentees once the roster arrives, also during render.
  if (assignedRefs && mode === "edit" && !rosterHydrated) {
    setRosterHydrated(true);
    setSelectedMenteeIds(assignedRefs.map((r) => r.menteeId));
  }

  const committedIds = React.useMemo(
    () => (assignedRefs ?? []).map((r) => r.menteeId),
    [assignedRefs]
  );
  const effectiveCommittedIds = React.useMemo(
    () => committedIds.filter((id) => !locallyRemovedIds.has(id)),
    [committedIds, locallyRemovedIds]
  );
  const menteeIdToDispatchId = React.useMemo(() => {
    const map = new Map<string, string>();
    (assignedRefs ?? []).forEach((r) => map.set(r.menteeId, r.contentDispatchId));
    return map;
  }, [assignedRefs]);

  // Derived during render. Drives whether the window fields render and whether
  // they're required before save.
  const requirement = template.metadata.is_not_required
    ? "disabled"
    : template.metadata.is_required
    ? "required"
    : "optional";
  const submissionWindowRequired = requirement !== "disabled";
  const submissionWindowInvalid =
    submissionWindowRequired &&
    isValidDateString(submissionStartsAt) &&
    isValidDateString(submissionEndsAt) &&
    new Date(submissionEndsAt).getTime() < new Date(submissionStartsAt).getTime();

  const canSubmitDetails =
    title.trim().length > 0 &&
    (!submissionWindowRequired ||
      (isValidDateString(submissionStartsAt) && isValidDateString(submissionEndsAt))) &&
    !submissionWindowInvalid;

  function applyTypeChange(next: ContentType) {
    setContentType(next);
    setTemplate(defaultTemplateFor(next));
    hasEditedTemplate.current = false;
  }

  function handleTypeChange(next: ContentType) {
    if (next === contentType) return;
    if (hasEditedTemplate.current) {
      Alert.alert(
        "Switch type?",
        "Switching type resets the submission form below (type-specific fields and questions don't carry over cleanly between types). Continue?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Continue", style: "destructive", onPress: () => applyTypeChange(next) },
        ]
      );
      return;
    }
    applyTypeChange(next);
  }

  function handleTemplateChange(next: ContentSubmissionTemplate) {
    hasEditedTemplate.current = true;
    setTemplate(next);
  }

  const saveDetailsMutation = useMutation({
    mutationFn: async () => {
      // Must match content_items_submission_window_check, or the insert/update fails.
      const windowStartsAt =
        submissionWindowRequired && submissionStartsAt
          ? new Date(submissionStartsAt).toISOString()
          : null;
      const windowEndsAt =
        submissionWindowRequired && submissionEndsAt
          ? new Date(submissionEndsAt).toISOString()
          : null;
      const portion_cluster = normalizePortionCluster(portionCluster);

      if (mode === "create") {
        return createContentItem({
          content_type: contentType,
          portion_cluster,
          title,
          description: description || null,
          instructions: instructions || null,
          week_id: weekId,
          submission_template: template,
          created_by: currentUserId,
          tag_ids: tagIds,
          submission_starts_at: windowStartsAt,
          submission_ends_at: windowEndsAt,
        });
      }
      return updateContentItem({
        id: contentItemId!,
        portion_cluster,
        title,
        description: description || null,
        instructions: instructions || null,
        week_id: weekId,
        submission_template: template,
        tag_ids: tagIds,
        submission_starts_at: windowStartsAt,
        submission_ends_at: windowEndsAt,
      });
    },
    onSuccess: (saved) => {
      setWorkingItem(saved);
      setStep("roster");
    },
    onError: (error: unknown) => {
      // Fallback only. The disabled Continue button should make this unreachable.
      console.error("content item save failed", error);
    },
  });

  const dispatchMutation = useMutation({
    mutationFn: async () => {
      const target = workingItem ?? existingItem;
      if (!target) throw new Error("No content item to assign mentees to");
      const newIds = selectedMenteeIds.filter((id) => !effectiveCommittedIds.includes(id));
      if (newIds.length === 0) return;
      // Derived from the saved row, not the form, so the requirement matches
      // what was actually persisted.
      const targetRequirement = target.submission_template.metadata.is_not_required
        ? "disabled"
        : target.submission_template.metadata.is_required
        ? "required"
        : "optional";
      return dispatchContentItem({
        contentItemId: target.id,
        menteeIds: newIds,
        assignedBy: currentUserId,
        dueAt: dueAt || null,
      });
    },
    onSuccess: () => {
      reset();
      onClose();
      onSaved();
    },
  });

  async function handleRemoveCommitted(menteeId: string) {
    const dispatchId = menteeIdToDispatchId.get(menteeId);
    if (!dispatchId) return;
    await removeContentDispatch(dispatchId);
    setLocallyRemovedIds((prev) => new Set(prev).add(menteeId));
  }

  function reset() {
    setStep("details");
    setContentType(initialContentType);
    setTitle("");
    setDescription("");
    setInstructions("");
    setWeekId(null);
    setPortionCluster("");
    setTagIds([]);
    setTemplate(defaultTemplateFor(initialContentType));
    setSubmissionStartsAt("");
    setSubmissionEndsAt("");
    setWorkingItem(null);
    setSelectedMenteeIds([]);
    setDueAt("");
    setLocallyRemovedIds(new Set());
    setHydratedItemId(null);
    setRosterHydrated(false);
    hasEditedTemplate.current = false;
  }

  function handleClose() {
    reset();
    onClose();
  }

  const canFinishRoster = mode === "create" ? selectedMenteeIds.length > 0 : true;


  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={
        step === "details"
          ? `${mode === "create" ? "New" : "Edit"} ${contentTypeLabel(contentType)}`
          : "Assign to mentees"
      }
      description={
        step === "details"
          ? "Set the details and the submission form mentees will fill out."
          : "Choose which mentees should receive this, and when it's due for new additions."
      }
      className="max-w-2xl"
    >
      {step === "details" ? (
        loadingItem && mode === "edit" ? (
          <Text className="p-4 text-sm text-text-muted ">Loading…</Text>
        ) : (
          <View className="gap-4">
            <ScrollView
              className="max-h-[70%]"
              contentContainerClassName="gap-5 p-1"
              keyboardShouldPersistTaps="handled"
            >
              <TypeSelector mode={mode} value={contentType} onChange={handleTypeChange} />

              <Field label="Title">
                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  className={inputClass}
                  placeholder="e.g. Week 3 — Character study"
                />
              </Field>

              <Field label="Description" optional>
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={2}
                  textAlignVertical="top"
                  className={inputClass}
                />
              </Field>

              <Field label="Instructions" optional>
                <TextInput
                  value={instructions}
                  onChangeText={setInstructions}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  className={inputClass}
                />
              </Field>

              <Field label="Week" optional>
                <WeekField
                  weeks={weeks ?? []}
                  weekId={weekId}
                  onSelect={setWeekId}
                  onCreated={(week) => {
                    queryClient.setQueryData<Week[]>(["weeks"], (prev) => [...(prev ?? []), week]);
                    setWeekId(week.id);
                  }}
                />
              </Field>

              <Field label="Semester" optional>
                <SemesterField
                  semesters={portionClusters ?? []}
                  value={portionCluster}
                  onSelect={setPortionCluster}
                />
              </Field>

              <Field label="Tags" optional>
                <TagMultiSelect
                  allTags={tags ?? []}
                  selectedIds={tagIds}
                  onChange={setTagIds}
                  onCreateTag={async (name) => {
                    const tag = await createTag(name);
                    await refetchTags();
                    setTagIds((prev) => [...prev, tag.id]);
                  }}
                    onTagDeleted={(tagId) => {
                    queryClient.setQueryData<Tag[]>(["tags"], (prev) =>
                        (prev ?? []).filter((t: Tag) => t.id !== tagId)
                    );
                    setTagIds((prev) => prev.filter((id) => id !== tagId));
                    }}
                />
              </Field>

              <View className="border-t border-border pt-4 ">
                <ContentSubmissionTemplateEditor
                  contentType={contentType}
                  value={template}
                  onChange={handleTemplateChange}
                />
              </View>

              {/*
                Placed after the template editor because its visibility depends on
                the requirement control inside it. Hidden for "No submission" items,
                matching the DB constraint: a disabled item has no window.
              */}
              {submissionWindowRequired && (
                <Field label="Submission window">
                  <View className="flex-row gap-2">
                    <DateField
                      value={submissionStartsAt}
                      onChange={setSubmissionStartsAt}
                      className="flex-1"
                    />
                    <DateField
                      value={submissionEndsAt}
                      onChange={setSubmissionEndsAt}
                      invalid={submissionWindowInvalid}
                      className="flex-1"
                    />
                  </View>
                  {submissionWindowInvalid && (
                    <Text className="mt-1 text-[11px] text-destructive ">
                      End date can&apos;t be before the start date.
                    </Text>
                  )}
                  <Text className="mt-1 text-[11px] text-text-muted ">
                    When mentees can submit. Powers the calendar/timeline view and due-date reminders.
                  </Text>
                </Field>
              )}

              {saveDetailsMutation.isError && (
                <Text className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive  ">
                  Couldn&apos;t save. Try again.
                </Text>
              )}
            </ScrollView>

            <View className="flex-row items-center justify-end gap-3 border-t border-border bg-surface pt-4  ">
              <Pressable
                onPress={handleClose}
                accessibilityRole="button"
                className="rounded-xl border border-border px-5 py-2.5 active:opacity-70 "
              >
                <Text className="text-sm font-medium text-text-primary ">Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  if (canSubmitDetails) saveDetailsMutation.mutate();
                }}
                disabled={!canSubmitDetails || saveDetailsMutation.isPending}
                accessibilityRole="button"
                accessibilityState={{ disabled: !canSubmitDetails || saveDetailsMutation.isPending }}
                className={`rounded-xl bg-primary px-5 py-2.5 active:opacity-70  ${
                  !canSubmitDetails || saveDetailsMutation.isPending ? "opacity-50" : ""
                }`}
              >
                <Text className="text-sm font-medium text-primary-foreground ">
                  {saveDetailsMutation.isPending ? "Saving…" : "Continue"}
                </Text>
              </Pressable>
            </View>
          </View>
        )
      ) : (
        <View className="gap-5">
          <Field label="Due date for newly added mentees">
            <DateField value={dueAt} onChange={setDueAt} />
          </Field>

          {mode === "edit" && loadingRoster ? (
            <Text className="text-xs text-text-muted ">Loading current roster…</Text>
          ) : (
            <PeopleGrid
              fieldDefs={pickerFieldDefs}
              viewKey={`content-item-roster-${contentItemId ?? "new"}`}
              queryKey={[
                "selectable-mentees",
                isStaffScoped ? "all-cohorts" : scopeToMentorId ?? "all",
              ]}
                queryFn={(filterState) =>
                peoplePickerApi.fetchSelectablePeople(
                    {
                    role: "mentee",
                    mentorId: isStaffScoped ? undefined : scopeToMentorId,
                    cohortId: (filterState.values.cohort as string | undefined) ?? undefined,
                    },
                    filterState.search
                )
                }
              groupBy="pod"
              groupKeyFn={(p) => (p as { podName?: string }).podName ?? "No team"}
              selectable
              selectedIds={selectedMenteeIds}
              onSelectionChange={setSelectedMenteeIds}
              alreadyCommittedIds={mode === "edit" ? effectiveCommittedIds : undefined}
              onRemoveCommitted={mode === "edit" ? handleRemoveCommitted : undefined}
              removalWarningTitle="Remove from this item?"
              removalWarningDescription={(names) =>
                `This has already been assigned to ${names.join(", ")}. Remove ${
                  names.length > 1 ? "them" : "this mentee"
                }? This can't be undone.`
              }
              emptyMessage="No teams with mentees found."
              showSelectAllVisible={isStaffScoped}
            />
          )}

          {dispatchMutation.isError && (
            <Text className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive  ">
              Couldn&apos;t update the mentee list. Try again.
            </Text>
          )}

          <View className="flex-row">
            <Pressable
              disabled={!canFinishRoster || dispatchMutation.isPending}
              onPress={() => dispatchMutation.mutate()}
              accessibilityRole="button"
              accessibilityState={{ disabled: !canFinishRoster || dispatchMutation.isPending }}
              className={`rounded-full bg-primary px-4 py-2 active:opacity-70  ${
                !canFinishRoster || dispatchMutation.isPending ? "opacity-50" : ""
              }`}
            >
              <Text className="text-sm font-medium text-primary-foreground ">
                {dispatchMutation.isPending
                  ? "Saving…"
                  : mode === "create"
                  ? `Assign to ${selectedMenteeIds.length || ""} mentee${selectedMenteeIds.length === 1 ? "" : "s"}`
                  : "Done"}
              </Text>
            </Pressable>
          </View>
        </View>
      )}
    </Modal>
  );
}

function contentTypeLabel(contentType: ContentType): string {
  if (contentType === "assignment") return "assignment";
  if (contentType === "course") return "course";
  return "resource";
}

const inputClass =
  "w-full rounded-xl border border-border bg-card-alt px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-primary     ";

function Field({
  label,
  optional,
  children,
}: {
  label: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View className="w-full gap-1.5">
      <Text className="text-xs font-semibold uppercase tracking-wide text-text-muted ">
        {label}
        {optional ? (
          <Text className="lowercase font-normal text-text-muted/70 "> (optional)</Text>
        ) : null}
      </Text>
      {children}
    </View>
  );
}

/**
 * Date entry as YYYY-MM-DD text. React Native has no native date input; swap in
 * @react-native-community/datetimepicker here if a picker UI is preferred.
 */
function DateField({
  value,
  onChange,
  invalid = false,
  className = "",
}: {
  value: string;
  onChange: (next: string) => void;
  invalid?: boolean;
  className?: string;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder="YYYY-MM-DD"
      keyboardType="numbers-and-punctuation"
      maxLength={10}
      accessibilityLabel="Date"
      className={`${inputClass} ${invalid ? "border-destructive " : ""} ${className}`}
    />
  );
}

/** Pill-style toggle used for single-choice selections throughout this modal. */
function Pill({
  label,
  active,
  onPress,
  icon: Icon,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  icon?: LucideIcon;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      className={`flex-row items-center gap-1.5 rounded-full px-3 py-1.5 active:opacity-70 ${
        active
          ? "bg-primary "
          : "border border-border bg-card-alt  "
      }`}
    >
      {Icon ? (
        <Icon
          size={14}
          className={active ? "text-primary-foreground " : "text-text-muted "}
        />
      ) : null}
      <Text
        className={`text-xs font-medium ${
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

// ---------------------------------------------------------------------------
// Type selector. Create mode shows the choice; edit mode shows a fixed chip
// because content_type is immutable once dispatches or submissions exist.
// ---------------------------------------------------------------------------

function TypeSelector({
  mode,
  value,
  onChange,
}: {
  mode: "create" | "edit";
  value: ContentType;
  onChange: (next: ContentType) => void;
}) {
  const activeOption = TYPE_OPTIONS.find((o) => o.value === value) ?? TYPE_OPTIONS[0];

  if (mode === "edit") {
    const Icon = activeOption.icon;
    return (
      <View className="gap-1.5">
        <Text className="text-xs font-semibold uppercase tracking-wide text-text-muted ">
          Type
        </Text>
        <View className="w-fit flex-row items-center gap-1.5 self-start rounded-full border border-border bg-card-alt px-3 py-1.5  ">
          <Icon size={14} className="text-text-primary " />
          <Text className="text-xs font-medium text-text-primary ">
            {activeOption.label}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View className="gap-1.5">
      <Text className="text-xs font-semibold uppercase tracking-wide text-text-muted ">
        Type
      </Text>
      <View className="flex-row flex-wrap gap-1 self-start rounded-full border border-border bg-card-alt p-1  ">
        {TYPE_OPTIONS.map((option) => (
          <Pill
            key={option.value}
            label={option.label}
            icon={option.icon}
            active={option.value === value}
            onPress={() => onChange(option.value)}
          />
        ))}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Week field: select an existing week, or create one inline.
// ---------------------------------------------------------------------------

function WeekField({
  weeks,
  weekId,
  onSelect,
  onCreated,
}: {
  weeks: Week[];
  weekId: string | null;
  onSelect: (id: string | null) => void;
  onCreated: (week: Week) => void;
}) {
  const [creating, setCreating] = React.useState(false);
  const [name, setName] = React.useState("");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");

  const createWeekMutation = useMutation({
    mutationFn: () =>
      createWeek(
        { name: name.trim(), start_date: startDate || null, end_date: endDate || null },
        weeks
      ),
    onSuccess: (week) => {
      onCreated(week);
      setCreating(false);
      setName("");
      setStartDate("");
      setEndDate("");
    },
  });

  const canCreate = name.trim().length > 0;

  if (!creating) {
    return (
      <View className="flex-row items-center gap-2">
        <View className="min-w-0 flex-1">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
            <Pill label="No week" active={weekId === null} onPress={() => onSelect(null)} />
            {weeks.map((w) => (
              <Pill key={w.id} label={w.name} active={weekId === w.id} onPress={() => onSelect(w.id)} />
            ))}
          </ScrollView>
        </View>
        <Pressable
          onPress={() => setCreating(true)}
          accessibilityRole="button"
          className="flex-row shrink-0 items-center gap-1 rounded-lg border border-dashed border-border px-2.5 py-2 "
        >
          <Plus size={14} className="text-text-muted " />
          <Text className="text-xs font-medium text-text-muted ">New</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="gap-2 rounded-xl border border-border bg-card-alt p-3  ">
      <View className="flex-row items-center justify-between">
        <Text className="text-xs font-semibold text-text-primary ">New week</Text>
        <Pressable
          onPress={() => setCreating(false)}
          accessibilityRole="button"
          accessibilityLabel="Cancel new week"
          className="rounded p-1"
        >
          <X size={14} className="text-text-muted " />
        </Pressable>
      </View>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="e.g. Week 4"
        className="rounded border border-border bg-card px-2 py-1.5 text-xs text-text-primary placeholder:text-text-muted    "
      />
      <View className="flex-row gap-2">
        <DateField value={startDate} onChange={setStartDate} className="flex-1 py-1.5" />
        <DateField value={endDate} onChange={setEndDate} className="flex-1 py-1.5" />
      </View>
      {createWeekMutation.isError && (
        <Text className="text-[11px] text-destructive ">
          Couldn&apos;t create week. Try again.
        </Text>
      )}
      <Pressable
        disabled={!canCreate || createWeekMutation.isPending}
        onPress={() => createWeekMutation.mutate()}
        accessibilityRole="button"
        className={`self-start rounded-full bg-primary px-3 py-1.5 active:opacity-70  ${
          !canCreate || createWeekMutation.isPending ? "opacity-50" : ""
        }`}
      >
        <Text className="text-xs font-medium text-primary-foreground ">
          {createWeekMutation.isPending ? "Creating…" : "Create & select"}
        </Text>
      </Pressable>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Semester field: chips of existing semesters, plus a "New" entry that swaps
// in a text input. Saved to the portion_cluster column.
// ---------------------------------------------------------------------------

function SemesterField({
  semesters,
  value,
  onSelect,
}: {
  semesters: string[];
  value: string;
  onSelect: (v: string) => void;
}) {
  const [creating, setCreating] = React.useState(false);
  const [draft, setDraft] = React.useState("");

  // The current value may not be in the list yet (a semester just typed and
  // saved before the query refetches). Include it so the chip can display it.
  const options = value !== "" && !semesters.includes(value) ? [...semesters, value] : semesters;

  const canUseDraft = draft.trim().length > 0;

  function handleUseDraft() {
    if (!canUseDraft) return;
    onSelect(draft.trim());
    setDraft("");
    setCreating(false);
  }

  if (!creating) {
    return (
      <View className="flex-row items-center gap-2">
        <View className="min-w-0 flex-1">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
            <Pill label="No semester" active={value === ""} onPress={() => onSelect("")} />
            {options.map((s) => (
              <Pill key={s} label={s} active={value === s} onPress={() => onSelect(s)} />
            ))}
          </ScrollView>
        </View>
        <Pressable
          onPress={() => {
            setDraft("");
            setCreating(true);
          }}
          accessibilityRole="button"
          className="flex-row shrink-0 items-center gap-1 rounded-lg border border-dashed border-border px-2.5 py-2 "
        >
          <Plus size={14} className="text-text-muted " />
          <Text className="text-xs font-medium text-text-muted ">New</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-row items-center gap-2">
      <TextInput
        autoFocus
        value={draft}
        onChangeText={setDraft}
        onSubmitEditing={handleUseDraft}
        returnKeyType="done"
        placeholder="e.g. Coms 101"
        className={`${inputClass} flex-1`}
      />
      <Pressable
        disabled={!canUseDraft}
        onPress={handleUseDraft}
        accessibilityRole="button"
        className={`shrink-0 rounded-full bg-primary px-3 py-2 active:opacity-70  ${
          canUseDraft ? "" : "opacity-50"
        }`}
      >
        <Text className="text-xs font-medium text-primary-foreground ">Use</Text>
      </Pressable>
      <Pressable
        onPress={() => setCreating(false)}
        accessibilityRole="button"
        accessibilityLabel="Cancel new semester"
        className="shrink-0 rounded p-1"
      >
        <X size={14} className="text-text-muted " />
      </Pressable>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Tag multi-select. Tags can be created inline and, for mentors and staff,
// deleted.
// ---------------------------------------------------------------------------

function TagMultiSelect({
  allTags,
  selectedIds,
  onChange,
  onCreateTag,
  onTagDeleted,
}: {
  allTags: { id: string; name: string }[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  onCreateTag: (name: string) => Promise<void>;
  onTagDeleted: (tagId: string) => void;
}) {
  const { permissionLevel } = useRole();
  const canDeleteTags = permissionLevel === "mentor" || permissionLevel === "staff";

  const [creating, setCreating] = React.useState(false);
  const [newTagName, setNewTagName] = React.useState("");
  const [deletingTagId, setDeletingTagId] = React.useState<string | null>(null);

  function toggle(id: string) {
    onChange(
      selectedIds.includes(id) ? selectedIds.filter((i) => i !== id) : [...selectedIds, id]
    );
  }

  async function handleCreate() {
    const name = newTagName.trim();
    if (!name) return;
    await onCreateTag(name);
    setNewTagName("");
    setCreating(false);
  }

  async function performDelete(tagId: string) {
    setDeletingTagId(tagId);
    try {
      await deleteTag(tagId);
      onTagDeleted(tagId);
    } catch (err) {
      console.error("[TagMultiSelect] Failed to delete tag", tagId, err);
      Alert.alert("Couldn't delete that tag. Try again.");
    } finally {
      setDeletingTagId(null);
    }
  }

  function handleDelete(tagId: string, tagName: string) {
    Alert.alert(
      "Delete tag?",
      `Delete the tag "${tagName}"? This removes it from every item using it. The items themselves aren't affected. This can't be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => void performDelete(tagId) },
      ]
    );
  }

  return (
    <View className="flex-row flex-wrap items-center gap-1.5">
      {allTags.map((tag) => {
        const isSelected = selectedIds.includes(tag.id);
        return (
          <View
            key={tag.id}
            className={`flex-row items-center gap-1 rounded-full px-2.5 py-1 ${
              isSelected
                ? "bg-primary "
                : "border border-border "
            }`}
          >
            <Pressable onPress={() => toggle(tag.id)} accessibilityRole="button" accessibilityState={{ selected: isSelected }}>
              <Text
                className={`text-xs font-medium ${
                  isSelected
                    ? "text-primary-foreground "
                    : "text-text-muted "
                }`}
              >
                {tag.name}
              </Text>
            </Pressable>
            {canDeleteTags && (
              <Pressable
                onPress={() => handleDelete(tag.id, tag.name)}
                disabled={deletingTagId === tag.id}
                accessibilityRole="button"
                accessibilityLabel={`Delete tag ${tag.name}`}
                className="rounded-full p-0.5 active:opacity-60"
              >
                <X
                  size={10}
                  className={isSelected ? "text-primary-foreground " : "text-text-muted "}
                />
              </Pressable>
            )}
          </View>
        );
      })}

      {creating ? (
        <View className="flex-row items-center gap-1">
          <TextInput
            autoFocus
            value={newTagName}
            onChangeText={setNewTagName}
            onSubmitEditing={() => void handleCreate()}
            returnKeyType="done"
            placeholder="New tag"
            className="w-28 rounded-full border border-border bg-card px-2.5 py-1 text-xs text-text-primary placeholder:text-text-muted    "
          />
          <Pressable onPress={() => void handleCreate()} accessibilityRole="button" accessibilityLabel="Add tag" className="p-1">
            <Plus size={14} className="text-text-accent " />
          </Pressable>
          <Pressable onPress={() => setCreating(false)} accessibilityRole="button" accessibilityLabel="Cancel new tag" className="p-1">
            <X size={14} className="text-text-muted " />
          </Pressable>
        </View>
      ) : (
        <Pressable
          onPress={() => setCreating(true)}
          accessibilityRole="button"
          className="flex-row items-center gap-1 rounded-full border border-dashed border-border px-2.5 py-1 "
        >
          <Plus size={12} className="text-text-muted " />
          <Text className="text-xs text-text-muted ">New tag</Text>
        </Pressable>
      )}
    </View>
  );
}