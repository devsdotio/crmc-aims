"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RequisitionItem } from "./types";

interface RequisitionItemRowProps {
  item: RequisitionItem;
  index: number;
  isRemovable: boolean;
  onChange: (
    id: string,
    field: keyof RequisitionItem,
    value: RequisitionItem[keyof RequisitionItem]
  ) => void;
  onRemove: (id: string) => void;
}

export function RequisitionItemRow({
  item,
  index,
  isRemovable,
  onChange,
  onRemove,
}: RequisitionItemRowProps) {
  return (
    <div className="group flex items-start gap-2 py-2 border-b border-primary/10 transition-colors hover:bg-bg-subtle/30 px-2 w-full">
      <div className="w-8 shrink pt-2 text-xs text-text-secondary font-medium text-center">
        {index + 1}.
      </div>
      
      <div className="w-20 shrink">
        <input
          type="number"
          min={1}
          placeholder="QTY"
          value={item.qty ?? ""}
          onChange={(e) => onChange(item.id, "qty", e.target.value ? Number(e.target.value) : null)}
          className="w-full h-8 px-2 text-sm bg-transparent border-b border-transparent focus:border-primary focus:outline-none transition-colors"
        />
      </div>

      <div className="flex-1 min-w-50">
        <input
          type="text"
          placeholder="Description"
          value={item.description}
          onChange={(e) => onChange(item.id, "description", e.target.value)}
          className="w-full h-8 px-2 text-sm bg-transparent border-b border-transparent focus:border-primary focus:outline-none transition-colors"
        />
      </div>

      <div className="w-32 shrink">
        <input
          type="text"
          placeholder="Cost Center"
          value={item.costCenterCode}
          onChange={(e) => onChange(item.id, "costCenterCode", e.target.value)}
          className="w-full h-8 px-2 text-sm bg-transparent border-b border-transparent focus:border-primary focus:outline-none transition-colors uppercase"
        />
      </div>

      <div className="w-40 shrink">
        <input
          type="text"
          placeholder="Suggested Dealer"
          value={item.suggestedDealer}
          onChange={(e) => onChange(item.id, "suggestedDealer", e.target.value)}
          className="w-full h-8 px-2 text-sm bg-transparent border-b border-transparent focus:border-primary focus:outline-none transition-colors"
        />
      </div>

      <div className="w-48 shrink">
        <input
          type="text"
          placeholder="Purpose"
          value={item.purpose}
          onChange={(e) => onChange(item.id, "purpose", e.target.value)}
          className="w-full h-8 px-2 text-sm bg-transparent border-b border-transparent focus:border-primary focus:outline-none transition-colors"
        />
      </div>

      <div className="w-32 shrink relative">
        <span className="absolute left-2 top-1.5 text-sm text-text-secondary">₱</span>
        <input
          type="number"
          min={0}
          step="0.01"
          placeholder="0.00"
          value={item.estimatedCost ?? ""}
          onChange={(e) => onChange(item.id, "estimatedCost", e.target.value ? Number(e.target.value) : null)}
          className="w-full h-8 pl-6 pr-2 text-sm bg-transparent border-b border-transparent focus:border-primary focus:outline-none transition-colors text-right"
        />
      </div>

      <div className="w-10 shrink flex justify-center pt-1">
        <button
          type="button"
          onClick={() => onRemove(item.id)}
          disabled={!isRemovable}
          className="p-1 rounded-md text-text-secondary opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-900/30 disabled:opacity-0 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
          aria-label="Remove row"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
