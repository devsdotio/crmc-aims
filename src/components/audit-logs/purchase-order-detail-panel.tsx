"use client";

import React, { useEffect, useRef } from "react";
import {
  X,
  User,
  Building2,
  Calendar,
  FileText,
  History,
  ShoppingCart,
  DollarSign,
  Package,
  QrCode,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateTime, formatRelativeTime } from "./audit-log-utils";
import type { PurchaseLot } from "@/types/purchase-lots";

interface PurchaseOrderDetailPanelProps {
  lot: PurchaseLot | null;
  isOpen: boolean;
  onClose: () => void;
}

export function PurchaseOrderDetailPanel({
  lot,
  isOpen,
  onClose,
}: PurchaseOrderDetailPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !lot) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity duration-200">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="po-detail-heading"
        className={cn(
          "relative flex flex-col w-full max-w-lg h-full bg-bg border-l border-border shadow-2xl z-10 overflow-hidden",
          "animate-in slide-in-from-right duration-250 ease-in-out"
        )}
      >
        {/* Panel Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-bg-subtle/50 shrink-0">
          <div className="min-w-0 flex-1 pr-3">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 id="po-detail-heading" className="font-mono text-lg font-bold tracking-tight text-text">
                {lot.lotCode}
              </h2>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-category-av-bg/20 text-category-av-bg border border-category-av-bg/30">
                <ShoppingCart className="h-3 w-3" />
                Purchased Intake
              </span>
            </div>
            <p className="text-xs text-text-secondary font-medium mt-0.5 truncate">
              Purchase Lot Intake • Vendor: <strong className="text-text font-semibold">{lot.supplierName || "Direct Procurement"}</strong>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close detail panel"
            className="p-1.5 rounded-lg text-text-secondary hover:text-text hover:bg-border transition-colors cursor-pointer shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Intake Overview Card */}
          <div className="p-4 rounded-xl border border-border bg-bg space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-secondary font-medium">Batch Lot Item:</span>
              <span className="font-mono text-xs text-text-secondary">{lot.itemCode}</span>
            </div>
            <p className="text-base font-bold text-text">{lot.itemName}</p>
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border text-xs">
              <span className="capitalize px-2 py-0.5 rounded-full font-semibold bg-bg-subtle text-text border border-border text-[10px]">
                {lot.itemType}
              </span>
              <span className="text-text-secondary">
                Purchased: <strong>{lot.purchasedOn}</strong>
              </span>
            </div>
          </div>

          {/* Quantities & Financial Cost Breakdown */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-lg border border-border bg-bg space-y-1">
              <span className="text-text-secondary block text-[11px]">Intake Quantity</span>
              <span className="text-base font-bold text-text block">
                {lot.quantity} units
              </span>
              <span className="text-[10px] text-text-secondary">
                Remaining: <strong className="text-text">{lot.quantityRemaining}</strong>
              </span>
            </div>

            <div className="p-3.5 rounded-lg border border-border bg-bg space-y-1">
              <span className="text-text-secondary block text-[11px]">Total Acquisition</span>
              <span className="text-base font-mono font-bold text-status-active-text block">
                ₱{Number(lot.totalCost).toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-text-secondary font-mono">
                ₱{Number(lot.unitCost).toLocaleString("en-US", { minimumFractionDigits: 2 })} / unit
              </span>
            </div>
          </div>

          {/* Supplier Info */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary">
              Supplier Details
            </h3>
            <div className="p-4 rounded-lg border border-border bg-bg space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-text-secondary">Vendor / Supplier:</span>
                <span className="font-bold text-text">{lot.supplierName || "Direct / Internal"}</span>
              </div>
              {lot.reference && (
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <span className="text-text-secondary">Invoice / PO Reference:</span>
                  <span className="font-mono font-semibold text-text">{lot.reference}</span>
                </div>
              )}
            </div>
          </div>

          {/* Accountability & Intake Logs */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
              <History className="h-3.5 w-3.5" />
              Action History
            </h3>
            <div className="p-4 rounded-lg border border-border bg-bg">
              <ol className="relative border-l-2 border-border/60 ml-3 space-y-6">
                <li className="pl-6 relative">
                  <span className="absolute -left-3.25 top-1.5 h-6 w-6 rounded-full border-2 flex items-center justify-center bg-bg shadow-sm z-10 bg-category-av-bg/20 text-category-av-bg border-category-av-bg/30">
                    <ShoppingCart className="h-3 w-3" />
                  </span>
                  <div className="flex flex-col gap-0.5 pt-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-category-av-bg">Purchased & Stocked</span>
                      <time className="text-[11px] text-text-secondary font-medium">
                        {formatDateTime(lot.createdAt)}
                      </time>
                    </div>
                    <p className="text-xs text-text-secondary font-medium">
                      Recorded By {lot.recordedByName}
                    </p>
                  </div>
                  {lot.notes && (
                    <div className="mt-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border shadow-xs max-w-full bg-bg-subtle text-text border-border">
                        <FileText className="h-3 w-3 shrink-0" />
                        <span className="truncate whitespace-normal leading-tight">{lot.notes}</span>
                      </span>
                    </div>
                  )}
                </li>
              </ol>
            </div>
          </div>

          {/* QR & Batch Trace */}
          {lot.qrPayload && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                <QrCode className="h-3.5 w-3.5" />
                Physical QR Code Tag
              </h3>
              <div className="p-3 rounded-lg border border-border bg-bg flex items-center justify-between text-xs">
                <span className="text-text-secondary">Tag Payload:</span>
                <span className="font-mono text-xs text-text font-bold">{lot.qrPayload}</span>
              </div>
            </div>
          )}
        </div>

        {/* Action Footer */}
        <div className="p-4 border-t border-border bg-bg-subtle flex items-center justify-between shrink-0">
          <span className="text-xs text-text-secondary">Immutable Purchase Order Intake</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-bold rounded-lg border border-border bg-bg text-text hover:bg-bg-subtle transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </aside>
    </div>
  );
}
