// apps/mobile/src/app/(app)/assignments_and_courses.tsx
import * as React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react-native";
import {
  STATUS_FILTER_DEFS,
  DONE_STATUSES,
  matchesStatusFilter,
  uniqueClusters,
  type ContentType,
  type ContentItemWithMeta,
  type MenteeContentDispatch,
  type StatusFilter,
  type Week,
  getMenteeIdsForMentor,
  useContentFieldDefs,
} from "@repo/shared";
import { useRole } from "@/providers/role-provider";
import { useSessionStore } from "@/store/session-store";
import { useFilterState } from "@/hooks/use-filter-state";
import {
  fetchContentItems,
  fetchPortionClusters,
  fetchTags,
  fetchWeeks,
  softDeleteContentItem,
} from "@/lib/api/content-items";
import { fetchMenteeContentDispatches } from "@/lib/api/content-dispatches";
import { ContentItemCard } from "@/components/content/ContentItemCard";
import { MenteeContentCard } from "@/components/content/MenteeContentCard";
import { ContentItemFormModal } from "@/components/content/ContentItemFormModal";
import { PortionClusterChips } from "@/components/content/PortionClusterChips";
import { CollapsibleSection } from "@/components/shared/CollapsibleSection";
import { EmptyState } from "@/components/shared/EmptyState";
import { supabase } from "@/lib/supabase/client";

type ContentTab = ContentType;

const TAB_DEFS: { value: ContentTab; label: string }[] = [
  { value: "assignment", label: "Assignments" },
  { value: "course", label: "Courses" },
  { value: "resource", label: "Resources" },
];

interface FormModalState {
  mode: "create" | "edit";
  contentItemId?: string;
  /** Only meaningful for mode: "create". Seeds the type selector to the active tab. */
  contentType?: ContentType;
}

export default function AssignmentsAndCoursesScreen() {
  const { role, permissionLevel } = useRole();
  const userId = useSessionStore((s) => s.userId);
  const queryClient = useQueryClient();

  const [tab, setTab] = React.useState<ContentTab>("assignment");
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all");
  const [portionCluster, setPortionCluster] = React.useState<string | null>(null);
  const [formModal, setFormModal] = React.useState<FormModalState | null>(null);

  const isMentee = permissionLevel === "mentee";
  const canCreate = permissionLevel === "mentor" || permissionLevel === "staff";

  // A semester chosen on one tab may not exist on another tab, so reset it here.
  function handleTabChange(next: ContentTab) {
    setTab(next);
    setPortionCluster(null);
  }

  // Mentors see content they authored OR content dispatched to any mentee
  // in their pod(s). See scopeToMentor in fetchContentItems.
  const scopeToMentorId = role === "mentor" ? userId ?? undefined : undefined;
  const { data: podMenteeIds, isLoading: podMenteeIdsLoading } = useQuery({
    queryKey: ["pod-mentee-ids", userId],
    queryFn: () => getMenteeIdsForMentor(supabase, userId as string),
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
      <ScrollView className="flex-1 bg-surface" contentContainerClassName="p-4 pb-10">
        <View className="flex-col gap-4">
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
              onCreate={() => setFormModal({ mode: "create", contentType: tab })}
              onEdit={(id) => setFormModal({ mode: "edit", contentItemId: id })}
              onDelete={(id) => deleteMutation.mutateAsync(id)}
            />
          )}
        </View>
      </ScrollView>

      {canCreate && userId && formModal ? (
        <ContentItemFormModal
          open
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
      ) : null}
    </>
  );
}

