"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  Boxes,
  FilePlus2,
  Package,
  FolderKanban,
  ShoppingCart,
  TrendingUp,
  Clock,
  PackageCheck,
  ShieldCheck,
  Truck,
  CheckCircle2,
  Banknote,
  HardHat,
} from "lucide-react";
import {
  usePurchaseLotsQuery,
  useDeletePurchaseOrderMutation,
} from "@/features/purchase-lots/client/use-purchase-lots";
import { useAssetOperator } from "@/hooks/use-asset-operator";
import { OperatorReadOnlyBanner } from "@/components/shared/operator-read-only-banner";
import { QueryErrorBanner } from "@/components/shared/query-error-banner";
import { useConfirm } from "@/components/providers/confirm-context";
import { useToast } from "@/components/providers/toast-context";
import type { PurchaseLot } from "@/types/purchase-lots";
import {
  groupLotsByPO,
  type GroupedPurchaseOrder,
} from "@/types/grouped-purchase-order";

import {
  PurchaseOrdersFilters,
  type PurchaseOrderFilterState,
} from "@/components/purchase-orders/purchase-orders-filters";
import { PurchaseOrdersTable } from "@/components/purchase-orders/purchase-orders-table";
import { PurchaseOrdersGrid } from "@/components/purchase-orders/purchase-orders-grid";
import { PurchaseOrderDetailSheet } from "@/components/purchase-orders/purchase-order-detail-sheet";
import { POPrintSlipDialog } from "@/components/purchase-orders/po-print-slip-dialog";
import { LotPrintTagDialog } from "@/components/purchase-orders/lot-print-tag-dialog";
import { LotReleaseDialog } from "@/components/purchase-orders/lot-release-dialog";
import { FileNewPODialog } from "@/components/purchase-orders/file-new-po-dialog";
import { useConsumablesQuery } from "@/features/consumables/client";
import type {
  POCategoryScope,
  POLockedScope,
  POType,
} from "@/app/(private)/purchase-orders/types";
import {
  DEFAULT_CONSUMABLE_CLASSIFICATION,
  type ConsumableClassification,
} from "@/lib/consumable-classification";
import { formatPhp } from "@/components/projects/format-money";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { cn } from "@/lib/utils";

interface PurchaseOrdersViewProps {
  categoryScope?: POCategoryScope;
  title?: string;
  subtitle?: string;
}

