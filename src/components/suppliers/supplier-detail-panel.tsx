"use client";

import { useEffect, useRef } from "react";
import {
  X,
  Pencil,
  Mail,
  Phone,
  MapPin,
  User,
  Truck,
  FileText,
  Barcode,
  Receipt,
  Calendar,
  Layers,
  Coins,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Supplier } from "@/types/suppliers";
import { SupplierStatusBadge } from "./supplier-status-badge";
import { usePurchaseLotsQuery } from "@/features/purchase-lots/client";
import { formatPhp } from "@/components/projects/format-money";
import { LoadingState } from "@/components/providers/loading-context";

export function SupplierDetailPanel({
  supplier,
  isOpen,
  onClose,
  onEdit,
}: {
  supplier: Supplier | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (s: Supplier) => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const { data: lots = [], isLoading: lotsLoading } = usePurchaseLotsQuery({
    supplierId: supplier?.id,
    enabled: isOpen && Boolean(supplier),
  });

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !supplier) return null;

  const totalLotSpend = lots.reduce(
    (acc, lot) => acc + (Number(lot.totalCost) || Number(lot.unitCost) * lot.quantity || 0),
    0
  );

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity duration-200">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="supplier-detail-heading"
        className={cn(
          "relative flex flex-col w-full max-w-lg h-full bg-bg border-l border-border shadow-2xl z-10 overflow-hidden",
          "animate-in slide-in-from-right duration-250 ease-in-out"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-bg-subtle/50 shrink-0">
          <div className="min-w-0 flex-1 pr-3">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="inline-flex items-center gap-1.5 font-mono text-sm font-bold tracking-tight px-2.5 py-0.5 rounded-full bg-accent/15 text-accent border border-accent/25">
                <Barcode className="h-3.5 w-3.5" />
                {supplier.supplierCode}
              </span>
              <SupplierStatusBadge status={supplier.status} />
            </div>
            <p className="text-xs text-text-secondary font-medium mt-1 truncate">
              Supplier Record • <strong className="text-text font-semibold">{supplier.name}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-secondary hover:text-text hover:bg-border transition-colors cursor-pointer shrink-0"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Quick Metrics (if lots exist) */}
          {lots.length > 0 && (
            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl border border-border bg-bg-subtle/40">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-category-transport-bg/15 text-category-transport-bg shrink-0">
                  <Layers className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                    Total Lots
                  </div>
                  <div className="text-sm font-bold font-mono text-text">
                    {lots.length} intake{lots.length === 1 ? "" : "s"}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-status-active-bg/15 text-status-active-text shrink-0">
                  <Coins className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                    Total Invoiced
                  </div>
                  <div className="text-sm font-bold font-mono text-text">
                    {formatPhp(totalLotSpend)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Contact Details Card */}
          <section className="space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary">
              Contact & Location
            </h3>
            <div className="grid grid-cols-1 gap-2 text-xs">
              <div className="p-3 rounded-lg border border-border bg-bg-subtle/40 flex items-center gap-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent/10 text-accent shrink-0">
                  <User className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                    Contact Person
                  </div>
                  <div className="font-semibold text-text truncate">
                    {supplier.contactName || "—"}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-lg border border-border bg-bg-subtle/40 flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent/10 text-accent shrink-0">
                    <Mail className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                      Email
                    </div>
                    <div className="font-medium text-text truncate">
                      {supplier.contactEmail || "—"}
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-border bg-bg-subtle/40 flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent/10 text-accent shrink-0">
                    <Phone className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                      Phone
                    </div>
                    <div className="font-medium text-text truncate">
                      {supplier.contactPhone || "—"}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-border bg-bg-subtle/40 flex items-start gap-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent/10 text-accent shrink-0 mt-0.5">
                  <MapPin className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                    Address
                  </div>
                  <div className="font-medium text-text leading-snug">
                    {supplier.address || "—"}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {supplier.notes && (
            <section className="space-y-1.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                Notes & Terms
              </h3>
              <p className="text-xs text-text leading-relaxed whitespace-pre-wrap p-3 rounded-lg border border-border bg-bg-subtle/30">
                {supplier.notes}
              </p>
            </section>
          )}

          {/* Purchase Lot History */}
          <section className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                <Truck className="h-3.5 w-3.5" />
                Purchase Lot & Cost History
              </h3>
              {lots.length > 0 && (
                <span className="text-[11px] font-bold text-text-secondary">
                  {lots.length} record{lots.length === 1 ? "" : "s"}
                </span>
              )}
            </div>

            {lotsLoading ? (
              <LoadingState
                variant="card"
                icon="truck"
                message="Loading purchase cost history…"
                subtitle="Retrieving vendor intake records"
              />
            ) : lots.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-4 text-center">
                <p className="text-xs text-text-secondary">
                  No purchase lots recorded yet. Restocks with unit costs will appear here automatically.
                </p>
              </div>
            ) : (
              <ul className="space-y-2.5">
                {lots.slice(0, 20).map((lot) => {
                  const hasRemaining = (lot.quantityRemaining ?? lot.quantity) > 0;
                  return (
                    <li
                      key={lot.id}
                      className="rounded-xl border border-border bg-bg-subtle/40 p-3.5 text-xs hover:bg-bg-subtle/70 transition-colors space-y-2"
                    >
                      {/* Top line: Item Name & Unit Cost */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-bold text-sm text-text leading-tight truncate">
                            {lot.itemName}
                          </div>
                          <div className="text-[11px] font-mono text-text-secondary mt-0.5">
                            {lot.itemCode}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-mono font-bold tabular-nums text-text text-sm">
                            {formatPhp(lot.unitCost)}
                          </div>
                          <div className="text-[10px] text-text-secondary">
                            unit cost
                          </div>
                        </div>
                      </div>

                      {/* Highlighted Pills Row: Lot Number, PO Number, Stock Availability */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-border/60">
                        {/* Lot Number Pill */}
                        <span className="inline-flex items-center gap-1 font-mono font-bold px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 text-[10px]">
                          <Barcode className="h-3 w-3 shrink-0" />
                          {lot.lotCode}
                        </span>

                        {/* PO Number Pill */}
                        {lot.poNumber && (
                          <span className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold px-2 py-0.5 rounded-md bg-category-transport-bg/15 text-category-transport-bg border border-category-transport-bg/25">
                            <Receipt className="h-2.5 w-2.5 shrink-0" />
                            {lot.poNumber}
                          </span>
                        )}

                        {/* Stock Quantity & Remaining Pill */}
                        {lot.quantityRemaining != null ? (
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border",
                              hasRemaining
                                ? "bg-status-active-bg/15 text-status-active-text border-status-active-bg/25"
                                : "bg-status-retired-bg/15 text-status-retired-text border-status-retired-bg/25"
                            )}
                          >
                            <span
                              className={cn(
                                "h-1.5 w-1.5 rounded-full",
                                hasRemaining
                                  ? "bg-status-active-bg"
                                  : "bg-status-retired-bg"
                              )}
                            />
                            {hasRemaining
                              ? `${lot.quantityRemaining} / ${lot.quantity} rem`
                              : `0 / ${lot.quantity} depleted`}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-bg-subtle text-text-secondary border border-border">
                            <Package className="h-2.5 w-2.5" />
                            qty {lot.quantity}
                          </span>
                        )}

                        {/* Purchase Date */}
                        <span className="inline-flex items-center gap-1 text-[10px] text-text-secondary ml-auto">
                          <Calendar className="h-3 w-3" />
                          {lot.purchasedOn}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-bg-subtle/40 shrink-0 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-4 text-xs font-bold rounded-lg border border-border bg-bg text-text hover:bg-bg-subtle transition-colors cursor-pointer"
          >
            Close
          </button>
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(supplier)}
              className="inline-flex items-center gap-1.5 h-9 px-4 text-xs font-bold rounded-lg bg-accent text-accent-foreground hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit Supplier
            </button>
          )}
        </div>
      </aside>
    </div>
  );
}
