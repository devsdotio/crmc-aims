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
  Building2,
  Boxes,
  Eye,
} from "lucide-react";
import type { Voucher, VoucherStatus, VoucherType } from "@/types/vouchers";
import { formatPhp } from "@/components/projects/format-money";
import { cn } from "@/lib/utils";

type SortField = "voucherCode" | "voucherDate" | "payeeName" | "amount" | "status";
type SortOrder = "asc" | "desc";

interface VouchersTableProps {
  vouchers: Voucher[];
  loading?: boolean;
  onSelectVoucher: (voucher: Voucher) => void;
}

function getStatusBadge(status: VoucherStatus) {
  switch (status) {
    case "completed":
      return {
        label: "Completed",
        className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
        icon: CheckCircle2,
      };
    case "approved":
      return {
        label: "Approved",
        className: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/20",
        icon: ShieldCheck,
      };
    case "pending_approval":
      return {
        label: "Pending",
        className: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20",
        icon: Clock,
      };
    case "cancelled":
      return {
        label: "Cancelled",
        className: "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/20",
        icon: Ban,
      };
    case "draft":
    default:
      return {
        label: "Draft",
        className: "bg-gray-500/15 text-gray-700 dark:text-gray-400 border-gray-500/20",
        icon: FileText,
      };
  }
}

function getTypeBadge(type: VoucherType) {
  switch (type) {
    case "disbursement":
      return {
        label: "Disbursement",
        className: "bg-primary/10 text-primary border-primary/20",
      };
    case "property_transfer":
      return {
        label: "Property Transfer",
        className: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
      };
    case "liquidation":
      return {
        label: "Liquidation",
        className: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20",
      };
  }
}

export function VouchersTable({
  vouchers,
  loading = false,
  onSelectVoucher,
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
        comparison = (parseFloat(a.amount) || 0) - (parseFloat(b.amount) || 0);
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
      <div className="flex-1 h-full min-h-60 rounded-xl border border-border bg-bg shadow-2xs overflow-hidden flex flex-col">
        <div className="p-3 border-b border-border bg-bg-subtle/40">
          <div className="h-4 w-32 bg-border/60 rounded-md animate-pulse" />
        </div>
        <div className="divide-y divide-border flex-1">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center justify-between p-3.5 animate-pulse">
              <div className="space-y-1.5">
                <div className="h-3.5 w-28 bg-border/60 rounded-md" />
                <div className="h-3 w-40 bg-border/40 rounded-md" />
              </div>
              <div className="h-4 w-20 bg-border/60 rounded-md" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (vouchers.length === 0) {
    return (
      <div className="flex-1 h-full min-h-60 flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-bg-subtle/40 p-6 sm:p-10 text-center shadow-2xs">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary shadow-2xs">
          <Receipt className="h-6 w-6" />
        </div>
        <h3 className="text-sm font-bold text-text">No Vouchers Found</h3>
        <p className="mt-1 max-w-sm text-xs text-text-secondary leading-relaxed">
          No vouchers matching your active filters were found. Create a new voucher or adjust your search filters to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-bg shadow-2xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-text">
          <thead className="border-b border-border bg-bg-subtle/60 text-text-secondary uppercase tracking-wider font-semibold">
            <tr>
              <th
                scope="col"
                className="py-3 px-4 cursor-pointer hover:text-text transition-colors"
                onClick={() => handleSort("voucherCode")}
              >
                <div className="flex items-center gap-1.5">
                  <span>Voucher No.</span>
                  {renderSortIcon("voucherCode")}
                </div>
              </th>
              <th scope="col" className="py-3 px-4">
                Type
              </th>
              <th
                scope="col"
                className="py-3 px-4 cursor-pointer hover:text-text transition-colors"
                onClick={() => handleSort("voucherDate")}
              >
                <div className="flex items-center gap-1.5">
                  <span>Date</span>
                  {renderSortIcon("voucherDate")}
                </div>
              </th>
              <th
                scope="col"
                className="py-3 px-4 cursor-pointer hover:text-text transition-colors"
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
              <th
                scope="col"
                className="py-3 px-4 cursor-pointer hover:text-text transition-colors text-right"
                onClick={() => handleSort("amount")}
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>Amount</span>
                  {renderSortIcon("amount")}
                </div>
              </th>
              <th
                scope="col"
                className="py-3 px-4 cursor-pointer hover:text-text transition-colors"
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
              const typeInfo = getTypeBadge(voucher.type);
              const StatusIcon = statusInfo.icon;

              return (
                <tr
                  key={voucher.id}
                  onClick={() => onSelectVoucher(voucher)}
                  className="cursor-pointer hover:bg-bg-subtle/50 transition-colors group"
                >
                  {/* Voucher Code */}
                  <td className="py-3.5 px-4 font-mono font-bold text-text">
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

                  {/* Type */}
                  <td className="py-3.5 px-4">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
                        typeInfo.className
                      )}
                    >
                      {typeInfo.label}
                    </span>
                  </td>

                  {/* Date */}
                  <td className="py-3.5 px-4 text-text-secondary whitespace-nowrap">
                    {voucher.voucherDate}
                  </td>

                  {/* Payee / Supplier */}
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-text max-w-50 truncate">
                      {voucher.payeeName}
                    </div>
                    {voucher.supplierName && voucher.supplierName !== voucher.payeeName && (
                      <div className="text-[11px] text-text-secondary max-w-50 truncate">
                        via {voucher.supplierName}
                      </div>
                    )}
                  </td>

                  {/* References */}
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

                  {/* Amount */}
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-text whitespace-nowrap">
                    {formatPhp(voucher.amount)}
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
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectVoucher(voucher);
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-border bg-bg px-2.5 py-1 text-xs font-semibold text-text shadow-2xs hover:bg-bg-subtle transition-colors"
                    >
                      <Eye className="h-3.5 w-3.5 text-text-secondary" />
                      <span>View</span>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
