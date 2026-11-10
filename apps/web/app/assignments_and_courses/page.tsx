// /app/assignments_and_courses/page.tsx

"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, SlidersHorizontal } from "lucide-react";
import { useRole } from "@/providers/role-provider";
import { useSessionStore } from "@/store/session-store";
import { CollapsibleSection } from "@/components/shared/CollapsibleSection";
import { EmptyState } from "@/components/shared/EmptyState";
import { SmartFilterBar } from "@/components/filters/SmartFilterBar";
import { useFilterState } from "@/hooks/use-filter-state";
import { useContentFieldDefs } from "@/lib/filtering/content-fields";
import {
  fetchContentItems,
  fetchPortionClusters,
  fetchTags,
  fetchWeeks,
  softDeleteContentItem,
} from "@/lib/api/content-items";
import { fetchMenteeContentDispatches } from "@/lib/api/content-dispatches";
import { getMenteeIdsForMentor } from "@/lib/api/pods";
import { uniqueClusters } from "@/lib/content/portion-cluster";
import { ContentItemCard } from "@/components/content/ContentItemCard";
import { MenteeContentCard } from "@/components/content/MenteeContentCard";
import { ContentItemFormModal } from "@/components/content/ContentItemFormModal";
import { PortionClusterChips } from "@/components/content/PortionClusterChips";
import type {
  CompletionStatus,
  ContentItemWithMeta,
  ContentType,
  MenteeContentDispatch,
  Week,
} from "@/types/content";

type ContentTab = ContentType;

const TAB_DEFS: { value: ContentTab; label: string }[] = [
  { value: "assignment", label: "Assignments" },
  { value: "course", label: "Courses" },
  { value: "resource", label: "Resources" },
];

// ---------------------------------------------------------------------------
// Status filter: client-side, over whatever the mentee's query already
// returned. The fetch itself is never narrowed by status.
// ---------------------------------------------------------------------------
type StatusFilter = "all" | "not_started" | "has_started" | "completed" | "overdue";

const STATUS_FILTER_DEFS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "has_started", label: "Has started" },
  { value: "not_started", label: "Not started" },
  { value: "completed", label: "Completed" },
  { value: "overdue", label: "Overdue" },
];

const DONE_STATUSES: readonly CompletionStatus[] = ["completed", "approved_awaiting_completion"];

/**
 * Derived purely from data already on the dispatch. No fetch, no effect.
 * Items with no submission window are always "started". Overdue excludes
 * anything already done, so a late-but-completed item isn't flagged.
 */
function matchesStatusFilter(d: MenteeContentDispatch, filter: StatusFilter): boolean {
  if (filter === "all") return true;

  const isDone = DONE_STATUSES.includes(d.completion_status);
  if (filter === "completed") return isDone;

  const effectiveDeadline = d.due_at ?? d.content_item.submission_ends_at;
  const isOverdue =
    !isDone && !!effectiveDeadline && new Date(effectiveDeadline).getTime() < Date.now();
  if (filter === "overdue") return isOverdue;

  const startsAt = d.content_item.submission_starts_at;
  const hasStarted = !startsAt || new Date(startsAt).getTime() <= Date.now();
  if (filter === "has_started") return hasStarted && !isDone;
  if (filter === "not_started") return !hasStarted;

  return true;
}

interface FormModalState {
  mode: "create" | "edit";
  contentItemId?: string;
  /** Only meaningful for mode: "create". Seeds the type selector to the active tab. */
  contentType?: ContentType;
}

