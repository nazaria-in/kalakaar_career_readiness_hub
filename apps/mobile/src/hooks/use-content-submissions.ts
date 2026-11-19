// apps/mobile/src/hooks/use-content-submissions.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateSubmissionInput, ReviewSubmissionInput } from "@repo/shared";
import {
  createSubmission,
  fetchSubmissionsForDispatch,
  reviewSubmission,
} from "../lib/api/content-submissions";

export function useSubmissions(dispatchId: string | undefined) {
  return useQuery({
    queryKey: ["submissions", dispatchId],
    queryFn: () => fetchSubmissionsForDispatch(dispatchId!),
    enabled: !!dispatchId,
  });
}

export function useSubmitWork() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSubmissionInput) => createSubmission(input),
    onSuccess: (_result, input) => {
      qc.invalidateQueries({ queryKey: ["submissions", input.dispatchId] });
      qc.invalidateQueries({ queryKey: ["my-dispatch"] });
    },
  });
}

export function useReviewSubmission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ReviewSubmissionInput) => reviewSubmission(input),
    onSuccess: (_result, input) => {
      qc.invalidateQueries({ queryKey: ["submissions", input.contentDispatchId] });
      qc.invalidateQueries({ queryKey: ["content-item-roster"] });
    },
  });
}