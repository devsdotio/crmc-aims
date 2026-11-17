"use client";

import React, { useState, useMemo } from "react";
import {
  Receipt,
  FileText,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Ban,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Boxes,
  Eye,
  Printer,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  FilePlus2,
} from "lucide-react";
import type { Voucher, VoucherStatus } from "@/types/vouchers";
import { formatPhp } from "@/components/projects/format-money";
import { disbursementPurposeLabel } from "@/lib/voucher-particulars";
import { cn } from "@/lib/utils";

type SortField = "voucherCode" | "voucherDate" | "payeeName" | "amount" | "status";
type SortOrder = "asc" | "desc";

interface VouchersTableProps {
  vouchers: Voucher[];
  loading?: boolean;
  total?: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  onSelectVoucher: (voucher: Voucher) => void;
  onPrintSlip: (voucher: Voucher) => void;
  onResetFilters?: () => void;
  onCreateVoucher?: () => void;
  hasActiveFilters?: boolean;
}

function getStatusBadge(status: VoucherStatus) {
  switch (status) {
    case "completed":
      return {
        label: "Closed",
        className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
        rail: "bg-emerald-500",
        icon: CheckCircle2,
      };
    case "disbursed":
      return {
        label: "Awaiting receipt",
        className: "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/20",
        rail: "bg-orange-500",
        icon: Receipt,
      };
    case "approved":
      return {
        label: "Approved",
        className: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/20",
        rail: "bg-blue-500",
        icon: ShieldCheck,
      };
    case "pending_approval":
      return {
        label: "Pending",
        className: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20",
        rail: "bg-amber-500",
        icon: Clock,
      };
    case "cancelled":
      return {
        label: "Cancelled",
        className: "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/20",
        rail: "bg-rose-500",
        icon: Ban,
      };
    case "draft":
    default:
      return {
        label: "Draft",
        className: "bg-gray-500/15 text-gray-700 dark:text-gray-400 border-gray-500/20",
        rail: "bg-gray-400",
        icon: FileText,
      };
  }
}

