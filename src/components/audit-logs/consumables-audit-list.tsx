"use client";

import React, { useState, useMemo } from "react";
import { Layers, ExternalLink, MapPin, Tag, FileText, PlusCircle, MinusCircle, AlertTriangle } from "lucide-react";
import { useConsumablesQuery } from "@/features/consumables/client/use-consumables";
import {
  AuditLogFilters,
  type AuditLogFilterValues,
} from "./audit-log-filters";
import { ConsumableAuditDetailPanel } from "./consumable-audit-detail-panel";
import { formatDateTime, formatRelativeTime, exportToCSV } from "./audit-log-utils";
import { useCategoryStyleMap } from "@/features/categories/client/use-categories";
import type { ConsumableItem } from "@/features/consumables/client/consumables-api";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/providers/toast-context";
import { LoadingState } from "@/components/providers/loading-context";

const STOCK_STATUS_OPTIONS = [
  { value: "healthy", label: "In Stock" },
  { value: "low", label: "Low Stock" },
  { value: "out", label: "Out of Stock" },
];

export function ConsumablesAuditList() {
  const { data: response, isLoading, error } = useConsumablesQuery({ limit: 100 });
  const { getCategoryStyle } = useCategoryStyleMap();
  const toast = useToast();

  // Safely extract consumables array whether wrapped in paginated response or raw array
  const consumables: ConsumableItem[] = useMemo(
    () => response?.data ?? [],
    [response?.data]
  );

  const [filters, setFilters] = useState<AuditLogFilterValues>({
    search: "",
    action: "",
    categoryOrDept: "",
    startDate: "",
    endDate: "",
    viewMode: "table",
  });

  const [selectedConsumable, setSelectedConsumable] = useState<ConsumableItem | null>(null);

  // Guarantee 1 unique record per Item Code
  const uniqueConsumables = useMemo(() => {
    const map = new Map<string, ConsumableItem>();
    consumables.forEach((c) => {
      const code = (c.itemCode || c.id).trim();
      if (!map.has(code)) {
        map.set(code, c);
      }
    });
    return Array.from(map.values());
  }, [consumables]);

  // Extract unique categories for dropdown filter
  const categoryOptions = useMemo(() => {
    const cats = new Set<string>();
    uniqueConsumables.forEach((c) => {
      if (c.category) cats.add(c.category);
    });
    return Array.from(cats)
      .sort()
      .map((cat) => ({
        value: cat,
        label: cat.replace(/_/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase()),
      }));
  }, [uniqueConsumables]);

  // Filter consumables
  const filteredConsumables = useMemo(() => {
    return uniqueConsumables.filter((item) => {
      // 1. Search Query
      if (filters.search.trim()) {
        const q = filters.search.toLowerCase();
        const matchCode = item.itemCode.toLowerCase().includes(q);
        const matchName = item.name.toLowerCase().includes(q);
        const matchLoc = item.location?.toLowerCase().includes(q);
        const matchSupplier = item.supplier?.toLowerCase().includes(q);
        const matchCategory = item.category?.toLowerCase().includes(q);
        if (!matchCode && !matchName && !matchLoc && !matchSupplier && !matchCategory) {
          return false;
        }
      }

      // 2. Stock Level Filter
      if (filters.action) {
        if (filters.action === "out" && item.currentQty > 0) return false;
        if (filters.action === "low" && (item.currentQty > item.minThreshold || item.currentQty === 0)) return false;
        if (filters.action === "healthy" && item.currentQty <= item.minThreshold) return false;
      }

      // 3. Category Filter
      if (filters.categoryOrDept && item.category !== filters.categoryOrDept) {
        return false;
      }

      // 4. Date Range
      if (filters.startDate) {
        if (!item.lastRestocked || item.lastRestocked === "—" || isNaN(new Date(item.lastRestocked).getTime())) {
          return false;
        }
        const date = new Date(item.lastRestocked).toISOString().split("T")[0];
        if (date < filters.startDate) return false;
      }
      if (filters.endDate) {
        if (!item.lastRestocked || item.lastRestocked === "—" || isNaN(new Date(item.lastRestocked).getTime())) {
          return false;
        }
        const date = new Date(item.lastRestocked).toISOString().split("T")[0];
        if (date > filters.endDate) return false;
      }

      return true;
    });
  }, [uniqueConsumables, filters]);

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
    if (filteredConsumables.length === 0) return;
    const exportable = filteredConsumables.map((c) => ({
      itemCode: c.itemCode,
      name: c.name,
      category: c.category,
      unit: c.unit,
      currentQty: c.currentQty,
      minThreshold: c.minThreshold,
      location: c.location,
      supplier: c.supplier || "",
      lastRestocked: c.lastRestocked || "",
      totalHistoryEntries: Array.isArray(c.history) ? c.history.length : 0,
    }));
    exportToCSV("consumables-audit-ledger", exportable);
    toast.success(`Exported ${filteredConsumables.length} consumable audit records.`);
  };

  if (isLoading) {
    return (
      <LoadingState
        icon="layers"
        message="Loading consumables audit ledger..."
        subtitle="Retrieving inventory items, batch balances, and stock movement records"
      />
    );
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
        <Layers className="h-12 w-12 text-status-outofservice-text mb-3 opacity-30" />
        <h3 className="text-sm font-bold text-text">Unable to Load Consumables</h3>
        <p className="text-xs text-text-secondary max-w-sm mt-1">
          An issue occurred while retrieving the consumable inventory records. Please check your connection or try refreshing.
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
        actionOptions={STOCK_STATUS_OPTIONS}
        actionLabel="Stock Level"
        categoryOptions={categoryOptions}
        categoryLabel="Category"
        totalCount={uniqueConsumables.length}
        filteredCount={filteredConsumables.length}
      />

      {/* Content Area: 1 row per unique consumable item */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {filteredConsumables.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center p-8 text-center">
            <Layers className="h-12 w-12 text-text-secondary mb-4 opacity-20" />
            <h3 className="text-base font-bold text-text">No Consumables Found</h3>
            <p className="text-xs text-text-secondary max-w-sm mt-1">
              No consumable records match your search and filter criteria.
            </p>
          </div>
        ) : filters.viewMode === "timeline" ? (
          <div className="p-4 md:p-6 max-w-4xl mx-auto pl-2">
            <div className="p-5 rounded-xl border border-border bg-bg shadow-xs">
              <ol className="relative border-l-2 border-border/60 ml-3 space-y-6">
                {filteredConsumables.map((item) => {
                  const catStyle = getCategoryStyle(item.category);
                  const isLow = item.currentQty <= item.minThreshold && item.currentQty > 0;
                  const isOut = item.currentQty === 0;
                  const historyCount = Array.isArray(item.history) ? item.history.length : 0;
                  const hasRestock = item.lastRestocked && item.lastRestocked !== "—";

                  return (
                    <li
                      key={item.id}
                      onClick={() => setSelectedConsumable(item)}
                      className="pl-6 relative group transition-all cursor-pointer"
                    >
                      <span
                        className={cn(
                          "absolute -left-3.25 top-1.5 h-6 w-6 rounded-full border-2 flex items-center justify-center bg-bg shadow-sm z-10 transition-transform group-hover:scale-110",
                          isOut
                            ? "bg-status-outofservice-bg/20 text-status-outofservice-text border-status-outofservice-bg/30"
                            : isLow
                            ? "bg-status-repair-bg/20 text-status-repair-text border-status-repair-bg/30"
                            : "bg-status-active-bg/20 text-status-active-text border-status-active-bg/30"
                        )}
                      >
                        <Layers className="h-3 w-3" />
                      </span>

                      <div className="flex flex-col gap-0.5 pt-1.5 group-hover:bg-bg-subtle/50 rounded-lg p-1.5 -ml-1.5 transition-colors">
                        <div className="flex items-center justify-between text-xs flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[11px] font-bold text-text bg-bg-subtle px-1.5 py-0.5 rounded border border-border">
                              {item.itemCode}
                            </span>
                            <span className="font-bold text-text text-xs">
                              {item.name}
                            </span>
                            <span
                              className={cn(
                                "rounded-full px-2 py-0.5 text-[9px] font-bold uppercase",
                                catStyle.bg,
                                catStyle.text
                              )}
                            >
                              {catStyle.label}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 text-right">
                            <span className="font-bold text-text text-xs">
                              {item.currentQty} {item.unit}
                            </span>
                            {hasRestock && (
                              <span className="text-[10px] text-text-secondary">
                                (Restocked {formatRelativeTime(item.lastRestocked)})
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between text-xs text-text-secondary font-medium mt-0.5">
                          <p className="flex items-center gap-1.5">
                            <MapPin className="h-3 w-3" />
                            <span>{item.location}</span>
                            {item.supplier && <span> • Supplier: <strong className="text-text">{item.supplier}</strong></span>}
                          </p>

                          <span className="text-[11px] font-medium text-accent opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                            Inspect Movement History ({historyCount}) <ExternalLink className="h-3 w-3" />
                          </span>
                        </div>

                        {/* Status Badges */}
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                              isOut
                                ? "bg-status-outofservice-bg/20 text-status-outofservice-text border-status-outofservice-bg/30"
                                : isLow
                                ? "bg-status-repair-bg/20 text-status-repair-text border-status-repair-bg/30"
                                : "bg-status-active-bg/20 text-status-active-text border-status-active-bg/30"
                            )}
                          >
                            {isOut ? "Out of Stock" : isLow ? "Low Stock" : "In Stock"}
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-bg-subtle text-text border border-border">
                            Min: {item.minThreshold} {item.unit}
                          </span>
                        </div>
                      </div>
                    </li>
                  );
                })}
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
                      <th className="px-4 py-3.5">Item Code</th>
                      <th className="px-4 py-3.5">Item Name</th>
                      <th className="px-4 py-3.5">Category</th>
                      <th className="px-4 py-3.5">Current Stock</th>
                      <th className="px-4 py-3.5">Stock Level</th>
                      <th className="px-4 py-3.5">Location</th>
                      <th className="px-4 py-3.5">Primary Supplier</th>
                      <th className="px-4 py-3.5">Last Restocked</th>
                      <th className="px-4 py-3.5 text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredConsumables.map((item) => {
                      const catStyle = getCategoryStyle(item.category);
                      const isLow = item.currentQty <= item.minThreshold && item.currentQty > 0;
                      const isOut = item.currentQty === 0;
                      const hasRestock = item.lastRestocked && item.lastRestocked !== "—";

                      return (
                        <tr
                          key={item.id}
                          onClick={() => setSelectedConsumable(item)}
                          className="hover:bg-bg-subtle/60 transition-colors cursor-pointer group"
                        >
                          <td className="px-4 py-3 font-mono font-bold text-text">
                            {item.itemCode}
                          </td>
                          <td className="px-4 py-3 font-semibold text-text">
                            {item.name}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={cn(
                                "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                                catStyle.bg,
                                catStyle.text
                              )}
                            >
                              {catStyle.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-bold text-text">
                            {item.currentQty} <span className="text-text-secondary font-normal text-[11px]">{item.unit}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                                isOut
                                  ? "bg-status-outofservice-bg/20 text-status-outofservice-text border-status-outofservice-bg/30"
                                  : isLow
                                  ? "bg-status-repair-bg/20 text-status-repair-text border-status-repair-bg/30"
                                  : "bg-status-active-bg/20 text-status-active-text border-status-active-bg/30"
                              )}
                            >
                              {isOut ? "Out of Stock" : isLow ? "Low Stock" : "In Stock"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-text-secondary">
                            {item.location}
                          </td>
                          <td className="px-4 py-3 text-text-secondary">
                            {item.supplier || "-"}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {hasRestock ? (
                              <>
                                <span className="font-semibold text-text block">
                                  {formatDateTime(item.lastRestocked)}
                                </span>
                                <span className="text-[10px] text-text-secondary">
                                  {formatRelativeTime(item.lastRestocked)}
                                </span>
                              </>
                            ) : (
                              <span className="text-text-secondary italic">No restocks</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent group-hover:underline">
                              Inspect Movement
                              <ExternalLink className="h-3 w-3" />
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Detail Slide-Over Sheet (Opens entire stock movement, restock, and issuance history) */}
      <ConsumableAuditDetailPanel
        consumable={selectedConsumable}
        isOpen={Boolean(selectedConsumable)}
        onClose={() => setSelectedConsumable(null)}
      />
    </div>
  );
}
