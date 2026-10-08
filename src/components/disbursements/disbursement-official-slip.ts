import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import type { Voucher } from "@/types/vouchers";
import type { PettyCashVoucher } from "@/types/petty-cash";
import type { ParticularLineItem } from "@/lib/voucher-particulars";
import {
  parseParticulars,
  particularLineAmount,
} from "@/lib/voucher-particulars";

/** Ruled item rows on the official form, including filled lines (tuned for 50% paper half-sheet). */
const RULED_ROWS = 6;

export interface DisbursementSlipLine {
  quantity: string;
  unitCost: string;
  description: string;
  dealer: string;
  purpose: string;
  amount: number;
}

export interface DisbursementSlipData {
  kind: "voucher" | "petty_cash";
  documentTitle: string;
  code: string;
  dateLabel: string;
  /** Check / reference no. (voucher) or receipt / slip no. (petty cash). */
  serviceInvoiceNumber: string;
  lines: DisbursementSlipLine[];
  amount: number;
  requestedBy: string;
  verifiedBy: string;
  preparedBy: string;
  logoUrl: string;
}

/** Check / reference no. as entered. Empty string = omit the Service Invoice line. */
function serviceInvoiceLabel(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatMoney(value: number): string {
  return value.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatSlipDate(dateStr: string | null | undefined): string {
  if (!dateStr?.trim()) return "";
  const normalized = dateStr.includes("T") ? dateStr : `${dateStr}T00:00:00`;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return dateStr;
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${month}/${day}/${date.getFullYear()}`;
}

/** Strip legacy “@ 15.00” suffixes now that unit cost has its own column. */
function plainDescription(item: ParticularLineItem): string {
  return item.description
    .trim()
    .replace(/\s*@\s*(?:₱|PHP\s*)?[\d,]+(?:\.\d{1,2})?\s*$/i, "")
    .trim();
}

function formatUnitCost(item: ParticularLineItem): string {
  const raw = item.unitCost.trim().replace(/,/g, "");
  if (!raw) return "—";
  const unit = Number(raw);
  if (!Number.isFinite(unit) || unit < 0) return "—";
  return formatMoney(unit);
}

function slipLines(
  particulars: string,
  purpose: string,
  dealer: string,
  amount: number
): DisbursementSlipLine[] {
  const suggestedDealer = dealer.trim();
  const headerPurpose = purpose.trim();
  const items = parseParticulars(particulars);
  if (items.length === 0) {
    return [
      {
        quantity: "1",
        unitCost: "—",
        description: headerPurpose || "Disbursement",
        dealer: suggestedDealer,
        purpose: headerPurpose,
        amount,
      },
    ];
  }

  return items.map((item) => {
    const qty = item.quantity.trim();
    const uom = item.unitOfMeasure?.trim() ?? "";
    const quantityLabel = [qty || "—", uom].filter(Boolean).join(" ");
    return {
      quantity: quantityLabel,
      unitCost: formatUnitCost(item),
      description: plainDescription(item) || item.description.trim(),
      dealer: suggestedDealer,
      purpose: item.purpose?.trim() || headerPurpose,
      amount: particularLineAmount(item),
    };
  });
}

function voucherTitle(type: Voucher["type"]): string {
  switch (type) {
    case "property_transfer":
      return "Property Transfer Voucher";
    case "liquidation":
      return "Liquidation Receipt";
    default:
      return "Disbursement Voucher Records";
  }
}

export function voucherToSlip(voucher: Voucher, logoUrl: string): DisbursementSlipData {
  const amount = Number(voucher.amount) || 0;
  const purpose = voucher.purpose?.trim() || "";
  const dealer = voucher.supplierName?.trim() || "";
  return {
    kind: "voucher",
    documentTitle: voucherTitle(voucher.type),
    code: voucher.voucherCode,
    dateLabel: formatSlipDate(voucher.voucherDate),
    serviceInvoiceNumber: serviceInvoiceLabel(voucher.checkNumber),
    lines: slipLines(voucher.particulars, purpose, dealer, amount),
    amount,
    requestedBy: voucher.payeeName?.trim() || "",
    verifiedBy: voucher.approvedByName?.trim() || "",
    preparedBy: voucher.createdByName?.trim() || "",
    logoUrl,
  };
}

export function pettyCashToSlip(
  voucher: PettyCashVoucher,
  logoUrl: string
): DisbursementSlipData {
  const amount = Number(voucher.amount) || 0;
  const purpose = voucher.purpose?.trim() || "";
  const dealer = voucher.supplierName?.trim() || "";
  return {
    kind: "petty_cash",
    documentTitle: "Disbursement Voucher Records",
    code: voucher.pcvNumber,
    dateLabel: formatSlipDate(voucher.voucherDate),
    serviceInvoiceNumber: serviceInvoiceLabel(voucher.receiptNumber),
    lines: slipLines(voucher.particulars, purpose, dealer, amount),
    amount,
    requestedBy: voucher.payeeName?.trim() || "",
    verifiedBy: voucher.approvedByName?.trim() || "",
    preparedBy: voucher.createdByName?.trim() || "",
    logoUrl,
  };
}

function runSpanStarts(
  lines: DisbursementSlipLine[],
  valueOf: (line: DisbursementSlipLine) => string
): number[] {
  const spans = new Array<number>(lines.length).fill(0);
  let index = 0;
  while (index < lines.length) {
    const key = valueOf(lines[index]).trim().toLowerCase();
    let end = index + 1;
    while (end < lines.length && valueOf(lines[end]).trim().toLowerCase() === key) {
      end += 1;
    }
    spans[index] = end - index;
    index = end;
  }
  return spans;
}

function buildLineRows(data: DisbursementSlipData): string {
  const dealerSpans = runSpanStarts(data.lines, (line) => line.dealer);
  const purposeSpans = runSpanStarts(data.lines, (line) => line.purpose);
  const body = data.lines
    .map((line, index) => {
      const dealerSpan = dealerSpans[index];
      const purposeSpan = purposeSpans[index];
      const dealerCell =
        dealerSpan > 0
          ? `<td class="col-dealer" rowspan="${dealerSpan}">${escapeHtml(line.dealer) || "&nbsp;"}</td>`
          : "";
      const purposeCell =
        purposeSpan > 0
          ? `<td class="col-purpose" rowspan="${purposeSpan}">${escapeHtml(line.purpose) || "&nbsp;"}</td>`
          : "";
      return `<tr class="item-row">
        <td class="col-qty">${escapeHtml(line.quantity)}</td>
        <td class="col-unit">${escapeHtml(line.unitCost)}</td>
        <td class="col-desc">${escapeHtml(line.description)}</td>
        ${dealerCell}
        ${purposeCell}
        <td class="col-amount">${line.amount === 0 ? "" : formatMoney(line.amount)}</td>
      </tr>`;
    })
    .join("");

  const nothingFollows = `<tr class="nothing-row">
      <td colspan="6" class="nothing-follows">*** NOTHING FOLLOWS ***</td>
    </tr>`;

  const padCount = Math.max(0, RULED_ROWS - data.lines.length);
  const pad = Array.from({ length: padCount })
    .map(
      () =>
        `<tr class="empty-row"><td></td><td></td><td></td><td></td><td></td><td></td></tr>`
    )
    .join("");

  const serviceInvoiceBar = data.serviceInvoiceNumber
    ? `<div class="forwarded-bar">
          <strong>${escapeHtml(data.serviceInvoiceNumber)}</strong>
        </div>`
    : "";

  const footer = `<tr class="total-row">
      <td colspan="4"></td>
      <td class="total-label">Total:</td>
      <td class="col-amount">${formatMoney(data.amount)}</td>
    </tr>
    <tr class="sign-row">
      <td colspan="6" class="sign-cell">
        <div class="signatories-row">
          <div class="sign-block">
            <span class="sign-label">Requested by:</span>
            <input class="sign-space" data-slip-field="requestedBy" value="${escapeHtml(data.requestedBy)}" aria-label="Payee" autocomplete="off" />
            <span class="sign-title">Payee</span>
          </div>
          <div class="sign-block">
            <span class="sign-label">Verified by:</span>
            <input class="sign-space" data-slip-field="verifiedBy" value="${escapeHtml(data.verifiedBy)}" aria-label="Property Custodian Staff" autocomplete="off" />
            <span class="sign-title">Property Custodian Staff</span>
          </div>
          <div class="sign-block">
            <span class="sign-label">Prepared by:</span>
            <input class="sign-space" data-slip-field="preparedBy" value="${escapeHtml(data.preparedBy)}" aria-label="Materials Control and Work Progress Staff" autocomplete="off" />
            <span class="sign-title">Materials Control and Work Progress Staff</span>
          </div>
        </div>
        ${serviceInvoiceBar}
      </td>
    </tr>`;

  return body + nothingFollows + pad + footer;
}

export function buildDisbursementSlipStyles(): string {
  return `
    @page { size: portrait; margin: 4mm 5mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body, table, th, td, h1, h2, p, div, span, strong, input {
      font-family: Arial, Helvetica, sans-serif;
    }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      color: #1f2937;
      background: #fff !important;
    }
    .dv-document {
      width: 100%;
      max-width: 100%;
      margin: 0;
      background: #fff;
      padding: 0;
      box-sizing: border-box;
    }
    .letterhead { margin-bottom: 6px; }
    .letterhead-top {
      display: grid;
      grid-template-columns: 64px 1fr 64px;
      align-items: center;
    }
    .logo-block { width: 64px; }
    .college-logo-img { width: 56px; height: 56px; object-fit: contain; display: block; }
    .college-titles {
      text-align: center;
    }
    .college-titles h1 {
      font-size: 14.5px;
      font-weight: 800;
      margin: 0;
      letter-spacing: 0.25px;
      text-transform: uppercase;
      line-height: 1.25;
    }
    .college-titles .city {
      margin: 2px 0 0;
      font-size: 11.5px;
      font-weight: 600;
      letter-spacing: 0.3px;
      text-transform: uppercase;
      color: #6b7280;
    }
    .title-banner {
      text-align: center;
      margin-top: 8px;
      margin-bottom: 8px;
    }
    .doc-title {
      display: inline-block;
      font-size: 15px;
      font-weight: 900;
      letter-spacing: 0.6px;
      text-transform: uppercase;
      line-height: 1.2;
    }
    .doc-meta {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-top: 4px;
      font-size: 11.5px;
      line-height: 1.3;
      color: #6b7280;
    }
    .doc-no {
      font-weight: 800;
      font-size: 13px;
      letter-spacing: 0.2px;
      color: #1f2937;
    }
    .request-line {
      margin: 0 0 6px;
      font-size: 11.5px;
      line-height: 1.3;
      color: #6b7280;
    }
    table { width: 100%; border-collapse: collapse; font-size: 11.5px; table-layout: fixed; }
    th, td {
      border: 1px solid #222;
      padding: 4px 6px;
      text-align: left;
      vertical-align: middle;
      line-height: 1.25;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }
    th,
    th.col-qty,
    th.col-unit,
    th.col-desc,
    th.col-dealer,
    th.col-purpose,
    th.col-amount {
      font-weight: 800;
      text-align: center;
      font-size: 11px;
      letter-spacing: 0.25px;
      text-transform: uppercase;
      color: #374151;
      padding: 6px 5px;
      line-height: 1.2;
      white-space: normal;
      overflow-wrap: normal;
    }
    .col-qty { width: 12%; text-align: center; font-weight: 700; white-space: nowrap; }
    .col-unit { width: 12%; text-align: right; font-weight: 700; white-space: nowrap; font-variant-numeric: tabular-nums; }
    .col-desc { width: 24%; }
    .col-dealer { width: 16%; vertical-align: middle; }
    .col-purpose { width: 20%; vertical-align: middle; }
    .col-amount { width: 16%; text-align: right; font-weight: 700; white-space: nowrap; overflow-wrap: normal; }
    .item-row td { height: 28px; }
    .empty-row td { height: 24px; }
    .nothing-follows {
      text-align: center;
      font-weight: 700;
      font-style: italic;
      letter-spacing: 1.1px;
      color: #9ca3af;
      font-size: 10.5px;
      padding: 4px 6px;
    }
    .total-row td { height: 28px; }
    .total-label {
      text-align: right;
      font-weight: 800;
      font-size: 12.5px;
    }
    .total-row .col-amount { font-size: 13px; }
    .sign-row td {
      height: 108px;
      padding: 10px 14px 8px;
    }
    .sign-cell {
      vertical-align: top;
    }
    .signatories-row {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      align-items: flex-start;
    }
    .sign-block {
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      min-height: 72px;
    }
    .sign-label {
      font-size: 10.5px;
      font-weight: 700;
      text-transform: uppercase;
      color: #4b5563;
      letter-spacing: 0.2px;
      margin-bottom: 18px;
    }
    .sign-space {
      width: 100%;
      min-height: 20px;
      border: none;
      border-bottom: 1px solid #222;
      border-radius: 0;
      background: transparent;
      color: #1f2937;
      font: inherit;
      font-weight: 700;
      text-transform: uppercase;
      text-align: center;
      padding: 0 4px 2px;
      font-size: 11.5px;
    }
    .sign-space:focus {
      outline: none;
      border-bottom-color: #2563eb;
    }
    .sign-title {
      margin-top: 4px;
      font-size: 10px;
      font-weight: 700;
      text-align: center;
      text-transform: uppercase;
      letter-spacing: 0.15px;
      color: #374151;
      line-height: 1.25;
    }
    .forwarded-bar {
      display: flex;
      justify-content: flex-end;
      margin-top: 10px;
      font-size: 10.5px;
      font-weight: 600;
      color: #6b7280;
    }
    .forwarded-bar strong {
      color: #1f2937;
      font-weight: 700;
      margin-left: 4px;
    }
    @media print {
      html, body {
        background: #fff !important;
        height: auto !important;
      }
      .dv-document {
        page-break-inside: avoid;
        max-height: 140mm;
      }
    }
  `;
}

export function buildDisbursementSlipBodyHtml(data: DisbursementSlipData): string {
  return `
    <div class="dv-document">
      <div class="letterhead">
        <div class="letterhead-top">
          <div class="logo-block">
            <img src="${escapeHtml(data.logoUrl)}" alt="CRMC Logo" class="college-logo-img" />
          </div>
          <div class="college-titles">
            <h1>Cebu Roosevelt Memorial Colleges, Inc.</h1>
            <p class="city">Bogo City, Cebu</p>
          </div>
        </div>
        <div class="title-banner">
          <div class="doc-title">${escapeHtml(data.documentTitle)}</div>
        </div>
        <div class="doc-meta">
          <div class="doc-no">${escapeHtml(data.code)}</div>
          <div class="doc-date">Date <strong>${escapeHtml(data.dateLabel)}</strong></div>
        </div>
      </div>
      <p class="request-line">May we request for the purchase/order placement of the following:</p>
      <table>
        <thead>
          <tr>
            <th class="col-qty">Qty / UoM</th>
            <th class="col-unit">Unit Cost</th>
            <th class="col-desc">Description</th>
            <th class="col-dealer">Suggested Dealer</th>
            <th class="col-purpose">Purpose</th>
            <th class="col-amount">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${buildLineRows(data)}
        </tbody>
      </table>
    </div>
    <script>
      (function () {
        var timer = null;
        function send(input) {
          parent.postMessage({
            source: "crmc-disbursement-slip",
            field: input.getAttribute("data-slip-field"),
            value: input.value
          }, "*");
        }
        document.querySelectorAll("[data-slip-field]").forEach(function (input) {
          input.addEventListener("input", function () {
            if (timer) clearTimeout(timer);
            timer = setTimeout(function () { send(input); }, 600);
          });
          input.addEventListener("blur", function () {
            if (timer) clearTimeout(timer);
            send(input);
          });
        });
      })();
    </script>
  `;
}

export function buildDisbursementSlipFullHtml(data: DisbursementSlipData): string {
  const title = `${data.documentTitle} - ${data.code}`;
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
    <style>${buildDisbursementSlipStyles()}</style>
  </head>
  <body>
    ${buildDisbursementSlipBodyHtml(data)}
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
        })
    )
  ).then(() => undefined);
}

export async function downloadDisbursementSlipPdf(
  data: DisbursementSlipData,
  filename: string
): Promise<void> {
  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.style.cssText =
    "position:fixed;left:-10000px;top:0;width:794px;background:#fff;z-index:-1;pointer-events:none;";
  host.innerHTML = `<style>${buildDisbursementSlipStyles()}</style>${buildDisbursementSlipBodyHtml(data)}`;
  document.body.appendChild(host);

  try {
    await waitForImages(host);
    const documentEl = host.querySelector(".dv-document") as HTMLElement | null;
    if (!documentEl) {
      throw new Error("Unable to render disbursement slip.");
    }

    const canvas = await html2canvas(documentEl, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      logging: false,
    });

    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 3;
    const usableWidth = pageWidth - margin * 2;
    const usableHeight = pageHeight - margin * 3;
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

export function disbursementSlipFilename(data: DisbursementSlipData): string {
  const prefix = data.kind === "petty_cash" ? "PCV" : "DV";
  const safeName = data.code.replace(/[\\/:*?"<>|]+/g, "-");
  return `${prefix}-${safeName}.pdf`;
}