export function VouchersTable({
  vouchers,
  loading = false,
  total,
  page = 1,
  pageSize = 25,
  totalPages = 1,
  onPageChange,
  onPageSizeChange,
  onSelectVoucher,
  onPrintSlip,
  onResetFilters,
  onCreateVoucher,
  hasActiveFilters = false,
}: VouchersTableProps) {
  const [sortField, setSortField] = useState<SortField>("voucherDate");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const sortedVouchers = useMemo(() => {
    return [...vouchers].sort((a, b) => {
      let comparison = 0;
      if (sortField === "amount") {
        comparison =
          (parseFloat(a.amount ?? "0") || 0) -
          (parseFloat(b.amount ?? "0") || 0);
      } else if (sortField === "voucherDate") {
        comparison = a.voucherDate.localeCompare(b.voucherDate);
      } else if (sortField === "voucherCode") {
        comparison = a.voucherCode.localeCompare(b.voucherCode);
      } else if (sortField === "payeeName") {
        comparison = a.payeeName.localeCompare(b.payeeName);
      } else if (sortField === "status") {
        comparison = a.status.localeCompare(b.status);
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });
  }, [vouchers, sortField, sortOrder]);

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3.5 w-3.5 text-text-secondary/40" />;
    }
    return sortOrder === "asc" ? (
      <ArrowUp className="h-3.5 w-3.5 text-primary" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 text-primary" />
    );
  };

  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-bg overflow-hidden flex flex-col flex-1 min-h-0 shadow-2xs">
        <div className="flex-1 overflow-auto min-h-0">
          <table className="w-full text-left border-collapse text-xs text-text">
            <thead className="sticky top-0 z-10 bg-bg-subtle/80 backdrop-blur-xs border-b border-border text-text-secondary text-[11px] font-bold uppercase tracking-wider">
              <tr>
                <th scope="col" className="py-3 px-4">Voucher No.</th>
                <th scope="col" className="py-3 px-4">Date</th>
                <th scope="col" className="py-3 px-4">Payee / Disbursed To</th>
                <th scope="col" className="py-3 px-4">PO / Asset Ref</th>
                <th scope="col" className="py-3 px-4">Ref / Receipt #</th>
                <th scope="col" className="py-3 px-4 text-right">Amount</th>
                <th scope="col" className="py-3 px-4">Status</th>
                <th scope="col" className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {Array.from({ length: 7 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="py-4 pl-5 pr-4">
                    <div className="h-4 w-28 bg-bg-subtle rounded" />
                  </td>
                  <td className="py-4 px-4">
                    <div className="h-4 w-20 bg-bg-subtle rounded" />
                  </td>
                  <td className="py-4 px-4">
                    <div className="space-y-1.5">
                      <div className="h-4 w-36 bg-bg-subtle rounded" />
                      <div className="h-3 w-24 bg-bg-subtle rounded" />
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="h-4 w-24 bg-bg-subtle rounded" />
                  </td>
                  <td className="py-4 px-4">
                    <div className="h-4 w-16 bg-bg-subtle rounded" />
                  </td>
                  <td className="py-4 px-4 text-right">
                    <div className="h-4 w-20 bg-bg-subtle rounded ml-auto" />
                  </td>
                  <td className="py-4 px-4">
                    <div className="h-5 w-24 bg-bg-subtle rounded-full" />
                  </td>
                  <td className="py-4 px-4 text-right">
                    <div className="h-7 w-28 bg-bg-subtle rounded-lg ml-auto" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (vouchers.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-bg flex flex-1 flex-col items-center justify-center p-12 text-center shadow-2xs">
        <div className="rounded-full bg-bg-subtle p-4 border border-border">
          <Receipt className="h-8 w-8 text-text-secondary" />
        </div>
        <h3 className="mt-3 text-sm font-bold text-text">
          {hasActiveFilters ? "No vouchers match your filters" : "No vouchers recorded"}
        </h3>
        <p className="mt-1 text-xs text-text-secondary max-w-sm">
          {hasActiveFilters
            ? "No disbursement vouchers match your active search or filters. Adjust or clear filters to view more records."
            : "No disbursement vouchers recorded yet. Create a voucher to track claims and payments."}
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {hasActiveFilters && onResetFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-border bg-bg text-text hover:bg-bg-subtle transition-colors cursor-pointer shadow-2xs"
            >
              <RotateCcw className="h-3.5 w-3.5 text-text-secondary" />
              <span>Clear filters</span>
            </button>
          )}
          {onCreateVoucher && (
            <button
              type="button"
              onClick={onCreateVoucher}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
            >
              <FilePlus2 className="h-3.5 w-3.5" />
              <span>New Voucher</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  const effectiveTotal = total ?? vouchers.length;
  const fromIndex = effectiveTotal === 0 ? 0 : (page - 1) * pageSize + 1;
  const toIndex = Math.min(page * pageSize, effectiveTotal);

  return (
    <div className="rounded-lg border border-border bg-bg overflow-hidden flex flex-col flex-1 min-h-0 shadow-2xs">
      <div className="flex-1 overflow-auto min-h-0">
        <table className="w-full text-left border-collapse text-xs text-text">
          <thead className="sticky top-0 z-10 bg-bg-subtle/80 backdrop-blur-xs border-b border-border text-text-secondary text-[11px] font-bold uppercase tracking-wider">
            <tr>
              <th
                scope="col"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleSort("voucherCode");
                  }
                }}
                className="py-3 px-4 cursor-pointer hover:text-text transition-colors select-none focus-visible:outline-2 focus-visible:outline-primary"
                onClick={() => handleSort("voucherCode")}
              >
                <div className="flex items-center gap-1.5">
                  <span>Voucher No.</span>
                  {renderSortIcon("voucherCode")}
                </div>
              </th>
              <th
                scope="col"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleSort("voucherDate");
                  }
                }}
                className="py-3 px-4 cursor-pointer hover:text-text transition-colors select-none focus-visible:outline-2 focus-visible:outline-primary"
                onClick={() => handleSort("voucherDate")}
              >
                <div className="flex items-center gap-1.5">
                  <span>Date</span>
                  {renderSortIcon("voucherDate")}
                </div>
              </th>
              <th
                scope="col"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleSort("payeeName");
                  }
                }}
                className="py-3 px-4 cursor-pointer hover:text-text transition-colors select-none focus-visible:outline-2 focus-visible:outline-primary"
                onClick={() => handleSort("payeeName")}
              >
                <div className="flex items-center gap-1.5">
                  <span>Payee / Disbursed To</span>
                  {renderSortIcon("payeeName")}
                </div>
              </th>
              <th scope="col" className="py-3 px-4">
                PO / Asset Ref
              </th>
              <th scope="col" className="py-3 px-4">
                Ref / Receipt #
              </th>
              <th
                scope="col"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleSort("amount");
                  }
                }}
                className="py-3 px-4 cursor-pointer hover:text-text transition-colors text-right focus-visible:outline-2 focus-visible:outline-primary"
                onClick={() => handleSort("amount")}
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>Amount</span>
                  {renderSortIcon("amount")}
                </div>
              </th>
              <th
                scope="col"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleSort("status");
                  }
                }}
                className="py-3 px-4 cursor-pointer hover:text-text transition-colors focus-visible:outline-2 focus-visible:outline-primary"
                onClick={() => handleSort("status")}
              >
                <div className="flex items-center gap-1.5">
                  <span>Status</span>
                  {renderSortIcon("status")}
                </div>
              </th>
              <th scope="col" className="py-3 px-4 text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sortedVouchers.map((voucher) => {
              const statusInfo = getStatusBadge(voucher.status);
              const StatusIcon = statusInfo.icon;

              return (
                <tr
                  key={voucher.id}
                  onClick={() => onSelectVoucher(voucher)}
                  className="cursor-pointer hover:bg-bg-subtle/50 transition-colors group"
                >
                  {/* Voucher Code */}
                  <td className="relative py-3.5 pl-5 pr-4 font-mono font-bold text-text">
                    <span
                      className={cn(
                        "absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full",
                        statusInfo.rail
                      )}
                      title={statusInfo.label}
                      aria-hidden
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-primary group-hover:underline">
                        {voucher.voucherCode}
                      </span>
                      {voucher.isLegacy && (
                        <span className="rounded bg-bg-subtle px-1.5 py-0.5 text-[9px] font-bold text-text-secondary uppercase border border-border">
                          Legacy
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Date */}
                  <td className="py-3.5 px-4 text-text-secondary whitespace-nowrap">
                    {voucher.voucherDate}
                  </td>

                  {/* Payee / Supplier */}
                  <td className="py-3.5 px-4">
                    <div
                      className="font-semibold text-text max-w-56 truncate"
                      title={voucher.payeeName}
                    >
                      {voucher.payeeName}
                    </div>
                    {voucher.supplierName && voucher.supplierName !== voucher.payeeName && (
                      <div
                        className="text-[11px] text-text-secondary max-w-56 truncate"
                        title={`Supplier: ${voucher.supplierName}`}
                      >
                        via {voucher.supplierName}
                      </div>
                    )}
                    {(() => {
                      const preview = disbursementPurposeLabel(
                        voucher.purpose,
                        voucher.particulars
                      );
                      if (!preview.label) return null;
                      return (
                        <span
                          title={preview.title}
                          className="mt-1 inline-flex max-w-56 truncate rounded-md px-1.5 py-0.5 text-[10px] font-semibold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/25"
                        >
                          {preview.label}
                        </span>
                      );
                    })()}
                  </td>

                  {/* PO / Asset Ref */}
                  <td className="py-3.5 px-4 text-text-secondary">
                    {voucher.purchaseOrderNumber ? (
                      <div className="flex items-center gap-1 font-mono text-[11px] text-text font-medium">
                        <Boxes className="h-3 w-3 text-primary" />
                        <span>#{voucher.purchaseOrderNumber}</span>
                      </div>
                    ) : voucher.assetCode ? (
                      <div className="flex items-center gap-1 font-mono text-[11px] text-text font-medium">
                        <FileText className="h-3 w-3 text-indigo-500" />
                        <span>{voucher.assetCode}</span>
                      </div>
                    ) : (
                      <span className="text-text-secondary/60">—</span>
                    )}
                  </td>

                  {/* Ref / Receipt # */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    {voucher.checkNumber ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono bg-bg-subtle text-text-secondary border border-border">
                        <Receipt className="w-3 h-3 opacity-70" />
                        {voucher.checkNumber}
                      </span>
                    ) : (
                      <span className="text-text-secondary/60 text-[11px]">—</span>
                    )}
                  </td>

                  {/* Amount */}
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-text whitespace-nowrap">
                    {voucher.amount != null ? formatPhp(voucher.amount) : "Restricted"}
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-4">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
                        statusInfo.className
                      )}
                    >
                      <StatusIcon className="h-3 w-3" />
                      {statusInfo.label}
                    </span>
                  </td>

                  {/* Action */}
                  <td className="py-3.5 px-4 text-right">
                    <div className="inline-flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onPrintSlip(voucher);
                        }}
                        title="Print or save disbursement slip"
                        className="inline-flex items-center gap-1 rounded-lg border border-border bg-bg px-2.5 py-1.5 text-xs font-semibold text-text shadow-2xs hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-primary/20 transition-colors"
                      >
                        <Printer className="h-3.5 w-3.5 text-text-secondary" />
                        <span>Print Slip</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectVoucher(voucher);
                        }}
                        title="View details"
                        className="inline-flex items-center gap-1 rounded-lg border border-border bg-bg px-2.5 py-1.5 text-xs font-semibold text-text shadow-2xs hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-primary/20 transition-colors"
                      >
                        <Eye className="h-3.5 w-3.5 text-text-secondary" />
                        <span>View</span>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {onPageChange && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-border bg-bg-subtle/50 text-xs text-text-secondary shrink-0">
          <div className="flex items-center gap-2">
            <span>
              Showing <strong className="text-text font-semibold">{fromIndex}</strong> to{" "}
              <strong className="text-text font-semibold">{toIndex}</strong> of{" "}
              <strong className="text-text font-semibold">{effectiveTotal}</strong> voucher
              {effectiveTotal === 1 ? "" : "s"}
            </span>

            {onPageSizeChange && (
              <div className="flex items-center gap-1.5 ml-3 pl-3 border-l border-border">
                <span className="text-text-secondary/80">Per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => onPageSizeChange(Number(e.target.value))}
                  aria-label="Vouchers per page"
                  className="h-7 rounded-md border border-border bg-bg px-2 text-xs text-text focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onPageChange(Math.max(1, page - 1))}
              disabled={page <= 1}
              aria-label="Previous page"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border bg-bg text-text text-xs font-semibold hover:bg-bg-subtle disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-2xs"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Previous</span>
            </button>

            <span className="px-2 text-xs font-mono font-medium text-text">
              Page {page} of {Math.max(1, totalPages)}
            </span>

            <button
              type="button"
              onClick={() => onPageChange(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              aria-label="Next page"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border bg-bg text-text text-xs font-semibold hover:bg-bg-subtle disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-2xs"
            >
              <span>Next</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
