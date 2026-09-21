"use client";

import { useCategoryStyleMap } from "@/features/categories/client/use-categories";
import { CheckCircle2, Eye, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MaintenanceLogRecord } from "@/types/maintenance-logs";
import { ConditionTag } from "./condition-tag";

export interface MaintenanceLogTableRowProps {
  record: MaintenanceLogRecord;
  onSelect: (record: MaintenanceLogRecord) => void;
  onResolve?: (record: MaintenanceLogRecord) => void;
}

function sourceLabel(source: MaintenanceLogRecord["source"]): string {
  if (source === "return_checkout") return "Return check-in";
  if (source === "project_assignment") return "Project damage";
  return "Manual flag";
}

export function MaintenanceLogTableRow({
  record,
  onSelect,
  onResolve,
}: MaintenanceLogTableRowProps) {
  const { getCategoryStyle } = useCategoryStyleMap();
  const categoryMeta = getCategoryStyle(record.category);
  const effectiveCondition = record.isResolved ? "resolved" : record.condition;

  return (
    <tr
      onClick={() => onSelect(record)}
      tabIndex={0}
      role="row"
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(record);
        }
      }}
      className={cn(
        "group border-b border-border bg-bg transition-colors duration-100 cursor-pointer",
        "hover:bg-bg-subtle/80 focus:outline-none focus-visible:bg-bg-subtle"
      )}
    >
      <td className="px-5 py-3.5">
        <div className="font-mono text-xs font-bold text-text">
          {record.logCode}
        </div>
        <div className="text-[11px] text-text-secondary mt-0.5">
          {record.dateLogged}
        </div>
      </td>

      <td className="px-3 py-3.5">
        <div className="font-bold text-sm text-text leading-tight group-hover:text-accent transition-colors truncate max-w-56">
          {record.assetName}
        </div>
        <div className="font-mono text-[11px] text-text-secondary mt-0.5">
          {record.assetCode}
        </div>
      </td>

      <td className="px-3 py-3.5 hidden md:table-cell">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase",
            categoryMeta.bg,
            categoryMeta.text
          )}
        >
          <Tag className="h-2.5 w-2.5" />
          {categoryMeta.label}
        </span>
      </td>

      <td className="px-3 py-3.5">
        <ConditionTag condition={effectiveCondition} />
      </td>

      <td className="px-3 py-3.5 hidden lg:table-cell">
        <span className="text-xs text-text-secondary">
          {sourceLabel(record.source)}
        </span>
      </td>

      <td className="px-3 py-3.5 hidden sm:table-cell">
        <p className="text-xs text-text-secondary line-clamp-2 max-w-64">
          {record.notes?.trim() || "—"}
        </p>
      </td>

      <td
        className="px-5 py-3.5 text-right"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-end items-center gap-1.5">
          <button
            type="button"
            onClick={() => onSelect(record)}
            className="inline-flex items-center gap-1 h-7 px-2.5 text-[11px] font-bold rounded-lg border border-border bg-bg-subtle text-text hover:bg-border/70 transition-colors cursor-pointer"
            title="View details"
          >
            <Eye className="h-3.5 w-3.5" />
            View
          </button>
          {!record.isResolved && onResolve && (
            <button
              type="button"
              onClick={() => onResolve(record)}
              className="inline-flex items-center gap-1 h-7 px-2.5 text-[11px] font-bold rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
              title="Resolve maintenance flag"
            >
              <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2.5} />
              Resolve
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
