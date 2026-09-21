"use client";

import React, { useRef, useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  X,
  Printer,
  Download,
  Check,
  QrCode,
  Tag,
  Building2,
  Package,
  Calendar,
} from "lucide-react";
import type { PurchaseLot } from "@/types/purchase-lots";
import { cn } from "@/lib/utils";

interface LotPrintTagDialogProps {
  lot: PurchaseLot | null;
  isOpen: boolean;
  onClose: () => void;
}

export function LotPrintTagDialog({
  lot,
  isOpen,
  onClose,
}: LotPrintTagDialogProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [downloaded, setDownloaded] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);

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

  const items = lot.items && lot.items.length > 0 ? lot.items : null;
  const currentItem = items ? items[selectedIdx] : null;

  const activeLotCode = currentItem?.lotCode || lot.lotCode;
  const activeItemName = currentItem?.itemName || lot.itemName;
  const activeItemCode = currentItem?.itemCode || lot.itemCode;
  const activeQuantity = currentItem?.quantity ?? lot.quantity;
  const activeUnitCost = currentItem?.unitCost || lot.unitCost;
  const activeSupplier = currentItem?.suggestedDealer || lot.supplierName;
  const activeItemType = currentItem?.itemType || lot.itemType;
  const payload = `CRMC-AIMS-LOT:${activeLotCode.trim()}`;

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;

    const printWindow = window.open("", "_blank", "width=600,height=700");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Lot Tag - ${activeLotCode}</title>
          <style>
            @page {
              size: 4in 3in;
              margin: 0;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              margin: 0;
              padding: 16px;
              background: #FFF;
              color: #111;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              box-sizing: border-box;
            }
            .tag-card {
              width: 100%;
              max-width: 360px;
              border: 2px solid #000;
              border-radius: 8px;
              padding: 14px;
              box-sizing: border-box;
            }
            .header {
              border-bottom: 2px solid #000;
              padding-bottom: 6px;
              margin-bottom: 8px;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .brand {
              font-weight: 900;
              font-size: 13px;
              letter-spacing: 0.5px;
            }
            .type-badge {
              font-size: 10px;
              font-weight: bold;
              text-transform: uppercase;
              border: 1px solid #000;
              padding: 2px 6px;
              border-radius: 4px;
            }
            .content {
              display: flex;
              gap: 12px;
              align-items: center;
            }
            .qr-box {
              flex-shrink: 0;
            }
            .details {
              flex: 1;
              font-size: 11px;
            }
            .lot-code {
              font-family: monospace;
              font-size: 15px;
              font-weight: bold;
              margin-bottom: 4px;
            }
            .item-name {
              font-size: 12px;
              font-weight: bold;
              margin-bottom: 6px;
            }
            .row {
              margin-bottom: 3px;
              color: #333;
            }
            .footer {
              margin-top: 8px;
              padding-top: 6px;
              border-top: 1px dashed #666;
              font-size: 9px;
              display: flex;
              justify-content: space-between;
              color: #555;
            }
          </style>
        </head>
        <body>
          <div class="tag-card">
            <div class="header">
              <span class="brand">CRMC-AIMS PHYSICAL BATCH TAG</span>
              <span class="type-badge">${activeItemType}</span>
            </div>
            <div class="content">
              <div class="qr-box">
                ${content.querySelector("svg")?.outerHTML || ""}
              </div>
              <div class="details">
                <div class="lot-code">${activeLotCode}</div>
                <div class="item-name">${activeItemName}</div>
                <div class="row">Code: <strong>${activeItemCode}</strong></div>
                <div class="row">Batch Qty: <strong>${activeQuantity} units</strong></div>
                <div class="row">Unit Cost: <strong>₱${Number(activeUnitCost).toLocaleString("en-US", { minimumFractionDigits: 2 })}</strong></div>
                <div class="row">Vendor: <strong>${activeSupplier || "Internal"}</strong></div>
              </div>
            </div>
            <div class="footer">
              <span>Rec: ${lot.purchasedOn || lot.createdAt.split("T")[0]}</span>
              <span>By: ${lot.recordedByName}</span>
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownloadPNG = () => {
    try {
      const svg = printRef.current?.querySelector("svg");
      if (!svg) return;

      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();

      const width = 400;
      const height = 300;
      canvas.width = width;
      canvas.height = height;

      img.onload = () => {
        if (!ctx) return;
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, width, height);

        // Draw border
        ctx.strokeStyle = "#1B2140";
        ctx.lineWidth = 3;
        ctx.strokeRect(10, 10, width - 20, height - 20);

        // Header
        ctx.fillStyle = "#1B2140";
        ctx.font = "bold 13px sans-serif";
        ctx.fillText("CRMC-AIMS BATCH LOT TAG", 24, 38);

        // Draw QR
        ctx.drawImage(img, 24, 55, 140, 140);

        // Draw Text
        ctx.font = "bold 15px monospace";
        ctx.fillText(lot.lotCode, 180, 75);

        ctx.font = "bold 13px sans-serif";
        ctx.fillText(lot.itemName.slice(0, 22), 180, 102);

        ctx.font = "11px sans-serif";
        ctx.fillStyle = "#5A5F73";
        ctx.fillText(`Item Code: ${lot.itemCode}`, 180, 126);
        ctx.fillText(`Intake Qty: ${lot.quantity} units`, 180, 146);
        ctx.fillText(`Unit Cost: ₱${Number(lot.unitCost).toLocaleString("en-US", { minimumFractionDigits: 2 })}`, 180, 166);
        ctx.fillText(`Supplier: ${(lot.supplierName || "Internal").slice(0, 20)}`, 180, 186);

        // Divider
        ctx.strokeStyle = "#E3E5EC";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(24, 215);
        ctx.lineTo(width - 24, 215);
        ctx.stroke();

        // Footer
        ctx.font = "10px monospace";
        ctx.fillStyle = "#888888";
        ctx.fillText(`Date: ${lot.purchasedOn || lot.createdAt.split("T")[0]}`, 24, 238);
        ctx.fillText(`Recorder: ${lot.recordedByName}`, 180, 238);
        ctx.fillText(`Payload: ${payload}`, 24, 262);

        const pngUrl = canvas.toDataURL("image/png");
        const downloadLink = document.createElement("a");
        downloadLink.href = pngUrl;
        downloadLink.download = `TAG-${activeLotCode}.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);

        setDownloaded(true);
        setTimeout(() => setDownloaded(false), 2000);
      };

      img.src =
        "data:image/svg+xml;base64," +
        btoa(unescape(encodeURIComponent(svgData)));
    } catch (err) {
      console.error("Failed to generate tag PNG:", err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="print-dialog-title"
        className="relative w-full max-w-lg rounded-2xl border border-border bg-bg shadow-2xl z-10 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-bg-subtle/50">
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-accent" />
            <h2 id="print-dialog-title" className="text-sm font-bold text-text">
              Printable Lot Bin Tag
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

        {/* Tag Preview Area */}
        <div className="p-6 space-y-4 overflow-y-auto max-h-[75vh]">
          {/* Multi-lot item selector */}
          {items && items.length > 1 && (
            <div className="space-y-1.5 pb-1 border-b border-border">
              <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider block">
                Select Lot Tag ({items.length} lots in PO):
              </span>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {items.map((it, idx) => (
                  <button
                    key={it.id + idx}
                    type="button"
                    onClick={() => setSelectedIdx(idx)}
                    className={cn(
                      "px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer shrink-0",
                      selectedIdx === idx
                        ? "bg-accent text-accent-foreground font-bold shadow-xs"
                        : "bg-bg-subtle text-text-secondary hover:text-text border border-border"
                    )}
                  >
                    <span className="font-mono text-[11px]">{it.lotCode || `Lot ${idx + 1}`}</span>: {it.itemName.slice(0, 14)}
                  </button>
                ))}
              </div>
            </div>
          )}

          <p className="text-xs text-text-secondary">
            Attach this physical barcode tag to warehouse shelves, storage bins, or intake pallets for rapid mobile scanning.
          </p>

          <div
            ref={printRef}
            className="p-5 rounded-xl border-2 border-border bg-card shadow-sm space-y-4 text-left"
          >
            {/* Tag Header */}
            <div className="flex items-center justify-between border-b border-border pb-2.5">
              <span className="font-extrabold text-xs tracking-wider text-text">
                CRMC-AIMS BATCH LOT TAG
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-bg-subtle text-text border border-border">
                {activeItemType}
              </span>
            </div>

            {/* Tag Content */}
            <div className="flex items-center gap-4">
              <div className="p-2 bg-white rounded-lg border border-border shadow-2xs shrink-0">
                <QRCodeSVG value={payload} size={110} level="H" includeMargin={false} />
              </div>

              <div className="space-y-1 text-xs min-w-0 flex-1">
                <span className="font-mono text-sm font-bold text-text block bg-bg-subtle px-1.5 py-0.5 rounded border border-border truncate">
                  {activeLotCode}
                </span>
                <p className="font-bold text-text text-sm truncate" title={activeItemName}>
                  {activeItemName}
                </p>
                <p className="text-[11px] text-text-secondary font-mono">
                  Code: {activeItemCode}
                </p>
                <div className="flex items-center gap-2 text-[11px] text-text font-medium pt-0.5">
                  <span>Batch: <strong>{activeQuantity} units</strong></span>
                  <span>•</span>
                  <span>Unit: <strong>₱{Number(activeUnitCost).toLocaleString("en-US", { minimumFractionDigits: 2 })}</strong></span>
                </div>
                <p className="text-[11px] text-text-secondary truncate">
                  Vendor: <strong className="text-text">{activeSupplier || "Internal Procurement"}</strong>
                </p>
              </div>
            </div>

            {/* Tag Footer */}
            <div className="flex items-center justify-between border-t border-dashed border-border pt-2 text-[10px] font-mono text-text-secondary">
              <span>Date: {lot.purchasedOn || lot.createdAt.split("T")[0]}</span>
              <span>Recorder: {lot.recordedByName}</span>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-4 border-t border-border bg-bg-subtle flex items-center justify-between">
          <button
            type="button"
            onClick={handleDownloadPNG}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-border transition-colors cursor-pointer",
              downloaded
                ? "bg-status-active-bg text-white border-transparent"
                : "bg-bg hover:bg-bg-subtle text-text"
            )}
          >
            {downloaded ? (
              <>
                <Check className="h-3.5 w-3.5" />
                <span>PNG Downloaded</span>
              </>
            ) : (
              <>
                <Download className="h-3.5 w-3.5" />
                <span>Download PNG</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 text-xs font-semibold rounded-lg border border-border bg-bg hover:bg-bg-subtle text-text transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-primary text-primary-foreground hover:bg-accent transition-colors cursor-pointer shadow-xs"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print Label</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
