export const consumableQueryKeys = {
  all: ["consumables"] as const,
  lists: () => [...consumableQueryKeys.all, "list"] as const,
  list: (filters?: {
    category?: string;
    classification?: string;
    stockLevel?: string;
    search?: string;
    page?: number;
    limit?: number;
    includeSandbox?: boolean;
  }) => [...consumableQueryKeys.lists(), filters ?? {}] as const,
  detail: (id: string) => [...consumableQueryKeys.all, "detail", id] as const,
};