export default function AssignmentsAndCoursesPage() {
  const { role, permissionLevel } = useRole();
  const userId = useSessionStore((s) => s.userId);
  const queryClient = useQueryClient();

  const [tab, setTab] = React.useState<ContentTab>("assignment");
  const [showFilters, setShowFilters] = React.useState(false);
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all");
  const [portionCluster, setPortionCluster] = React.useState<string | null>(null);
  const [formModal, setFormModal] = React.useState<FormModalState | null>(null);

  const isMentee = permissionLevel === "mentee";
  const canCreate = permissionLevel === "mentor" || permissionLevel === "staff";

  // A semester chosen on one tab may not have items on another tab (mentee
  // chips are built from the current tab's dispatches), so reset it here.
  function handleTabChange(next: ContentTab) {
    setTab(next);
    setPortionCluster(null);
  }

  // Mentors see content they authored OR content dispatched to any mentee
  // in their pod(s). See scopeToMentor in fetchContentItems.
  const scopeToMentorId = role === "mentor" ? userId ?? undefined : undefined;
  const { data: podMenteeIds, isLoading: podMenteeIdsLoading } = useQuery({
    queryKey: ["pod-mentee-ids", userId],
    queryFn: () => getMenteeIdsForMentor(userId as string),
    enabled: role === "mentor" && !!userId,
  });

  const { data: weeks } = useQuery({ queryKey: ["weeks"], queryFn: fetchWeeks });
  const { data: tags } = useQuery({ queryKey: ["tags"], queryFn: fetchTags });
  const fieldDefs = useContentFieldDefs(weeks ?? [], tags ?? []);

  const filterState = useFilterState(fieldDefs, `content-${tab}-list`);

  const portionClustersQuery = useQuery({
    queryKey: ["portion-clusters"],
    queryFn: fetchPortionClusters,
    enabled: !isMentee,
  });

  const menteeQuery = useQuery({
    queryKey: ["content-dispatches", "mentee", tab, userId],
    queryFn: () => fetchMenteeContentDispatches(userId!, tab),
    enabled: isMentee && !!userId,
  });

  const menteeDispatches: MenteeContentDispatch[] = menteeQuery.data ?? [];

  // Mentees get semesters from their own dispatches so the row only offers
  // semesters they can actually see. Staff and mentors get every semester.
  const semesterOptions = isMentee
    ? uniqueClusters(menteeDispatches.map((d) => d.content_item))
    : portionClustersQuery.data ?? [];

  const staffQuery = useQuery({
    queryKey: [
      "content-items",
      "list",
      tab,
      scopeToMentorId,
      podMenteeIds,
      filterState.filterState,
      filterState.sortState,
      portionCluster,
    ],
    queryFn: () =>
      fetchContentItems({
        contentType: tab,
        fieldDefs,
        filterState: filterState.filterState,
        sortState: filterState.sortState,
        portionCluster,
        scopeToMentor:
          role === "mentor" && userId
            ? { mentorId: userId, podMenteeIds: podMenteeIds ?? [] }
            : undefined,
      }),
    // For mentors, wait for pod-mentee ids before firing. Otherwise the first
    // render queries with podMenteeIds: [] and briefly shows only self-authored
    // items before widening.
    enabled: !isMentee && (role !== "mentor" || !podMenteeIdsLoading),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => softDeleteContentItem(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["content-items", "list", tab] }),
  });

  return (
    <>
      <div className="flex flex-col gap-4 p-4">
        <PortionClusterChips
          clusters={semesterOptions}
          value={portionCluster}
          onChange={setPortionCluster}
        />

        <PageHeader tab={tab} onTabChange={handleTabChange} />

        {isMentee ? (
          <MenteeView
            loading={menteeQuery.isLoading}
            dispatches={menteeDispatches}
            tab={tab}
            showFilters={showFilters}
            onToggleFilters={() => setShowFilters((s) => !s)}
            fieldDefs={fieldDefs}
            filterState={filterState}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            portionCluster={portionCluster}
          />
        ) : (
          <StaffView
            loading={staffQuery.isLoading}
            items={staffQuery.data ?? []}
            weeks={weeks ?? []}
            tab={tab}
            canCreate={canCreate}
            showFilters={showFilters}
            onToggleFilters={() => setShowFilters((s) => !s)}
            fieldDefs={fieldDefs}
            filterState={filterState}
            onCreate={() => setFormModal({ mode: "create", contentType: tab })}
            onEdit={(id) => setFormModal({ mode: "edit", contentItemId: id })}
            onDelete={(id) => deleteMutation.mutateAsync(id)}
          />
        )}
      </div>

      {canCreate && userId && formModal && (
        <ContentItemFormModal
          open={!!formModal}
          onClose={() => setFormModal(null)}
          mode={formModal.mode}
          contentType={formModal.contentType ?? tab}
          contentItemId={formModal.contentItemId}
          currentUserId={userId}
          scopeToMentorId={scopeToMentorId}
          onSaved={() => {
            setFormModal(null);
            // Invalidate every tab's list. The form's type selector can move an
            // item into a different tab than the one the modal opened from.
            queryClient.invalidateQueries({ queryKey: ["content-items", "list"] });
            // A save can introduce a new semester name.
            queryClient.invalidateQueries({ queryKey: ["portion-clusters"] });
          }}
        />
      )}
    </>
  );
}

