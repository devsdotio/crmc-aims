"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  X,
  Search,
  QrCode,
  Package,
  Layers,
  ArrowRight,
  Send,
  Printer,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import type { PurchaseLot } from "@/types/purchase-lots";
import { cn } from "@/lib/utils";

interface LotQuickScanDialogProps {
  lots: PurchaseLot[];
  isOpen: boolean;
  onClose: () => void;
  onSelectLot: (lot: PurchaseLot) => void;
  onPrintTag: (lot: PurchaseLot) => void;
  onReleaseStock?: (lot: PurchaseLot) => void;
  canOperate?: boolean;
}

export function LotQuickScanDialog({
  lots,
  isOpen,
  onClose,
  onSelectLot,
  onPrintTag,
  onReleaseStock,
  canOperate = false,
}: LotQuickScanDialogProps) {
  const [scanQuery, setScanQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setScanQuery("");
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const cleanQuery = scanQuery
    .replace(/^CRMC-AIMS-LOT:/i, "")
    .trim()
    .toLowerCase();

  const { exactMatch, partialMatches } = useMemo(() => {
    if (!cleanQuery) return { exactMatch: null, partialMatches: [] };

    const exact = lots.find(
      (l) =>
        l.lotCode.toLowerCase() === cleanQuery ||
        l.id.toLowerCase() === cleanQuery
    );

    const partials = lots.filter(
      (l) =>
        l !== exact &&
        (l.lotCode.toLowerCase().includes(cleanQuery) ||
          l.itemCode.toLowerCase().includes(cleanQuery) ||
          l.itemName.toLowerCase().includes(cleanQuery) ||
          (l.supplierName && l.supplierName.toLowerCase().includes(cleanQuery)))
    );

    return { exactMatch: exact || null, partialMatches: partials.slice(0, 5) };
  }, [lots, cleanQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-scan-title"
        className="relative w-full max-w-lg rounded-2xl border border-border bg-bg shadow-2xl z-10 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-bg-subtle/50">
          <div className="flex items-center gap-2">
            <QrCode className="h-4 w-4 text-accent" />
            <h2 id="quick-scan-title" className="text-sm font-bold text-text">
              Quick Scan & Lot Code Lookup
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1 rounded-lg text-text-secondary hover:text-text hover:bg-border/60 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Input & Scanner Search Area */}
        <div className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="lot-scanner-input" className="text-xs font-semibold text-text">
              Scan Barcode / QR Tag or Type Lot Code:
            </label>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
              <input
                id="lot-scanner-input"
                ref={inputRef}
                type="text"
                value={scanQuery}
                onChange={(e) => setScanQuery(e.target.value)}
                placeholder="e.g. LOT-2026-0001 or scan QR payload..."
                className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-border bg-bg-subtle font-mono text-text focus:bg-bg focus:border-border focus:ring-2 focus:ring-ring focus:outline-hidden"
              />
            </div>
            <p className="text-[11px] text-text-secondary">
              Handheld USB 2D scanners will paste the code and resolve the lot automatically.
            </p>
          </div>

          {/* Exact Match Card */}
          {exactMatch && (
            <div className="p-4 rounded-xl border-2 border-status-active-bg/40 bg-status-active-bg/5 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-bold text-status-active-text">
                  <CheckCircle2 className="h-4 w-4" />
                  Exact Batch Match Found
                </span>
                <span className="font-mono text-xs font-bold text-text bg-bg px-2 py-0.5 rounded border border-border">
                  {exactMatch.lotCode}
                </span>
              </div>

              <div>
                <p className="text-sm font-bold text-text">{exactMatch.itemName}</p>
                <div className="flex items-center gap-2 text-xs text-text-secondary mt-0.5">
                  <span>Available: <strong className="text-text">{exactMatch.quantityRemaining}</strong> / {exactMatch.quantity}</span>
                  <span>•</span>
                  <span>Unit: <strong>₱{Number(exactMatch.unitCost).toLocaleString("en-US", { minimumFractionDigits: 2 })}</strong></span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-border/70 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    onSelectLot(exactMatch);
                    onClose();
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer"
                >
                  <span>View Details</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onPrintTag(exactMatch);
                    onClose();
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-border bg-bg hover:bg-bg-subtle text-text transition-colors cursor-pointer"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Print Tag</span>
                </button>

                {canOperate && exactMatch.itemType === "consumable" && exactMatch.quantityRemaining > 0 && onReleaseStock && (
                  <button
                    type="button"
                    onClick={() => {
                      onReleaseStock(exactMatch);
                      onClose();
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-category-transport-bg/10 text-category-transport-bg hover:bg-category-transport-bg/20 border border-category-transport-bg/30 transition-colors cursor-pointer"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>Quick Release</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Partial Matches */}
          {partialMatches.length > 0 && (
            <div className="space-y-2">
              <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider block">
                Matching Lots ({partialMatches.length})
              </span>
              <div className="divide-y divide-border rounded-xl border border-border bg-card overflow-hidden">
                {partialMatches.map((lot) => (
                  <div
                    key={lot.id}
                    onClick={() => {
                      onSelectLot(lot);
                      onClose();
                    }}
                    className="p-3 hover:bg-bg-subtle/70 transition-colors cursor-pointer flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-text">{lot.lotCode}</span>
                        <span className="text-text-secondary truncate font-medium">
                          {lot.itemName}
                        </span>
                      </div>
                      <span className="text-[11px] text-text-secondary">
                        {lot.quantityRemaining} units left · ₱{Number(lot.unitCost).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <ArrowRight className="h-4 w-4 text-text-secondary shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {cleanQuery && !exactMatch && partialMatches.length === 0 && (
            <div className="p-6 text-center border border-border/70 rounded-xl bg-bg-subtle/40 space-y-1">
              <AlertCircle className="h-6 w-6 text-text-secondary mx-auto opacity-50 mb-1" />
              <p className="text-xs font-bold text-text">No Matching Lot Code</p>
              <p className="text-[11px] text-text-secondary">
                No purchase batch records match &quot;{scanQuery}&quot;.
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-border bg-bg-subtle flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg border border-border bg-bg hover:bg-bg-subtle text-text transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
