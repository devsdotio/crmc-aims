export const voucherQueryKeys = {
  all: ["vouchers"] as const,
  lists: () => [...voucherQueryKeys.all, "list"] as const,
  list: (filters?: {
    search?: string;
    type?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    pageSize?: number;
    limit?: number;
    offset?: number;
  }) => [...voucherQueryKeys.lists(), filters ?? {}] as const,
  detail: (id: string) => [...voucherQueryKeys.all, "detail", id] as const,
};