function PageHeader({ tab, onTabChange }: { tab: ContentTab; onTabChange: (t: ContentTab) => void }) {
  return (
    <View className="inline-flex w-fit flex-row rounded-full border border-border bg-card p-0.5">
      {TAB_DEFS.map((t) => {
        const active = tab === t.value;
        return (
          <Pressable
            key={t.value}
            onPress={() => onTabChange(t.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            className={`rounded-full px-4 py-1.5 active:opacity-70 ${active ? "bg-primary" : ""}`}
          >
            <Text
              className={`text-sm font-medium ${active ? "text-primary-foreground" : "text-text-muted"}`}
            >
              {t.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
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
    <View className="flex-row flex-wrap gap-1.5">
      {STATUS_FILTER_DEFS.map((def) => {
        const active = value === def.value;
        return (
          <Pressable
            key={def.value}
            onPress={() => onChange(def.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            className={`rounded-full px-3 py-1.5 active:opacity-70 ${
              active ? "bg-primary" : "border border-border"
            }`}
          >
            <Text
              className={`text-xs font-medium ${active ? "text-primary-foreground" : "text-text-muted"}`}
            >
              {def.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function SectionLabel({ label, count }: { label: string; count: number }) {
  return (
    <View className="flex-row items-center gap-2 px-1">
      <Text className="text-sm font-semibold text-text-primary">{label}</Text>
      <View className="rounded-full bg-card-alt px-1.5 py-0.5">
        <Text className="text-[11px] text-text-muted">{count}</Text>
      </View>
    </View>
  );
}

// Mirrors the web CardGrid. React Native has no grid, so cards stack in one
// column on phones and wrap on wider screens.
function CardGrid({ children }: { children: React.ReactNode }) {
  return <View className="flex-col gap-3 sm:flex-row sm:flex-wrap">{children}</View>;
}

function MenteeView({
  loading,
  dispatches,
  tab,
  statusFilter,
  onStatusFilterChange,
  portionCluster,
}: {
  loading: boolean;
  dispatches: MenteeContentDispatch[];
  tab: ContentTab;
  statusFilter: StatusFilter;
  onStatusFilterChange: (v: StatusFilter) => void;
  portionCluster: string | null;
}) {
  const bySemester = dispatches.filter(
    (d) => !portionCluster || d.content_item.portion_cluster === portionCluster
  );
  const visible = bySemester.filter((d) => matchesStatusFilter(d, statusFilter));

  const toDo = visible.filter((d) => !DONE_STATUSES.includes(d.completion_status));
  const completed = visible.filter((d) => DONE_STATUSES.includes(d.completion_status));

  return (
    <View className="flex-col gap-4">
      <StatusFilterChips value={statusFilter} onChange={onStatusFilterChange} />

      {loading ? (
        <Text className="text-sm text-text-muted">Loading…</Text>
      ) : visible.length === 0 ? (
        <EmptyState
          title={`No ${tabNoun(tab, true)} yet`}
          description="Nothing matches the current filters, or nothing has been assigned to you here yet."
        />
      ) : (
        <View className="flex-col gap-5">
          <View className="flex-col gap-3">
            <SectionLabel label="To do" count={toDo.length} />
            {toDo.length === 0 ? (
              <Text className="px-1 text-xs text-text-muted">You're all caught up.</Text>
            ) : (
              <CardGrid>
                {toDo.map((d) => (
                  <MenteeContentCard
                    key={d.content_item.id}
                    dispatch={d}
                    href={`/assignments_and_courses/${d.content_item.id}` as any}
                  />
                ))}
              </CardGrid>
            )}
          </View>

          {completed.length > 0 && (
            <View className="flex-col gap-3">
              <SectionLabel label="Completed" count={completed.length} />
              <CardGrid>
                {completed.map((d) => (
                  <MenteeContentCard
                    key={d.content_item.id}
                    dispatch={d}
                    href={`/assignments_and_courses/${d.content_item.id}` as any}
                  />
                ))}
              </CardGrid>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

function StaffView({
  loading,
  items,
  weeks,
  tab,
  canCreate,
  onCreate,
  onEdit,
  onDelete,
}: {
  loading: boolean;
  items: ContentItemWithMeta[];
  weeks: Week[];
  tab: ContentTab;
  canCreate: boolean;
  onCreate: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => Promise<void>;
}) {
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
    <View className="flex-col gap-4">
      {canCreate && (
        <Pressable
          onPress={onCreate}
          accessibilityRole="button"
          className="inline-flex shrink-0 flex-row items-center gap-1.5 self-start rounded-full bg-primary px-4 py-2 active:opacity-70"
        >
          <Plus size={16} color="#ffffff" />
          <Text className="text-sm font-medium text-primary-foreground">
            Create {tabNoun(tab, false)}
          </Text>
        </Pressable>
      )}

      {loading ? (
        <Text className="text-sm text-text-muted">Loading…</Text>
      ) : items.length === 0 ? (
        <EmptyState
          title={`No ${tabNoun(tab, true)} yet`}
          description="Nothing matches the current filters, or nothing has been created yet."
        />
      ) : (
        <View className="flex-col gap-3">
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
        </View>
      )}
    </View>
  );
}

function tabNoun(tab: ContentTab, plural: boolean): string {
  if (tab === "assignment") return plural ? "assignments" : "assignment";
  if (tab === "course") return plural ? "courses" : "course";
  return plural ? "resources" : "resource";
}