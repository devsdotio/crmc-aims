export const pettyCashQueryKeys = {
  all: ["petty-cash"] as const,
  list: (filters?: {
    search?: string;
    status?: string;
    category?: string;
    departmentId?: string;
    startDate?: string;
    endDate?: string;
  }) => [...pettyCashQueryKeys.all, "list", filters ?? {}] as const,
  detail: (id: string) => [...pettyCashQueryKeys.all, "detail", id] as const,
};
