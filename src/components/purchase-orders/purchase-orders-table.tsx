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
  Layers,
  Building2,
} from "lucide-react";
import type { PurchaseLot, PurchaseOrderStatus } from "@/types/purchase-lots";
import type { GroupedPurchaseOrder } from "@/types/grouped-purchase-order";
import { cn } from "@/lib/utils";
import {
  formatRelativeTime,
} from "@/components/audit-logs/audit-log-utils";

type SortField =
  | "createdAt"
  | "poNumber"
  | "itemName"
  | "supplier"
  | "quantity"
  | "totalCost"
  | "status";
type SortOrder = "asc" | "desc";

interface PurchaseOrdersTableProps {
  groups: GroupedPurchaseOrder[];
  loading?: boolean;
  onSelectLot: (lot: PurchaseLot) => void;
  onPrintSlip: (lot: PurchaseLot) => void;
  onDeleteGroup?: (group: GroupedPurchaseOrder) => void;
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
      <td className="px-3 sm:px-4 py-3.5 w-[32%] sm:w-[24%] md:w-[20%] lg:w-[16%]">
        <div className="h-4 w-20 sm:w-24 bg-border rounded mb-1.5" />
        <div className="h-3 w-14 sm:w-16 bg-border/60 rounded" />
      </td>
      <td className="px-3 sm:px-4 py-3.5 w-[24%] sm:w-[18%] md:w-[14%] lg:w-[12%]">
        <div className="h-5 w-18 sm:w-20 bg-border rounded-full" />
      </td>
      <td className="px-3 sm:px-4 py-3.5 w-[34%] sm:w-[38%] md:w-[32%] lg:w-[26%]">
        <div className="h-4 w-32 sm:w-40 bg-border rounded mb-1.5" />
        <div className="flex items-center gap-2">
          <div className="h-3 w-16 bg-border/60 rounded" />
          <div className="h-3.5 w-16 bg-border/60 rounded-full" />
        </div>
      </td>
      <td className="px-3 sm:px-4 py-3.5 hidden sm:table-cell sm:w-[10%] md:w-[10%] lg:w-[8%]">
        <div className="h-4 w-12 bg-border rounded" />
      </td>
      <td className="px-3 sm:px-4 py-3.5 hidden lg:table-cell lg:w-[17%]">
        <div className="h-6 w-24 bg-border rounded-full" />
      </td>
      <td className="px-3 sm:px-4 py-3.5 hidden md:table-cell md:w-[15%] lg:w-[13%]">
        <div className="h-4 w-16 bg-border rounded mb-1" />
        <div className="h-3 w-12 bg-border/60 rounded" />
      </td>
      <td className="px-3 sm:px-4 py-3.5 text-right w-[10%] sm:w-[10%] md:w-[9%] lg:w-[8%]">
        <div className="flex justify-end gap-1.5">
          <div className="h-7 w-7 bg-border rounded-lg" />
          <div className="h-7 w-7 bg-border rounded-lg" />
        </div>
      </td>
    </tr>
  );
}

