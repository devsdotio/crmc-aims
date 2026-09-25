"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useDashboardSnapshotQuery,
} from "@/features/dashboard/client/use-dashboard";
import { dashboardQueryKeys } from "@/features/dashboard/client/query-keys";
import { CompactStatCards } from "@/components/dashboard/compact-stat-cards";
import { StockVolumeAreaChart } from "@/components/dashboard/stock-volume-area-chart";
import { InventoryProportionDonutCard } from "@/components/dashboard/inventory-proportion-donut-card";
import { TopRankedBarCard } from "@/components/dashboard/top-ranked-bar-card";
import { PendingDeliveriesCard } from "@/components/dashboard/pending-deliveries-card";
import { PendingPurchaseOrdersCard } from "@/components/dashboard/pending-purchase-orders-card";
import { RecentActivityFeed } from "@/components/dashboard/recent-activity-feed";

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const {
    data: snapshot,
    isLoading,
  } = useDashboardSnapshotQuery();

  // Seed sidebar badge cache from the full snapshot so /dashboard does not
  // also hit ?scope=sidebar (same summary fields, consistent badges).
  useEffect(() => {
    if (!snapshot?.summary) return;
    queryClient.setQueryData(
      dashboardQueryKeys.sidebarSummary(),
      snapshot.summary
    );
  }, [snapshot?.summary, queryClient]);

  // Only true while the first fetch is in flight — never !snapshot after error.
  const loading = isLoading && !snapshot;

  return (
    <div
      className="flex flex-col gap-3 w-full pb-6"
      data-theme="light"
    >
      {/* 1. Top Row: 4 Compact Stat Cards */}
      <CompactStatCards summary={snapshot?.summary} loading={loading} />

      {/* 2. Middle Section: Area/Line Chart + Donut & Ranked Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 2xl:grid-cols-12 gap-3 items-stretch">
        {/* Left-mid: Large Area/Line Chart */}
        <div className="lg:col-span-7 xl:col-span-8 2xl:col-span-8 flex flex-col">
          <StockVolumeAreaChart loading={loading} />
        </div>

        {/* Right-mid: Donut Chart & Top N Ranked Bars */}
        <div className="lg:col-span-5 xl:col-span-4 2xl:col-span-4 flex flex-col gap-3">
          <InventoryProportionDonutCard
            summary={snapshot?.summary}
            loading={loading}
          />
          <TopRankedBarCard
            categoryDistribution={snapshot?.categoryDistribution}
            loading={loading}
          />
        </div>
      </div>

      {/* 3. Lower Section: Recent Activity + Still Pending Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 2xl:grid-cols-12 gap-3 items-stretch">
        {/* Lower-left: Recent Activity Feed */}
        <div className="lg:col-span-7 xl:col-span-8 2xl:col-span-8 flex flex-col">
          <RecentActivityFeed
            entries={snapshot?.recentActivity ?? []}
            loading={loading}
            maxRows={15}
            className="h-115"
          />
        </div>

        {/* Lower-right: Still Pending Requests & Pending POs */}
        <div className="lg:col-span-5 xl:col-span-4 2xl:col-span-4 flex flex-col gap-3 lg:h-115">
          <PendingDeliveriesCard
            pendingRequests={snapshot?.pendingRequests}
            overdueAssets={snapshot?.overdueAssets}
            totalPendingRequests={snapshot?.summary?.pendingApprovals}
            loading={loading}
          />
          <PendingPurchaseOrdersCard loading={loading} />
        </div>
      </div>
    </div>
  );
}
