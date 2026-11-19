// /components/filters/SortDropdown.tsx
import { Pressable, Text } from "react-native";
import { ArrowUpDown, Check } from "lucide-react-native";
import * as React from "react";
import type { FilterFieldDef, SortState } from "@repo/shared";
import { OptionSheet, type OptionSheetItem } from "@/components/filters/OptionSheet";

export interface SortDropdownProps {
  fieldDefs: FilterFieldDef[];
  sortState: SortState;
  onChange: (key: string, direction: "asc" | "desc") => void;
}

export function SortDropdown({ fieldDefs, sortState, onChange }: SortDropdownProps) {
  const [open, setOpen] = React.useState(false);
  const sortableFields = fieldDefs.filter((f) => "sortable" in f && f.sortable);

  if (sortableFields.length === 0) return null;

  const activeField = sortableFields.find((f) => f.key === sortState.key);
  const activeLabel = activeField
    ? "label" in activeField
      ? activeField.label
      : activeField.key
    : null;

  const items: OptionSheetItem[] = sortableFields.flatMap((field) => {
    const fieldLabel = "label" in field ? field.label : field.key;
    return (["asc", "desc"] as const).map((dir) => {
      const active = sortState.key === field.key && sortState.direction === dir;
      return {
        key: `${field.key}-${dir}`,
        label: `${fieldLabel} (${dir === "asc" ? "A→Z / oldest" : "Z→A / newest"})`,
        active,
        onPress: () => {
          onChange(field.key, dir);
          setOpen(false);
        },
        trailing: active ? <Check size={14} strokeWidth={2.5} className="text-primary-foreground " /> : null,
      };
    });
  });

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Sort"
        className="flex-row items-center gap-1.5 rounded-full border border-border px-3 py-1.5 active:opacity-70 "
      >
        <ArrowUpDown size={14} className="text-text-primary " />
        <Text className="text-xs font-medium text-text-primary ">
          {activeLabel ? `${activeLabel} (${sortState.direction})` : "Sort"}
        </Text>
      </Pressable>

      <OptionSheet visible={open} onClose={() => setOpen(false)} items={items} />
    </>
  );
}