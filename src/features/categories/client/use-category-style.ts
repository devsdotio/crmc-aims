"use client";

import { useCallback } from "react";

import { getCategoryStyle, type CategoryStyleMeta } from "@/constants/categories";
import { isUuid } from "@/lib/sanitize-display";
import { useCategoriesQuery } from "./use-categories";

const UNRESOLVED_CATEGORY: CategoryStyleMeta = {
  bg: "bg-slate-700",
  text: "text-white font-bold",
  label: "Uncategorized",
  cssVar: "var(--color-text-secondary)",
};

export type CategoryStyleResolver = (
  category?: string | null
) => CategoryStyleMeta;

/**
 * Resolves a stored category value — which may be a settings category id, a
 * category name, or a legacy built-in slug — into display metadata.
 */
export function useCategoryStyleResolver(): CategoryStyleResolver {
  const { data: categories = [] } = useCategoriesQuery();

  return useCallback(
    (category) => {
      const raw = category?.trim() ?? "";
      if (!raw) return getCategoryStyle("");

      const match = categories.find(
        (c) => c.id === raw || c.name.toLowerCase() === raw.toLowerCase()
      );
      if (match) {
        return getCategoryStyle(match.id, match.name, match.colorToken);
      }

      // An id that no longer matches a category must never reach the screen.
      if (isUuid(raw)) return UNRESOLVED_CATEGORY;

      return getCategoryStyle(raw);
    },
    [categories]
  );
}
