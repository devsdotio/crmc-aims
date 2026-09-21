"use client";

import React from "react";
import { type LucideIcon } from "lucide-react";
import { StatCard, type StatCardTone } from "@/components/ui/stat-card";

export type { StatCardTone };

export interface StatMetricCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  description: string;
  icon: LucideIcon;
  tone?: StatCardTone;
  className?: string;
}

export function StatMetricCard({
  title,
  value,
  subtitle,
  description,
  icon,
  tone = "blue",
  className,
}: StatMetricCardProps) {
  return (
    <StatCard
      title={title}
      value={value}
      icon={icon}
      tone={tone}
      subtitle={subtitle || description}
      className={className}
    />
  );
}
