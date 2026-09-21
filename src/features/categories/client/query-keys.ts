export const categoryQueryKeys = {
  all: ["categories"] as const,
  list: () => [...categoryQueryKeys.all, "list"] as const,
};
