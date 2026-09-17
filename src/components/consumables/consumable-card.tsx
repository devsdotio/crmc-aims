"use client";

import { PlusCircle, SlidersHorizontal, Tag, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ConsumableItem } from "@/types/inventory";
import { StockLevelBar } from "./stock-level-bar";
import { useCategoryStyleMap } from "@/features/categories/client/use-categories";
import { SandboxBadge } from "@/components/shared/sandbox-badge";
import { consumableClassificationLabel } from "@/lib/consumable-classification";

export interface ConsumableCardProps {
  item: ConsumableItem;
  onSelect: (item: ConsumableItem) => void;
  onAdjust?: (item: ConsumableItem) => void;
  onDelete?: (item: ConsumableItem) => void;
}

export function ConsumableCard({
  item,
  onSelect,
  onAdjust,
  onDelete,
}: ConsumableCardProps) {
  const { getCategoryStyle } = useCategoryStyleMap();
  const categoryMeta = getCategoryStyle(item.category);

  return (
    <div
      onClick={() => onSelect(item)}
      tabIndex={0}
      role="button"
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(item);
        }
      }}
      className={cn(
        "group relative flex flex-col rounded-xl border border-border bg-bg overflow-hidden transition-all duration-200 cursor-pointer",
        "hover:shadow-md hover:border-primary/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      )}
    >
      <div className="flex items-center justify-between p-3.5 border-b border-border bg-bg-subtle/50 gap-2">
        <span className="font-mono text-xs font-bold text-text bg-bg px-2 py-0.5 rounded border border-border shrink-0">
          {item.itemCode}
        </span>
        <div className="flex flex-col items-end gap-0.5 min-w-0">
          <span className="text-[10px] font-semibold text-text-secondary truncate max-w-36">
            {consumableClassificationLabel(item.classification)}
          </span>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow-2xs",
              categoryMeta.bg,
              categoryMeta.text
            )}
          >
            <Tag className="h-2.5 w-2.5 shrink-0" />
            {categoryMeta.label}
          </span>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4 flex flex-col gap-3 flex-1">
        <h3 className="text-sm font-bold text-text leading-snug line-clamp-2 group-hover:text-accent transition-colors">
          {item.name}
          {item.isSandbox ? (
            <span className="ml-2 align-middle">
              <SandboxBadge />
            </span>
          ) : null}
        </h3>

        {/* Stock Level Bar Component */}
        <div className="mt-auto pt-2">
          <StockLevelBar
            currentQty={item.currentQty}
            minThreshold={item.minThreshold}
            unit={item.unit}
          />
          {(item.reservedQty ?? 0) > 0 && (
            <p className="mt-1.5 text-[11px] text-status-repair-text">
              {item.reservedQty} reserved · {item.availableQty ?? item.currentQty - item.reservedQty} available
            </p>
          )}
        </div>
      </div>

      {/* Card Footer Actions */}
      {(onAdjust || onDelete) && (
        <div
          className="px-4 py-2.5 bg-bg-subtle border-t border-border flex items-center justify-between"
          onClick={(e) => e.stopPropagation()}
        >
          {onAdjust ? (
            <button
              type="button"
              onClick={() => onAdjust(item)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500 hover:text-white transition-colors cursor-pointer text-[11px] font-semibold"
            >
              <SlidersHorizontal className="h-3 w-3" />
              Adjust
            </button>
          ) : (
            <span />
          )}
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(item)}
              title="Delete supply item"
              aria-label="Delete supply item"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-destructive/25 bg-destructive/10 text-destructive hover:bg-destructive hover:text-white transition-colors cursor-pointer text-[11px] font-semibold"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
