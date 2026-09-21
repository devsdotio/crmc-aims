"use client";

import React, { useState, useMemo } from "react";
import { Package, ExternalLink, User, MapPin, Tag, FileText, CheckCircle2, AlertTriangle, Wrench } from "lucide-react";
import { useAssetsQuery } from "@/features/assets/client";
import {
  AuditLogFilters,
  type AuditLogFilterValues,
} from "./audit-log-filters";
import { AssetAuditDetailPanel } from "./asset-audit-detail-panel";
import { formatDateTime, formatRelativeTime, exportToCSV } from "./audit-log-utils";
import { useCategoryStyleMap } from "@/features/categories/client/use-categories";
import type { Asset, AssetCategory, AssetStatus } from "@/types/assets";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/providers/toast-context";
import { LoadingState } from "@/components/providers/loading-context";

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "borrowed", label: "Borrowed / In-Use" },
  { value: "needs_repair", label: "Needs Repair" },
  { value: "out_of_service", label: "Out of Service" },
  { value: "retired", label: "Retired" },
];

export function AssetsAuditList() {
  const { data: assets = [], isLoading, error } = useAssetsQuery();
  const { getCategoryStyle } = useCategoryStyleMap();
  const toast = useToast();

  const [filters, setFilters] = useState<AuditLogFilterValues>({
    search: "",
    action: "",
    categoryOrDept: "",
    startDate: "",
    endDate: "",
    viewMode: "table",
  });

  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  // Guarantee 1 unique record per Asset Code
  const uniqueAssets = useMemo(() => {
    const map = new Map<string, Asset>();
    assets.forEach((a) => {
      const code = (a.assetCode || a.id).trim();
      if (!map.has(code)) {
        map.set(code, a);
      }
    });
    return Array.from(map.values());
  }, [assets]);

  // Extract unique categories for dropdown filter
  const categoryOptions = useMemo(() => {
    const cats = new Set<string>();
    uniqueAssets.forEach((a) => {
      if (a.category) cats.add(a.category);
    });
    return Array.from(cats)
      .sort()
      .map((c) => ({
        value: c,
        label: c.replace(/_/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase()),
      }));
  }, [uniqueAssets]);

  // Filter assets
  const filteredAssets = useMemo(() => {
    return uniqueAssets.filter((asset) => {
      // 1. Search Query
      if (filters.search.trim()) {
        const q = filters.search.toLowerCase();
        const matchCode = asset.assetCode.toLowerCase().includes(q);
        const matchName = asset.name.toLowerCase().includes(q);
        const matchLoc = asset.location.toLowerCase().includes(q);
        const matchHolder = asset.currentHolder?.toLowerCase().includes(q);
        const matchSerial = asset.serialNumber?.toLowerCase().includes(q);
        const matchCategory = asset.category.toLowerCase().includes(q);
        if (!matchCode && !matchName && !matchLoc && !matchHolder && !matchSerial && !matchCategory) {
          return false;
        }
      }

      // 2. Status / Action Filter
      if (filters.action) {
        if (filters.action === "borrowed") {
          if (!asset.currentHolder) return false;
        } else if (asset.status.toLowerCase() !== filters.action.toLowerCase()) {
          return false;
        }
      }

      // 3. Category Filter
      if (filters.categoryOrDept && asset.category !== filters.categoryOrDept) {
        return false;
      }

      // 4. Date Range (lastUpdated)
      if (filters.startDate) {
        const date = new Date(asset.lastUpdated).toISOString().split("T")[0];
        if (date < filters.startDate) return false;
      }
      if (filters.endDate) {
        const date = new Date(asset.lastUpdated).toISOString().split("T")[0];
        if (date > filters.endDate) return false;
      }

      return true;
    });
  }, [uniqueAssets, filters]);

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
    if (filteredAssets.length === 0) return;
    const exportable = filteredAssets.map((a) => ({
      assetCode: a.assetCode,
      name: a.name,
      category: a.category,
      status: a.currentHolder ? "borrowed" : a.status,
      currentHolder: a.currentHolder || "Storage",
      location: a.location,
      serialNumber: a.serialNumber || "",
      assignmentType: a.assignmentType,
      lastUpdated: a.lastUpdated,
    }));
    exportToCSV("assets-audit-ledger", exportable);
    toast.success(`Exported ${filteredAssets.length} asset audit records.`);
  };

  if (isLoading) {
    return (
      <LoadingState
        icon="package"
        message="Loading assets audit ledger..."
        subtitle="Retrieving tracked equipment, hardware registries, and lifecycle logs"
      />
    );
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
        <Package className="h-12 w-12 text-status-outofservice-text mb-3 opacity-30" />
        <h3 className="text-sm font-bold text-text">Failed to load assets</h3>
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
        actionOptions={STATUS_OPTIONS}
        categoryOptions={categoryOptions}
        categoryLabel="Category"
        totalCount={uniqueAssets.length}
        filteredCount={filteredAssets.length}
      />

      {/* Content Area: 1 row per unique asset */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {filteredAssets.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center p-8 text-center">
            <Package className="h-12 w-12 text-text-secondary mb-4 opacity-20" />
            <h3 className="text-base font-bold text-text">No Assets Found</h3>
            <p className="text-xs text-text-secondary max-w-sm mt-1">
              No asset records match your search and filter criteria.
            </p>
          </div>
        ) : filters.viewMode === "timeline" ? (
          <div className="p-4 md:p-6 max-w-4xl mx-auto pl-2">
            <div className="p-5 rounded-xl border border-border bg-bg shadow-xs">
              <ol className="relative border-l-2 border-border/60 ml-3 space-y-6">
                {filteredAssets.map((asset) => {
                  const catStyle = getCategoryStyle(asset.category);
                  const isBorrowed = Boolean(asset.currentHolder);

                  return (
                    <li
                      key={asset.id}
                      onClick={() => setSelectedAsset(asset)}
                      className="pl-6 relative group transition-all cursor-pointer"
                    >
                      <span
                        className={cn(
                          "absolute -left-3.25 top-1.5 h-6 w-6 rounded-full border-2 flex items-center justify-center bg-bg shadow-sm z-10 transition-transform group-hover:scale-110",
                          isBorrowed
                            ? "bg-status-repair-bg/20 text-status-repair-text border-status-repair-bg/30"
                            : asset.status === "active"
                            ? "bg-status-active-bg/20 text-status-active-text border-status-active-bg/30"
                            : "bg-status-outofservice-bg/20 text-status-outofservice-text border-status-outofservice-bg/30"
                        )}
                      >
                        <Package className="h-3 w-3" />
                      </span>

                      <div className="flex flex-col gap-0.5 pt-1.5 group-hover:bg-bg-subtle/50 rounded-lg p-1.5 -ml-1.5 transition-colors">
                        <div className="flex items-center justify-between text-xs flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[11px] font-bold text-text bg-bg-subtle px-1.5 py-0.5 rounded border border-border">
                              {asset.assetCode}
                            </span>
                            <span className="font-bold text-text text-xs">
                              {asset.name}
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
                            <time className="text-[11px] text-text-secondary font-medium">
                              {formatDateTime(asset.lastUpdated)}
                            </time>
                            <span className="text-[10px] text-text-secondary/80">
                              ({formatRelativeTime(asset.lastUpdated)})
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between text-xs text-text-secondary font-medium mt-0.5">
                          <p className="flex items-center gap-1.5">
                            <MapPin className="h-3 w-3" />
                            <span>{asset.location}</span>
                            {asset.currentHolder && (
                              <span> • Holder: <strong className="text-text">{asset.currentHolder}</strong></span>
                            )}
                          </p>

                          <span className="text-[11px] font-medium text-accent opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                            Inspect Lifecycle History <ExternalLink className="h-3 w-3" />
                          </span>
                        </div>

                        {/* Status Badges */}
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                              isBorrowed
                                ? "bg-status-repair-bg/20 text-status-repair-text border-status-repair-bg/30"
                                : asset.status === "active"
                                ? "bg-status-active-bg/20 text-status-active-text border-status-active-bg/30"
                                : "bg-status-outofservice-bg/20 text-status-outofservice-text border-status-outofservice-bg/30"
                            )}
                          >
                            {isBorrowed ? "Borrowed / In-Use" : asset.status.replace(/_/g, " ")}
                          </span>
                          {asset.serialNumber && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-bg-subtle text-text border border-border">
                              SN: {asset.serialNumber}
                            </span>
                          )}
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
                      <th className="px-4 py-3.5">Asset Code</th>
                      <th className="px-4 py-3.5">Asset Name</th>
                      <th className="px-4 py-3.5">Category</th>
                      <th className="px-4 py-3.5">Status / Custody</th>
                      <th className="px-4 py-3.5">Location</th>
                      <th className="px-4 py-3.5">Current Holder</th>
                      <th className="px-4 py-3.5">Last Updated</th>
                      <th className="px-4 py-3.5 text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredAssets.map((asset) => {
                      const catStyle = getCategoryStyle(asset.category);
                      const isBorrowed = Boolean(asset.currentHolder);

                      return (
                        <tr
                          key={asset.id}
                          onClick={() => setSelectedAsset(asset)}
                          className="hover:bg-bg-subtle/60 transition-colors cursor-pointer group"
                        >
                          <td className="px-4 py-3 font-mono font-bold text-text">
                            {asset.assetCode}
                          </td>
                          <td className="px-4 py-3 font-semibold text-text">
                            {asset.name}
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
                          <td className="px-4 py-3">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                                isBorrowed
                                  ? "bg-status-repair-bg/20 text-status-repair-text border-status-repair-bg/30"
                                  : asset.status === "active"
                                  ? "bg-status-active-bg/20 text-status-active-text border-status-active-bg/30"
                                  : "bg-status-outofservice-bg/20 text-status-outofservice-text border-status-outofservice-bg/30"
                              )}
                            >
                              {isBorrowed ? "Borrowed" : asset.status.replace(/_/g, " ")}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-text-secondary">
                            {asset.location}
                          </td>
                          <td className="px-4 py-3 text-text font-medium">
                            {asset.currentHolder ? (
                              <span className="font-semibold text-text">{asset.currentHolder}</span>
                            ) : (
                              <span className="text-text-secondary italic">In Storage</span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="font-semibold text-text block">
                              {formatDateTime(asset.lastUpdated)}
                            </span>
                            <span className="text-[10px] text-text-secondary">
                              {formatRelativeTime(asset.lastUpdated)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent group-hover:underline">
                              Inspect Lifecycle
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

      {/* Detail Slide-Over Sheet (Opens entire lifecycle from borrowing to return and updates) */}
      <AssetAuditDetailPanel
        asset={selectedAsset}
        isOpen={Boolean(selectedAsset)}
        onClose={() => setSelectedAsset(null)}
      />
    </div>
  );
}
