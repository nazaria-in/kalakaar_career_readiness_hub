// /components/filters/FilterChip.tsx
import { Pressable, Text } from "react-native";

// Three-state cycle per press: not selected -> selected -> anti-selected -> not selected.
export type FilterChipState = "selected" | "anti-selected" | null;

interface FilterChipProps {
  label: string;
  state: FilterChipState;
  onChange: (next: FilterChipState) => void;
}

function nextState(state: FilterChipState): FilterChipState {
  if (state === null) return "selected";
  if (state === "selected") return "anti-selected";
  return null;
}

export function FilterChip({ label, state, onChange }: FilterChipProps) {
  const containerClass =
    state === "selected"
      ? "border-primary bg-primary  "
      : state === "anti-selected"
      ? "border-destructive/40 bg-destructive/10  "
      : "border-border bg-transparent ";

  const textClass =
    state === "selected"
      ? "text-primary-foreground "
      : state === "anti-selected"
      ? "text-destructive line-through "
      : "text-text-primary ";

  return (
    <Pressable
      onPress={() => onChange(nextState(state))}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: state !== null }}
      className={`rounded-full border px-3 py-1 active:opacity-70 ${containerClass}`}
    >
      <Text className={`text-xs font-medium ${textClass}`}>{label}</Text>
    </Pressable>
  );
}