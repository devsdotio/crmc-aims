"use client";

import { useToast } from "@/components/providers/toast-context";
import { CategoriesSection } from "@/components/settings/categories-section";
import { QueryErrorBanner } from "@/components/shared/query-error-banner";
import {
  useCategoriesQuery,
  useCreateCategoryMutation,
  useDeleteCategoryMutation,
  useUpdateCategoryMutation,
} from "@/features/categories/client/use-categories";
import type { CategoryItem } from "@/types/settings";
import { Tags } from "lucide-react";

export default function CategoriesPage() {
  const {
    data: allCategories,
    isLoading: categoriesLoading,
    isError: categoriesError,
    error: categoriesErr,
    refetch: refetchCategories,
  } = useCategoriesQuery();

  const createCategoryMutation = useCreateCategoryMutation();
  const updateCategoryMutation = useUpdateCategoryMutation();
  const deleteCategoryMutation = useDeleteCategoryMutation();
  const toast = useToast();

  const assetCategories =
    allCategories?.filter((c) => c.type === "asset") || [];
  const consumableCategories =
    allCategories?.filter((c) => c.type === "consumable") || [];

  const handleSaveCategory = async (categoryData: Partial<CategoryItem>) => {
    try {
      if (categoryData.id && !categoryData.id.startsWith("cat-")) {
        await updateCategoryMutation.mutateAsync(categoryData);
        toast.success("Category updated.");
      } else {
        await createCategoryMutation.mutateAsync(categoryData);
        toast.success("Category created.");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save category.",
      );
      throw error;
    }
  };

  const handleDeleteCategory = async (category: CategoryItem) => {
    if (category.itemCount > 0) return;
    try {
      await deleteCategoryMutation.mutateAsync(category.id);
      toast.success("Category deleted.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete category.",
      );
    }
  };

  return (
    <div className="h-full flex flex-col min-h-0 overflow-hidden bg-bg-subtle">
      {/* Top Header */}
      <div className="px-4 md:px-6 py-4 bg-bg shrink-0 border-b border-border flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-text">
                Category Management
              </h1>
              <span className="px-2 py-0.5 text-xs font-bold bg-bg-subtle text-text-secondary rounded-full border border-border">
                {categoriesLoading
                  ? "Loading categories…"
                  : `${allCategories?.length ?? 0} categories`}
              </span>
            </div>
            <p className="text-xs text-text-secondary mt-0.5">
              Configure asset and consumable supply categories.
            </p>
          </div>
        </div>

      {/* Main Scoped Scroll Area */}
      <main className="flex-1 overflow-y-auto scrollbar-gutter-stable p-4 md:p-6 min-h-0">
        <div className="w-full space-y-6">
          {categoriesError ? (
            <QueryErrorBanner
              message={categoriesErr?.message || "Failed to load categories"}
              onRetry={() => void refetchCategories()}
            />
          ) : null}

          {categoriesLoading ? (
            <div className="space-y-6 animate-pulse">
              <div className="h-72 rounded-2xl bg-bg border border-border" />
              <div className="h-72 rounded-2xl bg-bg border border-border" />
            </div>
          ) : (
            <CategoriesSection
              assetCategories={assetCategories}
              consumableCategories={consumableCategories}
              onSaveCategory={handleSaveCategory}
              onDeleteCategory={handleDeleteCategory}
            />
          )}
        </div>
      </main>
    </div>
  );
}