export function PurchaseOrdersView({
  categoryScope = "all",
  title,
  subtitle,
}: PurchaseOrdersViewProps) {
  const searchParams = useSearchParams();
  const searchParamQuery = searchParams?.get("search") || searchParams?.get("po") || "";

  const {
    data: lots = [],
    isLoading,
    error,
    isFetching,
    refetch,
  } = usePurchaseLotsQuery();
  const { data: consumablePage } = useConsumablesQuery({ limit: 100 });
  const classificationByConsumableId = useMemo(() => {
    const map = new Map<string, ConsumableClassification>();
    for (const item of consumablePage?.data ?? []) {
      map.set(
        item.id,
        (item.classification as ConsumableClassification | undefined) ??
          DEFAULT_CONSUMABLE_CLASSIFICATION
      );
    }
    return map;
  }, [consumablePage?.data]);

  const resolveLotClassification = useCallback(
    (lot: PurchaseLot): ConsumableClassification | null => {
      if (lot.itemType !== "consumable") return null;
      if (lot.projectId) return "material";
      if (lot.consumableId) {
        return (
          classificationByConsumableId.get(lot.consumableId) ??
          DEFAULT_CONSUMABLE_CLASSIFICATION
        );
      }
      return DEFAULT_CONSUMABLE_CLASSIFICATION;
    },
    [classificationByConsumableId],
  );

  const { canOperate } = useAssetOperator();
  const deleteMutation = useDeletePurchaseOrderMutation();
  const toast = useToast();
  const { confirm } = useConfirm();

  const [filters, setFilters] = useState<PurchaseOrderFilterState>({
    search: searchParamQuery,
    itemType:
      categoryScope === "asset"
        ? "asset"
        : categoryScope === "consumable" ||
          categoryScope === "consumables" ||
          categoryScope === "supplies" ||
          categoryScope === "materials" ||
          categoryScope === "projects"
        ? "consumable"
        : "all",
    status: "all",
    stockStatus: "all",
    supplierId: "",
    datePreset: "all",
    startDate: "",
    endDate: "",
    viewMode: "table",
  });

  const [selectedLot, setSelectedLot] = useState<PurchaseLot | null>(null);
  const [printSlipLot, setPrintSlipLot] = useState<PurchaseLot | null>(null);
  const [printTagLot, setPrintTagLot] = useState<PurchaseLot | null>(null);
  const [releaseLot, setReleaseLot] = useState<PurchaseLot | null>(null);
  const [isFileNewPOOpen, setIsFileNewPOOpen] = useState(false);

  // Sync search parameter from URL if redirected from Vouchers or other links
  useEffect(() => {
    if (searchParamQuery) {
      setFilters((prev) => ({ ...prev, search: searchParamQuery }));
    }
  }, [searchParamQuery]);

  // Automatically open matching purchase order detail sheet if landed via direct link
  useEffect(() => {
    if (searchParamQuery && lots.length > 0) {
      const q = searchParamQuery.toLowerCase().trim();
      const matched = lots.find(
        (l) =>
          (l.poNumber && l.poNumber.toLowerCase().trim() === q) ||
          l.lotCode.toLowerCase().trim() === q
      );
      if (matched) {
        setSelectedLot(matched);
      }
    }
  }, [searchParamQuery, lots]);

  // Group flat lot rows into PO-level groups
  const groupedPOs = useMemo(() => groupLotsByPO(lots), [lots]);

  // Pre-filter by category scope if specialized subpage
  const scopedGroups = useMemo(() => {
    if (categoryScope === "asset") {
      return groupedPOs.filter((g) =>
        g.lineItems.some((li) => li.itemType === "asset")
      );
    }
    if (categoryScope === "supplies") {
      return groupedPOs.filter((g) =>
        g.lineItems.some((li) => {
          if (li.itemType !== "consumable" || li.projectId) return false;
          return resolveLotClassification(li) === "supply";
        })
      );
    }
    if (categoryScope === "materials") {
      return groupedPOs.filter((g) =>
        g.lineItems.some((li) => {
          if (li.itemType !== "consumable" || li.projectId) return false;
          return resolveLotClassification(li) === "material";
        })
      );
    }
    if (categoryScope === "consumable" || categoryScope === "consumables") {
      return groupedPOs.filter((g) =>
        g.lineItems.some((li) => li.itemType === "consumable")
      );
    }
    if (categoryScope === "projects") {
      return groupedPOs.filter((g) =>
        Boolean(g.representative.projectId) ||
        g.lineItems.some((li) => Boolean(li.projectId))
      );
    }
    return groupedPOs;
  }, [groupedPOs, categoryScope, resolveLotClassification]);

  const selectedLotSynced = useMemo(() => {
    if (!selectedLot) return null;
    for (const g of groupedPOs) {
      const found = g.lineItems.find((l) => l.id === selectedLot.id);
      if (found) return g.representative;
    }
    return selectedLot;
  }, [groupedPOs, selectedLot]);

  const selectedLineItems = useMemo(() => {
    if (!selectedLot) return undefined;
    for (const g of groupedPOs) {
      if (g.lineItems.some((l) => l.id === selectedLot.id)) {
        return g.lineItems;
      }
    }
    return [selectedLot];
  }, [groupedPOs, selectedLot]);

  const printSlipLotSynced = useMemo(() => {
    if (!printSlipLot) return null;
    for (const g of groupedPOs) {
      if (
        g.poNumber === (printSlipLot.poNumber || printSlipLot.lotCode) ||
        g.lineItems.some((l) => l.id === printSlipLot.id)
      ) {
        return g.representative;
      }
    }
    return printSlipLot;
  }, [groupedPOs, printSlipLot]);

  const releaseLotSynced = useMemo(() => {
    if (!releaseLot) return null;
    for (const g of groupedPOs) {
      const found = g.lineItems.find((l) => l.id === releaseLot.id);
      if (found) return found;
    }
    return releaseLot;
  }, [groupedPOs, releaseLot]);

  const supplierOptions = useMemo(() => {
    const countMap = new Map<string, number>();
    for (const g of scopedGroups) {
      const name = g.representative.supplierName?.trim() || "Internal / Direct";
      countMap.set(name, (countMap.get(name) || 0) + 1);
    }
    return Array.from(countMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([name, count]) => ({
        value: name === "Internal / Direct" ? "" : name,
        label: name,
        count,
      }));
  }, [scopedGroups]);

  const filteredPOs = useMemo(() => {
    return scopedGroups.filter((group) => {
      const lot = group.representative;

      // 1. Search Query
      if (filters.search.trim()) {
        const q = filters.search.toLowerCase();
        const matchCode = group.poNumber.toLowerCase().includes(q);
        const matchAnyItem = group.lineItems.some(
          (li) =>
            li.itemName.toLowerCase().includes(q) ||
            li.itemCode.toLowerCase().includes(q) ||
            li.lotCode.toLowerCase().includes(q)
        );
        const matchSupplier = lot.supplierName?.toLowerCase().includes(q);
        const matchRecorder = lot.recordedByName?.toLowerCase().includes(q);
        const matchRef = lot.reference?.toLowerCase().includes(q);
        const matchNotes = lot.notes?.toLowerCase().includes(q);
        const matchPurpose = group.lineItems.some(
          (li) => li.purpose?.toLowerCase().includes(q)
        );
        if (
          !matchCode &&
          !matchAnyItem &&
          !matchSupplier &&
          !matchRecorder &&
          !matchRef &&
          !matchNotes &&
          !matchPurpose
        ) {
          return false;
        }
      }

      // 2. Workflow Status Filter
      if (filters.status !== "all" && lot.status !== filters.status) {
        return false;
      }

      // 3. Item Type Filter
      if (
        categoryScope === "all" &&
        filters.itemType !== "all" &&
        !group.lineItems.some((li) => li.itemType === filters.itemType)
      ) {
        return false;
      }

      // 4. Stock Status Filter
      if (filters.stockStatus === "in_stock") {
        if (!group.lineItems.some((li) => li.quantityRemaining > 0)) return false;
      }
      if (filters.stockStatus === "depleted") {
        if (!group.lineItems.every((li) => li.quantityRemaining <= 0)) return false;
      }
      if (filters.stockStatus === "low_stock") {
        const hasLowStock = group.lineItems.some((li) => {
          const ratio = li.quantity > 0 ? li.quantityRemaining / li.quantity : 0;
          return li.quantityRemaining > 0 && ratio <= 0.2;
        });
        if (!hasLowStock) return false;
      }

      // 5. Supplier Filter
      if (
        filters.supplierId &&
        (lot.supplierName || "") !== filters.supplierId
      ) {
        return false;
      }

      // 6. Date Presets & Ranges
      const dateStr = lot.purchasedOn || lot.createdAt.split("T")[0];
      const poTime = new Date(dateStr).getTime();
      const now = new Date();

      if (filters.datePreset === "30d") {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(now.getDate() - 30);
        if (poTime < thirtyDaysAgo.getTime()) return false;
      } else if (filters.datePreset === "this_month") {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        if (poTime < startOfMonth.getTime()) return false;
      } else if (filters.datePreset === "this_year") {
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        if (poTime < startOfYear.getTime()) return false;
      } else if (filters.datePreset === "custom") {
        if (filters.startDate) {
          const start = new Date(filters.startDate).getTime();
          if (poTime < start) return false;
        }
        if (filters.endDate) {
          const end = new Date(filters.endDate).getTime();
          if (poTime > end) return false;
        }
      }

      return true;
    });
  }, [scopedGroups, filters, categoryScope]);

  // Key summary statistics for the scoped page
  const stats = useMemo(() => {
    const totalOrders = scopedGroups.length;
    const deliveredCount = scopedGroups.filter(
      (g) => g.representative.status === "delivered"
    ).length;
    const pendingCount = scopedGroups.filter(
      (g) => g.representative.status === "pending_approval"
    ).length;
    const approvedCount = scopedGroups.filter(
      (g) => g.representative.status === "approved"
    ).length;
    const orderedCount = scopedGroups.filter(
      (g) => g.representative.status === "ordered"
    ).length;
    const activePipelineCount = approvedCount + orderedCount;
    const totalValue = scopedGroups.reduce((acc, g) => acc + g.totalCost, 0);
    const deliveredValue = scopedGroups
      .filter((g) => g.representative.status === "delivered")
      .reduce((acc, g) => acc + g.totalCost, 0);
    const pendingValue = scopedGroups
      .filter((g) => g.representative.status === "pending_approval")
      .reduce((acc, g) => acc + g.totalCost, 0);
    const fulfillmentRate =
      totalOrders > 0 ? Math.round((deliveredCount / totalOrders) * 100) : 0;
    const pendingRate =
      totalOrders > 0 ? Math.round((pendingCount / totalOrders) * 100) : 0;
    const avgOrderValue =
      totalOrders > 0 ? Math.round(totalValue / totalOrders) : 0;

    return {
      totalOrders,
      deliveredCount,
      pendingCount,
      approvedCount,
      orderedCount,
      activePipelineCount,
      totalValue,
      deliveredValue,
      pendingValue,
      fulfillmentRate,
      pendingRate,
      avgOrderValue,
    };
  }, [scopedGroups]);

  const categoryScopeLabel = useMemo(() => {
    if (categoryScope === "asset") return "Asset Purchases";
    if (categoryScope === "supplies") return "Consumable Supplies";
    if (categoryScope === "materials") return "Consumable Materials";
    if (categoryScope === "consumable" || categoryScope === "consumables") {
      return "Consumables";
    }
    if (categoryScope === "projects") return "Project Procurement";
    return "All Purchase Orders";
  }, [categoryScope]);

  const isConsumableScoped =
    categoryScope === "consumable" ||
    categoryScope === "consumables" ||
    categoryScope === "supplies" ||
    categoryScope === "materials" ||
    categoryScope === "projects";

  const activePipelineValue = Math.max(
    0,
    stats.totalValue - stats.deliveredValue - stats.pendingValue
  );
  const deliveredPct =
    stats.totalValue > 0
      ? Math.round((stats.deliveredValue / stats.totalValue) * 100)
      : 0;
  const pendingPct =
    stats.totalValue > 0
      ? Math.round((stats.pendingValue / stats.totalValue) * 100)
      : 0;
  const pipelinePct =
    stats.totalValue > 0 ? Math.max(0, 100 - deliveredPct - pendingPct) : 0;

  const handleFilterChange = (updates: Partial<PurchaseOrderFilterState>) => {
    setFilters((prev) => ({ ...prev, ...updates }));
  };

  const handleResetFilters = () => {
    setFilters({
      search: "",
      itemType:
        categoryScope === "asset"
          ? "asset"
          : isConsumableScoped
          ? "consumable"
          : "all",
      status: "all",
      stockStatus: "all",
      supplierId: "",
      datePreset: "all",
      startDate: "",
      endDate: "",
      viewMode: filters.viewMode,
    });
  };

  const requestDeleteGroup = async (group: GroupedPurchaseOrder) => {
    const description =
      group.itemCount > 1
        ? `Are you sure you want to delete purchase order "${group.poNumber}" and all ${group.itemCount} line items? This will cancel the order and cannot be undone.`
        : `Are you sure you want to delete purchase order "${group.poNumber}" (${group.representative.itemName})? This will cancel the order and cannot be undone.`;

    await confirm({
      title: "Delete Purchase Order?",
      description,
      confirmLabel: "Delete Order",
      cancelLabel: "Keep order",
      variant: "destructive",
      action: async () => {
        try {
          await Promise.all(
            group.lineItems.map((li) => deleteMutation.mutateAsync(li.id))
          );
          toast.success(
            `Purchase Order "${group.poNumber}" and all ${group.itemCount} line item(s) deleted.`
          );
          if (selectedLot && group.lineItems.some((li) => li.id === selectedLot.id)) {
            setSelectedLot(null);
          }
        } catch (err) {
          toast.error(
            err instanceof Error ? err.message : "Failed to delete Purchase Order."
          );
          throw err;
        }
      },
    });
  };

  // Header Icon and Titles
  const defaultHeader = useMemo(() => {
    if (categoryScope === "asset") {
      return {
        icon: Package,
        title: "Asset Purchase Orders",
        subtitle:
          "Procurement and acquisition orders for institutional capital assets, machinery, and equipment.",
        badgeText: "Fixed Assets & Equipment",
        newPoLabel: "File Asset PO",
        defaultType: "asset" as POType,
        defaultPurpose: "[Asset Procurement]",
        lockedScope: "asset" as POLockedScope | undefined,
        defaultClassification: undefined as ConsumableClassification | undefined,
      };
    }
    if (categoryScope === "supplies") {
      return {
        icon: Boxes,
        title: "Supplies Purchase Orders",
        subtitle:
          "Warehouse restocking for office supplies, stationery, and recurring stock batches.",
        badgeText: "Consumable Supplies",
        newPoLabel: "File Supplies PO",
        defaultType: "consumable" as POType,
        defaultPurpose: "[Supplies Restock]",
        lockedScope: "supply" as POLockedScope | undefined,
        defaultClassification: "supply" as ConsumableClassification | undefined,
      };
    }
    if (categoryScope === "materials") {
      return {
        icon: HardHat,
        title: "Materials Purchase Orders",
        subtitle:
          "Warehouse procurement for operational and construction materials held in Materials inventory.",
        badgeText: "Consumable Materials",
        newPoLabel: "File Materials PO",
        defaultType: "consumable" as POType,
        defaultPurpose: "[Materials Restock]",
        lockedScope: "material" as POLockedScope | undefined,
        defaultClassification: "material" as ConsumableClassification | undefined,
      };
    }
    if (categoryScope === "consumable" || categoryScope === "consumables") {
      return {
        icon: Boxes,
        title: "Consumables Purchase Orders",
        subtitle:
          "Inventory restocking orders for office supplies, stationery, laboratory items, and materials.",
        badgeText: "Consumables",
        newPoLabel: "File Consumable PO",
        defaultType: "consumable" as POType,
        defaultPurpose: "[Inventory Restock]",
        lockedScope: undefined as POLockedScope | undefined,
        defaultClassification: undefined as ConsumableClassification | undefined,
      };
    }
    if (categoryScope === "projects") {
      return {
        icon: FolderKanban,
        title: "Project Purchase Orders",
        subtitle:
          "Direct project material procurement — credited to project spend on delivery, not warehouse stock.",
        badgeText: "Project Procurement",
        newPoLabel: "File Project PO",
        defaultType: "consumable" as POType,
        defaultPurpose: "[Project Procurement]",
        lockedScope: "project" as POLockedScope | undefined,
        defaultClassification: "material" as ConsumableClassification | undefined,
      };
    }
    return {
      icon: ShoppingCart,
      title: "Purchase Orders",
      subtitle:
        "Comprehensive procurement tracking, receiving workflows, digital receipt archives, and official slip printing.",
      badgeText: "Operations",
      newPoLabel: "File New PO",
      defaultType: "consumable" as POType,
      defaultPurpose: "",
      lockedScope: undefined as POLockedScope | undefined,
      defaultClassification: undefined as ConsumableClassification | undefined,
    };
  }, [categoryScope]);

  const HeaderIcon = defaultHeader.icon;

  return (
    <div className="flex flex-col h-full overflow-hidden bg-bg">
      {/* Read-only banner if user is read-only */}
      <OperatorReadOnlyBanner />

      {/* Query error alert */}
      {error && (
        <div className="p-4 sm:p-6 pb-0 shrink-0">
          <QueryErrorBanner
            message={error instanceof Error ? error.message : String(error)}
            onRetry={() => void refetch()}
          />
        </div>
      )}

      {/* Scrollable Main Area */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-text">
                {title || defaultHeader.title}
              </h1>
              <span className="px-2 py-0.5 text-xs font-bold bg-bg-subtle text-text-secondary rounded-full border border-border">
                {defaultHeader.badgeText}
              </span>
            </div>
            <p className="text-xs text-text-secondary mt-0.5">
              {subtitle || defaultHeader.subtitle}
            </p>
          </div>

          {/* Header Action: File New PO */}
          {canOperate && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsFileNewPOOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
              >
                <FilePlus2 className="h-4 w-4" />
                <span>{defaultHeader.newPoLabel}</span>
              </button>
            </div>
          )}
        </div>

        {/* Quick Scope Stats Summary Strip */}
        <StatCardGrid>
          {/* Card 1: Total Orders */}
          <StatCard
            title="Total Orders"
            sublabel="VOLUME // ORDERS"
            value={stats.totalOrders}
            icon={HeaderIcon}
            tone="accent"
            badge={{
              text: `${stats.totalOrders} total`,
              pulse: true,
            }}
            subtitle={
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-3 h-3" />
                  {stats.deliveredCount} received
                </span>
                <span>•</span>
                <span className="text-blue-600 dark:text-blue-400 font-medium">
                  {stats.activePipelineCount} in transit
                </span>
              </div>
            }
            progress={{
              value: stats.fulfillmentRate,
            }}
          />

          {/* Card 2: Pending Approval (Violet Theme) */}
          <StatCard
            title="Pending Approval"
            sublabel="QUEUE // REVIEW"
            value={stats.pendingCount}
            icon={Clock}
            tone="purple"
            toneValue={true}
            badge={stats.pendingCount > 0 ? "Awaiting Review" : "Queue Clear"}
            subtitle={
              <div className="flex items-center justify-between">
                <span className="truncate">
                  {stats.pendingCount > 0
                    ? `${stats.pendingCount} order${stats.pendingCount > 1 ? "s" : ""} awaiting sign-off`
                    : "No pending approval requests"}
                </span>
                {stats.pendingValue > 0 && (
                  <span className="text-[10px] font-mono text-purple-600 dark:text-purple-400 font-semibold truncate ml-1">
                    {formatPhp(stats.pendingValue)}
                  </span>
                )}
              </div>
            }
            progress={{
              value: stats.pendingRate,
            }}
          />

          {/* Card 3: Completed & Stocked */}
          <StatCard
            title="Completed & Stocked"
            sublabel="FULFILLMENT // RECEIVED"
            value={stats.deliveredCount}
            icon={PackageCheck}
            tone="emerald"
            toneValue={true}
            badge={`${stats.fulfillmentRate}% Fulfilled`}
            subtitle={
              <span className="inline-flex items-center gap-1 text-emerald-600/90 dark:text-emerald-400/90 font-medium">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                Inventory verified & released
              </span>
            }
            progress={{
              value: stats.fulfillmentRate,
            }}
          />

          {/* Card 4: Total Value / Capital Outlay */}
          <StatCard
            title="Total Value"
            sublabel="FINANCIAL // OUTLAY"
            value={formatPhp(stats.totalValue)}
            valueClassName="text-xl sm:text-2xl"
            icon={Banknote}
            tone="indigo"
            badge="PHP (₱)"
            infoTooltipAlign="right"
            infoTooltipPlacement="bottom"
            infoTooltip={
              <div className="space-y-2.5 text-left font-sans normal-case tracking-normal">
                <div className="flex items-center justify-between pb-1.5 border-b border-white/10">
                  <span className="font-semibold text-white flex items-center gap-1.5">
                    <Banknote className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    Total PO Valuation
                  </span>
                  <span className="font-mono font-bold text-indigo-300">
                    {formatPhp(stats.totalValue)}
                  </span>
                </div>

                <p className="text-[11px] text-neutral-300 leading-relaxed">
                  Coincides with the cumulative contracted outlay across all line items (Quantity × Unit Cost) for <strong className="text-white">{categoryScopeLabel}</strong>.
                </p>

                <div className="space-y-1.5 text-[11px] pt-0.5">
                  <div className="flex items-center justify-between text-neutral-300">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                      Delivered & Stocked
                    </span>
                    <span className="font-mono text-emerald-400 font-medium">
                      {formatPhp(stats.deliveredValue)} ({deliveredPct}%)
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-neutral-300">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-purple-400 shrink-0" />
                      Pending Approval
                    </span>
                    <span className="font-mono text-purple-300 font-medium">
                      {formatPhp(stats.pendingValue)} ({pendingPct}%)
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-neutral-300">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-indigo-400 shrink-0" />
                      In Pipeline (Approved/Ordered)
                    </span>
                    <span className="font-mono text-indigo-300 font-medium">
                      {formatPhp(activePipelineValue)} ({pipelinePct}%)
                    </span>
                  </div>
                </div>

                <div className="pt-1.5 border-t border-white/10 flex items-center justify-between text-[10px] text-neutral-400">
                  <span>Average per Order</span>
                  <span className="font-mono text-neutral-200">
                    {formatPhp(stats.avgOrderValue)} • {stats.totalOrders} PO{stats.totalOrders === 1 ? "" : "s"}
                  </span>
                </div>
              </div>
            }
            subtitle={
              <div className="flex items-center justify-between">
                <span className="truncate">
                  Avg <strong className="text-text font-mono">{formatPhp(stats.avgOrderValue)}</strong> / PO
                </span>
                {stats.deliveredValue > 0 && (
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium truncate ml-1">
                    {formatPhp(stats.deliveredValue)} stocked
                  </span>
                )}
              </div>
            }
            progress={{
              value:
                stats.totalValue > 0
                  ? Math.min(
                      100,
                      Math.round((stats.deliveredValue / stats.totalValue) * 100)
                    )
                  : 0,
            }}
          />
        </StatCardGrid>

        {/* Filter Toolbar */}
        <PurchaseOrdersFilters
          filters={filters}
          onFilterChange={handleFilterChange}
          onResetFilters={handleResetFilters}
          supplierOptions={supplierOptions}
          totalCount={scopedGroups.length}
          filteredCount={filteredPOs.length}
        />

        {/* View Switcher: Table vs Grid */}
        {filters.viewMode === "table" ? (
          <PurchaseOrdersTable
            groups={filteredPOs}
            loading={isLoading}
            onSelectLot={setSelectedLot}
            onPrintSlip={setPrintSlipLot}
            onDeleteGroup={canOperate ? (g) => void requestDeleteGroup(g) : undefined}
          />
        ) : (
          <PurchaseOrdersGrid
            groups={filteredPOs}
            loading={isLoading}
            onSelectLot={setSelectedLot}
            onPrintSlip={setPrintSlipLot}
            onDeleteGroup={canOperate ? (g) => void requestDeleteGroup(g) : undefined}
          />
        )}
      </div>

      {/* Slide-over Inspection Sheet */}
      <PurchaseOrderDetailSheet
        lot={selectedLotSynced}
        lineItems={selectedLineItems}
        isOpen={Boolean(selectedLotSynced)}
        onClose={() => setSelectedLot(null)}
        onPrintSlip={(lot) => setPrintSlipLot(lot)}
        onPrintTag={(lot) => setPrintTagLot(lot)}
        onReleaseStock={(lot) => setReleaseLot(lot)}
        onDelete={
          canOperate
            ? (lot) => {
                const grp = groupedPOs.find(
                  (g) =>
                    g.poNumber === (lot.poNumber || lot.lotCode) ||
                    g.lineItems.some((l) => l.id === lot.id)
                );
                if (grp) void requestDeleteGroup(grp);
              }
            : undefined
        }
        canOperate={canOperate}
      />

      {/* Official Form Print Preview */}
      <POPrintSlipDialog
        lot={printSlipLotSynced}
        isOpen={Boolean(printSlipLotSynced)}
        onClose={() => setPrintSlipLot(null)}
      />

      {/* Physical Bin / Lot Tag */}
      <LotPrintTagDialog
        lot={printTagLot}
        isOpen={Boolean(printTagLot)}
        onClose={() => setPrintTagLot(null)}
      />

      {/* Staff Operator Modals */}
      {canOperate && (
        <>
          <LotReleaseDialog
            lot={releaseLotSynced}
            isOpen={Boolean(releaseLotSynced)}
            onClose={() => setReleaseLot(null)}
            onSuccess={() => {
              void refetch();
            }}
          />

          <FileNewPODialog
            isOpen={isFileNewPOOpen}
            onClose={() => setIsFileNewPOOpen(false)}
            defaultPoType={defaultHeader.defaultType}
            defaultPurpose={defaultHeader.defaultPurpose}
            defaultClassification={defaultHeader.defaultClassification}
            lockedScope={defaultHeader.lockedScope}
            onSuccess={() => {
              void refetch();
            }}
          />
        </>
      )}
    </div>
  );
}
