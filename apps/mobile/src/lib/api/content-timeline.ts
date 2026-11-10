// apps/mobile/src/lib/api/content-timeline.ts
import { useQuery } from "@tanstack/react-query";
import { fetchContentItemsDueInRange, fetchMenteeContentDispatchesInRange } from "@repo/shared";
import { supabase } from "../supabase/client";

export function useMenteeDispatches(userId: string | null, rangeStart?: string, rangeEnd?: string) {
  return useQuery({
    queryKey: ["content-dispatches-timeline", userId, rangeStart, rangeEnd],
    queryFn: () => fetchMenteeContentDispatchesInRange(supabase, userId!, rangeStart!, rangeEnd!),
    enabled: Boolean(userId && rangeStart && rangeEnd),
  });
}

export function useContentItemsDue(rangeStart?: string, rangeEnd?: string, scopeToCreatedBy?: string) {
  return useQuery({
    queryKey: ["content-items-timeline", rangeStart, rangeEnd, scopeToCreatedBy],
    queryFn: () => fetchContentItemsDueInRange(supabase, rangeStart!, rangeEnd!, scopeToCreatedBy),
    enabled: Boolean(rangeStart && rangeEnd),
  });
}