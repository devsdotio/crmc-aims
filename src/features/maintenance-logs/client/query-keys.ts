export const maintenanceQueryKeys = {
  all: ["maintenance-logs"] as const,
  lists: () => [...maintenanceQueryKeys.all, "list"] as const,
  list: (filters?: {
    openOnly?: boolean;
    search?: string;
    condition?: string;
    includeSandbox?: boolean;
  }) => [...maintenanceQueryKeys.lists(), filters ?? {}] as const,
  detail: (id: string) =>
    [...maintenanceQueryKeys.all, "detail", id] as const,
};
