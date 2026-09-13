"use client";

import React, { useState, useMemo } from "react";
import {
  Boxes,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Copy,
  Check,
  FileText,
  Clock,
  ShieldCheck,
  Truck,
  PackageCheck,
  Ban,
  Trash2,
} from "lucide-react";
import type { PurchaseLot, PurchaseOrderStatus } from "@/types/purchase-lots";
import { cn } from "@/lib/utils";
import {
  formatDateTime,
  formatRelativeTime,
} from "@/components/audit-logs/audit-log-utils";

type SortField =
  | "createdAt"
  | "lotCode"
  | "purchasedOn"
  | "poNumber"
  | "itemName"
  | "supplier"
  | "quantity"
  | "unitCost"
  | "totalCost"
  | "status";
type SortOrder = "asc" | "desc";

interface PurchaseOrdersTableProps {
  lots: PurchaseLot[];
  loading?: boolean;
  onSelectLot: (lot: PurchaseLot) => void;
  onPrintSlip: (lot: PurchaseLot) => void;
  onDelete?: (lot: PurchaseLot) => void;
}

function getStatusRowClasses(status: PurchaseOrderStatus): string {
  switch (status) {
    case "delivered":
      return "border-l-4 border-l-emerald-500 hover:bg-emerald-500/5 dark:hover:bg-emerald-500/10";
    case "ordered":
      return "border-l-4 border-l-blue-500 hover:bg-blue-500/5 dark:hover:bg-blue-500/10";
    case "approved":
      return "border-l-4 border-l-amber-500 hover:bg-amber-500/5 dark:hover:bg-amber-500/10";
    case "cancelled":
      return "border-l-4 border-l-rose-500/70 hover:bg-rose-500/5 opacity-80";
    case "pending_approval":
    default:
      return "border-l-4 border-l-purple-500 hover:bg-purple-500/5 dark:hover:bg-purple-500/10";
  }
}

function ItemTypeBadge({ itemType }: { itemType: "asset" | "consumable" }) {
  if (itemType === "asset") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/25 shadow-2xs">
        Asset
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-500/25 shadow-2xs">
      Consumable
    </span>
  );
}

function StatusBadge({ status }: { status: PurchaseOrderStatus }) {
  if (status === "delivered") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 shadow-2xs">
        <PackageCheck className="h-3 w-3" />
        Delivered
      </span>
    );
  }
  if (status === "ordered") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/30 shadow-2xs">
        <Truck className="h-3 w-3" />
        Ordered
      </span>
    );
  }
  if (status === "approved") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 shadow-2xs">
        <ShieldCheck className="h-3 w-3" />
        Approved
      </span>
    );
  }
  if (status === "cancelled") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30 shadow-2xs">
        <Ban className="h-3 w-3" />
        Cancelled
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/15 text-purple-700 dark:text-purple-400 border border-purple-500/30 shadow-2xs">
      <Clock className="h-3 w-3" />
      Pending Approval
    </span>
  );
}

function SkeletonTableRow() {
  return (
    <tr className="border-b border-border bg-bg animate-pulse">
      <td className="px-3 sm:px-4 py-3.5">
        <div className="h-4 w-24 sm:w-28 bg-border rounded mb-1.5" />
        <div className="h-3 w-16 sm:w-20 bg-border/60 rounded" />
      </td>
      <td className="px-3 sm:px-4 py-3.5">
        <div className="h-5 w-18 sm:w-20 bg-border rounded-full" />
      </td>
      <td className="px-3 sm:px-4 py-3.5">
        <div className="h-4 w-32 sm:w-40 bg-border rounded mb-1.5" />
        <div className="flex items-center gap-2">
          <div className="h-3 w-16 bg-border/60 rounded" />
          <div className="h-3.5 w-16 bg-border/60 rounded-full" />
        </div>
      </td>
      <td className="px-3 sm:px-4 py-3.5 hidden sm:table-cell">
        <div className="h-4 w-12 bg-border rounded" />
      </td>
      <td className="px-3 sm:px-4 py-3.5 hidden lg:table-cell">
        <div className="h-4 w-28 bg-border rounded mb-1" />
      </td>
      <td className="px-3 sm:px-4 py-3.5 hidden md:table-cell">
        <div className="h-4 w-20 bg-border rounded mb-1" />
        <div className="h-3 w-14 bg-border/60 rounded" />
      </td>
      <td className="px-3 sm:px-4 py-3.5 text-right">
        <div className="flex justify-end">
          <div className="h-7 w-16 sm:w-20 bg-border rounded-lg" />
        </div>
      </td>
    </tr>
  );
}

