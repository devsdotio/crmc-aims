export const purchaseLotQueryKeys = {
  all: ["purchase-lots"] as const,
  list: (filters?: Record<string, string | boolean | undefined>) =>
    [...purchaseLotQueryKeys.all, "list", filters ?? {}] as const,
  detail: (id: string) => [...purchaseLotQueryKeys.all, "detail", id] as const,
};
