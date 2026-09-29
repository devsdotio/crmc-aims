export const projectQueryKeys = {
  all: ["projects"] as const,
  list: (filters?: { search?: string; status?: string }) =>
    [...projectQueryKeys.all, "list", filters ?? {}] as const,
  detail: (id: string) => [...projectQueryKeys.all, "detail", id] as const,
  expenses: (projectId: string) =>
    [...projectQueryKeys.all, "expenses", projectId] as const,
  progress: (projectId: string) =>
    [...projectQueryKeys.all, "progress", projectId] as const,
  progressSummaries: () =>
    [...projectQueryKeys.all, "progress-summaries"] as const,
  assets: (projectId: string, status?: string) =>
    [...projectQueryKeys.all, "assets", projectId, status ?? "all"] as const,
};