export function PurchaseOrdersTable({
  groups,
  loading = false,
  onSelectLot,
  onPrintSlip,
  onDeleteGroup,
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

  const sortedGroups = useMemo(() => {
    return [...groups].sort((a, b) => {
      let aVal: string | number = "";
      let bVal: string | number = "";

      switch (sortField) {
        case "createdAt":
          aVal = a.representative.createdAt;
          bVal = b.representative.createdAt;
          break;
        case "poNumber":
          aVal = a.poNumber;
          bVal = b.poNumber;
          break;
        case "itemName":
          aVal = a.representative.itemName;
          bVal = b.representative.itemName;
          break;
        case "supplier":
          aVal = a.representative.supplierName || "";
          bVal = b.representative.supplierName || "";
          break;
        case "quantity":
          aVal = a.totalQuantity;
          bVal = b.totalQuantity;
          break;
        case "totalCost":
          aVal = a.totalCost;
          bVal = b.totalCost;
          break;
        case "status":
          aVal = a.representative.status;
          bVal = b.representative.status;
          break;
      }

      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  }, [groups, sortField, sortOrder]);

  if (loading) {
    return (
      <div className="w-full overflow-x-auto min-w-full">
        <table className="w-full text-xs text-left min-w-130 sm:min-w-full">
          <thead className="sticky top-0 z-10 bg-bg-subtle text-text-secondary border-b border-border font-semibold uppercase tracking-wider text-[11px] shadow-2xs">
            <tr>
              <th className="px-3 sm:px-4 py-3.5 whitespace-nowrap">PO Number & Date</th>
              <th className="px-3 sm:px-4 py-3.5 whitespace-nowrap">Status</th>
              <th className="px-3 sm:px-4 py-3.5">Item(s)</th>
              <th className="px-3 sm:px-4 py-3.5 hidden sm:table-cell whitespace-nowrap">Total Qty</th>
              <th className="px-3 sm:px-4 py-3.5 hidden lg:table-cell whitespace-nowrap">Dealer / Supplier</th>
              <th className="px-3 sm:px-4 py-3.5 hidden md:table-cell whitespace-nowrap">Total Cost (₱)</th>
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

  if (groups.length === 0) {
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
      <table className="w-full text-xs text-left min-w-130 sm:min-w-full table-fixed" aria-label="Purchase orders table">
        <thead className="sticky top-0 z-10 bg-bg-subtle text-text-secondary border-b border-border font-semibold uppercase tracking-wider text-[11px] select-none shadow-2xs">
          <tr>
            <th
              onClick={() => handleSort("createdAt")}
              className="px-3 sm:px-4 py-3.5 cursor-pointer hover:text-text transition-colors whitespace-nowrap w-[32%] sm:w-[24%] md:w-[20%] lg:w-[16%]"
            >
              <div className="flex items-center gap-1.5">
                <span>PO & Date</span>
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
              className="px-3 sm:px-4 py-3.5 cursor-pointer hover:text-text transition-colors whitespace-nowrap w-[24%] sm:w-[18%] md:w-[14%] lg:w-[12%]"
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
              className="px-3 sm:px-4 py-3.5 cursor-pointer hover:text-text transition-colors w-[34%] sm:w-[38%] md:w-[32%] lg:w-[26%]"
            >
              <div className="flex items-center gap-1.5">
                <span>Item(s)</span>
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
              className="px-3 sm:px-4 py-3.5 cursor-pointer hover:text-text transition-colors whitespace-nowrap hidden sm:table-cell sm:w-[10%] md:w-[10%] lg:w-[8%]"
            >
              <div className="flex items-center gap-1.5">
                <span>Total Qty</span>
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

            <th
              onClick={() => handleSort("supplier")}
              className="px-3 sm:px-4 py-3.5 cursor-pointer hover:text-text transition-colors whitespace-nowrap hidden lg:table-cell lg:w-[17%]"
            >
              <div className="flex items-center gap-1.5">
                <span>Dealer / Supplier</span>
                {sortField === "supplier" ? (
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
              onClick={() => handleSort("totalCost")}
              className="px-3 sm:px-4 py-3.5 cursor-pointer hover:text-text transition-colors whitespace-nowrap hidden md:table-cell md:w-[15%] lg:w-[13%]"
            >
              <div className="flex items-center gap-1.5">
                <span>Total Value</span>
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

            <th className="px-3 sm:px-4 py-3.5 text-right whitespace-nowrap w-[10%] sm:w-[10%] md:w-[9%] lg:w-[8%]">Actions</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-border">
          {sortedGroups.map((group) => {
            const lot = group.representative;
            const isMultiItem = group.itemCount > 1;
            const poDate = lot.purchasedOn || lot.createdAt.split("T")[0];
            const uniqueSuppliers = Array.from(
              new Set(
                group.lineItems
                  .map((li) => li.supplierName?.trim())
                  .filter((s): s is string => Boolean(s))
              )
            );
            const displaySupplier =
              uniqueSuppliers.length === 0
                ? "Internal / Direct"
                : uniqueSuppliers.length === 1
                ? uniqueSuppliers[0]
                : `Multiple (${uniqueSuppliers.length})`;
            const supplierTooltip =
              uniqueSuppliers.length > 1
                ? uniqueSuppliers.join(", ")
                : displaySupplier;

            return (
              <tr
                key={group.poNumber}
                onClick={() => onSelectLot(lot)}
                className={cn(
                  "transition-all duration-150 cursor-pointer group bg-bg",
                  getStatusRowClasses(lot.status)
                )}
              >
                {/* PO Number & Date */}
                <td className="px-3 sm:px-4 py-3.5 whitespace-nowrap align-middle w-[32%] sm:w-[24%] md:w-[20%] lg:w-[16%] overflow-hidden">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs font-bold text-text bg-bg-subtle/80 px-2 py-0.5 rounded-md border border-border group-hover:border-accent/40 group-hover:text-accent transition-colors shadow-2xs">
                      {group.poNumber}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleCopyCode(e, group.poNumber)}
                      title="Copy PO Code"
                      className="opacity-0 group-hover:opacity-100 p-1 rounded text-text-secondary hover:text-text hover:bg-bg-subtle transition-all shrink-0"
                    >
                      {copiedCode === group.poNumber ? (
                        <Check className="h-3 w-3 text-status-active-text" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                    {isMultiItem && (
                      <span className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold bg-accent/10 text-accent border border-accent/25 shrink-0">
                        <Layers className="h-2.5 w-2.5" />
                        {group.itemCount}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-text-secondary block font-medium mt-0.5 truncate">
                    {poDate} · <span className="opacity-80">{formatRelativeTime(lot.createdAt)}</span>
                  </span>
                </td>

                {/* Status Badge */}
                <td className="px-3 sm:px-4 py-3.5 whitespace-nowrap align-middle w-[24%] sm:w-[18%] md:w-[14%] lg:w-[12%]">
                  <StatusBadge status={lot.status} />
                  {/* On small mobile screens (< sm), show inline quantity badge here */}
                  <div className="sm:hidden mt-1 font-mono text-[11px] text-text-secondary font-medium">
                    {group.totalQuantity}{" "}
                    <span className="font-normal">
                      {isMultiItem ? "total" : lot.itemType === "asset" ? (lot.quantity === 1 ? "unit" : "units") : "pcs"}
                    </span>
                  </div>
                </td>

                {/* Description & Type */}
                <td className="px-3 sm:px-4 py-3.5 align-middle w-[34%] sm:w-[38%] md:w-[32%] lg:w-[26%] overflow-hidden">
                  {isMultiItem ? (
                    <>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-text group-hover:text-accent transition-colors truncate max-w-full block">
                          {group.lineItems[0].itemName}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className="text-[10px] text-text-secondary shrink-0">
                          +{group.itemCount - 1} more item{group.itemCount > 2 ? "s" : ""}
                        </span>
                        {/* Show unique item type badges */}
                        {Array.from(new Set<"asset" | "consumable">(group.lineItems.map((li) => li.itemType))).map((type) => (
                          <ItemTypeBadge key={type} itemType={type} />
                        ))}
                      </div>
                      {/* On screens < lg where Dealer/Supplier column is hidden, show inline */}
                      <span className="lg:hidden text-[10px] text-text-secondary truncate max-w-full block mt-0.5">
                        • {lot.supplierName || "Internal / Direct"}
                      </span>
                      {/* On screens < md where Total Cost column is hidden, show inline */}
                      <div className="md:hidden mt-1 flex items-center gap-1.5 text-[11px]">
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          ₱{group.totalCost.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="font-semibold text-text block max-w-full truncate group-hover:text-accent transition-colors">
                        {lot.itemName}
                      </span>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="font-mono text-[10px] text-text-secondary bg-bg-subtle/60 px-1.5 py-0.2 rounded border border-border/60">
                          {lot.itemCode}
                        </span>
                        <ItemTypeBadge itemType={lot.itemType} />
                        {/* On screens < lg where Dealer/Supplier column is hidden, show inline */}
                        <span className="lg:hidden text-[10px] text-text-secondary truncate max-w-full">
                          • {lot.supplierName || "Internal / Direct"}
                        </span>
                      </div>
                      {/* On screens < md where Total Cost column is hidden, show inline */}
                      <div className="md:hidden mt-1 flex items-center gap-1.5 text-[11px]">
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          ₱{group.totalCost.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </span>
                        <span className="text-[10px] text-text-secondary">
                          (@ ₱{Number(lot.unitCost).toFixed(2)})
                        </span>
                      </div>
                    </>
                  )}
                </td>

                {/* Quantity */}
                <td className="px-3 sm:px-4 py-3.5 whitespace-nowrap hidden sm:table-cell align-middle sm:w-[10%] md:w-[10%] lg:w-[8%]">
                  <div className="font-mono font-bold text-text text-sm">
                    {group.totalQuantity}{" "}
                    <span className="text-[10px] font-normal text-text-secondary">
                      {isMultiItem
                        ? `(${group.itemCount})`
                        : lot.itemType === "asset"
                        ? lot.quantity === 1
                          ? "unit"
                          : "units"
                        : "pcs"}
                    </span>
                  </div>
                </td>

                {/* Supplier */}
                <td className="px-3 sm:px-4 py-3.5 whitespace-nowrap hidden lg:table-cell align-middle lg:w-[17%] overflow-hidden">
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-bg-subtle text-text border border-border/80 shadow-2xs max-w-full"
                    title={supplierTooltip}
                  >
                    <Building2 className="h-3 w-3 shrink-0 text-text-secondary" />
                    <span className="truncate">{displaySupplier}</span>
                  </span>
                </td>

                {/* Cost */}
                <td className="px-3 sm:px-4 py-3.5 whitespace-nowrap hidden md:table-cell align-middle md:w-[15%] lg:w-[13%]">
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 block text-sm">
                    ₱
                    {group.totalCost.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                  {!isMultiItem && (
                    <span className="font-mono text-[10px] text-text-secondary block">
                      @ ₱{Number(lot.unitCost).toFixed(2)} / unit
                    </span>
                  )}
                </td>

                {/* Action Buttons */}
                <td className="px-3 sm:px-4 py-3.5 text-right whitespace-nowrap align-middle w-[10%] sm:w-[10%] md:w-[9%] lg:w-[8%]">
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

                    {onDeleteGroup && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteGroup(group);
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
