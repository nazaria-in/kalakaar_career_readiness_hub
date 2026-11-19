// /components/shared/EmptyState.tsx
import { Pressable, Text, View } from "react-native";

export interface EmptyStateProps {
  title: string;
  description?: string;
  action?: { label: string; onPress: () => void };
  className?: string;
}

export function EmptyState({ title, description, action, className = "" }: EmptyStateProps) {
  return (
    <View
      className={`items-center gap-2 rounded-2xl border border-dashed border-border p-6  ${className}`}
    >
      <Text className="text-center text-sm font-medium text-text-primary ">
        {title}
      </Text>
      {description ? (
        <Text className="text-center text-xs text-text-primary/60 ">
          {description}
        </Text>
      ) : null}
      {action ? (
        <Pressable
          onPress={action.onPress}
          accessibilityRole="button"
          className="mt-1 rounded-full bg-primary px-3 py-1.5 active:opacity-70 "
        >
          <Text className="text-xs font-medium text-primary-foreground ">
            {action.label}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}