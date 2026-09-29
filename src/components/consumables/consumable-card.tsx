"use client";

import { SlidersHorizontal, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ConsumableItem } from "@/types/inventory";
import type { CategoryStyleMeta } from "@/constants/categories";
import { StockLevelBar } from "./stock-level-bar";
import { CategoryPill } from "./category-pill";
import { consumableClassificationLabel } from "@/lib/consumable-classification";

export interface ConsumableCardProps {
  item: ConsumableItem;
  onSelect: (item: ConsumableItem) => void;
  onAdjust?: (item: ConsumableItem) => void;
  onDelete?: (item: ConsumableItem) => void;
  getCategoryStyle: (categoryName: string, fallbackLabel?: string) => CategoryStyleMeta;
}

export function ConsumableCard({
  item,
  onSelect,
  onAdjust,
  onDelete,
  getCategoryStyle,
}: ConsumableCardProps) {
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
      <div className="grid grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] items-center p-3.5 border-b border-border bg-bg-subtle/50 gap-2">
        <span
          title={item.itemCode}
          className="block min-w-0 max-w-full truncate whitespace-nowrap font-mono text-xs font-bold text-text bg-bg px-2 py-0.5 rounded border border-border justify-self-start"
        >
          {item.itemCode}
        </span>
        <div className="flex min-w-0 max-w-full flex-col items-end gap-0.5 justify-self-end">
          <span
            title={consumableClassificationLabel(item.classification)}
            className="max-w-full truncate whitespace-nowrap text-[10px] font-semibold text-text-secondary"
          >
            {consumableClassificationLabel(item.classification)}
          </span>
          <CategoryPill
            category={item.category}
            className="max-w-full"
            getCategoryStyle={getCategoryStyle}
          />
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4 flex flex-col gap-3 flex-1">
        <h3 className="text-sm font-bold text-text leading-snug line-clamp-2 group-hover:text-accent transition-colors">
          {item.name}
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
