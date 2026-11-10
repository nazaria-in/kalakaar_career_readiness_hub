// /lib/api/content-timeline.ts
import { supabase } from "@/lib/supabase/client";
import * as shared from "@repo/shared";

export const fetchContentItemsDueInRange = (
  rangeStartIso: string,
  rangeEndIso: string,
  scopeToCreatedBy?: string,
) => shared.fetchContentItemsDueInRange(supabase, rangeStartIso, rangeEndIso, scopeToCreatedBy);

export const fetchMenteeContentDispatchesInRange = (
  menteeId: string,
  rangeStartIso: string,
  rangeEndIso: string,
) => shared.fetchMenteeContentDispatchesInRange(supabase, menteeId, rangeStartIso, rangeEndIso);