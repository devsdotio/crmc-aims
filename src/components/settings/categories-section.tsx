"use client";

import { useMemo, useState } from "react";
import {
  Boxes,
  FolderTree,
  Layers,
  Package,
  Plus,
  Search,
  Tag,
  X,
} from "lucide-react";
import type { CategoryItem, CategoryType } from "@/types/settings";
import { CategoryListItem } from "./category-list-item";
import { AddEditCategoryDialog } from "./add-edit-category-dialog";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { cn } from "@/lib/utils";

export interface CategoriesSectionProps {
  assetClasses: CategoryItem[];
  assetCategories: CategoryItem[];
  consumableClasses: CategoryItem[];
  consumableCategories: CategoryItem[];
  onSaveCategory: (categoryData: Partial<CategoryItem>) => void | Promise<void>;
  onDeleteCategory: (category: CategoryItem) => void;
}

type CategoryTab =
  | "all"
  | "asset_class"
  | "asset"
  | "consumable_class"
  | "consumable";

export function CategoriesSection({
  assetClasses,
  assetCategories,
  consumableClasses,
  consumableCategories,
  onSaveCategory,
  onDeleteCategory,
}: CategoriesSectionProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<CategoryItem | null>(null);
  const [dialogType, setDialogType] = useState<CategoryType>("asset");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<CategoryTab>("all");

  const handleAddCategory = (type: CategoryType = "asset") => {
    setEditTarget(null);
    setDialogType(type);
    setDialogOpen(true);
  };

  const handleEditCategory = (category: CategoryItem) => {
    setEditTarget(category);
    setDialogType(category.type);
    setDialogOpen(true);
  };

  const allCategories = useMemo(
    () => [
      ...assetClasses,
      ...assetCategories,
      ...consumableClasses,
      ...consumableCategories,
    ],
    [assetClasses, assetCategories, consumableClasses, consumableCategories],
  );

  const totalCount = allCategories.length;
  const totalAssetClassCount = assetClasses.length;
  const totalAssetsCount = assetCategories.length;
  const totalConsumableClassCount = consumableClasses.length;
  const totalConsumablesCount = consumableCategories.length;
  const totalItemCount = useMemo(
    () =>
      [...assetCategories, ...consumableCategories].reduce(
        (acc, c) => acc + (c.itemCount || 0),
        0,
      ),
    [assetCategories, consumableCategories],
  );

  const filteredCategories = useMemo(() => {
    return allCategories.filter((cat) => {
      if (activeTab !== "all" && cat.type !== activeTab) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchName = cat.name.toLowerCase().includes(query);
        const matchParent = (cat.parentName || "")
          .toLowerCase()
          .includes(query);
        if (!matchName && !matchParent) return false;
      }

      return true;
    });
  }, [allCategories, activeTab, searchQuery]);

  const addButtonType = ((): CategoryType => {
    if (activeTab === "consumable") return "consumable";
    if (activeTab === "consumable_class") return "consumable_class";
    if (activeTab === "asset_class") return "asset_class";
    if (activeTab === "asset") return "asset";
    return "asset";
  })();

  const addButtonLabel =
    activeTab === "consumable"
      ? "Add Consumable"
      : activeTab === "consumable_class"
        ? "Add Consumable Class"
        : activeTab === "asset_class"
          ? "Add Classification"
          : "Add Category";

  return (
    <div className="w-full space-y-4">
      <StatCardGrid columns={5} className="gap-3 -mt-1.5">
        <StatCard
          title="Total Categories"
          sublabel="CATALOG // TAXONOMY"
          value={totalCount}
          icon={FolderTree}
          tone="blue"
          badge={{ text: "Catalog Groups", pulse: true }}
          subtitle="Classification groups across institution"
        />

        <StatCard
          title="Asset Classifications"
          sublabel="GENERAL // CLASS"
          value={totalAssetClassCount}
          icon={Layers}
          tone="purple"
          toneValue={true}
          badge="General"
          subtitle="Broad groups like Computer Equipments"
          progress={{
            value: totalAssetClassCount,
            max: totalCount || 1,
          }}
        />

        <StatCard
          title="Asset Categories"
          sublabel="SPECIFIC // CAPITAL"
          value={totalAssetsCount}
          icon={Package}
          tone="purple"
          toneValue={true}
          badge="Equipment"
          subtitle="Monitors, keyboards & durable items"
          progress={{
            value: totalAssetsCount,
            max: totalCount || 1,
          }}
        />

        <StatCard
          title="Consumable Classifications"
          sublabel="GENERAL // CLASS"
          value={totalConsumableClassCount}
          icon={Layers}
          tone="emerald"
          toneValue={true}
          badge="General"
          subtitle="Broad groups like Stationery, Medical"
          progress={{
            value: totalConsumableClassCount,
            max: totalCount || 1,
          }}
        />

        <StatCard
          title="Consumable Groups"
          sublabel="STOCK // SUPPLIES"
          value={totalConsumablesCount}
          icon={Boxes}
          tone="emerald"
          toneValue={true}
          badge="Supplies"
          subtitle="Office, medical & consumable materials"
          progress={{
            value: totalConsumablesCount,
            max: totalCount || 1,
          }}
        />

        <StatCard
          title="Cataloged Items"
          sublabel="INVENTORY // COUNT"
          value={totalItemCount}
          icon={Tag}
          tone="amber"
          toneValue={true}
          badge="Items"
          subtitle="Total line items categorized"
        />
      </StatCardGrid>

      <div className="p-2 rounded-2xl border border-border bg-bg shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
          <input
            id="category-search"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search categories…"
            className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-border bg-bg text-text placeholder:text-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                document.getElementById("category-search")?.focus();
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-bg-subtle text-text-secondary cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto justify-between md:justify-end shrink-0 flex-wrap">
          <div
            role="tablist"
            className="flex items-center p-1 rounded-xl bg-bg-subtle border border-border text-xs font-medium overflow-x-auto"
          >
            {(
              [
                ["all", `All (${totalCount})`],
                ["asset_class", `Asset Class (${totalAssetClassCount})`],
                ["asset", `Assets (${totalAssetsCount})`],
                [
                  "consumable_class",
                  `Cons. Class (${totalConsumableClassCount})`,
                ],
                ["consumable", `Consumables (${totalConsumablesCount})`],
              ] as const
            ).map(([tab, label]) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={activeTab === tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-3 py-1.5 rounded-lg transition-colors duration-150 cursor-pointer text-xs font-semibold whitespace-nowrap",
                  activeTab === tab
                    ? "bg-bg text-text shadow-2xs"
                    : "text-text-secondary hover:text-text",
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleAddCategory("asset_class")}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border border-border bg-bg text-text hover:bg-bg-subtle active:scale-95 transition-colors cursor-pointer shadow-xs shrink-0 whitespace-nowrap"
            >
              <Layers className="h-4 w-4" strokeWidth={2.5} />
              <span>Add Asset Class</span>
            </button>
            <button
              type="button"
              onClick={() => handleAddCategory("consumable_class")}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border border-border bg-bg text-text hover:bg-bg-subtle active:scale-95 transition-colors cursor-pointer shadow-xs shrink-0 whitespace-nowrap"
            >
              <Layers className="h-4 w-4" strokeWidth={2.5} />
              <span>Add Cons. Class</span>
            </button>
            <button
              type="button"
              onClick={() => handleAddCategory(addButtonType)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:opacity-90 active:scale-95 transition-opacity cursor-pointer shadow-xs shrink-0 whitespace-nowrap"
            >
              <Plus className="h-4 w-4" strokeWidth={2.5} />
              <span>{addButtonLabel}</span>
            </button>
          </div>
        </div>
      </div>

      {filteredCategories.length === 0 ? (
        <div className="p-12 text-center bg-bg rounded-2xl border border-dashed border-border flex flex-col items-center justify-center">
          <div className="h-12 w-12 rounded-2xl bg-bg-subtle flex items-center justify-center text-text-secondary mb-3">
            <FolderTree className="h-6 w-6" />
          </div>
          <p className="text-sm font-bold text-text">No categories found</p>
          <p className="text-xs text-text-secondary mt-1 max-w-sm">
            {searchQuery
              ? `No categories match "${searchQuery}". Try a different keyword.`
              : "No categories have been created yet in this section."}
          </p>
          <button
            type="button"
            onClick={() =>
              handleAddCategory(
                activeTab === "consumable"
                  ? "consumable"
                  : activeTab === "asset_class"
                    ? "asset_class"
                    : "asset",
              )
            }
            className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            {activeTab === "consumable"
              ? "Create Consumable"
              : activeTab === "asset_class"
                ? "Create Classification"
                : "Create Category"}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredCategories.map((cat) => (
            <CategoryListItem
              key={cat.id}
              category={cat}
              onEdit={handleEditCategory}
              onDelete={onDeleteCategory}
            />
          ))}
        </div>
      )}

      <AddEditCategoryDialog
        isOpen={dialogOpen}
        type={dialogType}
        initialCategory={editTarget}
        assetClasses={assetClasses}
        consumableClasses={consumableClasses}
        onClose={() => {
          setDialogOpen(false);
          setEditTarget(null);
        }}
        onSave={onSaveCategory}
      />
    </div>
  );
}
