export const userQueryKeys = {
  all: ["users"] as const,
  me: () => [...userQueryKeys.all, "me"] as const,
  list: (filters?: { role?: string; status?: string; search?: string }) =>
    [...userQueryKeys.all, "list", filters ?? {}] as const,
};
