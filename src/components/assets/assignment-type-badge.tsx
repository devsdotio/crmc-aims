"use client";

import { cn } from "@/lib/utils";
import {
  ASSIGNMENT_TYPE_BADGE_CLASS,
  assignmentTypeLabel,
  assignmentTypeShortLabel,
} from "@/lib/asset-assignment-type";
import type { AssetAssignmentType } from "@/types/assets";

export interface AssignmentTypeBadgeProps {
  type: AssetAssignmentType;
  /** Compact label for dense table/grid rows. */
  compact?: boolean;
  className?: string;
}

export function AssignmentTypeBadge({
  type,
  compact = false,
  className,
}: AssignmentTypeBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-bold uppercase tracking-wider",
        compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-0.5 text-[11px]",
        ASSIGNMENT_TYPE_BADGE_CLASS[type],
        className
      )}
    >
      {compact ? assignmentTypeShortLabel(type) : assignmentTypeLabel(type)}
    </span>
  );
}
