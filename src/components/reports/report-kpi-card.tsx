"use client";

import React from "react";
import { KpiCard, type KpiCardProps, type KpiCardDelta } from "./kpi-card";
import { StatCardGrid } from "@/components/ui/stat-card";

export type { KpiCardProps, KpiCardDelta };
export { KpiCard, StatCardGrid };

// Backward-compatible ReportKpiCard export
export function ReportKpiCard(props: KpiCardProps) {
  return <KpiCard {...props} />;
}