function PageHeader({
  tab,
  onTabChange,
}: {
  tab: ContentTab;
  onTabChange: (t: ContentTab) => void;
}) {
  return (
    <div className="inline-flex w-fit rounded-full border border-border bg-card p-0.5 dark:border-border dark:bg-card">
      {TAB_DEFS.map((t) => (
        <button
          key={t.value}
          type="button"
          onClick={() => onTabChange(t.value)}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            tab === t.value
              ? "bg-primary text-primary-foreground dark:bg-primary dark:text-primary-foreground"
              : "text-text-muted dark:text-text-muted"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

interface FilterToggleProps {
  showFilters: boolean;
  onToggleFilters: () => void;
  fieldDefs: ReturnType<typeof useContentFieldDefs>;
  filterState: ReturnType<typeof useFilterState>;
}

function FilterBarWithToggle({
  showFilters,
  onToggleFilters,
  fieldDefs,
  filterState,
}: FilterToggleProps) {
  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={onToggleFilters}
        className="flex w-fit items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-text-primary sm:hidden dark:border-border dark:text-text-primary"
      >
        <SlidersHorizontal className="h-3.5 w-3.5" />
        Filters
      </button>
      <div className={`${showFilters ? "block" : "hidden"} sm:block`}>
        <SmartFilterBar fieldDefs={fieldDefs} state={filterState} />
      </div>
    </div>
  );
}

function StatusFilterChips({
  value,
  onChange,
}: {
  value: StatusFilter;
  onChange: (v: StatusFilter) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {STATUS_FILTER_DEFS.map((def) => (
        <button
          key={def.value}
          type="button"
          onClick={() => onChange(def.value)}
          className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            value === def.value
              ? "bg-primary text-primary-foreground dark:bg-primary dark:text-primary-foreground"
              : "border border-border text-text-muted hover:text-text-primary dark:border-border dark:text-text-muted dark:hover:text-text-primary"
          }`}
        >
          {def.label}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mentee view: mobile-first. Search, then status chips, then a "To do" /
// "Completed" split. The semester filter arrives as a prop; its chips are
// rendered by the page above the tab selector.
// ---------------------------------------------------------------------------

function MenteeView({
  loading,
  dispatches,
  tab,
  showFilters,
  onToggleFilters,
  fieldDefs,
  filterState,
  statusFilter,
  onStatusFilterChange,
  portionCluster,
}: {
  loading: boolean;
  dispatches: MenteeContentDispatch[];
  tab: ContentTab;
  showFilters: boolean;
  onToggleFilters: () => void;
  fieldDefs: ReturnType<typeof useContentFieldDefs>;
  filterState: ReturnType<typeof useFilterState>;
  statusFilter: StatusFilter;
  onStatusFilterChange: (v: StatusFilter) => void;
  portionCluster: string | null;
}) {
  const search = filterState.filterState.search?.toLowerCase().trim() ?? "";

  const bySearch = dispatches.filter(
    (d) => !search || d.content_item.title.toLowerCase().includes(search)
  );
  const bySemester = bySearch.filter(
    (d) => !portionCluster || d.content_item.portion_cluster === portionCluster
  );
  const visible = bySemester.filter((d) => matchesStatusFilter(d, statusFilter));

  const toDo = visible.filter((d) => !DONE_STATUSES.includes(d.completion_status));
  const completed = visible.filter((d) => DONE_STATUSES.includes(d.completion_status));

  return (
    <div className="flex flex-col gap-4">
      <FilterBarWithToggle
        showFilters={showFilters}
        onToggleFilters={onToggleFilters}
        fieldDefs={fieldDefs}
        filterState={filterState}
      />

      <StatusFilterChips value={statusFilter} onChange={onStatusFilterChange} />

      {loading ? (
        <p className="text-sm text-text-muted dark:text-text-muted">Loading…</p>
      ) : visible.length === 0 ? (
        <EmptyState
          title={`No ${tabNoun(tab, true)} yet`}
          description="Nothing matches the current filters, or nothing has been assigned to you here yet."
        />
      ) : (
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-3">
            <SectionLabel label="To do" count={toDo.length} />
            {toDo.length === 0 ? (
              <p className="px-1 text-xs text-text-muted dark:text-text-muted">
                You&apos;re all caught up.
              </p>
            ) : (
              <CardGrid>
                {toDo.map((d) => (
                  <MenteeContentCard
                    key={d.content_item.id}
                    dispatch={d}
                    href={`/assignments_and_courses/${d.content_item.id}`}
                  />
                ))}
              </CardGrid>
            )}
          </div>

          {completed.length > 0 && (
            <div className="flex flex-col gap-3">
              <SectionLabel label="Completed" count={completed.length} />
              <CardGrid>
                {completed.map((d) => (
                  <MenteeContentCard
                    key={d.content_item.id}
                    dispatch={d}
                    href={`/assignments_and_courses/${d.content_item.id}`}
                  />
                ))}
              </CardGrid>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Staff/mentor view: filters and create, grouped by week. The semester filter
// arrives as a prop; its chips are rendered by the page above the tab selector.
// ---------------------------------------------------------------------------

interface StaffViewProps {
  loading: boolean;
  items: ContentItemWithMeta[];
  weeks: Week[];
  tab: ContentTab;
  canCreate: boolean;
  showFilters: boolean;
  onToggleFilters: () => void;
  fieldDefs: ReturnType<typeof useContentFieldDefs>;
  filterState: ReturnType<typeof useFilterState>;
  onCreate: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => Promise<void>;
}

function StaffView({
  loading,
  items,
  weeks,
  tab,
  canCreate,
  showFilters,
  onToggleFilters,
  fieldDefs,
  filterState,
  onCreate,
  onEdit,
  onDelete,
}: StaffViewProps) {
  // Each item lands in exactly one bucket, in one pass, so the count and the
  // expanded list can't drift apart.
  const byWeek = new Map<string, ContentItemWithMeta[]>();
  const noWeek: ContentItemWithMeta[] = [];
  for (const item of items) {
    if (!item.week) {
      noWeek.push(item);
      continue;
    }
    const bucket = byWeek.get(item.week.id) ?? [];
    bucket.push(item);
    byWeek.set(item.week.id, bucket);
  }
  const orderedWeeks = weeks.filter((w) => byWeek.has(w.id));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <FilterBarWithToggle
          showFilters={showFilters}
          onToggleFilters={onToggleFilters}
          fieldDefs={fieldDefs}
          filterState={filterState}
        />
        {canCreate && (
          <button
            type="button"
            onClick={onCreate}
            className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground dark:bg-primary dark:text-primary-foreground"
          >
            <Plus className="h-4 w-4" />
            Create {tabNoun(tab, false)}
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-text-muted dark:text-text-muted">Loading…</p>
      ) : items.length === 0 ? (
        <EmptyState
          title={`No ${tabNoun(tab, true)} yet`}
          description="Nothing matches the current filters, or nothing has been created yet."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {orderedWeeks.map((week) => {
            const weekItems = byWeek.get(week.id) ?? [];
            return (
              <CollapsibleSection
                key={week.id}
                title={week.name}
                count={weekItems.length}
                accentClassName="bg-primary"
                defaultOpen
              >
                <CardGrid>
                  {weekItems.map((item) => (
                    <ContentItemCard
                      key={item.id}
                      item={item}
                      href={`/assignments_and_courses/${item.id}`}
                      onEdit={() => onEdit(item.id)}
                      onDelete={() => onDelete(item.id)}
                    />
                  ))}
                </CardGrid>
              </CollapsibleSection>
            );
          })}

          {noWeek.length > 0 && (
            <CollapsibleSection
              title="No week assigned"
              count={noWeek.length}
              accentClassName="bg-text-muted"
              defaultOpen={orderedWeeks.length === 0}
            >
              <CardGrid>
                {noWeek.map((item) => (
                  <ContentItemCard
                    key={item.id}
                    item={item}
                    href={`/assignments_and_courses/${item.id}`}
                    onEdit={() => onEdit(item.id)}
                    onDelete={() => onDelete(item.id)}
                  />
                ))}
              </CardGrid>
            </CollapsibleSection>
          )}
        </div>
      )}
    </div>
  );
}

function tabNoun(tab: ContentTab, plural: boolean): string {
  if (tab === "assignment") return plural ? "assignments" : "assignment";
  if (tab === "course") return plural ? "courses" : "course";
  return plural ? "resources" : "resource";
}

function SectionLabel({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center gap-2 px-1">
      <h2 className="text-sm font-semibold text-text-primary dark:text-text-primary">{label}</h2>
      <span className="rounded-full bg-card-alt px-1.5 py-0.5 text-[11px] text-text-muted dark:bg-card-alt dark:text-text-muted">
        {count}
      </span>
    </div>
  );
}

function CardGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
  );
}