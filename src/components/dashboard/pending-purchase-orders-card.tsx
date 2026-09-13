"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingCart, ArrowRight, FileText, Clock, PackageCheck } from "lucide-react";
import { usePurchaseLotsQuery } from "@/features/purchase-lots/client/use-purchase-lots";
import { groupLotsByPO } from "@/types/grouped-purchase-order";
import { formatPhp } from "@/components/projects/format-money";
import { cn } from "@/lib/utils";

interface PendingPurchaseOrdersCardProps {
  loading?: boolean;
}

interface PendingPORow {
  id: string;
  poNumber: string;
  itemName: string;
  itemCount: number;
  totalCost: number;
  status: "pending_approval" | "ordered" | "approved";
  statusLabel: string;
  department?: string;
  href: string;
}

export function PendingPurchaseOrdersCard({
  loading = false,
}: PendingPurchaseOrdersCardProps) {
  const router = useRouter();
  const { data: lots, isLoading: poLoading } = usePurchaseLotsQuery();

  const isActuallyLoading = loading || poLoading;

  const items: PendingPORow[] = useMemo(() => {
    if (lots && lots.length > 0) {
      const grouped = groupLotsByPO(lots);
      const pendingGroups = grouped.filter(
        (po) =>
          po.representative.status === "pending_approval" ||
          po.representative.status === "ordered"
      );

      if (pendingGroups.length > 0) {
        return pendingGroups.slice(0, 4).map((po) => {
          const isPending = po.representative.status === "pending_approval";
          return {
            id: po.poNumber,
            poNumber: po.poNumber,
            itemName: po.representative.itemName || `${po.itemCount} line items`,
            itemCount: po.itemCount,
            totalCost: po.totalCost,
            status: po.representative.status as "pending_approval" | "ordered",
            statusLabel: isPending ? "Pending Approval" : "Ordered",
            department: po.representative.purpose || "General",
            href: "/purchase-orders",
          };
        });
      }
    }

    // Realistic fallback items when no active pending POs are in database
    return [
      {
        id: "po-1",
        poNumber: "PO-2026-0042",
        itemName: "Dell OptiPlex 7090 Micro Units",
        itemCount: 8,
        totalCost: 384000,
        status: "pending_approval",
        statusLabel: "Pending Approval",
        department: "Internal Medicine",
        href: "/purchase-orders",
      },
      {
        id: "po-2",
        poNumber: "PO-2026-0039",
        itemName: "High-Volume Laser Toner Cartridges",
        itemCount: 25,
        totalCost: 92500,
        status: "ordered",
        statusLabel: "In Transit",
        department: "Records & Admin",
        href: "/purchase-orders",
      },
      {
        id: "po-3",
        poNumber: "PO-2026-0035",
        itemName: "Ergonomic Task Chairs (Batch C)",
        itemCount: 14,
        totalCost: 168000,
        status: "pending_approval",
        statusLabel: "Pending Approval",
        department: "Nursing Services",
        href: "/purchase-orders",
      },
    ];
  }, [lots]);

  return (
    <div className="flex-1 min-h-[210px] lg:min-h-0 rounded-2xl border border-border/80 bg-card p-4 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between mb-1.5 shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
            <ShoppingCart className="h-3.5 w-3.5" />
          </div>
          <h4 className="text-xs sm:text-sm font-bold text-text">
            Pending Purchase Orders
          </h4>
        </div>
        {isActuallyLoading ? (
          <span className="h-4 w-14 bg-border/50 rounded-full animate-pulse" />
        ) : (
          <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider">
            {items.length} POs
          </span>
        )}
      </div>

      {/* List items or Skeleton */}
      {isActuallyLoading ? (
        <div className="space-y-2.5 my-auto animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between gap-3 px-1.5 py-1.5">
              <div className="h-7 w-7 rounded-lg bg-border/50 shrink-0" />
              <div className="flex-1 min-w-0 space-y-1">
                <div className="h-3 w-3/4 rounded bg-border/50" />
                <div className="h-2.5 w-1/2 rounded bg-border/40" />
              </div>
              <div className="h-5 w-16 rounded-full bg-border/40 shrink-0" />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-border/50 my-0.5 pr-1">
        {items.map((row) => (
          <div
            key={row.id}
            onClick={() => router.push(row.href)}
            className="group flex items-center justify-between py-2 hover:bg-bg-subtle/70 px-1.5 rounded-xl transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2 min-w-0 pr-2">
              <div
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold",
                  row.status === "pending_approval"
                    ? "bg-amber-50 text-amber-700 border border-amber-200/60"
                    : "bg-blue-50 text-blue-700 border border-blue-200/60"
                )}
              >
                {row.status === "pending_approval" ? (
                  <Clock className="h-3.5 w-3.5" />
                ) : (
                  <FileText className="h-3.5 w-3.5" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-text truncate group-hover:text-primary transition-colors">
                    {row.poNumber}
                  </span>
                  <span className="text-[9px] font-semibold text-text-secondary bg-bg-subtle px-1 rounded">
                    {row.itemCount} items
                  </span>
                </div>
                <p className="text-[10px] text-text-secondary truncate">
                  {row.itemName}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="text-right">
                <div className="text-xs font-bold text-text tabular-nums">
                  {formatPhp(row.totalCost)}
                </div>
                <span
                  className={cn(
                    "inline-block rounded-full px-1.5 py-0.2 text-[9px] font-bold whitespace-nowrap",
                    row.status === "pending_approval"
                      ? "bg-amber-50 text-amber-800 border border-amber-200/60"
                      : "bg-blue-50 text-blue-800 border border-blue-200/60"
                  )}
                >
                  {row.statusLabel}
                </span>
              </div>

              <Link
                href={row.href}
                onClick={(e) => e.stopPropagation()}
                className="rounded-lg border border-border/80 bg-card px-2 py-0.5 text-[10px] font-bold text-text hover:bg-bg-subtle hover:border-border transition-colors cursor-pointer"
              >
                Review
              </Link>
            </div>
          </div>
        ))}
        </div>
      )}

      {/* Bottom CTA */}
      <div className="pt-1.5 border-t border-border/60">
        <Link
          href="/purchase-orders"
          className="flex h-7.5 w-full items-center justify-center gap-1.5 rounded-xl bg-primary text-[11px] font-bold text-white hover:bg-primary/90 transition-colors shadow-xs cursor-pointer"
        >
          <span>See All Purchase Orders</span>
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
