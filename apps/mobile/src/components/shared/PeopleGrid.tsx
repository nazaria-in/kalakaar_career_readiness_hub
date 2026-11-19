// /components/shared/PeopleGrid.tsx
import * as React from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { List, LayoutGrid } from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import { useFilterState } from "@/hooks/use-filter-state";
import { SmartFilterBar } from "@/components/filters/SmartFilterBar";
import { FilterFieldDef, FilterState, SortState, UserCardPerson } from "@repo/shared";
import { UserCard } from "./UserCard";
import { WarningModal } from "./WarningModal";

export interface ExplicitGroup {
  key: string;
  label: string;
}

export interface PeopleGridProps {
  fieldDefs: FilterFieldDef[];
  viewKey: string;
  queryKey: unknown[];
  queryFn: (filterState: FilterState, sortState: SortState) => Promise<UserCardPerson[]>;
  renderActions?: (person: UserCardPerson) => React.ReactNode;
  /**
   * "pod" and "cohort" both just mean "derive a group label from each
   * person via groupKeyFn". PeopleGrid doesn't care what the label
   * represents. Nesting (cohort containing pods) isn't supported; pick
   * one grouping level per PeopleGrid instance.
   */
  groupBy?: "pod" | "cohort" | "none";
  groupKeyFn?: (person: UserCardPerson) => string;
  /**
   * Full set of groups to render, independent of who's currently fetched
   * into `data`, e.g. every cohort/team including ones with zero members
   * right now. When provided, every group here always renders (0/0 count
   * is fine, select-all is simply a no-op via the existing `disabled`
   * guard below). Groups are still sorted ascending by label regardless
   * of the order given here.
   */
  explicitGroups?: ExplicitGroup[];
  computeClickable?: (person: UserCardPerson) => boolean;
  emptyMessage?: string;
  defaultView?: "list" | "card";

  // ---- Picker / selectable mode (replaces PodMemberSelector) ----
  selectable?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  alreadyCommittedIds?: string[];
  onRemoveCommitted?: (id: string) => Promise<void>;
  preventEmptyCommitted?: boolean;
  removalWarningTitle?: string;
  removalWarningDescription?: (memberNames: string[]) => string;
  showSelectAllVisible?: boolean;
}

type ViewMode = "list" | "card";

const OTHER_GROUP_KEY = "__other__";

