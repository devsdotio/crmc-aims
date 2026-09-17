"use client";
 
import { useCategoryStyleMap } from "@/features/categories/client/use-categories";
import { CheckCircle2, User, Calendar, Tag, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MaintenanceLogRecord } from "@/types/maintenance-logs";

import { ConditionTag } from "./condition-tag";

export interface MaintenanceLogListItemProps {
  record: MaintenanceLogRecord;
  onSelect: (record: MaintenanceLogRecord) => void;
  onResolve?: (record: MaintenanceLogRecord) => void;
}

export function MaintenanceLogListItem({
  record,
  onSelect,
  onResolve,
}: MaintenanceLogListItemProps) {
  const { getCategoryStyle } = useCategoryStyleMap();
  const categoryMeta = getCategoryStyle(record.category);

  return (
    <div
      onClick={() => onSelect(record)}
      tabIndex={0}
      role="button"
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(record);
        }
      }}
      className={cn(
        "group relative flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 md:px-6 bg-bg border-b border-border transition-colors duration-150 cursor-pointer",
        "hover:bg-bg-subtle/80 focus:outline-none focus-visible:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset"
      )}
    >
      {/* Left Column: Asset & Log Entry Info */}
      <div className="flex flex-col gap-1.5 flex-1 min-w-0">
        {/* Row 1: Log ID, Asset Code, Category & Source */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-mono font-bold text-text-secondary">
            {record.logCode}
          </span>
          <span className="text-text-secondary/40">·</span>
          <span className="font-mono text-xs font-bold text-text bg-bg-subtle px-1.5 py-0.5 rounded border border-border">
            {record.assetCode}
          </span>
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
          <span className="text-[11px] text-text-secondary/80 bg-bg-subtle px-2 py-0.5 rounded border border-border">
            {record.source === "return_checkout"
              ? "Logged on Return"
              : record.source === "project_assignment"
                ? "Project damage"
                : "Manually Flagged"}
          </span>
        </div>

        {/* Row 2: Asset Name */}
        <h3 className="text-sm font-bold text-text truncate group-hover:text-accent transition-colors">
          {record.assetName}
        </h3>

        {/* Row 3: Notes snippet & Logged By */}
        <p className="text-xs text-text-secondary line-clamp-1">
          {record.notes}
        </p>

        <div className="flex items-center gap-3 text-xs text-text-secondary pt-0.5">
          <span className="flex items-center gap-1">
            <User className="h-3.5 w-3.5 text-text-secondary/70 shrink-0" />
            Logged by <strong className="text-text">{record.loggedBy}</strong>
          </span>
          <span>·</span>
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5 text-text-secondary/70 shrink-0" />
            {record.dateLogged}
          </span>
        </div>
      </div>

      {/* Right Column: Condition Tag & Resolve CTA */}
      <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
        {/* Reusable ConditionTag Component */}
        <ConditionTag condition={record.isResolved ? "resolved" : record.condition} />

        {/* Inline Resolve Action for Open Items */}
        {!record.isResolved && onResolve ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onResolve(record);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-primary text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
          >
            <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2.5} />
            Resolve
          </button>
        ) : !record.isResolved ? null : (
          <button
            type="button"
            onClick={() => onSelect(record)}
            aria-label={`View detail record for ${record.logCode}`}
            className="p-1 rounded text-text-secondary hover:text-text hover:bg-border transition-colors cursor-pointer"
          >
            <ExternalLink className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
