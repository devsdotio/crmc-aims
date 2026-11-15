import type { ConsumableRequestKind } from "@/lib/consumable-classification";
import type { ConsumableRequest } from "./consumable-requests-api";

export const consumableRequestQueryKeys = {
  all: ["consumable-requests"] as const,
  lists: () => [...consumableRequestQueryKeys.all, "list"] as const,
  list: (filters?: {
    status?: ConsumableRequest["status"];
    classification?: ConsumableRequestKind;
    department?: string;
    search?: string;
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
    includeSandbox?: boolean;
    fetchAll?: boolean;
  }) => [...consumableRequestQueryKeys.lists(), filters ?? {}] as const,
  detail: (id: string) =>
    [...consumableRequestQueryKeys.all, "detail", id] as const,
};
