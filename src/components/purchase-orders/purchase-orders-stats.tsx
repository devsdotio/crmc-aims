"use client";

import { useMemo } from "react";
import {
  DollarSign,
  Boxes,
  Truck,
  ShieldCheck,
  Clock,
  PackageCheck,
} from "lucide-react";
import type { PurchaseLot } from "@/types/purchase-lots";
import type { GroupedPurchaseOrder } from "@/types/grouped-purchase-order";
import { cn } from "@/lib/utils";

interface PurchaseOrdersStatsProps {
  groups: GroupedPurchaseOrder[];
}

export function PurchaseOrdersStats({ groups }: PurchaseOrdersStatsProps) {
  const stats = useMemo(() => {
    let totalSpend = 0;
    let pendingCount = 0;
    let approvedCount = 0;
    let orderedCount = 0;
    let deliveredCount = 0;
    const suppliers = new Set<string>();

    for (const group of groups) {
      totalSpend += group.totalCost;

      const status = group.representative.status;
      if (status === "pending_approval") pendingCount += 1;
      else if (status === "approved") approvedCount += 1;
      else if (status === "ordered") orderedCount += 1;
      else if (status === "delivered") deliveredCount += 1;

      const supplierName = group.representative.supplierName?.trim();
      if (supplierName) {
        suppliers.add(supplierName);
      }
    }

    const totalOrders = groups.length;
    const activeInPipeline = pendingCount + approvedCount + orderedCount;

    return {
      totalSpend,
      totalOrders,
      pendingCount,
      approvedCount,
      orderedCount,
      deliveredCount,
      activeInPipeline,
      supplierCount: suppliers.size,
    };
  }, [groups]);

  const cards = [
    {
      title: "Total Procurement Spend",
      value: `₱${stats.totalSpend.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
      subtitle: `${stats.totalOrders} total purchase orders filed`,
      icon: DollarSign,
      iconColor: "text-status-active-text bg-status-active-bg/15 border-status-active-bg/30",
    },
    {
      title: "Pending Review / Approval",
      value: stats.pendingCount.toLocaleString(),
      subtitle: "Awaiting Custodian authority sign-off",
      icon: Clock,
      iconColor: "text-amber-600 dark:text-amber-400 bg-amber-500/15 border-amber-500/30",
    },
    {
      title: "Approved & In-Transit",
      value: `${stats.approvedCount + stats.orderedCount}`,
      subtitle: `${stats.approvedCount} approved · ${stats.orderedCount} ordered`,
      icon: Truck,
      iconColor: "text-blue-600 dark:text-blue-400 bg-blue-500/15 border-blue-500/30",
    },
    {
      title: "Delivered & Stocked",
      value: stats.deliveredCount.toLocaleString(),
      subtitle: "Received & active in inventory",
      icon: PackageCheck,
      iconColor: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 border-emerald-500/30",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 shrink-0">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.title}
            className="p-4 rounded-xl border border-border bg-card shadow-xs transition-all duration-200 flex flex-col justify-between group hover:border-accent/40"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider block">
                  {card.title}
                </span>
                <span className="text-xl md:text-2xl font-bold text-text tracking-tight block">
                  {card.value}
                </span>
              </div>
              <span
                className={cn(
                  "p-2 rounded-xl border flex items-center justify-center shrink-0 shadow-2xs transition-transform duration-200 group-hover:scale-105",
                  card.iconColor
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={2.2} />
              </span>
            </div>

            <p className="text-[11px] font-medium text-text-secondary mt-3 truncate">
              {card.subtitle}
            </p>
          </div>
        );
      })}
    </div>
  );
}
