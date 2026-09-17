"use client";

import React, { useRef, useState, useEffect } from "react";
import Image from "next/image";
import {
  X,
  Printer,
  FileText,
  Building2,
  Calendar,
  Check,
  Download,
} from "lucide-react";
import type { PurchaseLot, POLineItemDetail } from "@/types/purchase-lots";
import { useUpdatePurchaseOrderMutation } from "@/features/purchase-lots/client/use-purchase-lots";

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
  const updateMutation = useUpdatePurchaseOrderMutation();

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
  const unitCostNum = parseFloat(lot.unitCost) || 0;
  const totalCostNum = parseFloat(lot.totalCost) || 0;
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

  const handlePrint = () => {
    const logoUrl = `${window.location.origin}/CRMC%20LOGO.png`;

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
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>CRMC Purchase Order - ${lot.poNumber || lot.lotCode}</title>
          <style>
            @page {
              size: portrait;
              margin: 8mm 10mm;
            }
            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            body, table, th, td, input, h1, h2, h3, p, div, span, strong {
              font-family: Arial, Helvetica, sans-serif;
            }
            html, body {
              font-family: Arial, Helvetica, sans-serif;
              margin: 0 !important;
              padding: 0 !important;
              width: 100% !important;
              color: #111;
              background: #FFF !important;
            }
            .po-document {
              font-family: Arial, Helvetica, sans-serif;
              width: 100% !important;
              max-width: 100% !important;
              margin: 0 !important;
              border: 1.5px solid #222;
              padding: 16px 20px;
              box-sizing: border-box;
              display: flex;
              flex-direction: column;
            }
            .header-container {
              margin-bottom: 14px;
              border-bottom: 1.5px solid #222;
              padding-bottom: 12px;
            }
            .letterhead {
              display: flex;
              align-items: center;
              gap: 12px;
              margin-bottom: 8px;
            }
            .college-logo-img {
              width: 64px;
              height: 64px;
              object-fit: contain;
              flex-shrink: 0;
            }
            .college-titles {
              padding-top: 2px;
            }
            .college-titles h1 {
              font-size: 14px;
              font-weight: 800;
              margin: 0;
              line-height: 1.25;
              letter-spacing: 0.4px;
              text-transform: uppercase;
            }
            .college-titles p {
              font-size: 11px;
              margin: 2px 0 0 0;
              color: #444;
              line-height: 1.3;
            }
            .po-title-banner {
              text-align: center;
              margin: 6px 0 10px 0;
            }
            .po-title {
              font-size: 15px;
              font-weight: 900;
              letter-spacing: 2px;
              margin: 0;
              line-height: 1.2;
              text-transform: uppercase;
              display: inline-block;
              border-bottom: 2px solid #111;
              padding-bottom: 2px;
            }
            .meta-strip {
              display: flex;
              align-items: flex-end;
              justify-content: space-between;
              gap: 16px;
              font-size: 11.5px;
            }
            .meta-col-left {
              display: flex;
              flex-direction: column;
              gap: 4px;
            }
            .meta-col-right {
              text-align: right;
              display: flex;
              flex-direction: column;
              gap: 4px;
            }
            .meta-item {
              line-height: 1.3;
              font-size: 11.5px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 16px 0;
              font-size: 12px;
            }
            th, td {
              border: 1.5px solid #222;
              padding: 10px 8px;
              text-align: left;
            }
            th {
              font-weight: 800;
              text-align: center;
              background: #fafafa;
              text-transform: capitalize;
            }
            .col-qty { width: 10%; text-align: center; font-weight: bold; }
            .col-desc { width: 36%; }
            .col-dealer { width: 22%; }
            .col-unit-price { width: 16%; text-align: right; font-family: Arial, Helvetica, sans-serif; }
            .col-estimated { width: 16%; text-align: right; font-family: Arial, Helvetica, sans-serif; font-weight: bold; }
            .po-number-highlight {
              display: inline-block;
              font-size: 14px;
              font-weight: 900;
              font-family: Arial, Helvetica, sans-serif;
              background: #f0f0f0;
              border: 1.5px solid #222;
              padding: 3px 10px;
              letter-spacing: 0.5px;
              min-width: 130px;
              text-align: center;
            }
            .purpose-card {
              border: 1.5px solid #222;
              padding: 10px 14px;
              margin-top: 0;
              font-size: 12px;
            }
            .purpose-card .purpose-label {
              font-weight: 800;
              font-size: 11px;
              text-transform: uppercase;
              letter-spacing: 0.4px;
              color: #333;
              margin-bottom: 4px;
            }
            .purpose-card .purpose-text {
              font-size: 12px;
              color: #111;
              line-height: 1.5;
            }
            .nothing-follows {
              text-align: center;
              font-weight: 700;
              font-style: italic;
              font-size: 11px;
              letter-spacing: 2px;
              color: #444;
              padding: 6px 8px;
              background-color: #fafafa;
            }
            .empty-row td {
              height: 30px;
            }
            .signatures-container {
              margin-top: 24px;
              padding-top: 16px;
              display: flex;
              justify-content: space-between;
              font-size: 12px;
            }
            .sig-block {
              width: 45%;
            }
            .sig-label {
              font-weight: 700;
              margin-bottom: 36px;
            }
            .sig-line {
              border-bottom: 1.5px solid #222;
              min-height: 24px;
              text-align: center;
              font-weight: bold;
              padding-bottom: 2px;
            }
            .sig-title {
              font-size: 11px;
              color: #444;
              text-align: center;
              margin-top: 4px;
            }
            @media print {
              html, body {
                margin: 0 !important;
                padding: 0 !important;
                width: 100% !important;
                background: #FFF !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              .po-document {
                width: 100% !important;
                max-width: 100% !important;
                margin: 0 !important;
                border: 1.5px solid #222 !important;
                padding: 16px 20px !important;
                box-sizing: border-box !important;
                page-break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          <div class="po-document">
            <div class="header-container">
              <!-- Top Row: School Letterhead -->
              <div class="letterhead">
                <img src="${logoUrl}" alt="CRMC Logo" class="college-logo-img" />
                <div class="college-titles">
                  <h1>Cebu Roosevelt Memorial Colleges, Inc.</h1>
                  <p>Upper Pandan, Bogo City, Cebu, Philippines</p>
                </div>
              </div>

              <!-- Centered Document Title -->
              <div class="po-title-banner">
                <span class="po-title">Purchase Order</span>
              </div>

              <!-- Balanced 2-Column Metadata Strip -->
              <div class="meta-strip">
                <div class="meta-col-left">
                  <div class="meta-item">
                    PO Number: <span class="po-number-highlight">${lot.poNumber || lot.lotCode}</span>
                  </div>
                  <div class="meta-item" style="color: #333; margin-top: 2px;">
                    Suggested Dealer: <strong style="font-size: 12px;">${displayDealer}</strong>
                  </div>
                </div>
                <div class="meta-col-right">
                  <div class="meta-item">
                    Date: <strong style="font-size: 12px;">${poDate}</strong> &nbsp;·&nbsp; Time: <strong style="font-size: 11px; font-family: Arial, Helvetica, sans-serif;">${poTimestamp}</strong>
                  </div>
                  <div class="meta-item" style="color: #555; font-size: 10.5px; margin-top: 2px;">
                    Lot Code: <strong style="font-size: 10.5px; border-bottom: none; min-width: auto; font-family: monospace;">${displayLotCode}</strong>
                  </div>
                </div>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th class="col-qty">Quantity</th>
                  <th class="col-desc">Description</th>
                  <th class="col-dealer">Suggested Dealer</th>
                  <th class="col-unit-price">Unit Price</th>
                  <th class="col-estimated">Estimated</th>
                </tr>
              </thead>
              <tbody>
                ${
                  lot.items && lot.items.length > 1
                    ? lot.items
                        .map((item: POLineItemDetail) => {
                          const iUnit = parseFloat(item.unitCost) || 0;
                          const iTotal = parseFloat(item.totalCost) || 0;
                          return `<tr>
                        <td class="col-qty">${item.quantity}</td>
                        <td class="col-desc">
                          <strong>${item.itemName}</strong>
                          <div style="font-size: 10px; color: #555; margin-top: 2px;">Code: ${item.itemCode}${item.lotCode ? ` &nbsp;·&nbsp; Lot: <span style="font-family: monospace;">${item.lotCode}</span>` : ""}</div>
                        </td>
                        <td class="col-dealer">${item.suggestedDealer || lot.supplierName || "Direct Procurement"}</td>
                        <td class="col-unit-price" style="text-align: right;">₱${iUnit.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                        <td class="col-estimated">₱${iTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                      </tr>`;
                        })
                        .join("") +
                      `<tr>
                        <td colspan="5" class="nothing-follows">*** NOTHING FOLLOWS ***</td>
                      </tr>` +
                      `<tr style="border-top: 2px solid #222; font-weight: bold;">
                        <td class="col-qty">${lot.items.reduce((s: number, i: POLineItemDetail) => s + i.quantity, 0)}</td>
                        <td class="col-desc" style="text-align: right; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Grand Total</td>
                        <td class="col-dealer"></td>
                        <td class="col-unit-price"></td>
                        <td class="col-estimated" style="font-size: 13px;">₱${lot.items.reduce((s: number, i: POLineItemDetail) => s + (parseFloat(i.totalCost) || 0), 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                      </tr>`
                    : `<tr>
                      <td class="col-qty">${lot.quantity}</td>
                      <td class="col-desc">
                        <strong>${lot.itemName}</strong>
                        <div style="font-size: 10px; color: #555; margin-top: 2px;">
                          Code: ${lot.itemCode} &nbsp;·&nbsp; Lot: <span style="font-family: monospace;">${lot.lotCode}</span>
                        </div>
                      </td>
                      <td class="col-dealer">${lot.supplierName || "Direct Procurement"}</td>
                      <td class="col-unit-price" style="text-align: right;">₱${unitCostNum.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                      <td class="col-estimated">
                        ₱${totalCostNum.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                    <tr>
                      <td colspan="5" class="nothing-follows">*** NOTHING FOLLOWS ***</td>
                    </tr>
                    <tr class="empty-row"><td></td><td></td><td></td><td></td><td></td></tr>
                    <tr class="empty-row"><td></td><td></td><td></td><td></td><td></td></tr>
                    <tr class="empty-row"><td></td><td></td><td></td><td></td><td></td></tr>`
                }
              </tbody>
            </table>

            <div class="purpose-card">
              <div class="purpose-label">Purpose:</div>
              <div class="purpose-text">${lot.purpose || "Institutional Inventory & Operations"}</div>
            </div>

            <div class="signatures-container">
              <div class="sig-block">
                <div class="sig-label">Requested by:</div>
                <div class="sig-line">${effectiveRequestedBy}</div>
                <div class="sig-title">${requestedByTitle}</div>
              </div>
              <div class="sig-block">
                <div class="sig-label">Approved by:</div>
                <div class="sig-line">JACINTO ANTONIO R. LEPITEN JR.</div>
                <div class="sig-title">Head Property Custodian</div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `);
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
                    <th className="px-3 py-2 text-center w-16 border-r border-border">
                      Quantity
                    </th>
                    <th className="px-3 py-2 border-r border-border">
                      Description
                    </th>
                    <th className="px-3 py-2 border-r border-border">
                      Suggested Dealer
                    </th>
                    <th className="px-3 py-2 text-right w-24 border-r border-border">
                      Unit Price
                    </th>
                    <th className="px-3 py-2 text-right w-28">Estimated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {lot.items && lot.items.length > 1 ? (
                    <>
                      {lot.items.map((item) => {
                        const iUnit = parseFloat(item.unitCost) || 0;
                        const iTotal = parseFloat(item.totalCost) || 0;
                        return (
                          <tr key={item.id}>
                            <td className="px-3.5 py-2.5 text-center font-bold text-text border-r border-border text-sm">
                              {item.quantity}
                            </td>
                            <td className="px-3.5 py-2.5 border-r border-border">
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
                            <td className="px-3.5 py-2.5 text-text-secondary border-r border-border">
                              {item.suggestedDealer ||
                                lot.supplierName ||
                                "Direct Procurement"}
                            </td>
                            <td className="px-3.5 py-2.5 text-right font-mono text-text border-r border-border">
                              ₱
                              {iUnit.toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                              })}
                            </td>
                            <td className="px-3.5 py-2.5 text-right font-bold text-sm text-status-active-text">
                              ₱
                              {iTotal.toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                              })}
                            </td>
                          </tr>
                        );
                      })}
                      {/* Nothing Follows Prompt */}
                      <tr className="bg-bg-subtle/30 border-t border-border">
                        <td
                          colSpan={5}
                          className="px-3.5 py-1.5 text-center font-bold tracking-widest text-[11px] text-text-secondary italic select-none"
                        >
                          *** NOTHING FOLLOWS ***
                        </td>
                      </tr>
                      {/* Grand Total Row */}
                      <tr className="border-t-2 border-border bg-bg-subtle/50 font-bold">
                        <td className="px-3.5 py-2.5 text-center font-mono font-bold text-text border-r border-border text-sm">
                          {lot.items.reduce((s, i) => s + i.quantity, 0)}
                        </td>
                        <td className="px-3.5 py-2.5 text-right text-xs font-bold uppercase tracking-wider text-text-secondary border-r border-border">
                          Grand Total
                        </td>
                        <td className="border-r border-border"></td>
                        <td className="border-r border-border"></td>
                        <td className="px-3.5 py-2.5 text-right font-bold text-sm text-status-active-text">
                          ₱
                          {lot.items
                            .reduce(
                              (s, i) => s + (parseFloat(i.totalCost) || 0),
                              0,
                            )
                            .toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                            })}
                        </td>
                      </tr>
                      {lot.items.length < 4 &&
                        Array.from({ length: 4 - lot.items.length }).map(
                          (_, i) => (
                            <tr key={`pad-${i}`} className="h-7.5">
                              <td className="border-r border-border"></td>
                              <td className="border-r border-border"></td>
                              <td className="border-r border-border"></td>
                              <td className="border-r border-border"></td>
                              <td></td>
                            </tr>
                          ),
                        )}
                    </>
                  ) : (
                    <>
                      <tr>
                        <td className="px-3.5 py-2.5 text-center font-bold text-text border-r border-border text-sm">
                          {lot.quantity}
                        </td>
                        <td className="px-3.5 py-2.5 border-r border-border">
                          <strong className="text-text block text-sm">
                            {lot.itemName}
                          </strong>
                          <span className="text-[10px] text-text-secondary">
                            Code: {lot.itemCode}
                            {lot.lotCode && (
                              <>
                                {" "}
                                · Lot:{" "}
                                <span className="font-mono text-text">
                                  {lot.lotCode}
                                </span>
                              </>
                            )}
                          </span>
                        </td>
                        <td className="px-3.5 py-2.5 text-text-secondary border-r border-border">
                          {lot.supplierName || "Direct / Internal Procurement"}
                        </td>
                        <td className="px-3.5 py-2.5 text-right font-mono text-text border-r border-border">
                          ₱
                          {unitCostNum.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td className="px-3.5 py-2.5 text-right font-bold text-sm text-status-active-text">
                          ₱
                          {totalCostNum.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                      </tr>
                      {/* Nothing Follows Prompt */}
                      <tr className="bg-bg-subtle/30 border-t border-border">
                        <td
                          colSpan={5}
                          className="px-3.5 py-1.5 text-center font-bold tracking-widest text-[11px] text-text-secondary italic select-none"
                        >
                          *** NOTHING FOLLOWS ***
                        </td>
                      </tr>
                      {Array.from({ length: 3 }).map((_, i) => (
                        <tr key={i} className="h-7.5">
                          <td className="border-r border-border"></td>
                          <td className="border-r border-border"></td>
                          <td className="border-r border-border"></td>
                          <td className="border-r border-border"></td>
                          <td></td>
                        </tr>
                      ))}
                    </>
                  )}
                </tbody>
              </table>
            </div>

            {/* Purpose Card */}
            <div className="border border-border rounded-lg px-4 py-2.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary block mb-0.5">
                Purpose:
              </span>
              <p className="text-xs text-text leading-relaxed">
                {lot.purpose || "Institutional Inventory & Operations"}
              </p>
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
