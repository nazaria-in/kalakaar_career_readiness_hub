// /components/content/UpcomingContentWidget.tsx
import { View, Text } from "react-native";
import { useQueries } from "@tanstack/react-query";
import type { Href } from "expo-router";
import { type ContentType, type MenteeContentDispatch } from "@repo/shared";
import { MenteeContentCard } from "@/components/content/MenteeContentCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { supabase } from "@/lib/supabase/client";
import { fetchMenteeContentDispatches } from "@/lib/api/content-dispatches";


const CONTENT_TYPES: ContentType[] = ["assignment", "course", "resource"];

interface UpcomingContentWidgetProps {
  menteeId: string;
  /** Cap on how many items to show. The widget fetches everything, sorts, then slices. */
  limit?: number;
}

/**
 * Dashboard widget: a mentee's nearest not-yet-done items across all three
 * content types, sorted by due date (items with no due date sort last).
 * Reuses fetchMenteeContentDispatches per type (same source the
 * /assignments_and_courses list page uses) rather than a new query, so
 * "upcoming" here always matches what the mentee sees on that page,
 * including the submission-window gating already applied there.
 */
export function UpcomingContentWidget({ menteeId, limit = 5 }: UpcomingContentWidgetProps) {
  const queries = useQueries({
    queries: CONTENT_TYPES.map((contentType) => ({
      queryKey: ["content-dispatches", "mentee", contentType, menteeId],
      queryFn: () => fetchMenteeContentDispatches(menteeId, contentType),
    })),
  });

  const isLoading = queries.some((q) => q.isLoading);
  const hasError = queries.some((q) => q.isError);

  const allDispatches: MenteeContentDispatch[] = queries.flatMap((q) => q.data ?? []);
  const notDone = allDispatches.filter(
    (d) =>
      d.completion_status !== "completed" &&
      d.completion_status !== "approved_awaiting_completion"
  );

  const sorted = [...notDone].sort((a, b) => {
    if (!a.due_at && !b.due_at) return 0;
    if (!a.due_at) return 1;
    if (!b.due_at) return -1;
    return new Date(a.due_at).getTime() - new Date(b.due_at).getTime();
  });

  const visible = sorted.slice(0, limit);

  return (
    <View className="gap-3 rounded-2xl border border-border bg-card p-4  ">
      <Text className="text-sm font-semibold uppercase tracking-wide text-text-muted ">
        Upcoming
      </Text>

      {isLoading ? (
        <Text className="text-xs text-text-muted ">Loading…</Text>
      ) : hasError ? (
        <Text className="text-xs text-destructive ">
          Couldn&apos;t load upcoming items.
        </Text>
      ) : visible.length === 0 ? (
        <EmptyState title="You're all caught up" description="Nothing outstanding right now." />
      ) : (
        <View className="gap-3">
          {visible.map((d) => (
            <MenteeContentCard
              key={`${d.content_item.content_type}-${d.content_item.id}`}
              dispatch={d}
              href={`/assignments_and_courses/${d.content_item.id}` as Href}
            />
          ))}
        </View>
      )}
    </View>
  );
}