"use client";

import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  HardHat,
  Package,
  Warehouse,
} from "lucide-react";

import type { BaseReportFilters, ConsumableStockRow } from "@/types/reports";
import { ReportTable, type ColumnDef } from "@/components/reports/report-table";
import { ConsumableCardSkeleton } from "@/components/reports/report-card-skeleton";
import { ConsumableClassificationBadge } from "@/components/reports/consumable-classification-badge";
import { ReportExportButton } from "@/components/reports/report-export-button";
import { normalizeConsumableClassification } from "@/lib/consumable-classification";

interface ConsumablePartSectionProps {
  partNumber: 1 | 2;
  classification: "supply" | "material";
  title: string;
  description: string;
  rows: ConsumableStockRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  isLoading: boolean;
  canViewCosts: boolean;
  viewMode: "table" | "cards";
  columns: ColumnDef<ConsumableStockRow>[];
  summaryMetrics: {
    skusCount: number;
    lowStockCount: number;
    dispatched30d: number;
    valuation: number;
  };
  filtersForExport: BaseReportFilters;
  onPageChange: (page: number) => void;
  onSelect: (row: ConsumableStockRow) => void;
  onResetFilters: () => void;
}

export function ConsumablePartSection({
  partNumber,
  classification,
  title,
  description,
  rows,
  total,
  page,
  pageSize,
  totalPages,
  isLoading,
  canViewCosts,
  viewMode,
  columns,
  summaryMetrics,
  filtersForExport,
  onPageChange,
  onSelect,
  onResetFilters,
}: ConsumablePartSectionProps) {
  const isMaterial = classification === "material";
  const Icon = isMaterial ? HardHat : Package;

  return (
    <section
      aria-labelledby={`consumable-part-${partNumber}-title`}
      className="flex flex-col gap-3 rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs"
    >
      {/* Part Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-3.5">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
              isMaterial
                ? "border-amber-500/30 bg-amber-500/12 text-amber-800 dark:text-amber-300"
                : "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
            }`}
          >
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`font-mono text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                  isMaterial
                    ? "border-amber-500/30 bg-amber-500/12 text-amber-800 dark:text-amber-300"
                    : "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                }`}
              >
                Part {partNumber}
              </span>
              <h2
                id={`consumable-part-${partNumber}-title`}
                className="text-base sm:text-lg font-bold tracking-tight text-text"
              >
                {title}
              </h2>
            </div>
            <p className="text-xs text-text-secondary mt-0.5">{description}</p>
          </div>
        </div>

        {/* Part Metrics Strip & Export */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono">
            <span className="rounded-lg border border-border bg-bg-subtle px-2.5 py-1 font-semibold text-text">
              {summaryMetrics.skusCount.toLocaleString()} SKUs
            </span>
            <span
              className={`rounded-lg border px-2.5 py-1 font-semibold ${
                summaryMetrics.lowStockCount > 0
                  ? "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300"
                  : "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              }`}
            >
              {summaryMetrics.lowStockCount} Low Stock
            </span>
            <span className="rounded-lg border border-border bg-bg-subtle px-2.5 py-1 font-semibold text-text">
              {summaryMetrics.dispatched30d.toLocaleString()} Used (30d)
            </span>
            {canViewCosts && (
              <span className="rounded-lg border border-border bg-bg-subtle px-2.5 py-1 font-bold text-text">
                ₱{summaryMetrics.valuation.toLocaleString()}
              </span>
            )}
          </div>
          <ReportExportButton
            reportType="consumables"
            filters={{ ...filtersForExport, classification }}
          />
        </div>
      </div>

      {/* Part Data View */}
      {viewMode === "table" ? (
        <ReportTable
          columns={columns}
          data={rows}
          total={total}
          page={page}
          pageSize={pageSize}
          totalPages={totalPages}
          isLoading={isLoading}
          onPageChange={onPageChange}
          onRowClick={onSelect}
          emptyTitle={
            isMaterial
              ? "No Consumable Materials found"
              : "No Consumable Supplies found"
          }
          emptyDescription="Try adjusting your search query, category, or stock status filter."
          onEmptyAction={onResetFilters}
        />
      ) : (
        <div className="space-y-4">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, idx) => (
                <ConsumableCardSkeleton key={idx} />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="rounded-xl border border-border/80 bg-bg-subtle/30 p-10 text-center">
              <Icon className="h-9 w-9 text-text-secondary/50 mx-auto mb-2.5" />
              <h3 className="text-sm font-semibold text-text">
                {isMaterial
                  ? "No Consumable Materials found"
                  : "No Consumable Supplies found"}
              </h3>
              <p className="text-xs text-text-secondary mt-1">
                Try adjusting your search criteria or filter selections.
              </p>
              <button
                type="button"
                onClick={onResetFilters}
                className="mt-4 inline-flex items-center justify-center rounded-xl border border-border bg-card px-4 min-h-11 sm:min-h-9 text-xs font-semibold text-text hover:bg-bg-subtle transition-colors cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {rows.map((row) => (
                <div
                  key={row.id}
                  onClick={() => onSelect(row)}
                  className="group flex flex-col justify-between rounded-xl border border-border/80 bg-card p-4.5 hover:border-primary/40 hover:shadow-md transition-all cursor-pointer relative"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-bg-subtle border border-border/60 text-xs font-mono font-bold text-text group-hover:text-primary transition-colors">
                        <span>{row.itemCode}</span>
                      </div>
                      {row.isLowStock ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-status-repair-bg/20 text-status-repair-text border border-status-repair-bg/30 px-2 py-0.5 text-[10px] font-bold">
                          <AlertTriangle className="h-3 w-3" />
                          <span>Low Stock</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-status-active-bg/20 text-status-active-text border border-status-active-bg/30 px-2 py-0.5 text-[10px] font-bold">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Optimal</span>
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm font-bold text-text group-hover:text-primary transition-colors line-clamp-1">
                      {row.name}
                    </h3>

                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <span className="inline-flex rounded-md bg-bg-subtle border border-border/60 px-2 py-0.5 text-[10px] font-semibold text-text capitalize">
                        {row.category.replace(/_/g, " ")}
                      </span>
                      <ConsumableClassificationBadge
                        classification={normalizeConsumableClassification(row.classification)}
                        compact
                      />
                    </div>

                    {row.location && (
                      <div className="flex items-center gap-1.5 text-xs text-text-secondary mt-2.5">
                        <Warehouse className="h-3.5 w-3.5 shrink-0 text-text-secondary/70" />
                        <span className="text-[11px] truncate">
                          Bin: <strong className="text-text font-medium">{row.location}</strong>
                        </span>
                      </div>
                    )}

                    <div className="grid grid-cols-3 gap-2 mt-3.5 pt-3 border-t border-border/40">
                      <div className="p-2 rounded-lg bg-bg-subtle/50 border border-border/50 text-center">
                        <div className="text-[10px] text-text-secondary uppercase font-semibold">
                          On Hand
                        </div>
                        <div
                          className={`font-mono font-bold text-xs mt-0.5 ${
                            row.isLowStock ? "text-rose-700 dark:text-rose-400" : "text-text"
                          }`}
                        >
                          {row.currentQty.toLocaleString()}{" "}
                          <span className="text-[9px] font-normal text-text-secondary">
                            {row.unit}
                          </span>
                        </div>
                      </div>
                      <div className="p-2 rounded-lg bg-bg-subtle/50 border border-border/50 text-center">
                        <div className="text-[10px] text-text-secondary uppercase font-semibold">
                          Available
                        </div>
                        <div className="font-mono font-bold text-xs text-text mt-0.5">
                          {row.availableQty}{" "}
                          <span className="text-[9px] font-normal text-text-secondary">
                            {row.unit}
                          </span>
                        </div>
                      </div>
                      <div className="p-2 rounded-lg bg-bg-subtle/50 border border-border/50 text-center">
                        <div className="text-[10px] text-text-secondary uppercase font-semibold">
                          Threshold
                        </div>
                        <div className="font-mono text-xs text-text-secondary mt-0.5">
                          {row.minThreshold}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-2.5 border-t border-border/50 flex items-center justify-between text-xs">
                    <div>
                      {canViewCosts && row.stockValuation != null && row.stockValuation > 0 ? (
                        <div>
                          <div className="text-[10px] text-text-secondary uppercase tracking-wider font-semibold">
                            Stock Value
                          </div>
                          <div className="font-mono font-bold text-text text-sm">
                            ₱
                            {row.stockValuation.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="text-[11px] text-text-secondary">
                          {row.estimatedDaysRemaining != null ? (
                            <span
                              className={
                                row.estimatedDaysRemaining <= 7
                                  ? "text-rose-700 dark:text-rose-400 font-bold"
                                  : "font-mono"
                              }
                            >
                              ~{row.estimatedDaysRemaining} days remaining
                            </span>
                          ) : (
                            <span className="font-mono text-text-secondary">
                              30d use: {row.usage30d}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelect(row);
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary dark:text-blue-300 hover:underline cursor-pointer"
                    >
                      <span>Details</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!isLoading && totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border/80 px-2 py-3">
              <span className="text-xs text-text-secondary">
                Page {page} of {totalPages} ({total} total)
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => onPageChange(page - 1)}
                  className="inline-flex items-center gap-1 min-h-11 sm:min-h-8 px-3 text-xs rounded-md border border-border bg-card text-text disabled:opacity-40 disabled:cursor-not-allowed hover:bg-bg-subtle transition-colors cursor-pointer"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  <span>Prev</span>
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => onPageChange(page + 1)}
                  className="inline-flex items-center gap-1 min-h-11 sm:min-h-8 px-3 text-xs rounded-md border border-border bg-card text-text disabled:opacity-40 disabled:cursor-not-allowed hover:bg-bg-subtle transition-colors cursor-pointer"
                >
                  <span>Next</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

