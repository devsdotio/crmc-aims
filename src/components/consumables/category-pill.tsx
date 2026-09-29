"use client";

import { Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CategoryStyleMeta } from "@/constants/categories";

interface CategoryPillProps {
  category: string;
  className?: string;
  getCategoryStyle: (categoryName: string, fallbackLabel?: string) => CategoryStyleMeta;
}

/**
 * Keeps long or multi-line category names from changing row/card dimensions.
 * The full normalized label remains available through the native tooltip.
 */
export function CategoryPill({ category, className, getCategoryStyle }: CategoryPillProps) {
  const categoryMeta = getCategoryStyle(category);
  const label = categoryMeta.label.replace(/\s+/g, " ").trim();

  return (
    <span
      title={label}
      aria-label={`Category: ${label}`}
      className={cn(
        "inline-flex h-5 max-w-36 min-w-0 items-center gap-1 rounded-full px-2.5",
        "text-[10px] font-bold uppercase tracking-wider shadow-2xs",
        categoryMeta.bg,
        categoryMeta.text,
        className
      )}
    >
      <Tag className="h-2.5 w-2.5 shrink-0" aria-hidden="true" />
      <span className="min-w-0 truncate whitespace-nowrap">{label}</span>
    </span>
  );
}
