export const auditLogQueryKeys = {
  all: ["audit-logs"] as const,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  list: (filters?: Record<string, any>) =>
    [...auditLogQueryKeys.all, "list", filters] as const,
};
