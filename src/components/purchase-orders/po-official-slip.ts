import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import type { PurchaseLot, POLineItemDetail } from "@/types/purchase-lots";
import { stripPoPurposePrefix } from "@/lib/po-purpose";
import { groupByPurpose } from "@/lib/request-purpose";

const SLIP_PURPOSE_FALLBACK = "Institutional Inventory & Operations";

export interface PoSlipRenderData {
  lot: PurchaseLot;
  requestedBy: string;
  requestedByTitle: string;
  poDate: string;
  poTimestamp: string;
  displayDealer: string;
  displayLotCode: string | undefined;
  logoUrl: string;
}

/** Purpose card(s) kept for callers; slip table now carries purpose column + groups. */
export function buildPoPurposeCardsHtml(lot: PurchaseLot): string {
  const groups = getSlipPurposeGroups(lot);
  if (groups.length <= 1) {
    const text =
      groups[0]?.purpose ||
      stripPoPurposePrefix(lot.purpose) ||
      (lot.purpose ?? "").trim() ||
      SLIP_PURPOSE_FALLBACK;
    return `<div class="purpose-card">
        <div class="purpose-label">Purpose:</div>
        <div class="purpose-text">${escapeHtml(text)}</div>
      </div>`;
  }
  return groups
    .map(
      (g) => `<div class="purpose-card">
        <div class="purpose-label">Purpose:</div>
        <div class="purpose-text">${escapeHtml(g.purpose)}</div>
        <div class="purpose-lines">${g.lines
          .map((l) => escapeHtml(l.itemName))
          .join(", ")}</div>
      </div>`
    )
    .join("\n");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function resolveLinePurpose(
  item: { purpose?: string | null },
  lot: PurchaseLot
): string {
  return (
    stripPoPurposePrefix(item.purpose) ||
    stripPoPurposePrefix(lot.purpose) ||
    // Prefer any raw stored purpose (incl. tag-only) over inventing "General"
    (item.purpose ?? "").trim() ||
    (lot.purpose ?? "").trim() ||
    SLIP_PURPOSE_FALLBACK
  );
}

type SlipLine = POLineItemDetail & { purposeLabel: string };

function getSlipLines(lot: PurchaseLot): SlipLine[] {
  if (lot.items && lot.items.length > 0) {
    return lot.items.map((item) => ({
      ...item,
      purposeLabel: resolveLinePurpose(item, lot),
    }));
  }
  return [
    {
      id: lot.id,
      itemType: lot.itemType,
      consumableId: lot.consumableId,
      assetId: lot.assetId,
      itemCode: lot.itemCode,
      itemName: lot.itemName,
      quantity: lot.quantity,
      unitCost: lot.unitCost,
      totalCost: lot.totalCost,
      purpose: lot.purpose,
      suggestedDealer: lot.supplierName,
      lotCode: lot.lotCode,
      purposeLabel: resolveLinePurpose(lot, lot),
    },
  ];
}

function getSlipPurposeGroups(lot: PurchaseLot) {
  const lines = getSlipLines(lot).map((l) => ({
    ...l,
    purpose: l.purposeLabel,
  }));
  return groupByPurpose(
    lines,
    stripPoPurposePrefix(lot.purpose) ||
      (lot.purpose ?? "").trim() ||
      SLIP_PURPOSE_FALLBACK
  );
}

/** Shared grouping for print preview + official slip PDF. */
export function getPoSlipPurposeGroups(lot: PurchaseLot) {
  return getSlipPurposeGroups(lot);
}

function formatMoney(value: number): string {
  return value.toLocaleString("en-US", { minimumFractionDigits: 2 });
}

function buildItemCellsHtml(
  item: SlipLine,
  lot: PurchaseLot,
  purposeCell: string
): string {
  const iUnit = parseFloat(item.unitCost) || 0;
  const iTotal = parseFloat(item.totalCost) || 0;
  return `<tr>
            <td class="col-qty">${item.quantity}</td>
            <td class="col-desc">
              <strong>${escapeHtml(item.itemName)}</strong>
              <div style="font-size: 10px; color: #555; margin-top: 2px;">Code: ${escapeHtml(item.itemCode)}${item.lotCode ? ` &nbsp;·&nbsp; Lot: <span style="font-family: monospace;">${escapeHtml(item.lotCode)}</span>` : ""}</div>
            </td>
            ${purposeCell}
            <td class="col-dealer">${escapeHtml(item.suggestedDealer || lot.supplierName || "Direct Procurement")}</td>
            <td class="col-unit-price" style="text-align: right;">₱${formatMoney(iUnit)}</td>
            <td class="col-estimated">₱${formatMoney(iTotal)}</td>
          </tr>`;
}

function buildLineItemsRows(lot: PurchaseLot): string {
  const groups = getSlipPurposeGroups(lot);
  const allLines = groups.flatMap((g) => g.lines);

  const body = groups
    .map((group) => {
      const rowspan = group.lines.length;
      return group.lines
        .map((item, index) => {
          const purposeCell =
            index === 0
              ? `<td class="col-purpose" rowspan="${rowspan}">${escapeHtml(group.purpose)}</td>`
              : "";
          return buildItemCellsHtml(item, lot, purposeCell);
        })
        .join("");
    })
    .join("");

  const qtyTotal = allLines.reduce((s, i) => s + i.quantity, 0);
  const costTotal = allLines.reduce(
    (s, i) => s + (parseFloat(i.totalCost) || 0),
    0
  );

  const footer = `<tr>
        <td colspan="6" class="nothing-follows">*** NOTHING FOLLOWS ***</td>
      </tr>
      <tr style="border-top: 2px solid #222; font-weight: bold;">
        <td class="col-qty">${qtyTotal}</td>
        <td class="col-desc" style="text-align: right; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Grand Total</td>
        <td class="col-purpose"></td>
        <td class="col-dealer"></td>
        <td class="col-unit-price"></td>
        <td class="col-estimated" style="font-size: 13px;">₱${formatMoney(costTotal)}</td>
      </tr>`;

  // Pad a few empty rows for single-line slips (print form aesthetics)
  const pad =
    allLines.length < 3
      ? Array.from({ length: 3 - allLines.length })
          .map(
            () =>
              `<tr class="empty-row"><td></td><td></td><td></td><td></td><td></td><td></td></tr>`
          )
          .join("")
      : "";

  return body + footer + pad;
}

export function buildPoSlipStyles(): string {
  return `
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
      background: #fff;
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
    .col-qty { width: 8%; text-align: center; font-weight: bold; }
    .col-desc { width: 28%; }
    .col-purpose {
      width: 18%;
      font-size: 10.5px;
      color: #222;
      line-height: 1.35;
      vertical-align: middle;
      text-align: left;
    }
    .col-dealer { width: 18%; }
    .col-unit-price { width: 14%; text-align: right; font-family: Arial, Helvetica, sans-serif; padding-left: 12px; }
    .col-estimated {
      width: 16%;
      text-align: right;
      font-family: Arial, Helvetica, sans-serif;
      font-weight: bold;
      padding-left: 16px;
      white-space: nowrap;
    }
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
    .purpose-card .purpose-lines {
      margin-top: 4px;
      font-size: 10px;
      color: #555;
      font-style: italic;
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
  `;
}

export function buildPoSlipBodyHtml(data: PoSlipRenderData): string {
  const { lot, requestedBy, requestedByTitle, poDate, poTimestamp, displayDealer, displayLotCode, logoUrl } =
    data;
  const effectiveRequestedBy =
    requestedBy.trim() || lot.recordedByName || "Authorized Staff";

  return `
    <div class="po-document">
      <div class="header-container">
        <div class="letterhead">
          <img src="${logoUrl}" alt="CRMC Logo" class="college-logo-img" />
          <div class="college-titles">
            <h1>Cebu Roosevelt Memorial Colleges, Inc.</h1>
            <p>Upper Pandan, Bogo City, Cebu, Philippines</p>
          </div>
        </div>

        <div class="po-title-banner">
          <span class="po-title">Purchase Order</span>
        </div>

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
            <th class="col-purpose">Purpose</th>
            <th class="col-dealer">Suggested Dealer</th>
            <th class="col-unit-price">Unit Price</th>
            <th class="col-estimated">Estimated</th>
          </tr>
        </thead>
        <tbody>
          ${buildLineItemsRows(lot)}
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
  `;
}

export function buildPoSlipFullHtml(data: PoSlipRenderData): string {
  const title = `CRMC Purchase Order - ${data.lot.poNumber || data.lot.lotCode}`;
  return `<!DOCTYPE html>
<html>
  <head>
    <title>${title}</title>
    <style>${buildPoSlipStyles()}</style>
  </head>
  <body>
    ${buildPoSlipBodyHtml(data)}
  </body>
</html>`;
}

function waitForImages(root: ParentNode): Promise<void> {
  const images = Array.from(root.querySelectorAll("img"));
  if (images.length === 0) return Promise.resolve();

  return Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) {
            resolve();
            return;
          }
          img.onload = () => resolve();
          img.onerror = () => resolve();
        }),
    ),
  ).then(() => undefined);
}

