"use client";

import { useState, useEffect, useMemo } from "react";
import { X, Tag, Check, Palette, Loader2, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CategoryItem, CategoryType } from "@/types/settings";
import {
  AVAILABLE_CATEGORY_COLORS,
  AVAILABLE_CATEGORY_ICONS,
  getCategoryStyle,
} from "@/constants/categories";
import { CategoryIcon } from "@/components/ui/category-icon";

export interface AddEditCategoryDialogProps {
  isOpen: boolean;
  type: CategoryType;
  initialCategory?: CategoryItem | null;
  /** Available asset classes when editing/creating a specific asset category. */
  assetClasses?: CategoryItem[];
  /** Available consumable classes when editing/creating a specific consumable category. */
  consumableClasses?: CategoryItem[];
  onClose: () => void;
  onSave: (categoryData: Partial<CategoryItem>) => void | Promise<void>;
}

function typeLabel(type: CategoryType): string {
  if (type === "asset_class") return "Asset Classification";
  if (type === "consumable_class") return "Consumable Classification";
  if (type === "asset") return "Asset Category";
  return "Consumable Category";
}

export function AddEditCategoryDialog({
  isOpen,
  type,
  initialCategory,
  assetClasses = [],
  consumableClasses = [],
  onClose,
  onSave,
}: AddEditCategoryDialogProps) {
  const isEditing = Boolean(initialCategory);
  const [name, setName] = useState("");
  const [colorToken, setColorToken] = useState("blue");
  const [iconToken, setIconToken] = useState("monitor");
  const [parentId, setParentId] = useState<string>("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const needsParent = type === "asset" || type === "consumable";

  const classOptions = useMemo(() => {
    const source =
      type === "consumable"
        ? consumableClasses.filter((c) => c.type === "consumable_class")
        : assetClasses.filter((c) => c.type === "asset_class");
    return source.slice().sort((a, b) => a.name.localeCompare(b.name));
  }, [type, assetClasses, consumableClasses]);

  const [prevOpenKey, setPrevOpenKey] = useState({
    isOpen: false,
    id: initialCategory?.id,
  });
  if (isOpen !== prevOpenKey.isOpen || initialCategory?.id !== prevOpenKey.id) {
    setPrevOpenKey({ isOpen, id: initialCategory?.id });
    if (isOpen) {
      if (initialCategory) {
        setName(initialCategory.name);
        setColorToken(initialCategory.colorToken || "blue");
        setIconToken(initialCategory.iconToken || "monitor");
        setParentId(initialCategory.parentId || "");
      } else {
        setName("");
        setColorToken("blue");
        setIconToken("monitor");
        setParentId("");
      }
      setError("");
    }
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const previewStyle = getCategoryStyle(
    name.trim() || "Category Preview",
    undefined,
    colorToken,
    iconToken
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    if (!name.trim()) {
      setError("Please enter the category name.");
      return;
    }
    if (needsParent && !parentId) {
      setError(
        type === "consumable"
          ? "Please select a general consumable classification."
          : "Please select a general asset classification.",
      );
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        id: initialCategory ? initialCategory.id : `cat-${Date.now()}`,
        name: name.trim(),
        type,
        colorToken,
        iconToken,
        parentId: needsParent ? parentId : null,
        itemCount: initialCategory ? initialCategory.itemCount : 0,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save category.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-opacity">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cat-dialog-title"
        className="relative w-full max-w-lg rounded-2xl border border-border bg-bg p-6 shadow-2xl z-10 animate-in fade-in zoom-in-95 duration-150 space-y-5"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/15 text-accent shrink-0">
              {type === "asset_class" || type === "consumable_class" ? (
                <Layers className="h-5 w-5" />
              ) : (
                <Tag className="h-5 w-5" />
              )}
            </div>
            <div>
              <h3
                id="cat-dialog-title"
                className="text-base font-bold text-text leading-tight"
              >
                {isEditing ? `Edit ${typeLabel(type)}` : `Add New ${typeLabel(type)}`}
              </h3>
              <p className="text-xs text-text-secondary mt-0.5">
                {type === "asset_class"
                  ? "Broad group for specific asset categories (e.g. Computer Equipments)"
                  : type === "consumable_class"
                    ? "Broad group for specific consumable categories (e.g. Stationery)"
                    : type === "asset"
                      ? "Specific category under a general classification (e.g. Monitors)"
                      : "Specific category under a general classification (e.g. Bond Paper)"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close category dialog"
            className="p-1 rounded-md text-text-secondary hover:text-text hover:bg-bg-subtle transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          {needsParent ? (
            <div className="space-y-1.5">
              <label
                htmlFor="cat-parent-select"
                className="block text-xs font-semibold text-text"
              >
                General Classification <span className="text-accent">*</span>
              </label>
              <select
                id="cat-parent-select"
                value={parentId}
                onChange={(e) => {
                  setParentId(e.target.value);
                  if (error) setError("");
                }}
                className="w-full h-9 px-3 text-xs bg-bg border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="">Select classification…</option>
                {classOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {classOptions.length === 0 ? (
                <p className="text-[11px] text-text-secondary">
                  {type === "consumable"
                    ? "Create a Consumable Classification first, then add specific categories under it."
                    : "Create an Asset Classification first, then add specific categories under it."}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-1.5">
            <label
              htmlFor="cat-name-input"
              className="block text-xs font-semibold text-text"
            >
              {type === "asset_class" || type === "consumable_class"
                ? "Classification Name"
                : "Category Name"}{" "}
              <span className="text-accent">*</span>
            </label>
            <input
              id="cat-name-input"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError("");
              }}
              placeholder={
                type === "asset_class"
                  ? "e.g. Computer Equipments, Furniture, Lab Instruments"
                  : type === "consumable_class"
                    ? "e.g. Stationery, Medical Supplies, Cleaning"
                    : type === "asset"
                      ? "e.g. Monitors, Keyboards, Desks"
                      : "e.g. Bond Paper, Ballpens, Gloves"
              }
              className="w-full h-9 px-3 text-xs bg-bg border border-border rounded-lg text-text placeholder:text-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <div className="p-3 bg-bg-subtle/70 rounded-xl border border-border flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-text-secondary">
              Badge Preview:
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-2xs",
                previewStyle.bg,
                previewStyle.text,
              )}
            >
              <CategoryIcon iconToken={previewStyle.iconToken} className="h-3 w-3 shrink-0" />
              {previewStyle.label}
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-text flex items-center gap-1.5">
                <Palette className="h-3.5 w-3.5 text-text-secondary" />
                Category Color
              </label>
              <span className="text-[11px] font-medium text-text-secondary capitalize">
                Selected: {colorToken}
              </span>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-48 overflow-y-auto p-1">
              {AVAILABLE_CATEGORY_COLORS.map((color) => {
                const isSelected = colorToken === color.id;
                return (
                  <button
                    key={color.id}
                    type="button"
                    onClick={() => setColorToken(color.id)}
                    className={cn(
                      "flex flex-col items-center justify-center p-2 rounded-xl border transition-all cursor-pointer select-none",
                      isSelected
                        ? "border-primary ring-2 ring-primary/30 bg-bg shadow-xs font-bold"
                        : "border-border/60 hover:border-border hover:bg-bg-subtle/50",
                    )}
                  >
                    <span
                      className={cn(
                        "h-6 w-6 rounded-full flex items-center justify-center shadow-2xs transition-transform",
                        color.bg,
                        isSelected && "scale-105",
                      )}
                    >
                      {isSelected && (
                        <Check className="h-3.5 w-3.5 text-white stroke-3" />
                      )}
                    </span>
                    <span className="text-[10px] text-text-secondary mt-1 truncate">
                      {color.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-text flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5 text-text-secondary" />
                Category Icon
              </label>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 max-h-40 overflow-y-auto p-1">
              {AVAILABLE_CATEGORY_ICONS.map((icon) => {
                const isSelected = iconToken === icon.id;
                return (
                  <button
                    key={icon.id}
                    type="button"
                    onClick={() => setIconToken(icon.id)}
                    className={cn(
                      "flex flex-col items-center justify-center p-2 rounded-xl border transition-all cursor-pointer select-none",
                      isSelected
                        ? "border-primary ring-2 ring-primary/30 bg-bg shadow-xs font-bold text-primary"
                        : "border-border/60 hover:border-border hover:bg-bg-subtle/50 text-text-secondary",
                    )}
                    title={icon.name}
                  >
                    <CategoryIcon iconToken={icon.id} className="h-5 w-5" />
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <p className="text-xs font-bold text-status-outofservice-text">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-xs font-semibold text-text-secondary hover:text-text rounded-md border border-border bg-bg transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || (needsParent && classOptions.length === 0)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-md bg-accent text-accent-foreground hover:opacity-90 transition-opacity cursor-pointer shadow-xs disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" strokeWidth={2.5} />
              )}
              {isSaving
                ? "Saving…"
                : isEditing
                  ? "Save Changes"
                  : type === "asset_class" || type === "consumable_class"
                    ? "Create Classification"
                    : "Create Category"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
