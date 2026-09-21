"use client";

import {
  Package,
  Clock,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import type { PortalSummaryStats } from "./types";

interface SummaryStripProps {
  stats: PortalSummaryStats;
  loading?: boolean;
}

export function SummaryStrip({ stats, loading = false }: SummaryStripProps) {
  const cards = [
    {
      label: "Active Borrowings",
      value: stats.activeBorrowings,
      contextLine: "Items currently out on loan",
      icon: Package,
      variant: "default" as const,
    },
    {
      label: "Pending Requests",
      value: stats.pendingRequests,
      contextLine:
        stats.pendingRequests > 0
          ? "Awaiting staff approval"
          : "No pending requests",
      icon: Clock,
      variant: (stats.pendingRequests > 0 ? "warning" : "default") as
        | "warning"
        | "default",
    },
    {
      label: "Overdue Items",
      value: stats.overdueItems,
      contextLine:
        stats.overdueItems > 0
          ? "Past due date — return immediately"
          : "No overdue items",
      icon: AlertTriangle,
      variant: (stats.overdueItems > 0 ? "danger" : "default") as
        | "danger"
        | "default",
    },
    {
      label: "Completed This Semester",
      value: stats.completedThisSemester,
      contextLine: "Successfully returned items",
      icon: CheckCircle2,
      variant: "default" as const,
    },
  ];

  return (
    <section aria-label="My borrowing summary">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <StatCard key={card.label} {...card} loading={loading} />
        ))}
      </div>
    </section>
  );
}
