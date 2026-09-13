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
import type { PurchaseLot } from "@/types/purchase-lots";

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

  useEffect(() => {
    if (lot) {
      setRequestedBy(lot.recordedByName || "");
    }
  }, [lot]);

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
              size: letter portrait;
              margin: 0.25in;
            }
            * {
              box-sizing: border-box;
            }
            body, table, th, td, input, h1, h2, h3, p, div, span, strong {
              font-family: Arial, Helvetica, sans-serif;
            }
            body {
              font-family: Arial, Helvetica, sans-serif;
              margin: 0;
              padding: 12px;
              color: #111;
              background: #FFF;
            }
            .po-document {
              font-family: Arial, Helvetica, sans-serif;
              max-width: 780px;
              margin: 0 auto;
              border: 1.5px solid #222;
              padding: 20px 24px;
              box-sizing: border-box;
              min-height: 520px;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
            }
            .header-container {
              display: flex;
              align-items: flex-start;
              justify-content: space-between;
              margin-bottom: 16px;
              border-bottom: 1px solid #ddd;
              padding-bottom: 14px;
            }
            .college-info {
              display: flex;
              align-items: flex-start;
              gap: 10px;
            }
            .college-logo-img {
              width: 72px;
              height: 72px;
              object-fit: contain;
              flex-shrink: 0;
            }
            .college-titles {
              padding-top: 2px;
            }
            .college-titles h1 {
              font-size: 13.5px;
              font-weight: 800;
              margin: 0;
              line-height: 1.25;
              letter-spacing: 0.4px;
              text-transform: uppercase;
            }
            .college-titles p {
              font-size: 11px;
              margin: 2.5px 0 0 0;
              color: #444;
              line-height: 1.3;
            }
            .po-meta {
              text-align: right;
              padding-top: 2px;
            }
            .po-title {
              font-size: 14px;
              font-weight: 800;
              letter-spacing: 0.6px;
              margin: 0 0 6px 0;
              line-height: 1.25;
              text-transform: uppercase;
            }
            .meta-line {
              font-size: 12px;
              margin: 3px 0;
            }
            .meta-line strong {
              font-family: Arial, Helvetica, sans-serif;
              font-size: 13px;
              border-bottom: 1px solid #111;
              display: inline-block;
              min-width: 130px;
              text-align: center;
              padding: 0 4px;
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
            .col-qty { width: 12%; text-align: center; font-weight: bold; }
            .col-desc { width: 34%; }
            .col-dealer { width: 20%; }
            .col-purpose { width: 18%; }
            .col-estimated { width: 16%; text-align: right; font-family: Arial, Helvetica, sans-serif; font-weight: bold; }
            .empty-row td {
              height: 30px;
            }
            .signatures-container {
              margin-top: auto;
              padding-top: 28px;
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
              body {
                padding: 0;
                background: #FFF;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              .po-document {
                border: 1.5px solid #222;
                padding: 20px 24px;
                min-height: 520px;
                page-break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          <div class="po-document">
            <div class="header-container">
              <div class="college-info">
                <img src="${logoUrl}" alt="CRMC Logo" class="college-logo-img" />
                <div class="college-titles">
                  <h1>Cebu Roosevelt Memorial Colleges, Inc.</h1>
                  <p>Upper Pandan, Bogo City, Cebu, Philippines</p>
                </div>
              </div>
              <div class="po-meta">
                <h2 class="po-title">Purchase Order</h2>
                <div class="meta-line">P.O Number: <strong>${lot.poNumber || lot.lotCode}</strong></div>
                <div class="meta-line">Date: <strong>${poDate}</strong></div>
                <div class="meta-line">Time: <strong>${poTimestamp}</strong></div>
                <div class="meta-line" style="font-size: 10px; color: #555;">Lot Code: <strong style="min-width:auto; font-size:10px; border-bottom:none;">${lot.lotCode}</strong></div>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th class="col-qty">Quantity</th>
                  <th class="col-desc">Description</th>
                  <th class="col-dealer">Suggested Dealer</th>
                  <th class="col-purpose">Purpose</th>
                  <th class="col-estimated">Estimated</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="col-qty">${lot.quantity}</td>
                  <td class="col-desc">
                    <strong>${lot.itemName}</strong>
                    <div style="font-size: 10px; color: #555; margin-top: 2px;">
                      Code: ${lot.itemCode}
                    </div>
                  </td>
                  <td class="col-dealer">${lot.supplierName || "Direct Procurement"}</td>
                  <td class="col-purpose">${lot.notes || "Institutional Inventory & Operations"}</td>
                  <td class="col-estimated">
                    ₱${totalCostNum.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </td>
                </tr>
                <tr class="empty-row"><td></td><td></td><td></td><td></td><td></td></tr>
                <tr class="empty-row"><td></td><td></td><td></td><td></td><td></td></tr>
                <tr class="empty-row"><td></td><td></td><td></td><td></td><td></td></tr>
                <tr class="empty-row"><td></td><td></td><td></td><td></td><td></td></tr>
              </tbody>
            </table>

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
            <div className="flex items-start justify-between gap-4 border-b border-border pb-3.5">
              <div className="flex items-start gap-2.5">
                <Image
                  src="/CRMC%20LOGO.png"
                  alt="CRMC Logo"
                  width={72}
                  height={72}
                  className="w-18 h-18 object-contain shrink-0"
                  priority
                />
                <div className="pt-0.5 space-y-0.5">
                  <h1 className="text-sm font-extrabold tracking-tight text-text uppercase leading-tight">
                    Cebu Roosevelt Memorial Colleges, Inc.
                  </h1>
                  <p className="text-xs text-text-secondary font-normal">
                    Upper Pandan, Bogo City, Cebu, Philippines
                  </p>
                </div>
              </div>

              <div className="text-right pt-0.5 space-y-1">
                <h2 className="text-sm font-extrabold tracking-wider uppercase text-text leading-tight">
                  Purchase Order
                </h2>
                <div className="text-xs space-y-0.5">
                  <div>
                    P.O Number:{" "}
                    <strong className="font-bold text-text">
                      {lot.poNumber || lot.lotCode}
                    </strong>
                  </div>
                  <div>
                    Date: <strong className="text-text">{poDate}</strong>
                  </div>
                  <div>
                    Time: <strong className="text-text font-mono text-[11px]">{poTimestamp}</strong>
                  </div>
                  <div className="text-[10px] text-text-secondary">
                    Lot Code: <span>{lot.lotCode}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 5-Column Table */}
            <div className="rounded-lg border border-border overflow-hidden my-1">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-bg-subtle text-text border-b border-border font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-3 py-2 text-center w-20 border-r border-border">
                      Quantity
                    </th>
                    <th className="px-3 py-2 border-r border-border">
                      Description
                    </th>
                    <th className="px-3 py-2 border-r border-border">
                      Suggested Dealer
                    </th>
                    <th className="px-3 py-2 border-r border-border">
                      Purpose
                    </th>
                    <th className="px-3 py-2 text-right w-28">Estimated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
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
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5 text-text-secondary border-r border-border">
                      {lot.supplierName || "Direct / Internal Procurement"}
                    </td>
                    <td className="px-3.5 py-2.5 text-text-secondary border-r border-border">
                      {lot.notes || "Institutional Inventory & Operations"}
                    </td>
                    <td className="px-3.5 py-2.5 text-right font-bold text-sm text-status-active-text">
                      ₱
                      {totalCostNum.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                  </tr>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="h-7.5">
                      <td className="border-r border-border"></td>
                      <td className="border-r border-border"></td>
                      <td className="border-r border-border"></td>
                      <td className="border-r border-border"></td>
                      <td></td>
                    </tr>
                  ))}
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
