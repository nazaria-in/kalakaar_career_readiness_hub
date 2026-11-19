// /mobile/src/hooks/use-filter-state.ts
import * as React from "react";
import {
  EMPTY_FILTER_STATE,
  getDefaultSort,
  type FilterFieldDef,
  type FilterState,
  type FilterValue,
  type SortState,
} from "@repo/shared";

/**
 * Local, ephemeral filter/sort state for one view. `viewKey` just needs to
 * be stable and unique per screen (e.g. "assignments-list", "mentee-roster").
 * It's for debugging only and is not persisted anywhere.
 */
export function useFilterState(fieldDefs: FilterFieldDef[], viewKey: string) {
  const [filterState, setFilterState] = React.useState<FilterState>(EMPTY_FILTER_STATE);
  const [sortState, setSortState] = React.useState<SortState>(() => getDefaultSort(fieldDefs));

  const setValue = React.useCallback((key: string, value: FilterValue | undefined) => {
    setFilterState((prev) => {
      const next = { ...prev.values };
      if (value == null) delete next[key];
      else next[key] = value;
      return { ...prev, values: next };
    });
  }, []);

  const setSearch = React.useCallback((search: string) => {
    setFilterState((prev) => ({ ...prev, search }));
  }, []);

  const setSort = React.useCallback((key: string, direction: "asc" | "desc") => {
    setSortState({ key, direction });
  }, []);

  const clearAll = React.useCallback(() => {
    setFilterState(EMPTY_FILTER_STATE);
  }, []);

  // Derived during render, not stored in state.
  const hasActiveFilters =
    filterState.search.trim().length > 0 || Object.keys(filterState.values).length > 0;

  return {
    viewKey,
    filterState,
    sortState,
    setValue,
    setSearch,
    setSort,
    clearAll,
    hasActiveFilters,
  };
}

export type UseFilterStateReturn = ReturnType<typeof useFilterState>;