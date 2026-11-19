// /components/filters/DateRangePicker.tsx
import { Text, TextInput, View } from "react-native";
import type { DateRangeValue } from "@repo/shared";

export interface DateRangePickerProps {
  value: DateRangeValue;
  onChange: (range: DateRangeValue) => void;
}

const inputClass =
  "w-28 rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-text-primary placeholder:text-text-primary/40    ";

/**
 * Plain YYYY-MM-DD text entry, matching the form's DateField. Swap in a native
 * picker (e.g. @react-native-community/datetimepicker) later if wanted.
 */
export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  return (
    <View className="flex-row items-center gap-2">
      <TextInput
        value={value.from ?? ""}
        onChangeText={(from) => {
          // Keep the range valid: if `to` predates the new `from`, push it up too.
          const to = value.to && value.to < from ? from : value.to;
          onChange({ from: from || undefined, to });
        }}
        placeholder="From"
        keyboardType="numbers-and-punctuation"
        maxLength={10}
        accessibilityLabel="From date"
        className={inputClass}
      />
      <Text className="text-xs text-text-primary/50 ">to</Text>
      <TextInput
        value={value.to ?? ""}
        onChangeText={(to) => onChange({ from: value.from, to: to || undefined })}
        placeholder="To"
        keyboardType="numbers-and-punctuation"
        maxLength={10}
        accessibilityLabel="To date"
        className={inputClass}
      />
    </View>
  );
}