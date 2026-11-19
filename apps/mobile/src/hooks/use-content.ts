// apps/mobile/src/hooks/use-content.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ContentType, FetchContentItemsParams } from "@repo/shared";
import {
  fetchMenteeContentDispatches,
  fetchDispatchById,
  fetchDispatchesForContentItem,
  fetchMyDispatchForItem,
  markDispatchComplete,
  unmarkDispatchComplete,
} from "../lib/api/content-dispatches";
import {
  fetchContentItems,
  fetchContentItem,
  fetchPortionClusters,
  fetchWeeks,
  fetchTags,
} from "../lib/api/content-items";

/** Single source of truth for query keys, so invalidation matches across screens. */
export const contentKeys = {
  menteeDispatches: (menteeId: string | null, contentType: ContentType) =>
    ["content-dispatches", "mentee", contentType, menteeId] as const,
  dispatch: (dispatchId: string | undefined) => ["content-dispatch", dispatchId] as const,
  myDispatch: (contentItemId: string | undefined, menteeId: string | null) =>
    ["my-dispatch", contentItemId, menteeId] as const,
  items: (contentType: ContentType, mentorId: string | null) =>
    ["content-items", "list", contentType, mentorId] as const,
  item: (id: string | undefined) => ["content-item", id] as const,
  roster: (contentItemId: string | undefined, contentType: ContentType) =>
    ["content-item-roster", contentItemId, contentType] as const,
  tags: ["tags"] as const,
  weeks: ["weeks"] as const,
  portionClusters: ["portion-clusters"] as const,
};

export function useMenteeDispatches(menteeId: string | null, contentType: ContentType) {
  return useQuery({
    queryKey: contentKeys.menteeDispatches(menteeId, contentType),
    queryFn: () => fetchMenteeContentDispatches(menteeId!, contentType),
    enabled: !!menteeId,
  });
}

export function useStaffContentItems(
  contentType: ContentType,
  scope: FetchContentItemsParams["scopeToMentor"] | undefined,
  enabled: boolean
) {
  return useQuery({
    queryKey: contentKeys.items(contentType, scope?.mentorId ?? null),
    queryFn: () =>
      fetchContentItems({
        contentType,
        fieldDefs: [],
        filterState: { search: "", values: {} },
        sortState: { key: "created_at", direction: "desc" },
        scopeToMentor: scope,
      }),
    enabled,
  });
}

export function useContentItem(id: string | undefined) {
  return useQuery({
    queryKey: contentKeys.item(id),
    queryFn: () => fetchContentItem(id!),
    enabled: !!id,
  });
}

/** Roster with completion status for staff/mentor review. */
export function useDispatchRoster(contentItemId: string | undefined, contentType: ContentType) {
  return useQuery({
    queryKey: contentKeys.roster(contentItemId, contentType),
    queryFn: () => fetchDispatchesForContentItem(contentItemId!, contentType),
    enabled: !!contentItemId,
  });
}

export function useMenteeDispatch(dispatchId: string | undefined) {
  return useQuery({
    queryKey: contentKeys.dispatch(dispatchId),
    queryFn: () => fetchDispatchById(dispatchId!),
    enabled: !!dispatchId,
  });
}

export function useMyDispatchForItem(contentItemId: string | undefined, menteeId: string | null) {
  return useQuery({
    queryKey: contentKeys.myDispatch(contentItemId, menteeId),
    queryFn: () => fetchMyDispatchForItem(contentItemId!, menteeId!),
    enabled: !!contentItemId && !!menteeId,
  });
}

/**
 * Mark complete / unmark. Mirrors web: writes the row and fires the
 * achievement notification. Notification failures come back as a warning,
 * so the UI can decide whether to show anything.
 */
export function useMarkComplete(contentItemId: string | undefined, contentType: ContentType) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      dispatchId,
      complete,
      actorId,
      menteeId,
      contentItemTitle,
    }: {
      dispatchId: string;
      complete: boolean;
      actorId: string;
      menteeId: string;
      contentItemTitle: string;
    }) => {
      if (!complete) {
        await unmarkDispatchComplete(dispatchId);
        return { notificationError: null };
      }
      return markDispatchComplete(dispatchId, actorId, menteeId, contentItemTitle);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: contentKeys.roster(contentItemId, contentType) });
    },
  });
}

export function useTags() {
  return useQuery({ queryKey: contentKeys.tags, queryFn: fetchTags });
}

export function useWeeks() {
  return useQuery({ queryKey: contentKeys.weeks, queryFn: fetchWeeks });
}

export function usePortionClusters() {
  return useQuery({ queryKey: contentKeys.portionClusters, queryFn: fetchPortionClusters });
}