export function PurchaseOrdersTable({
  lots,
  loading = false,
  onSelectLot,
  onPrintSlip,
  onDelete,
}: PurchaseOrdersTableProps) {
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopyCode = (e: React.MouseEvent, code: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 1500);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const sortedLots = useMemo(() => {
    return [...lots].sort((a, b) => {
      let aVal: string | number =
        (a[sortField as keyof PurchaseLot] as string | number) ?? "";
      let bVal: string | number =
        (b[sortField as keyof PurchaseLot] as string | number) ?? "";

      if (sortField === "totalCost") {
        aVal = parseFloat(a.totalCost) || 0;
        bVal = parseFloat(b.totalCost) || 0;
      }

      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  }, [lots, sortField, sortOrder]);

  if (loading) {
    return (
      <div className="w-full overflow-x-auto min-w-full">
        <table className="w-full text-xs text-left min-w-130 sm:min-w-full">
          <thead className="sticky top-0 z-10 bg-bg-subtle text-text-secondary border-b border-border font-semibold uppercase tracking-wider text-[11px] shadow-2xs">
            <tr>
              <th className="px-3 sm:px-4 py-3.5 whitespace-nowrap">PO Number & Date</th>
              <th className="px-3 sm:px-4 py-3.5 whitespace-nowrap">Status</th>
              <th className="px-3 sm:px-4 py-3.5">Description</th>
              <th className="px-3 sm:px-4 py-3.5 hidden sm:table-cell whitespace-nowrap">Qty</th>
              <th className="px-3 sm:px-4 py-3.5 hidden lg:table-cell whitespace-nowrap">Dealer / Supplier</th>
              <th className="px-3 sm:px-4 py-3.5 hidden md:table-cell whitespace-nowrap">Cost (₱)</th>
              <th className="px-3 sm:px-4 py-3.5 text-right whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonTableRow key={i} />
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (lots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center min-h-96">
        <div className="p-3 rounded-2xl bg-accent/10 border border-accent/20 text-accent mb-3">
          <Boxes className="h-6 w-6" />
        </div>
        <h3 className="text-sm font-bold text-text">
          No Purchase Orders Found
        </h3>
        <p className="text-xs text-text-secondary max-w-sm mt-1 leading-relaxed">
          No purchase orders match your active search and filter criteria. File
          a new PO or reset your filters.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto min-w-full">
      <table className="w-full text-xs text-left min-w-130 sm:min-w-full" aria-label="Purchase orders table">
        <thead className="sticky top-0 z-10 bg-bg-subtle text-text-secondary border-b border-border font-semibold uppercase tracking-wider text-[11px] select-none shadow-2xs">
          <tr>
            <th
              onClick={() => handleSort("createdAt")}
              className="px-3 sm:px-4 py-3.5 cursor-pointer hover:text-text transition-colors whitespace-nowrap"
            >
              <div className="flex items-center gap-1.5">
                <span>PO Number & Date</span>
                {sortField === "createdAt" ? (
                  sortOrder === "asc" ? (
                    <ArrowUp className="h-3 w-3" />
                  ) : (
                    <ArrowDown className="h-3 w-3" />
                  )
                ) : (
                  <ArrowUpDown className="h-3 w-3 opacity-40" />
                )}
              </div>
            </th>

            <th
              onClick={() => handleSort("status")}
              className="px-3 sm:px-4 py-3.5 cursor-pointer hover:text-text transition-colors whitespace-nowrap"
            >
              <div className="flex items-center gap-1.5">
                <span>Status</span>
                {sortField === "status" ? (
                  sortOrder === "asc" ? (
                    <ArrowUp className="h-3 w-3" />
                  ) : (
                    <ArrowDown className="h-3 w-3" />
                  )
                ) : (
                  <ArrowUpDown className="h-3 w-3 opacity-40" />
                )}
              </div>
            </th>

            <th
              onClick={() => handleSort("itemName")}
              className="px-3 sm:px-4 py-3.5 cursor-pointer hover:text-text transition-colors"
            >
              <div className="flex items-center gap-1.5">
                <span>Item Description</span>
                {sortField === "itemName" ? (
                  sortOrder === "asc" ? (
                    <ArrowUp className="h-3 w-3" />
                  ) : (
                    <ArrowDown className="h-3 w-3" />
                  )
                ) : (
                  <ArrowUpDown className="h-3 w-3 opacity-40" />
                )}
              </div>
            </th>

            <th
              onClick={() => handleSort("quantity")}
              className="px-3 sm:px-4 py-3.5 cursor-pointer hover:text-text transition-colors whitespace-nowrap hidden sm:table-cell"
            >
              <div className="flex items-center gap-1.5">
                <span>Qty</span>
                {sortField === "quantity" ? (
                  sortOrder === "asc" ? (
                    <ArrowUp className="h-3 w-3" />
                  ) : (
                    <ArrowDown className="h-3 w-3" />
                  )
                ) : (
                  <ArrowUpDown className="h-3 w-3 opacity-40" />
                )}
              </div>
            </th>

            <th className="px-3 sm:px-4 py-3.5 whitespace-nowrap hidden lg:table-cell">Dealer / Supplier</th>

            <th
              onClick={() => handleSort("totalCost")}
              className="px-3 sm:px-4 py-3.5 cursor-pointer hover:text-text transition-colors whitespace-nowrap hidden md:table-cell"
            >
              <div className="flex items-center gap-1.5">
                <span>Total Value (₱)</span>
                {sortField === "totalCost" ? (
                  sortOrder === "asc" ? (
                    <ArrowUp className="h-3 w-3" />
                  ) : (
                    <ArrowDown className="h-3 w-3" />
                  )
                ) : (
                  <ArrowUpDown className="h-3 w-3 opacity-40" />
                )}
              </div>
            </th>

            <th className="px-3 sm:px-4 py-3.5 text-right whitespace-nowrap">Actions</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-border">
          {sortedLots.map((lot) => {
            const displayPO = lot.poNumber || lot.lotCode;
            const poDate = lot.purchasedOn || lot.createdAt.split("T")[0];
            const remainingRatio =
              lot.quantity > 0 ? lot.quantityRemaining / lot.quantity : 0;
            const isDepleted =
              lot.status === "delivered" && lot.quantityRemaining === 0;
            const isLowStock =
              lot.status === "delivered" && !isDepleted && remainingRatio <= 0.2;

            return (
              <tr
                key={lot.id}
                onClick={() => onSelectLot(lot)}
                className={cn(
                  "transition-all duration-150 cursor-pointer group bg-bg",
                  getStatusRowClasses(lot.status)
                )}
              >
                {/* PO Number & Date */}
                <td className="px-3 sm:px-4 py-3.5 whitespace-nowrap align-middle">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs font-bold text-text bg-bg-subtle/80 px-2 py-0.5 rounded-md border border-border group-hover:border-accent/40 group-hover:text-accent transition-colors shadow-2xs">
                      {displayPO}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleCopyCode(e, displayPO)}
                      title="Copy PO Code"
                      className="opacity-0 group-hover:opacity-100 p-1 rounded text-text-secondary hover:text-text hover:bg-bg-subtle transition-all"
                    >
                      {copiedCode === displayPO ? (
                        <Check className="h-3 w-3 text-status-active-text" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                  <span className="text-[11px] text-text-secondary block font-medium mt-0.5">
                    {poDate} · <span className="opacity-80">{formatRelativeTime(lot.createdAt)}</span>
                  </span>
                </td>

                {/* Status Badge */}
                <td className="px-3 sm:px-4 py-3.5 whitespace-nowrap align-middle">
                  <StatusBadge status={lot.status} />
                  {/* On small mobile screens (< sm), show inline quantity badge here */}
                  <div className="sm:hidden mt-1 font-mono text-[11px] text-text-secondary font-medium">
                    {lot.quantity}{" "}
                    <span className="font-normal">
                      {lot.itemType === "asset" ? (lot.quantity === 1 ? "unit" : "units") : "pcs"}
                    </span>
                  </div>
                </td>

                {/* Description & Type */}
                <td className="px-3 sm:px-4 py-3.5 align-middle min-w-40 sm:min-w-48">
                  <span className="font-semibold text-text block max-w-xs truncate group-hover:text-accent transition-colors">
                    {lot.itemName}
                  </span>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="font-mono text-[10px] text-text-secondary bg-bg-subtle/60 px-1.5 py-0.2 rounded border border-border/60">
                      {lot.itemCode}
                    </span>
                    <ItemTypeBadge itemType={lot.itemType} />
                    {/* On screens < lg where Dealer/Supplier column is hidden, show inline */}
                    <span className="lg:hidden text-[10px] text-text-secondary truncate max-w-36">
                      • {lot.supplierName || "Internal / Direct"}
                    </span>
                  </div>
                  {/* On screens < md where Total Cost column is hidden, show inline */}
                  <div className="md:hidden mt-1 flex items-center gap-1.5 text-[11px]">
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      ₱{Number(lot.totalCost).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-[10px] text-text-secondary">
                      (@ ₱{Number(lot.unitCost).toFixed(2)})
                    </span>
                  </div>
                </td>

                {/* Quantity & Stock Intake */}
                <td className="px-3 sm:px-4 py-3.5 whitespace-nowrap hidden sm:table-cell align-middle">
                  <div className="font-mono font-bold text-text text-sm">
                    {lot.quantity}{" "}
                    <span className="text-[10px] font-normal text-text-secondary">
                      {lot.itemType === "asset" ? (lot.quantity === 1 ? "unit" : "units") : "pcs"}
                    </span>
                  </div>
                  {lot.status === "delivered" && lot.itemType === "consumable" && (
                    <div className="mt-1">
                      {isDepleted ? (
                        <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                          Depleted
                        </span>
                      ) : lot.quantityRemaining < lot.quantity ? (
                        <span
                          className={cn(
                            "inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold border",
                            isLowStock
                              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
                              : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25"
                          )}
                        >
                          {lot.quantityRemaining} in stock
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                          In Stock
                        </span>
                      )}
                    </div>
                  )}
                </td>

                {/* Supplier */}
                <td className="px-3 sm:px-4 py-3.5 text-text font-medium whitespace-nowrap max-w-40 truncate text-xs hidden lg:table-cell align-middle">
                  <span className="text-text-secondary font-normal">By: </span>
                  <span className="font-semibold text-text">{lot.supplierName || "Internal / Direct"}</span>
                </td>

                {/* Cost */}
                <td className="px-3 sm:px-4 py-3.5 whitespace-nowrap hidden md:table-cell align-middle">
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 block text-sm">
                    ₱
                    {Number(lot.totalCost).toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                  <span className="font-mono text-[10px] text-text-secondary block">
                    @ ₱{Number(lot.unitCost).toFixed(2)} / unit
                  </span>
                </td>

                {/* Action Buttons */}
                <td className="px-3 sm:px-4 py-3.5 text-right whitespace-nowrap align-middle">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPrintSlip(lot);
                      }}
                      title="Print Official Form Slip"
                      className="p-1.5 rounded-lg border border-border bg-bg hover:bg-bg-subtle text-text-secondary hover:text-text hover:border-accent/40 transition-colors cursor-pointer shadow-2xs"
                    >
                      <FileText className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectLot(lot);
                      }}
                      className="px-2 sm:px-2.5 py-1 text-[11px] font-semibold rounded-lg border border-border bg-bg hover:bg-bg-subtle text-text hover:border-primary/40 transition-colors cursor-pointer shadow-2xs"
                    >
                      Details
                    </button>
                    {onDelete && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(lot);
                        }}
                        title="Delete Purchase Order"
                        aria-label="Delete Purchase Order"
                        className="p-1.5 rounded-lg border border-destructive/25 bg-destructive/10 hover:bg-destructive text-destructive hover:text-white transition-all cursor-pointer shadow-2xs"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
