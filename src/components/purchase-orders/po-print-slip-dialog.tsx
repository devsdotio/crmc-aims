"use client";

import { useRef, useState, useEffect } from "react";
import Image from "next/image";
import { X, Printer, FileText, Download, Loader2 } from "lucide-react";
import type { PurchaseLot } from "@/types/purchase-lots";
import { useUpdatePurchaseOrderMutation } from "@/features/purchase-lots/client/use-purchase-lots";
import { useToast } from "@/components/providers/toast-context";
import {
  buildPoSlipFullHtml,
  downloadPoSlipPdf,
  getPoSlipPurposeGroups,
  type PoSlipRenderData,
} from "@/components/purchase-orders/po-official-slip";

interface POPrintSlipDialogProps {
  lot: PurchaseLot | null;
  isOpen: boolean;
  onClose: () => void;
}

export function POPrintSlipDialog({
  lot,
  isOpen,
  onClose,
}: POPrintSlipDialogProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [requestedBy, setRequestedBy] = useState("");
  const [requestedByTitle, setRequestedByTitle] = useState("Staff / Requester");
  const [isSavingPdf, setIsSavingPdf] = useState(false);
  const updateMutation = useUpdatePurchaseOrderMutation();
  const toast = useToast();

  useEffect(() => {
    if (lot && isOpen) {
      setRequestedBy(lot.recordedByName || "");
      setRequestedByTitle("Staff / Requester");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lot?.id, isOpen]);

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

  const rawDate = lot.purchasedOn
    ? new Date(lot.purchasedOn)
    : new Date(lot.createdAt);
  const isValidDate = !isNaN(rawDate.getTime());
  const poDate = isValidDate
    ? rawDate.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : lot.purchasedOn || lot.createdAt.split("T")[0];

  const now = new Date();
  const poTimestamp = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  const effectiveRequestedBy =
    requestedBy.trim() || lot.recordedByName || "Authorized Staff";

  const uniqueDealers = Array.from(
    new Set(
      (lot.items && lot.items.length > 0
        ? lot.items.map((i) => i.suggestedDealer?.trim())
        : [lot.supplierName?.trim()]
      ).filter((d): d is string => Boolean(d)),
    ),
  );
  const displayDealer =
    uniqueDealers.length === 0
      ? "Direct Procurement"
      : uniqueDealers.length === 1
        ? uniqueDealers[0]
        : `Multiple Dealers (${uniqueDealers.length})`;

  const uniqueLotCodes = Array.from(
    new Set(
      (lot.items && lot.items.length > 0
        ? lot.items.map((i) => i.lotCode?.trim())
        : [lot.lotCode?.trim()]
      ).filter((c): c is string => Boolean(c)),
    ),
  );
  const displayLotCode =
    uniqueLotCodes.length <= 1
      ? lot.lotCode
      : `Multi-Lot (${uniqueLotCodes.length} Lots)`;

  const getSlipRenderData = (): PoSlipRenderData => ({
    lot,
    requestedBy,
    requestedByTitle,
    poDate,
    poTimestamp,
    displayDealer,
    displayLotCode,
    logoUrl: `${window.location.origin}/CRMC%20LOGO.png`,
  });

  const handlePrint = () => {
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "none";
    iframe.style.opacity = "0";
    iframe.style.pointerEvents = "none";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(buildPoSlipFullHtml(getSlipRenderData()));
    doc.close();

    const triggerPrint = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } finally {
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 1000);
      }
    };

    const logoImg = doc.querySelector("img");
    if (logoImg && !logoImg.complete) {
      logoImg.onload = triggerPrint;
      logoImg.onerror = triggerPrint;
    } else {
      setTimeout(triggerPrint, 200);
    }
  };

  const handleSavePdf = async () => {
    if (isSavingPdf) return;
    setIsSavingPdf(true);
    try {
      const poLabel = lot.poNumber || lot.lotCode;
      const safeName = String(poLabel).replace(/[\\/:*?"<>|]+/g, "-");
      await downloadPoSlipPdf(getSlipRenderData(), `PO-${safeName}.pdf`);
      toast.success("Purchase order slip saved as PDF.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save purchase order slip as PDF.",
      );
    } finally {
      setIsSavingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="official-po-title"
        className="relative w-full max-w-4xl max-h-[85vh] h-[80vh] rounded-2xl border border-border bg-bg shadow-2xl z-10 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
      >
        {/* Modal Top Bar Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-bg-subtle/50 shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-accent" />
            <h2 id="official-po-title" className="text-sm font-bold text-text">
              Official CRMC Purchase Order Document Preview
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

        {/* Customization Options Toolbar */}
        <div className="px-6 py-2.5 bg-bg-subtle/30 border-b border-border flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 flex-1 min-w-48 flex-wrap">
            <span className="text-[11px] font-bold text-text-secondary whitespace-nowrap">
              Requested by:
            </span>
            <input
              type="text"
              value={requestedBy}
              onChange={(e) => setRequestedBy(e.target.value)}
              onBlur={() => {
                if (requestedBy !== (lot?.recordedByName || "")) {
                  updateMutation.mutate({
                    id: lot.id,
                    payload: { recordedByName: requestedBy },
                  });
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.currentTarget.blur();
                }
              }}
              placeholder="Requester name…"
              className="h-8 px-2.5 text-xs rounded-lg border border-border bg-bg text-text focus:bg-bg focus:border-accent focus:ring-1 focus:ring-accent focus:outline-hidden transition-colors flex-1 min-w-36 max-w-xs font-semibold"
            />
            <input
              type="text"
              value={requestedByTitle}
              onChange={(e) => setRequestedByTitle(e.target.value)}
              placeholder="Title / Role"
              className="h-8 px-2.5 text-xs rounded-lg border border-border bg-bg text-text focus:bg-bg focus:border-accent focus:ring-1 focus:ring-accent focus:outline-hidden transition-colors w-36"
            />
            {(requestedBy !== (lot.recordedByName || "") ||
              requestedByTitle !== "Staff / Requester") && (
              <button
                type="button"
                onClick={() => {
                  setRequestedBy(lot.recordedByName || "");
                  setRequestedByTitle("Staff / Requester");
                }}
                className="text-[11px] font-semibold text-accent hover:underline cursor-pointer"
              >
                Reset to default
              </button>
            )}
          </div>
        </div>

        {/* Document Body (matching physical form) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 bg-bg-subtle/40 flex">
          <div
            ref={printRef}
            style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
            className="w-full m-auto min-h-121.25 p-5 sm:p-6 bg-card rounded-xl border border-border shadow-md flex flex-col justify-between text-xs text-text font-[Arial,Helvetica,sans-serif]"
          >
            {/* Header */}
            {/* Header */}
            <div className="border-b border-border pb-3 mb-2">
              {/* Top Row: Letterhead */}
              <div className="flex items-center gap-3">
                <Image
                  src="/CRMC%20LOGO.png"
                  alt="CRMC Logo"
                  width={64}
                  height={64}
                  className="w-16 h-16 object-contain shrink-0"
                  priority
                />
                <div className="space-y-0.5">
                  <h1 className="text-sm font-extrabold tracking-tight text-text uppercase leading-tight">
                    Cebu Roosevelt Memorial Colleges, Inc.
                  </h1>
                  <p className="text-xs text-text-secondary font-normal">
                    Upper Pandan, Bogo City, Cebu, Philippines
                  </p>
                </div>
              </div>

              {/* Centered Document Title */}
              <div className="text-center my-2">
                <span className="inline-block text-sm font-extrabold tracking-widest uppercase text-text border-b-2 border-text pb-0.5">
                  Purchase Order
                </span>
              </div>

              {/* Balanced 2-Column Metadata Strip */}
              <div className="flex items-end justify-between gap-4 text-xs pt-1">
                {/* Left: PO Number & Suggested Dealer */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-text-secondary">PO Number:</span>
                    <span className="inline-block font-black text-xs font-mono tracking-wide bg-bg-subtle border-1.5 border-text px-2.5 py-0.5 rounded-sm">
                      {lot.poNumber || lot.lotCode}
                    </span>
                  </div>
                  <div className="text-xs text-text-secondary">
                    Suggested Dealer:{" "}
                    <strong className="text-text font-semibold">
                      {displayDealer}
                    </strong>
                  </div>
                  {lot.receiptUrl && (
                    <div className="text-[10.5px] text-emerald-700 dark:text-emerald-400 font-medium">
                      Official Receipt: Attached in AIMS Archive ✓
                    </div>
                  )}
                </div>

                {/* Right: Date, Time & Lot Code */}
                <div className="text-right space-y-1">
                  <div className="text-xs">
                    <span className="text-text-secondary">Date:</span>{" "}
                    <strong className="text-text font-medium">{poDate}</strong>
                    <span className="mx-1.5 text-text-muted">·</span>
                    <span className="text-text-secondary">Time:</span>{" "}
                    <strong className="text-text font-mono text-[11px]">
                      {poTimestamp}
                    </strong>
                  </div>
                  <div className="text-[11px] text-text-secondary">
                    Lot Code:{" "}
                    <span className="font-mono text-text">
                      {displayLotCode}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="rounded-lg border border-border overflow-hidden my-1">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-bg-subtle text-text border-b border-border font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-2.5 py-2 text-center w-14 border-r border-border">
                      Qty
                    </th>
                    <th className="px-2.5 py-2 border-r border-border">
                      Description
                    </th>
                    <th className="px-2.5 py-2 border-r border-border w-[18%]">
                      Purpose
                    </th>
                    <th className="px-2.5 py-2 border-r border-border">
                      Suggested Dealer
                    </th>
                    <th className="px-2.5 py-2 text-right w-20 border-r border-border">
                      Unit Price
                    </th>
                    <th className="pl-4 pr-2.5 py-2 text-right min-w-24 whitespace-nowrap">
                      Estimated
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(() => {
                    const groups = getPoSlipPurposeGroups(lot);
                    const allLines = groups.flatMap((g) => g.lines);
                    const qtyTotal = allLines.reduce((s, i) => s + i.quantity, 0);
                    const costTotal = allLines.reduce(
                      (s, i) => s + (parseFloat(i.totalCost) || 0),
                      0
                    );

                    return (
                      <>
                        {groups.map((group) =>
                          group.lines.map((item, index) => {
                            const iUnit = parseFloat(item.unitCost) || 0;
                            const iTotal = parseFloat(item.totalCost) || 0;
                            return (
                              <tr key={item.id}>
                                <td className="px-2.5 py-2 text-center font-bold text-text border-r border-border text-sm">
                                  {item.quantity}
                                </td>
                                <td className="px-2.5 py-2 border-r border-border">
                                  <strong className="text-text block text-sm">
                                    {item.itemName}
                                  </strong>
                                  <span className="text-[10px] text-text-secondary">
                                    Code: {item.itemCode}
                                    {item.lotCode && (
                                      <>
                                        {" "}
                                        · Lot:{" "}
                                        <span className="font-mono text-text">
                                          {item.lotCode}
                                        </span>
                                      </>
                                    )}
                                  </span>
                                </td>
                                {index === 0 && (
                                  <td
                                    rowSpan={group.lines.length}
                                    className="px-2.5 py-2 text-[11px] text-text leading-snug border-r border-border align-middle"
                                  >
                                    {group.purpose}
                                  </td>
                                )}
                                <td className="px-2.5 py-2 text-text-secondary border-r border-border">
                                  {item.suggestedDealer ||
                                    lot.supplierName ||
                                    "Direct Procurement"}
                                </td>
                                <td className="px-2.5 py-2 text-right font-mono text-text border-r border-border">
                                  ₱
                                  {iUnit.toLocaleString("en-US", {
                                    minimumFractionDigits: 2,
                                  })}
                                </td>
                                <td className="pl-4 pr-2.5 py-2 text-right font-bold text-sm text-status-active-text whitespace-nowrap tabular-nums">
                                  ₱
                                  {iTotal.toLocaleString("en-US", {
                                    minimumFractionDigits: 2,
                                  })}
                                </td>
                              </tr>
                            );
                          })
                        )}
                        <tr className="bg-bg-subtle/30 border-t border-border">
                          <td
                            colSpan={6}
                            className="px-2.5 py-1.5 text-center font-bold tracking-widest text-[11px] text-text-secondary italic select-none"
                          >
                            *** NOTHING FOLLOWS ***
                          </td>
                        </tr>
                        <tr className="border-t-2 border-border bg-bg-subtle/50 font-bold">
                          <td className="px-2.5 py-2 text-center font-mono font-bold text-text border-r border-border text-sm">
                            {qtyTotal}
                          </td>
                          <td className="px-2.5 py-2 text-right text-xs font-bold uppercase tracking-wider text-text-secondary border-r border-border">
                            Grand Total
                          </td>
                          <td className="border-r border-border" />
                          <td className="border-r border-border" />
                          <td className="border-r border-border" />
                          <td className="pl-4 pr-2.5 py-2 text-right font-bold text-sm text-status-active-text whitespace-nowrap tabular-nums">
                            ₱
                            {costTotal.toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                            })}
                          </td>
                        </tr>
                      </>
                    );
                  })()}
                </tbody>
              </table>
            </div>

            {/* Official Signatures matching form */}
            <div className="grid grid-cols-2 gap-8 pt-4 mt-auto">
              <div className="space-y-4">
                <span className="text-xs font-bold text-text-secondary block">
                  Requested by:
                </span>
                <div className="pt-4 border-b border-text/80 text-center">
                  <span className="font-bold text-xs text-text">
                    {effectiveRequestedBy}
                  </span>
                </div>
                <p className="text-[10px] text-text-secondary text-center -mt-3">
                  {requestedByTitle}
                </p>
              </div>

              <div className="space-y-4">
                <span className="text-xs font-bold text-text-secondary block">
                  Approved by:
                </span>
                <div className="pt-4 border-b border-text/80 text-center">
                  <span className="font-bold text-xs text-text">
                    JACINTO ANTONIO R. LEPITEN JR.
                  </span>
                </div>
                <p className="text-[10px] text-text-secondary text-center -mt-3">
                  Head Property Custodian
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-border bg-bg-subtle flex items-center justify-between shrink-0">
          <span className="text-xs text-text-secondary font-medium">
            Formatted to official CRMC Purchase Order specs
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-lg border border-border bg-bg hover:bg-bg-subtle text-text transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleSavePdf}
              disabled={isSavingPdf}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg border border-emerald-600/30 bg-emerald-600 text-white hover:bg-emerald-700 transition-colors cursor-pointer shadow-xs disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSavingPdf ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              <span>{isSavingPdf ? "Saving PDF…" : "Save as PDF"}</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-primary text-primary-foreground hover:bg-accent transition-colors cursor-pointer shadow-xs"
            >
              <Printer className="h-4 w-4" />
              <span>Print Official PO Slip</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
