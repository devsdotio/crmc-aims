"use client";

import { Clock, CheckCircle2, PauseCircle, CheckCheck, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProjectStatus } from "@/types/projects";
import { PROJECT_STATUS_LABELS } from "@/types/projects";

const CONFIG: Record<
  ProjectStatus,
  {
    bg: string;
    text: string;
    icon: typeof Clock;
  }
> = {
  draft: {
    bg: "bg-bg-subtle border border-border",
    text: "text-text-secondary",
    icon: Clock,
  },
  active: {
    bg: "bg-status-active-bg/15 border border-status-active-bg/25",
    text: "text-status-active-text",
    icon: CheckCircle2,
  },
  on_hold: {
    bg: "bg-status-repair-bg/15 border border-status-repair-bg/25",
    text: "text-status-repair-text",
    icon: PauseCircle,
  },
  completed: {
    bg: "bg-status-retired-bg/15 border border-status-retired-bg/25",
    text: "text-status-retired-text",
    icon: CheckCheck,
  },
  cancelled: {
    bg: "bg-status-outofservice-bg/15 border border-status-outofservice-bg/25",
    text: "text-status-outofservice-text",
    icon: XCircle,
  },
};

export function ProjectStatusBadge({
  status,
  className,
}: {
  status: ProjectStatus;
  className?: string;
}) {
  const config = CONFIG[status];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-tight shrink-0 shadow-2xs",
        config.bg,
        config.text,
        className
      )}
    >
      <Icon className="h-3 w-3 shrink-0" />
      <span>{PROJECT_STATUS_LABELS[status]}</span>
    </span>
  );
}
