// /components/filters/EntityPicker.tsx
import * as React from "react";
import { Pressable, Text } from "react-native";
import { Check } from "lucide-react-native";
import type { SelectOption } from "@repo/shared";
import { OptionSheet, type OptionSheetItem } from "@/components/filters/OptionSheet";

export interface EntityPickerProps {
  label: string;
  value: string | undefined;
  options: SelectOption[];
  onChange: (value: string | undefined) => void;
}

export function EntityPicker({ label, value, options, onChange }: EntityPickerProps) {
  const [open, setOpen] = React.useState(false);
  const currentLabel = options.find((o) => o.value === value)?.label;

  function pick(next: string | undefined) {
    onChange(next);
    setOpen(false);
  }

  const items: OptionSheetItem[] = [
    { key: "__any__", label: "Any", active: value === undefined, muted: true, onPress: () => pick(undefined) },
    ...options.map((opt) => {
      const active = value === opt.value;
      return {
        key: opt.value,
        label: opt.label,
        active,
        onPress: () => pick(opt.value),
        trailing: active ? <Check size={14} className="text-primary-foreground " /> : null,
      };
    }),
  ];

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={label}
        className={`flex-row items-center gap-1.5 rounded-full border px-3 py-1.5 active:opacity-70 ${
          value
            ? "border-primary bg-primary/10  "
            : "border-border bg-transparent "
        }`}
      >
        <Text
          className={`text-xs font-medium ${
            value
              ? "text-text-accent "
              : "text-text-primary "
          }`}
        >
          {currentLabel ?? label}
        </Text>
      </Pressable>

      <OptionSheet visible={open} onClose={() => setOpen(false)} items={items} />
    </>
  );
}