"use client";

import React, { useState, useMemo } from "react";
import {
  FileText,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Ban,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Building2,
  Eye,
  Receipt,
  Wallet,
  Tag,
  Boxes,
} from "lucide-react";
import type { PettyCashVoucher, PettyCashStatus } from "@/types/petty-cash";
import { formatPhp } from "@/components/projects/format-money";
import { formatPurposeParticularsPreview } from "@/lib/voucher-particulars";
import { cn } from "@/lib/utils";

type SortField = "pcvNumber" | "voucherDate" | "payeeName" | "category" | "amount" | "status";
type SortOrder = "asc" | "desc";

interface PettyCashTableProps {
  vouchers: PettyCashVoucher[];
  loading?: boolean;
  onSelectVoucher: (voucher: PettyCashVoucher) => void;
}

function getStatusBadge(status: PettyCashStatus) {
  switch (status) {
    case "completed":
      return {
        label: "Disbursed / Done",
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

function getCategoryBadge(category: string) {
  switch (category.toLowerCase()) {
    case "transportation":
      return {
        label: "Transportation",
        className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
      };
    case "meals":
      return {
        label: "Meals & Rep.",
        className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
      };
    case "repairs":
      return {
        label: "Repairs",
        className: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
      };
    case "courier":
      return {
        label: "Courier / Delivery",
        className: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
      };
    case "emergency":
      return {
        label: "Emergency",
        className: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
      };
    case "supplies":
    default:
      return {
        label: category || "Supplies",
        className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
      };
  }
}

export function PettyCashTable({
  vouchers,
  loading = false,
  onSelectVoucher,
}: PettyCashTableProps) {
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

      switch (sortField) {
        case "pcvNumber":
          comparison = a.pcvNumber.localeCompare(b.pcvNumber);
          break;
        case "voucherDate":
          comparison = a.voucherDate.localeCompare(b.voucherDate);
          break;
        case "payeeName":
          comparison = a.payeeName.localeCompare(b.payeeName);
          break;
        case "category":
          comparison = (a.category || "").localeCompare(b.category || "");
          break;
        case "amount":
          comparison = parseFloat(a.amount) - parseFloat(b.amount);
          break;
        case "status":
          comparison = a.status.localeCompare(b.status);
          break;
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });
  }, [vouchers, sortField, sortOrder]);

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3.5 h-3.5 opacity-40 group-hover:opacity-70" />;
    }
    return sortOrder === "asc" ? (
      <ArrowUp className="w-3.5 h-3.5 text-primary" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-primary" />
    );
  };

  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-bg p-4 flex-1 flex flex-col gap-3 min-h-0">
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className="h-12 w-full bg-bg-subtle/60 rounded-lg animate-pulse border border-border/40"
          />
        ))}
      </div>
    );
  }

  if (sortedVouchers.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-bg flex flex-1 flex-col items-center justify-center p-12 text-center shadow-2xs">
        <div className="rounded-full bg-bg-subtle p-4 border border-border">
          <Wallet className="h-8 w-8 text-text-secondary" />
        </div>
        <h3 className="mt-3 text-sm font-bold text-text">No petty cash records found</h3>
        <p className="mt-1 text-xs text-text-secondary max-w-sm">
          No disbursements match your current filters. Adjust your search or record a new petty cash disbursement to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-bg overflow-hidden flex flex-col flex-1 min-h-0 shadow-2xs">
      <div className="flex-1 overflow-auto min-h-0">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="sticky top-0 z-10 bg-bg-subtle/80 backdrop-blur-xs border-b border-border text-text-secondary text-[11px] font-bold uppercase tracking-wider">
            <tr>
              <th
                scope="col"
                className="py-3 px-4 cursor-pointer hover:text-text transition-colors select-none"
                onClick={() => handleSort("pcvNumber")}
              >
                <div className="flex items-center gap-1.5">
                  <span>PCV Code</span>
                  {renderSortIcon("pcvNumber")}
                </div>
              </th>
              <th
                scope="col"
                className="py-3 px-4 cursor-pointer hover:text-text transition-colors select-none"
                onClick={() => handleSort("voucherDate")}
              >
                <div className="flex items-center gap-1.5">
                  <span>Date</span>
                  {renderSortIcon("voucherDate")}
                </div>
              </th>
              <th
                scope="col"
                className="py-3 px-4 cursor-pointer hover:text-text transition-colors select-none"
                onClick={() => handleSort("payeeName")}
              >
                <div className="flex items-center gap-1.5">
                  <span>Payee / Claimant</span>
                  {renderSortIcon("payeeName")}
                </div>
              </th>
              <th
                scope="col"
                className="py-3 px-4 cursor-pointer hover:text-text transition-colors select-none"
                onClick={() => handleSort("category")}
              >
                <div className="flex items-center gap-1.5">
                  <span>Category</span>
                  {renderSortIcon("category")}
                </div>
              </th>
              <th scope="col" className="py-3 px-4">
                Purpose
              </th>
              <th scope="col" className="py-3 px-4">
                Ref / Receipt #
              </th>
              <th
                scope="col"
                className="py-3 px-4 cursor-pointer hover:text-text transition-colors text-right select-none"
                onClick={() => handleSort("amount")}
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>Amount</span>
                  {renderSortIcon("amount")}
                </div>
              </th>
              <th
                scope="col"
                className="py-3 px-4 cursor-pointer hover:text-text transition-colors text-center select-none"
                onClick={() => handleSort("status")}
              >
                <div className="flex items-center justify-center gap-1.5">
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
              const statusConfig = getStatusBadge(voucher.status);
              const StatusIcon = statusConfig.icon;
              const categoryConfig = getCategoryBadge(voucher.category);

              return (
                <tr
                  key={voucher.id}
                  onClick={() => onSelectVoucher(voucher)}
                  className="cursor-pointer hover:bg-bg-subtle/50 transition-colors group"
                >
                  {/* PCV Code */}
                  <td className="py-3.5 px-4 font-mono font-bold text-text">
                    <div className="flex items-center gap-2">
                      <span className="text-primary group-hover:underline">
                        {voucher.pcvNumber}
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

                  {/* Payee / Claimant */}
                  <td className="py-3.5 px-4 font-medium text-text">
                    <div className="font-semibold text-text max-w-42.5 truncate" title={voucher.payeeName}>
                      {voucher.payeeName}
                    </div>
                    {voucher.supplierName && voucher.supplierName !== voucher.payeeName && (
                      <div className="text-[11px] text-text-secondary max-w-42.5 truncate">
                        via {voucher.supplierName}
                      </div>
                    )}
                    {voucher.departmentName && (
                      <div className="text-[11px] text-text-secondary max-w-42.5 truncate flex items-center gap-1 mt-0.5">
                        <Building2 className="w-2.5 h-2.5" />
                        <span>{voucher.departmentName}</span>
                      </div>
                    )}
                  </td>

                  {/* Category */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-semibold rounded-full border",
                        categoryConfig.className
                      )}
                    >
                      <Tag className="w-2.5 h-2.5" />
                      {categoryConfig.label}
                    </span>
                  </td>

                  {/* Purpose Preview */}
                  <td className="py-3.5 px-4 text-text-secondary max-w-55">
                    <p
                      className="truncate text-[11px] leading-relaxed"
                      title={
                        formatPurposeParticularsPreview(
                          voucher.purpose,
                          voucher.particulars,
                          200
                        ) || undefined
                      }
                    >
                      {formatPurposeParticularsPreview(
                        voucher.purpose,
                        voucher.particulars
                      ) || "—"}
                    </p>
                  </td>

                  {/* Ref / Receipt # & Linked PO */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div className="flex flex-col gap-1">
                      {voucher.purchaseOrderNumber && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono bg-primary/10 text-primary border border-primary/20">
                          <Boxes className="w-3 h-3" />
                          #{voucher.purchaseOrderNumber}
                        </span>
                      )}
                      {voucher.receiptNumber ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono bg-bg-subtle text-text-secondary border border-border">
                          <Receipt className="w-3 h-3 opacity-70" />
                          {voucher.receiptNumber}
                        </span>
                      ) : !voucher.purchaseOrderNumber ? (
                        <span className="text-text-secondary/60 text-[11px]">—</span>
                      ) : null}
                    </div>
                  </td>

                  {/* Amount */}
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-text whitespace-nowrap">
                    {formatPhp(voucher.amount)}
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-4 text-center whitespace-nowrap">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
                        statusConfig.className
                      )}
                    >
                      <StatusIcon className="h-3 w-3" />
                      {statusConfig.label}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
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
