import type { BorrowLogRecord } from "./borrow-log-api";

export const borrowLogQueryKeys = {
  all: ["borrow-log"] as const,
  lists: () => [...borrowLogQueryKeys.all, "list"] as const,
  list: (filters?: {
    status?: BorrowLogRecord["status"] | "closed";
    department?: string;
    search?: string;
    custodyKind?: "borrow" | "assignment" | "all";
    includeSandbox?: boolean;
    scope?: "department";
    page?: number;
    limit?: number;
  }) => [...borrowLogQueryKeys.lists(), filters ?? {}] as const,
  detail: (id: string) => [...borrowLogQueryKeys.all, "detail", id] as const,
};
