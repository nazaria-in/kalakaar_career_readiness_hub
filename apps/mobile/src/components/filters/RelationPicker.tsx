// /components/filters/RelationPicker.tsx
import type { SelectOption } from "@repo/shared";
import { EntityPicker } from "@/components/filters/EntityPicker";

export interface RelationPickerProps {
  label: string;
  value: string | undefined;
  options: SelectOption[];
  onChange: (value: string | undefined) => void;
}

// Visually identical to EntityPicker. Kept separate because the two kinds
// resolve to different query clauses in apply-filters.ts.
export function RelationPicker(props: RelationPickerProps) {
  return <EntityPicker {...props} />;
}