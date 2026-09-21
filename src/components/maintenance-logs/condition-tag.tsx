"use client";

import { CheckCircle2, Wrench, AlertOctagon, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ConditionState } from "@/types/maintenance-logs";

export interface ConditionTagProps {
  condition: ConditionState;
  className?: string;
  showIcon?: boolean;
}

const CONDITION_META: Record<
  ConditionState,
  { bg: string; text: string; label: string; icon: typeof CheckCircle2 }
> = {
  good: {
    bg: "bg-status-active-bg",
    text: "text-white font-bold",
    label: "Good",
    icon: CheckCircle2,
  },
  needs_maintenance: {
    bg: "bg-status-repair-bg",
    text: "text-white font-bold",
    label: "Needs Maintenance",
    icon: Wrench,
  },
  damaged: {
    bg: "bg-status-outofservice-bg",
    text: "text-white font-bold",
    label: "Damaged",
    icon: AlertOctagon,
  },
  resolved: {
    bg: "bg-status-retired-bg",
    text: "text-white font-bold",
    label: "Resolved",
    icon: CheckCheck,
  },
};

export function ConditionTag({
  condition,
  className,
  showIcon = true,
}: ConditionTagProps) {
  const meta = CONDITION_META[condition];
  const Icon = meta.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] whitespace-nowrap",
        meta.bg,
        meta.text,
        className
      )}
    >
      {showIcon && <Icon className="h-3 w-3 shrink-0" />}
      <span>{meta.label}</span>
    </span>
  );
}