/** Natural/numeric alphabetical compare. "Team 2" sorts before "Team 10". */
function alphaCompare(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

/**
 * Sorts groups ascending by label, but always pushes catch-all buckets
 * ("Other", "No pod", "No cohort", etc.) to the end. Those aren't a real
 * alphabetical peer of the named groups, they're a leftover bucket.
 */
function sortGroupsAscending<T extends { key: string | null; label: string | null }>(groups: T[]): T[] {
  const isCatchAll = (g: T) => g.key === OTHER_GROUP_KEY || g.label === null;
  const named = groups.filter((g) => !isCatchAll(g));
  const catchAll = groups.filter(isCatchAll);
  named.sort((a, b) => alphaCompare(a.label ?? "", b.label ?? ""));
  return [...named, ...catchAll];
}

/** Sorts people within a single group/list by name. */
function sortPeopleAscending(people: UserCardPerson[]): UserCardPerson[] {
  return [...people].sort((a, b) => alphaCompare(a.fullName ?? "", b.fullName ?? ""));
}

export function PeopleGrid({
  fieldDefs,
  viewKey,
  queryKey,
  queryFn,
  renderActions,
  groupBy = "none",
  groupKeyFn,
  explicitGroups,
  computeClickable,
  emptyMessage = "No one matches these filters.",
  defaultView = "list",
  selectable = false,
  selectedIds,
  onSelectionChange,
  alreadyCommittedIds,
  onRemoveCommitted,
  preventEmptyCommitted = true,
  removalWarningTitle = "Remove from this assignment?",
  removalWarningDescription,
  showSelectAllVisible,
}: PeopleGridProps) {
  const [view, setView] = React.useState<ViewMode>(defaultView);
  const filterState = useFilterState(fieldDefs, viewKey);

  const { data, isLoading, error } = useQuery({
    queryKey: [...queryKey, filterState.filterState, filterState.sortState],
    queryFn: () => queryFn(filterState.filterState, filterState.sortState),
  });

  // Derived during render. Grouping + sorting is pure from data/props,
  // no effect needed.
  const groups = React.useMemo(() => {
    const people = data ?? [];
    if (groupBy === "none") return [{ key: null, label: null, people: sortPeopleAscending(people) }];

    const keyFn = groupKeyFn ?? (() => "Ungrouped");

    if (explicitGroups && explicitGroups.length > 0) {
      const buckets = new Map<string, UserCardPerson[]>(explicitGroups.map((g) => [g.key, []]));
      const otherBucket: UserCardPerson[] = [];
      for (const person of people) {
        const key = keyFn(person);
        const bucket = buckets.get(key);
        if (bucket) {
          bucket.push(person);
        } else {
          otherBucket.push(person);
        }
      }
      const result = explicitGroups.map((g) => ({
        key: g.key as string | null,
        label: g.label as string | null,
        people: sortPeopleAscending(buckets.get(g.key) ?? []),
      }));
      if (otherBucket.length > 0) {
        result.push({ key: OTHER_GROUP_KEY, label: "Other", people: sortPeopleAscending(otherBucket) });
      }
      return sortGroupsAscending(result);
    }

    const map = new Map<string, UserCardPerson[]>();
    for (const person of people) {
      const key = keyFn(person);
      const list = map.get(key) ?? [];
      list.push(person);
      map.set(key, list);
    }
    const result = Array.from(map.entries()).map(([key, members]) => ({
      key: key as string | null,
      label: key as string | null,
      people: sortPeopleAscending(members),
    }));
    return sortGroupsAscending(result);
  }, [data, groupBy, groupKeyFn, explicitGroups]);

  const value = selectedIds ?? [];
  const selectedSet = React.useMemo(() => new Set(value), [value]);
  const committedSet = React.useMemo(() => new Set(alreadyCommittedIds ?? []), [alreadyCommittedIds]);
  const allPeople = data ?? [];
  const nameFor = React.useCallback(
    (id: string) => allPeople.find((p) => p.id === id)?.fullName ?? "this member",
    [allPeople]
  );

  const visibleIds = React.useMemo(() => (data ?? []).map((p) => p.id), [data]);
  const visibleSelectedCount = visibleIds.filter((id) => selectedSet.has(id)).length;
  const allVisibleSelected = visibleIds.length > 0 && visibleSelectedCount === visibleIds.length;

  const [pendingRemovalIds, setPendingRemovalIds] = React.useState<string[] | null>(null);
  const [pendingBlocked, setPendingBlocked] = React.useState(false);
  const [removeError, setRemoveError] = React.useState<string | null>(null);
  const [isRemoving, setIsRemoving] = React.useState(false);

  function requestRemoval(ids: string[]) {
    const remainder = value.length - ids.length;
    if (preventEmptyCommitted && onRemoveCommitted && remainder <= 0) {
      setPendingBlocked(true);
      return;
    }
    setRemoveError(null);
    setPendingRemovalIds(ids);
  }

  function toggleAllVisible() {
    if (allVisibleSelected) {
      // Same committed-guard as toggleGroup. Don't silently strip committed
      // members, route them through the same removal confirmation.
      const committedInVisible = onRemoveCommitted ? visibleIds.filter((id) => committedSet.has(id)) : [];
      const plainRemovable = visibleIds.filter((id) => !committedInVisible.includes(id));
      if (plainRemovable.length > 0) onSelectionChange?.(value.filter((id) => !plainRemovable.includes(id)));
      if (committedInVisible.length > 0) requestRemoval(committedInVisible);
    } else {
      const merged = new Set(value);
      visibleIds.forEach((id) => merged.add(id));
      onSelectionChange?.(Array.from(merged));
    }
  }

  function toggleMember(id: string) {
    const isSelected = selectedSet.has(id);
    if (isSelected && committedSet.has(id) && onRemoveCommitted) {
      requestRemoval([id]);
      return;
    }
    onSelectionChange?.(isSelected ? value.filter((v) => v !== id) : [...value, id]);
  }

  // Works identically whether memberIds represents a pod or a whole
  // cohort. "Select everyone in this group" is the same operation either
  // way, which is why cohort-level "select all" doesn't need new logic,
  // just groupBy="cohort" upstream.
  function toggleGroup(memberIds: string[], allSelected: boolean) {
    if (memberIds.length === 0) return;
    if (allSelected) {
      const committedInGroup = onRemoveCommitted ? memberIds.filter((id) => committedSet.has(id)) : [];
      const plainRemovable = memberIds.filter((id) => !committedInGroup.includes(id));
      if (plainRemovable.length > 0) onSelectionChange?.(value.filter((id) => !plainRemovable.includes(id)));
      if (committedInGroup.length > 0) requestRemoval(committedInGroup);
    } else {
      const merged = new Set(value);
      memberIds.forEach((id) => merged.add(id));
      onSelectionChange?.(Array.from(merged));
    }
  }

  async function confirmRemoval() {
    if (!pendingRemovalIds || !onRemoveCommitted) return;
    setIsRemoving(true);
    setRemoveError(null);
    try {
      for (const id of pendingRemovalIds) {
        await onRemoveCommitted(id);
      }
      onSelectionChange?.(value.filter((id) => !pendingRemovalIds.includes(id)));
      setPendingRemovalIds(null);
    } catch (err) {
      setRemoveError(err instanceof Error ? err.message : "Couldn't remove this member. Try again.");
    } finally {
      setIsRemoving(false);
    }
  }

  const removalDescription = pendingRemovalIds
    ? removalWarningDescription
      ? removalWarningDescription(pendingRemovalIds.map(nameFor))
      : `This has already been assigned to ${pendingRemovalIds
          .map(nameFor)
          .join(", ")}. Do you wish to remove ${
          pendingRemovalIds.length > 1 ? "them" : "this person"
        }? This can't be undone.`
    : "";

  return (
    <View className="gap-4">
      <View className="flex-row items-center justify-between gap-3">
        <View className="min-w-0 flex-1">
          <SmartFilterBar fieldDefs={fieldDefs} state={filterState} />
        </View>
        <View className="shrink-0 flex-row rounded-full border border-border p-0.5 ">
          <ToggleIconButton
            label="List view"
            active={view === "list"}
            icon={List}
            onPress={() => setView("list")}
          />
          <ToggleIconButton
            label="Card view"
            active={view === "card"}
            icon={LayoutGrid}
            onPress={() => setView("card")}
          />
        </View>
      </View>

      {isLoading && <Text className="text-sm text-text-muted ">Loading…</Text>}
      {error && (
        <Text className="text-sm text-destructive ">
          {error instanceof Error ? error.message : "Couldn't load people."}
        </Text>
      )}
      {!isLoading && (data ?? []).length === 0 && !explicitGroups && (
        <Text className="text-sm text-text-muted ">{emptyMessage}</Text>
      )}

      {selectable && showSelectAllVisible && visibleIds.length > 0 && (
        <Pressable
          onPress={toggleAllVisible}
          accessibilityRole="button"
          className="w-fit self-start rounded-full border border-border px-3 py-1.5 active:opacity-70 "
        >
          <Text className="text-xs font-medium text-text-primary ">
            {allVisibleSelected ? "Clear all visible" : `Select all visible (${visibleIds.length})`}
          </Text>
        </Pressable>
      )}

      {groups.map((group) => {
        const memberIds = group.people.map((p) => p.id);
        const selectedCount = memberIds.filter((id) => selectedSet.has(id)).length;
        const allSelected = memberIds.length > 0 && selectedCount === memberIds.length;
        const someSelected = selectedCount > 0 && !allSelected;

        return (
          <View key={group.key ?? "all"} className="gap-2">
            {group.label &&
              (selectable ? (
                <GroupSelectAllHeader
                  label={group.label}
                  count={`${selectedCount}/${memberIds.length}`}
                  allSelected={allSelected}
                  someSelected={someSelected}
                  disabled={memberIds.length === 0}
                  onToggle={() => toggleGroup(memberIds, allSelected)}
                />
              ) : (
                <Text className="text-sm font-semibold text-text-muted ">{group.label}</Text>
              ))}

            {memberIds.length === 0 ? (
              <Text className="pl-1 text-xs text-text-muted/70 ">No members yet.</Text>
            ) : (
              <View className={view === "card" ? "flex-row flex-wrap gap-2" : "gap-2"}>
                {group.people.map((person) => (
                  <View key={person.id} className={view === "card" ? "w-full sm:w-[48%]" : "w-full"}>
                    {selectable ? (
                      <UserCard
                        person={person}
                        view={view}
                        clickable={false}
                        selected={selectedSet.has(person.id)}
                        onToggleSelect={() => toggleMember(person.id)}
                        committed={committedSet.has(person.id)}
                      />
                    ) : (
                      <UserCard
                        person={person}
                        view={view}
                        clickable={computeClickable?.(person) ?? false}
                      >
                        {renderActions?.(person)}
                      </UserCard>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        );
      })}

      {selectable && pendingRemovalIds && (
        <Pressable className="hidden" />
      )}

      {selectable && (
        <>
          <WarningModal
            open={!!pendingRemovalIds}
            onClose={() => {
              if (!isRemoving) {
                setPendingRemovalIds(null);
                setRemoveError(null);
              }
            }}
            onConfirm={confirmRemoval}
            variant="danger"
            title={removalWarningTitle}
            description={removalDescription}
            confirmLabel="Remove"
            isLoading={isRemoving}
            errorMessage={removeError}
          />

          <WarningModal
            open={pendingBlocked}
            onClose={() => setPendingBlocked(false)}
            title="Can't remove the last member"
            description="This needs at least one person assigned. To remove everyone, delete the assignment itself instead."
            variant="warning"
          />
        </>
      )}
    </View>
  );
}

function ToggleIconButton({
  label,
  active,
  icon: Icon,
  onPress,
}: {
  label: string;
  active: boolean;
  icon: LucideIcon;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      className={`rounded-full p-1.5 active:opacity-70 ${active ? "bg-primary " : ""}`}
    >
      <Icon
        size={16}
        className={active ? "text-primary-foreground " : "text-text-muted "}
      />
    </Pressable>
  );
}

/**
 * Group header with a tri-state checkbox. Pressing the row toggles the whole group.
 * The indeterminate state is shown as a dash on the checkbox box.
 */
function GroupSelectAllHeader({
  label,
  count,
  allSelected,
  someSelected,
  disabled,
  onToggle,
}: {
  label: string;
  count: string;
  allSelected: boolean;
  someSelected: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  const checkState = allSelected ? "checked" : someSelected ? "mixed" : "unchecked";

  return (
    <Pressable
      onPress={onToggle}
      disabled={disabled}
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked: allSelected ? true : someSelected ? "mixed" : false, disabled }}
      className={`flex-row items-center gap-2 border-b border-border pb-1.5  ${
        disabled ? "opacity-60" : "active:opacity-70"
      }`}
    >
      <View
        className={`h-4 w-4 items-center justify-center rounded border ${
          checkState === "unchecked"
            ? "border-border bg-card  "
            : "border-primary bg-primary  "
        }`}
      >
        {allSelected && <Text className="text-[10px] font-bold text-primary-foreground ">✓</Text>}
        {someSelected && <Text className="text-[10px] font-bold text-primary-foreground ">–</Text>}
      </View>
      <Text className="text-sm font-semibold text-text-muted ">{label}</Text>
      <Text className="ml-auto text-xs text-text-muted ">{count}</Text>
    </Pressable>
  );
}