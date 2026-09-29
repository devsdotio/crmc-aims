import type { AssetStatus } from "@/types/assets";

export const assetQueryKeys = {
  all: ["assets"] as const,
  lists: () => [...assetQueryKeys.all, "list"] as const,
  list: (filters?: {
    status?: AssetStatus;
    catalog?: boolean;
    includeSandbox?: boolean;
    search?: string;
    category?: string;
    availableOnly?: boolean;
    assignmentType?: "borrowable" | "assignable";
    modelId?: string;
  }) => [...assetQueryKeys.lists(), filters ?? {}] as const,
  detail: (id: string) => [...assetQueryKeys.all, "detail", id] as const,
  lifecycle: (id: string) => [...assetQueryKeys.all, "lifecycle", id] as const,
};
