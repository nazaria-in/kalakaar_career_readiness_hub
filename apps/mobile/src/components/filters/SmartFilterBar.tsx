// /components/filters/SmartFilterBar.tsx
import { Pressable, Text, TextInput, View } from "react-native";
import { Search, X } from "lucide-react-native";
import type { FilterFieldDef, DateRangeValue, NumberRangeValue } from "@repo/shared";
import type { UseFilterStateReturn } from "@/hooks/use-filter-state";
import { FilterChip, type FilterChipState } from "@/components/filters/FilterChip";
import { DateRangePicker } from "@/components/filters/DateRangePicker";
import { EntityPicker } from "@/components/filters/EntityPicker";
import { RelationPicker } from "@/components/filters/RelationPicker";
import { NumberRangeInput } from "@/components/filters/NumberRangeInput";
import { SortDropdown } from "@/components/filters/SortDropdown";

export interface SmartFilterBarProps {
  fieldDefs: FilterFieldDef[];
  /** Pass the object returned by useFilterState() directly. */
  state: UseFilterStateReturn;
  className?: string;
}

export function SmartFilterBar({ fieldDefs, state, className = "" }: SmartFilterBarProps) {
  const { filterState, sortState, setValue, setSearch, setSort, clearAll, hasActiveFilters } = state;

  const hasSearchableField = fieldDefs.some((f) => f.kind === "text" && f.searchable);

  return (
    <View className={`gap-3 ${className}`}>
      <View className="flex-row flex-wrap items-center gap-3">
        {hasSearchableField && (
          <View className="min-w-[180px] flex-1 flex-row items-center gap-2 rounded-xl border border-border bg-background px-3 py-2  ">
            <Search size={16} className="text-text-primary/50 " />
            <TextInput
              value={filterState.search}
              onChangeText={setSearch}
              placeholder="Search…"
              accessibilityLabel="Search"
              className="flex-1 p-0 text-sm text-text-primary placeholder:text-text-primary/40  "
            />
          </View>
        )}

        <SortDropdown fieldDefs={fieldDefs} sortState={sortState} onChange={setSort} />
      </View>

      <View className="flex-row flex-wrap items-center gap-3">
        {fieldDefs.map((field) => {
          if (field.kind === "text" && field.searchable) return null; // rendered as the main search box

          switch (field.kind) {
            case "enum": {
              const current = (filterState.values[field.key] as Record<string, FilterChipState>) ?? {};
              return (
                <View key={field.key} className="flex-row flex-wrap items-center gap-1.5">
                  <Text className="text-xs font-medium text-text-primary/60 ">
                    {field.label}
                  </Text>
                  {field.options.map((opt) => (
                    <FilterChip
                      key={opt.value}
                      label={opt.label}
                      state={current[opt.value] ?? null}
                      onChange={(next) => setValue(field.key, { ...current, [opt.value]: next })}
                    />
                  ))}
                </View>
              );
            }

            case "boolean": {
              const active = filterState.values[field.key] === true;
              return (
                <Pressable
                  key={field.key}
                  onPress={() => setValue(field.key, active ? undefined : true)}
                  accessibilityRole="button"
                  accessibilityLabel={field.chipLabel}
                  accessibilityState={{ selected: active }}
                  className={`rounded-full border px-3 py-1 active:opacity-70 ${
                    active
                      ? "border-primary bg-primary  "
                      : "border-border bg-transparent "
                  }`}
                >
                  <Text
                    className={`text-xs font-medium ${
                      active
                        ? "text-primary-foreground "
                        : "text-text-primary "
                    }`}
                  >
                    {field.chipLabel}
                  </Text>
                </Pressable>
              );
            }

            case "dateRange": {
              const range = (filterState.values[field.key] as DateRangeValue) ?? {};
              return (
                <DateRangePicker
                  key={field.key}
                  value={range}
                  onChange={(next) => setValue(field.key, next)}
                />
              );
            }

            case "numberRange": {
              const range = (filterState.values[field.key] as NumberRangeValue) ?? {};
              return (
                <NumberRangeInput
                  key={field.key}
                  label={field.label}
                  value={range}
                  onChange={(next) => setValue(field.key, next)}
                />
              );
            }

            case "entity": {
              const current = filterState.values[field.key] as string | undefined;
              return (
                <EntityPicker
                  key={field.key}
                  label={field.label}
                  value={current}
                  options={field.options}
                  onChange={(next) => setValue(field.key, next)}
                />
              );
            }

            case "relation": {
              const current = filterState.values[field.key] as string | undefined;
              return (
                <RelationPicker
                  key={field.key}
                  label={field.label}
                  value={current}
                  options={field.options}
                  onChange={(next) => setValue(field.key, next)}
                />
              );
            }

            case "computed": {
              const current = (filterState.values[field.key] as Record<string, FilterChipState>) ?? {};
              return (
                <View key={field.key} className="flex-row flex-wrap items-center gap-1.5">
                  <Text className="text-xs font-medium text-text-primary/60 ">
                    {field.label}
                  </Text>
                  {field.options.map((opt) => (
                    <FilterChip
                      key={opt.value}
                      label={opt.label}
                      state={current[opt.value] ?? null}
                      onChange={(next) => setValue(field.key, { ...current, [opt.value]: next })}
                    />
                  ))}
                </View>
              );
            }

            default:
              return null;
          }
        })}

        {hasActiveFilters && (
          <Pressable
            onPress={clearAll}
            accessibilityRole="button"
            accessibilityLabel="Clear all filters"
            className="flex-row items-center gap-1 rounded-full px-2.5 py-1.5 active:opacity-70"
          >
            <X size={12} className="text-destructive " />
            <Text className="text-xs font-medium text-destructive ">Clear all</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}