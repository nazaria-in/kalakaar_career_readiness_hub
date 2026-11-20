// packages/ui/src/components/Card.tsx
import type { ReactNode } from "react";
import { Text, View } from "../primitives";

type CardProps = {
  title: string;
  description?: string;
  children?: ReactNode;
};

export function Card({ title, description, children }: CardProps) {
  return (
<View className="rounded-xl border border-border bg-card p-4 gap-2">
  <View className="m-10 bg-green-300">
    <Text className="text-black">Hello red</Text>
  </View>
  <Text className="text-base font-semibold text-text-primary">{title}</Text>
  {description ? (
    <Text className="text-sm text-text-muted">{description}</Text>
  ) : null}
  {children ? <View className="mt-2 rounded-lg bg-card-alt p-3">{children}</View> : null}
</View>
  );
}