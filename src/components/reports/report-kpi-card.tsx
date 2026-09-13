"use client";

import React from "react";
import type { LucideIcon } from "lucide-react";
import {
  StatCard,
  StatCardGrid,
  type StatCardTone,
} from "@/components/ui/stat-card";

interface ReportKpiCardProps {
  title: string;
  value: React.ReactNode;
  subtitle?: React.ReactNode;
  sublabel?: string;
  icon: LucideIcon | React.ComponentType<{ className?: string }>;
  tone?: StatCardTone;
  toneValue?: boolean;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  badge?: string;
  loading?: boolean;
  href?: string;
  className?: string;
}

export function ReportKpiCard({
  title,
  value,
  subtitle,
  sublabel,
  icon,
  tone = "blue",
  toneValue = false,
  trend,
  badge,
  loading = false,
  href,
  className,
}: ReportKpiCardProps) {
  const renderedSubtitle = (
    <div className="flex items-center justify-between gap-1.5 min-w-0">
      {subtitle && <span className="text-text-secondary truncate">{subtitle}</span>}
      {trend && (
        <span
          className={`inline-flex items-center gap-0.5 text-[10px] font-semibold font-mono shrink-0 ml-auto ${
            trend.isPositive
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-amber-600 dark:text-amber-400"
          }`}
        >
          {trend.value}
        </span>
      )}
    </div>
  );

  return (
    <StatCard
      title={title}
      sublabel={sublabel}
      value={value}
      icon={icon}
      tone={tone}
      toneValue={toneValue}
      subtitle={renderedSubtitle}
      badge={badge}
      loading={loading}
      href={href}
      className={className}
    />
  );
}

export { StatCardGrid };
