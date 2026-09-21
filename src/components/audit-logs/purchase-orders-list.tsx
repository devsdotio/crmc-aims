"use client";

import React, { useState, useMemo } from "react";
import { ShoppingCart, ExternalLink, User, Building, FileText, DollarSign } from "lucide-react";
import { usePurchaseLotsQuery } from "@/features/purchase-lots/client/use-purchase-lots";
import {
  AuditLogFilters,
  type AuditLogFilterValues,
} from "./audit-log-filters";
import { PurchaseOrderDetailPanel } from "./purchase-order-detail-panel";
import {
  formatDateTime,
  formatRelativeTime,
  exportToCSV,
} from "./audit-log-utils";
import type { PurchaseLot } from "@/types/purchase-lots";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/providers/toast-context";
import { LoadingState } from "@/components/providers/loading-context";

export function PurchaseOrdersList() {
  const { data: lots = [], isLoading, error } = usePurchaseLotsQuery();
  const toast = useToast();

  const [filters, setFilters] = useState<AuditLogFilterValues>({
    search: "",
    action: "",
    categoryOrDept: "",
    startDate: "",
    endDate: "",
    viewMode: "table",
  });

  const [selectedLot, setSelectedLot] = useState<PurchaseLot | null>(null);

  // Guarantee 1 unique record per Lot Code (e.g. LOT-2026-xxxx)
  const uniqueLots = useMemo(() => {
    const map = new Map<string, PurchaseLot>();
    lots.forEach((l) => {
      const code = (l.lotCode || l.id).trim();
      if (!map.has(code)) {
        map.set(code, l);
      }
    });
    return Array.from(map.values());
  }, [lots]);

  // Extract unique suppliers for filter dropdown
  const supplierOptions = useMemo(() => {
    const suppliers = new Set<string>();
    uniqueLots.forEach((l) => {
      if (l.supplierName) suppliers.add(l.supplierName);
    });
    return Array.from(suppliers)
      .sort()
      .map((s) => ({ value: s, label: s }));
  }, [uniqueLots]);

  // Filter lots (strictly 1 entry per unique lot code)
  const filteredLots = useMemo(() => {
    return uniqueLots.filter((lot) => {
      // 1. Search Query
      if (filters.search.trim()) {
        const q = filters.search.toLowerCase();
        const matchCode = lot.lotCode.toLowerCase().includes(q);
        const matchItem = lot.itemName.toLowerCase().includes(q) || lot.itemCode.toLowerCase().includes(q);
        const matchSupplier = lot.supplierName?.toLowerCase().includes(q);
        const matchRecorder = lot.recordedByName?.toLowerCase().includes(q);
        const matchNotes = lot.notes?.toLowerCase().includes(q);
        if (!matchCode && !matchItem && !matchSupplier && !matchRecorder && !matchNotes) {
          return false;
        }
      }

      // 2. Supplier Filter
      if (filters.categoryOrDept && lot.supplierName !== filters.categoryOrDept) {
        return false;
      }

      // 3. Date Range
      if (filters.startDate) {
        const lotDate = new Date(lot.createdAt).toISOString().split("T")[0];
        if (lotDate < filters.startDate) return false;
      }
      if (filters.endDate) {
        const lotDate = new Date(lot.createdAt).toISOString().split("T")[0];
        if (lotDate > filters.endDate) return false;
      }

      return true;
    });
  }, [uniqueLots, filters]);

  const handleFilterChange = (updated: Partial<AuditLogFilterValues>) => {
    setFilters((prev) => ({ ...prev, ...updated }));
  };

  const handleResetFilters = () => {
    setFilters((prev) => ({
      ...prev,
      search: "",
      action: "",
      categoryOrDept: "",
      startDate: "",
      endDate: "",
    }));
  };

  const handleExportCSV = () => {
    if (filteredLots.length === 0) return;
    const exportable = filteredLots.map((l) => ({
      lotCode: l.lotCode,
      itemCode: l.itemCode,
      itemName: l.itemName,
      itemType: l.itemType,
      supplierName: l.supplierName || "Internal",
      quantity: l.quantity,
      quantityRemaining: l.quantityRemaining,
      unitCost: l.unitCost,
      totalCost: l.totalCost,
      recordedByName: l.recordedByName,
      purchasedOn: l.purchasedOn,
      createdAt: l.createdAt,
    }));
    exportToCSV("purchase-lots-audit-ledger", exportable);
    toast.success(`Exported ${filteredLots.length} purchase lot audit records.`);
  };

  if (isLoading) {
    return (
      <LoadingState
        icon="truck"
        message="Loading purchase orders audit ledger..."
        subtitle="Retrieving intake batches, lot codes, supplier records, and costing data"
      />
    );
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
        <ShoppingCart className="h-12 w-12 text-status-outofservice-text mb-3 opacity-30" />
        <h3 className="text-sm font-bold text-text">Failed to load purchase orders</h3>
        <p className="text-xs text-text-secondary mt-1">
          {error.message || "An unexpected error occurred while fetching audit trail."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 bg-bg">
      {/* Top Filter Bar */}
      <AuditLogFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        onReset={handleResetFilters}
        onExport={handleExportCSV}
        categoryOptions={supplierOptions}
        categoryLabel="Supplier"
        totalCount={uniqueLots.length}
        filteredCount={filteredLots.length}
      />

      {/* Content Area: 1 row per purchase lot */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {filteredLots.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center p-8 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 shadow-xs mb-3">
              <ShoppingCart className="h-7 w-7" strokeWidth={1.8} />
            </span>
            <h3 className="text-base font-bold text-text">No Purchase Records Found</h3>
            <p className="text-xs text-text-secondary max-w-sm mt-1 leading-relaxed">
              No purchase orders or intake lots match your search query and filter criteria.
            </p>
          </div>
        ) : filters.viewMode === "timeline" ? (
          <div className="p-4 md:p-6 max-w-4xl mx-auto pl-2">
            <div className="p-5 rounded-xl border border-border bg-bg shadow-xs">
              <ol className="relative border-l-2 border-border/60 ml-3 space-y-6">
                {filteredLots.map((lot) => (
                  <li
                    key={lot.id}
                    onClick={() => setSelectedLot(lot)}
                    className="pl-6 relative group transition-all cursor-pointer"
                  >
                    <span className="absolute -left-3.25 top-1.5 h-6 w-6 rounded-full border-2 flex items-center justify-center bg-category-av-bg/20 text-category-av-bg border-category-av-bg/30 shadow-2xs z-10 transition-transform group-hover:scale-110">
                      <ShoppingCart className="h-3 w-3" />
                    </span>

                    <div className="flex flex-col gap-0.5 pt-1.5 group-hover:bg-bg-subtle/50 rounded-lg p-1.5 -ml-1.5 transition-colors">
                      <div className="flex items-center justify-between text-xs flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-category-av-bg text-xs">
                            Purchased Intake
                          </span>
                          <span className="font-mono text-[11px] font-bold text-text bg-bg-subtle px-1.5 py-0.5 rounded border border-border">
                            {lot.lotCode}
                          </span>
                          <span className="text-[10px] font-semibold text-text-secondary bg-bg-subtle px-1.5 py-0.5 rounded border border-border capitalize">
                            {lot.itemType}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 text-right">
                          <time className="text-[11px] text-text-secondary font-medium">
                            {formatDateTime(lot.createdAt)}
                          </time>
                          <span className="text-[10px] text-text-secondary/80">
                            ({formatRelativeTime(lot.createdAt)})
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between text-xs text-text-secondary font-medium mt-0.5">
                        <p>
                          Recorded By: <span className="font-semibold text-text">{lot.recordedByName}</span>
                          {lot.supplierName && <span> • {lot.supplierName}</span>}
                        </p>

                        <span className="text-[11px] font-medium text-accent opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                          Inspect Lot Details <ExternalLink className="h-3 w-3" />
                        </span>
                      </div>

                      {/* Item Summary Pill */}
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border shadow-xs max-w-full bg-bg-subtle text-text border-border">
                          <strong className="text-text">{lot.quantity}x {lot.itemName}</strong>
                          <span className="text-text-secondary">@ ₱{Number(lot.unitCost).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        ) : (
          <div className="p-4 md:p-6">
            <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-bg-subtle text-text-secondary border-b border-border font-semibold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="px-4 py-3.5">Date Added</th>
                      <th className="px-4 py-3.5">Lot Code</th>
                      <th className="px-4 py-3.5">Item & Qty</th>
                      <th className="px-4 py-3.5">Unit Cost</th>
                      <th className="px-4 py-3.5">Total Valuation</th>
                      <th className="px-4 py-3.5">Supplier</th>
                      <th className="px-4 py-3.5">Recorded By</th>
                      <th className="px-4 py-3.5 text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredLots.map((lot) => (
                      <tr
                        key={lot.id}
                        onClick={() => setSelectedLot(lot)}
                        className="hover:bg-bg-subtle/60 transition-colors cursor-pointer group"
                      >
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="font-semibold text-text block">
                            {formatDateTime(lot.createdAt)}
                          </span>
                          <span className="text-[10px] text-text-secondary">
                            ({formatRelativeTime(lot.createdAt)})
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-text">
                          {lot.lotCode}
                        </td>
                        <td className="px-4 py-3 font-medium text-text">
                          {lot.quantity}x {lot.itemName}
                        </td>
                        <td className="px-4 py-3 font-mono text-text">
                          ₱{Number(lot.unitCost).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-status-active-text">
                          ₱{Number(lot.totalCost).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-text-secondary">
                          {lot.supplierName || "-"}
                        </td>
                        <td className="px-4 py-3 font-semibold text-text">
                          {lot.recordedByName}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent group-hover:underline">
                            Inspect
                            <ExternalLink className="h-3 w-3" />
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Detail Slide-Over Sheet */}
      <PurchaseOrderDetailPanel
        lot={selectedLot}
        isOpen={Boolean(selectedLot)}
        onClose={() => setSelectedLot(null)}
      />
    </div>
  );
}
