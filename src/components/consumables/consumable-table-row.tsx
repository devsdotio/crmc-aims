"use client";

import { PlusCircle, SlidersHorizontal, Tag, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ConsumableItem } from "@/types/inventory";
import { StockLevelBar } from "./stock-level-bar";
import { useCategoryStyleMap } from "@/features/categories/client/use-categories";
import { SandboxBadge } from "@/components/shared/sandbox-badge";
import { consumableClassificationLabel } from "@/lib/consumable-classification";

export interface ConsumableTableRowProps {
  item: ConsumableItem;
  onSelect: (item: ConsumableItem) => void;
  onAdjust?: (item: ConsumableItem) => void;
  onDelete?: (item: ConsumableItem) => void;
}

export function ConsumableTableRow({
  item,
  onSelect,
  onAdjust,
  onDelete,
}: ConsumableTableRowProps) {
  const { getCategoryStyle } = useCategoryStyleMap();
  const categoryMeta = getCategoryStyle(item.category);

  return (
    <tr
      onClick={() => onSelect(item)}
      tabIndex={0}
      role="row"
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(item);
        }
      }}
      className={cn(
        "group border-b border-border bg-bg transition-colors duration-100 cursor-pointer",
        "hover:bg-bg-subtle/80 focus:outline-none focus-visible:bg-bg-subtle"
      )}
    >
      {/* Code & Item Name */}
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold text-text bg-bg-subtle px-1.5 py-0.5 rounded border border-border">
            {item.itemCode}
          </span>
          <span className="text-sm font-bold text-text group-hover:text-accent transition-colors block leading-tight">
            {item.name}
          </span>
          {item.isSandbox ? <SandboxBadge /> : null}
        </div>
      </td>

      {/* Category Tag */}
      <td className="px-3 py-3.5 whitespace-nowrap">
        <div className="flex flex-col gap-1 items-start">
          <span className="text-[10px] font-semibold text-text-secondary">
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
      </td>

      {/* Stock Level Bar Column */}
      <td className="px-3 py-3.5 min-w-50">
        <StockLevelBar
          currentQty={item.currentQty}
          minThreshold={item.minThreshold}
          unit={item.unit}
        />
        {(item.reservedQty ?? 0) > 0 && (
          <p className="mt-1 text-[10px] text-status-repair-text">
            {item.reservedQty} reserved
          </p>
        )}
      </td>

      {/* Last Restocked */}
      <td className="px-3 py-3.5 text-xs text-text-secondary whitespace-nowrap hidden md:table-cell">
        {item.lastRestocked}
      </td>

      {/* Actions */}
      {(onAdjust || onDelete) && (
        <td
          className="px-5 py-3.5 text-right whitespace-nowrap"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-end gap-1.5">
            {onAdjust && (
              <button
                type="button"
                onClick={() => onAdjust(item)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-amber-500/30 bg-amber-500/10 text-xs font-semibold text-amber-700 dark:text-amber-400 hover:bg-amber-500 hover:text-white transition-colors cursor-pointer"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Adjust
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(item)}
                title="Delete supply item"
                aria-label="Delete supply item"
                className="inline-flex items-center p-1.5 rounded-md border border-destructive/25 bg-destructive/10 text-destructive hover:bg-destructive hover:text-white transition-colors cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </td>
      )}
    </tr>
  );
}
