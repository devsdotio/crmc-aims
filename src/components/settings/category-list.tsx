"use client";

import { Plus } from "lucide-react";
import type { CategoryItem, CategoryType } from "@/types/settings";
import { CategoryListItem } from "./category-list-item";

export interface CategoryListProps {
  categories: CategoryItem[];
  type: CategoryType;
  title: string;
  description: string;
  onAddCategory: (type: CategoryType) => void;
  onEditCategory: (category: CategoryItem) => void;
  onDeleteCategory: (category: CategoryItem) => void;
}

export function CategoryList({
  categories,
  type,
  title,
  description,
  onAddCategory,
  onEditCategory,
  onDeleteCategory,
}: CategoryListProps) {
  return (
    <div className="p-6 rounded-2xl border border-border bg-bg space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h3 className="text-base font-bold text-text">{title}</h3>
          <p className="text-xs text-text-secondary mt-0.5">{description}</p>
        </div>

        <button
          type="button"
          onClick={() => onAddCategory(type)}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          Add Category
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {categories.length === 0 ? (
          <div className="col-span-full py-8 text-center bg-bg-subtle/50 rounded-xl border border-dashed border-border flex flex-col items-center justify-center">
            <p className="text-xs font-medium text-text-secondary">No categories found.</p>
            <p className="text-[11px] text-text-secondary/70 mt-1">Click &quot;Add Category&quot; to create one.</p>
          </div>
        ) : (
          categories.map((cat) => (
            <CategoryListItem
              key={cat.id}
              category={cat}
              onEdit={onEditCategory}
              onDelete={onDeleteCategory}
            />
          ))
        )}
      </div>
    </div>
  );
}
