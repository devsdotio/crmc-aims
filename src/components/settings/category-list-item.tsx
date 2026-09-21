"use client";

import { Edit3, Trash2, Tag, Box, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { getCategoryStyle } from "@/constants/categories";
import type { CategoryItem } from "@/types/settings";

export interface CategoryListItemProps {
  category: CategoryItem;
  onEdit: (category: CategoryItem) => void;
  onDelete: (category: CategoryItem) => void;
}

export function getSwatchForName(name: string, colorToken?: string) {
  const style = getCategoryStyle(name, name, colorToken);
  return {
    bg: style.bg,
    text: style.text,
    border: "border-transparent",
  };
}

export function CategoryListItem({
  category,
  onEdit,
  onDelete,
}: CategoryListItemProps) {
  const isUsed = category.itemCount > 0;
  const categoryStyle = getCategoryStyle(
    category.name,
    category.name,
    category.colorToken,
  );
  const isAsset = category.type === "asset";

  return (
    <div className="group relative flex flex-col justify-between gap-3 p-4 bg-bg rounded-xl border border-border transition-colors hover:border-primary/40 hover:shadow-xs">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span
            className={cn(
              "inline-flex items-center justify-center h-9 w-9 rounded-xl text-xs font-bold shrink-0 shadow-2xs transition-transform duration-150 group-hover:scale-105",
              categoryStyle.bg,
              categoryStyle.text,
            )}
          >
            {isAsset ? (
              <Package className="h-4.5 w-4.5" />
            ) : (
              <Box className="h-4.5 w-4.5" />
            )}
          </span>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-text truncate">
                {category.name}
              </span>
              <span
                className={cn(
                  "inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider",
                  isAsset
                    ? "bg-blue-50 text-blue-700 border border-blue-200/60"
                    : "bg-emerald-50 text-emerald-700 border border-emerald-200/60",
                )}
              >
                {isAsset ? "Asset" : "Consumable"}
              </span>
            </div>
            <p className="text-xs text-text-secondary mt-0.5">
              {isAsset
                ? "Fixed equipment classification"
                : "Consumable inventory classification"}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={() => onEdit(category)}
            aria-label={`Edit category ${category.name}`}
            title="Edit category"
            className="p-2 rounded-lg border border-border bg-bg text-text-secondary hover:text-text hover:border-primary/50 hover:bg-bg-subtle transition-all cursor-pointer shadow-2xs"
          >
            <Edit3 className="h-3.5 w-3.5" />
          </button>

          {isUsed ? (
            <button
              type="button"
              disabled
              title={`${category.itemCount} items linked. Reassign them before deleting.`}
              className="p-2 rounded-lg border border-border/40 bg-bg-subtle text-text-secondary/40 cursor-not-allowed opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onDelete(category)}
              aria-label={`Delete category ${category.name}`}
              title="Delete category"
              className="p-2 rounded-lg border border-border bg-bg text-text-secondary hover:border-status-retired-bg hover:text-status-retired-text hover:bg-red-50/50 transition-all cursor-pointer shadow-2xs"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Footer item counter chip */}
      <div className="flex items-center justify-between pt-2 border-t border-border/60 text-xs">
        <span className="text-text-secondary text-[11px] font-medium">
          Associated Items
        </span>
        <span
          className={cn(
            "inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded-md text-xs",
            category.itemCount > 0
              ? "bg-bg-subtle text-text"
              : "bg-bg-subtle/50 text-text-secondary/60",
          )}
        >
          <Tag className="h-3 w-3 text-text-secondary" />
          <span>
            {category.itemCount}{" "}
            {isAsset
              ? category.itemCount === 1
                ? "asset"
                : "assets"
              : category.itemCount === 1
                ? "item"
                : "items"}
          </span>
        </span>
      </div>
    </div>
  );
}
