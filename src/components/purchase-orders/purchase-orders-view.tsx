"use client";

import React, { useState, useMemo } from "react";
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
} from "lucide-react";
import {
  usePurchaseLotsQuery,
  useDeletePurchaseOrderMutation,
} from "@/features/purchase-lots/client/use-purchase-lots";
import { useAssetOperator } from "@/hooks/use-asset-operator";
import { OperatorReadOnlyBanner } from "@/components/shared/operator-read-only-banner";
import { QueryErrorBanner } from "@/components/shared/query-error-banner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
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
import { FileNewPODialog, type POType } from "@/components/purchase-orders/file-new-po-dialog";
import { LotPrintTagDialog } from "@/components/purchase-orders/lot-print-tag-dialog";
import { LotReleaseDialog } from "@/components/purchase-orders/lot-release-dialog";
import { formatPhp } from "@/components/projects/format-money";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { cn } from "@/lib/utils";

export type POCategoryScope = "all" | "asset" | "consumable" | "projects";

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
  const {
    data: lots = [],
    isLoading,
    error,
    isFetching,
    refetch,
  } = usePurchaseLotsQuery();
  const { canOperate } = useAssetOperator();
  const deleteMutation = useDeletePurchaseOrderMutation();
  const toast = useToast();

  const [filters, setFilters] = useState<PurchaseOrderFilterState>({
    search: "",
    itemType:
      categoryScope === "asset"
        ? "asset"
        : categoryScope === "consumable"
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
  const [groupToDelete, setGroupToDelete] = useState<GroupedPurchaseOrder | null>(null);
  const [isFileNewPOOpen, setIsFileNewPOOpen] = useState(false);

  // Group flat lot rows into PO-level groups
  const groupedPOs = useMemo(() => groupLotsByPO(lots), [lots]);

  // Pre-filter by category scope if specialized subpage
  const scopedGroups = useMemo(() => {
    if (categoryScope === "asset") {
      return groupedPOs.filter((g) =>
        g.lineItems.some((li) => li.itemType === "asset")
      );
    }
    if (categoryScope === "consumable") {
      return groupedPOs.filter((g) =>
        g.lineItems.some((li) => li.itemType === "consumable")
      );
    }
    if (categoryScope === "projects") {
      return groupedPOs.filter((g) => {
        const text = [
          g.poNumber,
          g.representative.purpose || "",
          g.representative.notes || "",
          ...g.lineItems.map((li) => li.purpose || ""),
        ]
          .join(" ")
          .toLowerCase();

        return (
          text.includes("project") ||
          text.includes("prj-") ||
          text.includes("development") ||
          text.includes("renovation") ||
          text.includes("expansion") ||
          text.includes("infrastructure")
        );
      });
    }
    return groupedPOs;
  }, [groupedPOs, categoryScope]);

  const selectedLotSynced = useMemo(() => {
    if (!selectedLot) return null;
    for (const g of groupedPOs) {
      const found = g.lineItems.find((l) => l.id === selectedLot.id);
      if (found) return g.representative;
    }
    return selectedLot;
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

  const handleFilterChange = (updates: Partial<PurchaseOrderFilterState>) => {
    setFilters((prev) => ({ ...prev, ...updates }));
  };

  const handleResetFilters = () => {
    setFilters({
      search: "",
      itemType:
        categoryScope === "asset"
          ? "asset"
          : categoryScope === "consumable"
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

  const handleConfirmDelete = async () => {
    if (!groupToDelete) return;
    try {
      await Promise.all(
        groupToDelete.lineItems.map((li) => deleteMutation.mutateAsync(li.id))
      );
      toast.success(
        `Purchase Order "${groupToDelete.poNumber}" and all ${groupToDelete.itemCount} line item(s) deleted.`
      );
      setGroupToDelete(null);
      if (selectedLot && groupToDelete.lineItems.some((li) => li.id === selectedLot.id)) {
        setSelectedLot(null);
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete Purchase Order."
      );
    }
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
      };
    }
    if (categoryScope === "consumable") {
      return {
        icon: Boxes,
        title: "Consumables Purchase Orders",
        subtitle:
          "Inventory restocking orders for office supplies, stationery, laboratory items, and materials.",
        badgeText: "Consumables & Supplies",
        newPoLabel: "File Consumable PO",
        defaultType: "consumable" as POType,
        defaultPurpose: "[Inventory Restock]",
      };
    }
    if (categoryScope === "projects") {
      return {
        icon: FolderKanban,
        title: "Project Purchase Orders",
        subtitle:
          "Procurement orders and material acquisitions dedicated to institutional campus and departmental projects.",
        badgeText: "Project Procurement",
        newPoLabel: "File Project PO",
        defaultType: "consumable" as POType,
        defaultPurpose: "[Project Procurement]",
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
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-accent/15 border border-accent/25 flex items-center justify-center text-accent shrink-0 shadow-2xs">
                <HeaderIcon className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-text">
                    {title || defaultHeader.title}
                  </h1>
                  <span className="inline-flex items-center text-[10px] font-semibold text-accent bg-accent/10 border border-accent/20 px-2 py-0.5 rounded-full">
                    {defaultHeader.badgeText}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-text-secondary">
                  {subtitle || defaultHeader.subtitle}
                </p>
              </div>
            </div>
          </div>

          {/* Header Action: File New PO */}
          {canOperate && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsFileNewPOOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-bold rounded-xl bg-accent text-accent-foreground hover:opacity-90 transition-all cursor-pointer shadow-xs active:scale-98"
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
            onDeleteGroup={canOperate ? setGroupToDelete : undefined}
          />
        ) : (
          <PurchaseOrdersGrid
            groups={filteredPOs}
            loading={isLoading}
            onSelectLot={setSelectedLot}
            onPrintSlip={setPrintSlipLot}
            onDeleteGroup={canOperate ? setGroupToDelete : undefined}
          />
        )}
      </div>

      {/* Slide-over Inspection Sheet */}
      <PurchaseOrderDetailSheet
        lot={selectedLotSynced}
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
                if (grp) setGroupToDelete(grp);
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
            onSuccess={() => {
              void refetch();
            }}
          />

          <ConfirmDialog
            isOpen={Boolean(groupToDelete)}
            title="Delete Purchase Order?"
            description={
              groupToDelete
                ? groupToDelete.itemCount > 1
                  ? `Are you sure you want to delete purchase order "${groupToDelete.poNumber}" and all ${groupToDelete.itemCount} line items? This will cancel the order and cannot be undone.`
                  : `Are you sure you want to delete purchase order "${groupToDelete.poNumber}" (${groupToDelete.representative.itemName})? This will cancel the order and cannot be undone.`
                : ""
            }
            confirmLabel="Delete Order"
            variant="destructive"
            isLoading={deleteMutation.isPending}
            onConfirm={handleConfirmDelete}
            onClose={() => setGroupToDelete(null)}
          />
        </>
      )}
    </div>
  );
}