export async function downloadPoSlipPdf(
  data: PoSlipRenderData,
  filename: string,
): Promise<void> {
  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.style.cssText =
    "position:fixed;left:-10000px;top:0;width:794px;background:#fff;z-index:-1;pointer-events:none;";
  host.innerHTML = `<style>${buildPoSlipStyles()}</style>${buildPoSlipBodyHtml(data)}`;
  document.body.appendChild(host);

  try {
    await waitForImages(host);

    const documentEl = host.querySelector(".po-document") as HTMLElement | null;
    if (!documentEl) {
      throw new Error("Unable to render purchase order slip.");
    }

    const canvas = await html2canvas(documentEl, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      logging: false,
    });

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 8;
    const usableWidth = pageWidth - margin * 2;
    const usableHeight = pageHeight - margin * 2;
    const imgWidth = usableWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    const imgData = canvas.toDataURL("image/png");

    if (imgHeight <= usableHeight) {
      pdf.addImage(imgData, "PNG", margin, margin, imgWidth, imgHeight);
    } else {
      let heightLeft = imgHeight;
      let position = margin;

      pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight);
      heightLeft -= usableHeight;

      while (heightLeft > 0) {
        position = margin - (imgHeight - heightLeft);
        pdf.addPage();
        pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight);
        heightLeft -= usableHeight;
      }
    }

    pdf.save(filename);
  } finally {
    if (document.body.contains(host)) {
      document.body.removeChild(host);
    }
  }
}
