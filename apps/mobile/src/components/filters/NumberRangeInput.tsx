// /components/filters/NumberRangeInput.tsx
import { Text, TextInput, View } from "react-native";
import type { NumberRangeValue } from "@repo/shared";

export interface NumberRangeInputProps {
  label: string;
  value: NumberRangeValue;
  onChange: (value: NumberRangeValue) => void;
}

const inputClass =
  "w-16 rounded-lg border border-border bg-background px-2 py-1 text-xs text-text-primary placeholder:text-text-primary/40    ";

function parse(text: string): number | undefined {
  if (text.trim() === "") return undefined;
  const n = Number(text);
  return Number.isNaN(n) ? undefined : n;
}

export function NumberRangeInput({ label, value, onChange }: NumberRangeInputProps) {
  return (
    <View className="flex-row items-center gap-1.5">
      <Text className="text-xs font-medium text-text-primary/60 ">{label}</Text>
      <TextInput
        keyboardType="numeric"
        value={value.min?.toString() ?? ""}
        onChangeText={(text) => onChange({ ...value, min: parse(text) })}
        placeholder="Min"
        className={inputClass}
      />
      <Text className="text-text-primary/40 ">–</Text>
      <TextInput
        keyboardType="numeric"
        value={value.max?.toString() ?? ""}
        onChangeText={(text) => onChange({ ...value, max: parse(text) })}
        placeholder="Max"
        className={inputClass}
      />
    </View>
  );
}