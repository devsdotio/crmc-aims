export const supplierQueryKeys = {
  all: ["suppliers"] as const,
  list: (filters?: { search?: string; status?: string; activeOnly?: boolean }) =>
    [...supplierQueryKeys.all, "list", filters ?? {}] as const,
};
