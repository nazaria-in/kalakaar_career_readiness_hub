// packages/shared/src/query.ts

/** Shared TanStack Query defaults. Web and mobile both build their QueryClient from these. */
export const QUERY_DEFAULTS = {
  staleTime: 30_000,
  // Fail fast and visibly on RLS permission errors instead of retrying silently.
  retry: 1,
} as const;