import type { BorrowRequest } from "./borrow-requests-api";

export const borrowRequestQueryKeys = {
  all: ["borrow-requests"] as const,
  lists: () => [...borrowRequestQueryKeys.all, "list"] as const,
  list: (filters?: {
    status?: BorrowRequest["status"];
    department?: string;
    search?: string;
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
    assetId?: string;
    requestType?: BorrowRequest["requestType"];
    includeSandbox?: boolean;
  }) => [...borrowRequestQueryKeys.lists(), filters ?? {}] as const,
  detail: (id: string) => [...borrowRequestQueryKeys.all, "detail", id] as const,
};
