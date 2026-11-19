// /components/content/PortionClusterChips.tsx
import * as React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

interface PortionClusterChipsProps {
  clusters: string[];
  /** null means "All" (no semester filter). */
  value: string | null;
  onChange: (cluster: string | null) => void;
}

export function PortionClusterChips({ clusters, value, onChange }: PortionClusterChipsProps) {
  if (clusters.length === 0) return null;

  return (
    <View className="flex-row items-center gap-3">
      <Text className="shrink-0 text-xs font-medium text-text-muted ">
        Select Semester
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-2 pb-1"
        className="min-w-0 flex-1"
        accessibilityLabel="Select semester"
      >
        <Chip label="All" active={value === null} onPress={() => onChange(null)} />
        {clusters.map((cluster) => (
          <Chip
            key={cluster}
            label={cluster}
            active={value === cluster}
            onPress={() => onChange(cluster)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      className={`shrink-0 rounded-full px-3 py-1.5 active:opacity-70 ${
        active
          ? "bg-primary "
          : "border border-border bg-card  "
      }`}
    >
      <Text
        className={`whitespace-nowrap text-xs font-medium ${
          active
            ? "text-primary-foreground "
            : "text-text-muted "
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}