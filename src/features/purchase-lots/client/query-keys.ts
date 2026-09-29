export const purchaseLotQueryKeys = {
  all: ["purchase-lots"] as const,
  list: (
    filters?: Record<string, string | boolean | number | string[] | undefined>
  ) => [...purchaseLotQueryKeys.all, "list", filters ?? {}] as const,
  detail: (id: string) => [...purchaseLotQueryKeys.all, "detail", id] as const,
};
