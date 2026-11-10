import { useQuery } from "@tanstack/react-query";
import { fetchInPersonSessions } from "@repo/shared";
import { supabase } from "../supabase/client";

export function useInPersonSessions(rangeStart?: string, rangeEnd?: string) {
  return useQuery({
    queryKey: ["in-person-sessions", rangeStart, rangeEnd],
    queryFn: () => fetchInPersonSessions(supabase, rangeStart!, rangeEnd!),
    enabled: Boolean(rangeStart && rangeEnd),
  });
}