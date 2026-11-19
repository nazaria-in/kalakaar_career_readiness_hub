// /src/components/shared/CollapsibleSection.tsx
import * as React from "react";
import { Pressable, Text, View } from "react-native";
import { ChevronDown } from "lucide-react-native";

export interface CollapsibleSectionProps {
  title: string;
  count?: number;
  defaultOpen?: boolean;
  accentClassName?: string;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function CollapsibleSection({
  title,
  count,
  defaultOpen = true,
  accentClassName,
  headerRight,
  children,
  className = "",
}: CollapsibleSectionProps) {
  const [open, setOpen] = React.useState(defaultOpen);

  return (
    <View className={`rounded-2xl border border-border bg-surface ${className}`}>
      <View className="flex-row items-center justify-between gap-3 px-4 py-3.5">
        <Pressable
          onPress={() => setOpen((o) => !o)}
          accessibilityRole="button"
          accessibilityLabel={`${open ? "Collapse" : "Expand"} ${title}`}
          accessibilityState={{ expanded: open }}
          className="min-w-0 flex-1 flex-row items-center gap-2.5 active:opacity-70"
        >
          <ChevronDown
            size={16}
            className={`text-text-primary/50  ${open ? "rotate-180" : ""}`}
          />
          <View className={`h-2 w-2 shrink-0 rounded-full ${accentClassName ?? "bg-primary"}`} />
          <Text
            numberOfLines={1}
            className="min-w-0 flex-shrink font-heading text-base font-semibold text-text-primary "
          >
            {title}
          </Text>
          {typeof count === "number" ? (
            <View className="shrink-0 rounded-full bg-secondary px-2 py-0.5 ">
              <Text className="text-[11px] font-medium text-secondary-foreground ">
                {count}
              </Text>
            </View>
          ) : null}
        </Pressable>
        {headerRight ? <View className="shrink-0 flex-row items-center">{headerRight}</View> : null}
      </View>

      {open ? (
        <View className="gap-3 border-t border-border/45 p-4 pt-3.5 ">
          {children}
        </View>
      ) : null}
    </View>
  );
}