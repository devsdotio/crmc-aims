"use client";

import { LayoutGrid, List } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ViewMode } from "@/types/assets";

export interface AssetViewToggleProps {
  viewMode: ViewMode;
  onViewChange: (mode: ViewMode) => void;
}

export function AssetViewToggle({ viewMode, onViewChange }: AssetViewToggleProps) {
  return (
    <div
      role="group"
      aria-label="View mode toggle"
      className="inline-flex items-center p-1 rounded-lg border border-border bg-bg-subtle"
    >
      <button
        type="button"
        aria-label="Grid view"
        aria-pressed={viewMode === "grid"}
        onClick={() => onViewChange("grid")}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors duration-150 cursor-pointer outline-none",
          "focus-visible:ring-2 focus-visible:ring-accent",
          viewMode === "grid"
            ? "bg-primary text-primary-foreground shadow-xs"
            : "text-text-secondary hover:text-text hover:bg-bg"
        )}
      >
        <LayoutGrid className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Grid</span>
      </button>

      <button
        type="button"
        aria-label="Table view"
        aria-pressed={viewMode === "table"}
        onClick={() => onViewChange("table")}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors duration-150 cursor-pointer outline-none",
          "focus-visible:ring-2 focus-visible:ring-accent",
          viewMode === "table"
            ? "bg-primary text-primary-foreground shadow-xs"
            : "text-text-secondary hover:text-text hover:bg-bg"
        )}
      >
        <List className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Table</span>
      </button>
    </div>
  );
}
