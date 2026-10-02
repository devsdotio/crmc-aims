"use client";
import { useMemo } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import type { CategoryItem } from "@/types/settings";
import { fetchJson, type ApiResponse } from "@/features/shared/fetch-json";
import { getCategoryStyle, type CategoryStyleMeta } from "@/constants/categories";
import {
  invalidateDomains,
  type CacheDomain,
} from "@/features/shared/cache-invalidation";
import { categoryQueryKeys } from "./query-keys";

/** Renaming or removing a category affects labels across inventory and requests. */
const CATEGORY_CHANGE_DOMAINS = [
  "categories",
  "assets",
  "consumables",
  "borrowRequests",
  "consumableRequests",
  "dashboard",
  "maintenance",
  "purchaseLots",
] as const satisfies readonly CacheDomain[];

function invalidateCategoryChange(queryClient: ReturnType<typeof useQueryClient>) {
  void invalidateDomains(queryClient, CATEGORY_CHANGE_DOMAINS);
  queryClient.invalidateQueries({ queryKey: ["asset-models"] });
}

async function fetchCategories(): Promise<CategoryItem[]> {
  const result = await fetchJson<ApiResponse<CategoryItem[]>>("/api/categories");
  return result.data;
}

async function createCategory(payload: Partial<CategoryItem>): Promise<CategoryItem> {
  const result = await fetchJson<ApiResponse<CategoryItem>>("/api/categories", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return result.data;
}

async function updateCategory(payload: Partial<CategoryItem>): Promise<CategoryItem> {
  const result = await fetchJson<ApiResponse<CategoryItem>>(
    `/api/categories/${payload.id}`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    }
  );
  return result.data;
}

async function deleteCategory(id: string): Promise<void> {
  await fetchJson(`/api/categories/${id}`, {
    method: "DELETE",
  });
}

export function useCategoriesQuery(options?: {
  enabled?: boolean;
}): UseQueryResult<CategoryItem[], Error> {
  return useQuery({
    queryKey: categoryQueryKeys.list(),
    queryFn: fetchCategories,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: options?.enabled ?? true,
  });
}

/**
 * Returns a helper function that resolves CategoryStyleMeta using custom colors from Settings.
 */
export function useCategoryStyleMap() {
  const { data: categories = [] } = useCategoriesQuery();

  return useMemo(() => {
    const tokenMap = new Map<string, { color?: string; icon?: string }>();
    for (const cat of categories) {
      if (cat.name) {
        tokenMap.set(cat.name.trim().toLowerCase(), {
          color: cat.colorToken,
          icon: cat.iconToken,
        });
      }
    }

    return {
      categories,
      getCategoryStyle: (
        categoryName: string,
        fallbackLabel?: string
      ): CategoryStyleMeta => {
        const tokens = tokenMap.get((categoryName || "").trim().toLowerCase());
        return getCategoryStyle(categoryName, fallbackLabel, tokens?.color, tokens?.icon);
      },
    };
  }, [categories]);
}

export function useCreateCategoryMutation(): UseMutationResult<
  CategoryItem,
  Error,
  Partial<CategoryItem>
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCategory,
    onMutate: async (newCategory) => {
      await queryClient.cancelQueries({ queryKey: categoryQueryKeys.all });
      const previousCategories = queryClient.getQueryData<CategoryItem[]>(categoryQueryKeys.list());

      if (previousCategories) {
        queryClient.setQueryData<CategoryItem[]>(categoryQueryKeys.list(), [
          ...previousCategories,
          { ...newCategory, id: newCategory.id || `temp-${Date.now()}` } as CategoryItem
        ]);
      }
      return { previousCategories };
    },
    onError: (_err, _newCategory, context) => {
      if (context?.previousCategories) {
        queryClient.setQueryData(
          categoryQueryKeys.list(),
          context.previousCategories
        );
      }
    },
    onSuccess: (created) => {
      queryClient.setQueryData<CategoryItem[]>(categoryQueryKeys.list(), (prev) => {
        const withoutPending = (prev ?? []).filter(
          (row) =>
            row.id !== created.id &&
            !row.id.startsWith("cat-") &&
            !row.id.startsWith("temp-")
        );
        return [...withoutPending, created];
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: categoryQueryKeys.all });
    },
  });
}

export function useUpdateCategoryMutation(): UseMutationResult<
  CategoryItem,
  Error,
  Partial<CategoryItem>
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateCategory,
    onMutate: async (updatedCategory) => {
      await queryClient.cancelQueries({ queryKey: categoryQueryKeys.all });
      const previousCategories = queryClient.getQueryData<CategoryItem[]>(categoryQueryKeys.list());

      if (previousCategories) {
        queryClient.setQueryData<CategoryItem[]>(
          categoryQueryKeys.list(),
          previousCategories.map((cat) =>
            cat.id === updatedCategory.id ? { ...cat, ...updatedCategory } : cat
          )
        );
      }
      return { previousCategories };
    },
    onError: (_err, _updatedCategory, context) => {
      if (context?.previousCategories) {
        queryClient.setQueryData(
          categoryQueryKeys.list(),
          context.previousCategories
        );
      }
    },
    onSettled: () => {
      invalidateCategoryChange(queryClient);
    },
  });
}

export function useDeleteCategoryMutation(): UseMutationResult<
  void,
  Error,
  string
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteCategory,
    onMutate: async (deletedId) => {
      await queryClient.cancelQueries({ queryKey: categoryQueryKeys.all });
      const previousCategories = queryClient.getQueryData<CategoryItem[]>(categoryQueryKeys.list());

      if (previousCategories) {
        queryClient.setQueryData<CategoryItem[]>(
          categoryQueryKeys.list(),
          previousCategories.filter((cat) => cat.id !== deletedId)
        );
      }
      return { previousCategories };
    },
    onError: (_err, _deletedId, context) => {
      if (context?.previousCategories) {
        queryClient.setQueryData(
          categoryQueryKeys.list(),
          context.previousCategories
        );
      }
    },
    onSettled: () => {
      invalidateCategoryChange(queryClient);
    },
  });
}
