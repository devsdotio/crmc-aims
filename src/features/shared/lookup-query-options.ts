/**
 * Shared TanStack Query options for rarely changing catalog / lookup lists
 * (departments, categories, suppliers, projects for pickers, users directory).
 */
export const LOOKUP_QUERY_OPTIONS = {
  staleTime: 10 * 60 * 1000,
  gcTime: 30 * 60 * 1000,
  refetchOnWindowFocus: false,
} as const;
