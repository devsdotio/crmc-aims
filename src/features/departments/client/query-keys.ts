export const departmentQueryKeys = {
  all: ["departments"] as const,
  list: () => [...departmentQueryKeys.all, "list"] as const,
};
