import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import type { Voucher } from "@/types/vouchers";
import type { PettyCashVoucher } from "@/types/petty-cash";
import { PETTY_CASH_CATEGORIES } from "@/types/petty-cash";
import {
  parseParticulars,
  particularLineAmount,
} from "@/lib/voucher-particulars";

const CUSTODIAN_NAME = "JACINTO ANTONIO R. LEPITEN JR.";
const CUSTODIAN_TITLE = "Head Property Custodian";

export interface DisbursementSlipLine {
  quantity: string;
  description: string;
  unitCost: string;
  amount: number;
}

export interface DisbursementSlipData {
  kind: "voucher" | "petty_cash";
  documentTitle: string;
  code: string;
  statusLabel: string;
  dateLabel: string;
  payeeName: string;
  departmentLabel: string;
  supplierName: string;
  purchaseOrderNumber: string | null;
  extraLabel: string | null;
  extraValue: string | null;
  categoryLabel: string | null;
  purpose: string;
  lines: DisbursementSlipLine[];
  amount: number;
  amountWords: string;
  preparedBy: string;
  receivedBy: string;
  approvedBy: string;
  approvedByTitle: string;
  logoUrl: string;
  printedAt: string;
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

const BELOW_TWENTY = [
  "Zero",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];

const TENS = [
  "",
  "",
  "Twenty",
  "Thirty",
  "Forty",
  "Fifty",
  "Sixty",
  "Seventy",
  "Eighty",
  "Ninety",
];

function chunkToWords(n: number): string {
  if (n < 20) return BELOW_TWENTY[n];
  if (n < 100) {
    const tens = Math.floor(n / 10);
    const rest = n % 10;
    return rest ? `${TENS[tens]}-${BELOW_TWENTY[rest]}` : TENS[tens];
  }
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  const head = `${BELOW_TWENTY[hundreds]} Hundred`;
  return rest ? `${head} ${chunkToWords(rest)}` : head;
}

function integerToWords(n: number): string {
  if (n === 0) return "Zero";
  const millions = Math.floor(n / 1_000_000);
  const thousands = Math.floor((n % 1_000_000) / 1000);
  const rest = n % 1000;
  const parts: string[] = [];
  if (millions) parts.push(`${chunkToWords(millions)} Million`);
  if (thousands) parts.push(`${chunkToWords(thousands)} Thousand`);
  if (rest) parts.push(chunkToWords(rest));
  return parts.join(" ");
}

export function pesosInWords(amount: number): string {
  const centsTotal = Number.isFinite(amount) ? Math.round(Math.max(0, amount) * 100) : 0;
  const pesos = Math.floor(centsTotal / 100);
  const centavos = centsTotal % 100;
  return `${integerToWords(pesos)} Pesos and ${String(centavos).padStart(2, "0")}/100`;
}

function statusLabel(status: string): string {
  switch (status) {
    case "pending_approval":
      return "Pending Approval";
    case "approved":
      return "Approved";
    case "disbursed":
      return "Disbursed";
    case "completed":
      return "Closed";
    case "cancelled":
      return "Cancelled";
    case "draft":
      return "Draft";
    default:
      return status;
  }
}

function formatSlipDate(dateStr: string): string {
  const normalized = dateStr.includes("T") ? dateStr : `${dateStr}T00:00:00`;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function departmentLabel(record: {
  departments?: Array<{ name: string }>;
  departmentName: string | null;
}): string {
  const names = (record.departments ?? [])
    .map((department) => department.name.trim())
    .filter(Boolean);
  if (names.length > 0) return names.join(", ");
  return record.departmentName?.trim() || "—";
}

function approvedBlock(
  status: string,
  approvedByName: string | null
): { name: string; title: string } {
  if (approvedByName?.trim()) {
    return { name: approvedByName.trim(), title: "Approving Officer" };
  }
  if (status === "approved" || status === "disbursed" || status === "completed") {
    return { name: CUSTODIAN_NAME, title: CUSTODIAN_TITLE };
  }
  return { name: "", title: "Approving Officer" };
}

function slipLines(
  particulars: string,
  purpose: string,
  amount: number
): DisbursementSlipLine[] {
  const items = parseParticulars(particulars);
  if (items.length === 0) {
    return [
      {
        quantity: "1",
        description: purpose.trim() || "Disbursement",
        unitCost: amount ? amount.toFixed(2) : "",
        amount,
      },
    ];
  }

  return items.map((item) => ({
    quantity: item.quantity.trim() || "—",
    description: item.description,
    unitCost: item.unitCost.trim(),
    amount: particularLineAmount(item),
  }));
}

function voucherTitle(type: Voucher["type"]): string {
  switch (type) {
    case "property_transfer":
      return "Property Transfer Voucher";
    case "liquidation":
      return "Liquidation Receipt";
    default:
      return "Disbursement Voucher";
  }
}

function categoryLabel(category: string): string {
  return (
    PETTY_CASH_CATEGORIES.find((entry) => entry.id === category)?.label ??
    category
  );
}

function printedStamp(): string {
  return new Date().toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function voucherToSlip(voucher: Voucher, logoUrl: string): DisbursementSlipData {
  const amount = Number(voucher.amount) || 0;
  const approved = approvedBlock(voucher.status, voucher.approvedByName);
  return {
    kind: "voucher",
    documentTitle: voucherTitle(voucher.type),
    code: voucher.voucherCode,
    statusLabel: statusLabel(voucher.status),
    dateLabel: formatSlipDate(voucher.voucherDate),
    payeeName: voucher.payeeName,
    departmentLabel: departmentLabel(voucher),
    supplierName: voucher.supplierName?.trim() || "Direct Payee",
    purchaseOrderNumber: voucher.purchaseOrderNumber,
    extraLabel: voucher.checkNumber ? "Check No." : null,
    extraValue: voucher.checkNumber,
    categoryLabel: null,
    purpose: voucher.purpose?.trim() || "—",
    lines: slipLines(voucher.particulars, voucher.purpose, amount),
    amount,
    amountWords: pesosInWords(amount),
    preparedBy: voucher.createdByName?.trim() || "Authorized Staff",
    receivedBy: voucher.payeeName,
    approvedBy: approved.name,
    approvedByTitle: approved.title,
    logoUrl,
    printedAt: printedStamp(),
  };
}

export function pettyCashToSlip(
  voucher: PettyCashVoucher,
  logoUrl: string
): DisbursementSlipData {
  const amount = Number(voucher.amount) || 0;
  const approved = approvedBlock(voucher.status, voucher.approvedByName);
  return {
    kind: "petty_cash",
    documentTitle: "Petty Cash Voucher",
    code: voucher.pcvNumber,
    statusLabel: statusLabel(voucher.status),
    dateLabel: formatSlipDate(voucher.voucherDate),
    payeeName: voucher.payeeName,
    departmentLabel: departmentLabel(voucher),
    supplierName: voucher.supplierName?.trim() || "Direct Payee",
    purchaseOrderNumber: voucher.purchaseOrderNumber,
    extraLabel: voucher.receiptNumber ? "Receipt No." : null,
    extraValue: voucher.receiptNumber,
    categoryLabel: categoryLabel(voucher.category),
    purpose: voucher.purpose?.trim() || "—",
    lines: slipLines(voucher.particulars, voucher.purpose, amount),
    amount,
    amountWords: pesosInWords(amount),
    preparedBy: voucher.createdByName?.trim() || "Authorized Staff",
    receivedBy: voucher.payeeName,
    approvedBy: approved.name,
    approvedByTitle: approved.title,
    logoUrl,
    printedAt: printedStamp(),
  };
}

function buildLineRows(data: DisbursementSlipData): string {
  const body = data.lines
    .map((line) => {
      const unit = line.unitCost
        ? `₱${formatMoney(Number(line.unitCost) || 0)}`
        : "—";
      return `<tr>
        <td class="col-qty">${escapeHtml(line.quantity)}</td>
        <td class="col-desc">${escapeHtml(line.description)}</td>
        <td class="col-unit">${unit}</td>
        <td class="col-amount">₱${formatMoney(line.amount)}</td>
      </tr>`;
    })
    .join("");

  const padCount = Math.max(0, 4 - data.lines.length);
  const pad = Array.from({ length: padCount })
    .map(
      () =>
        `<tr class="empty-row"><td></td><td></td><td></td><td></td></tr>`
    )
    .join("");

  const footer = `<tr>
      <td colspan="4" class="nothing-follows">*** NOTHING FOLLOWS ***</td>
    </tr>
    <tr class="total-row">
      <td colspan="3" class="total-label">Amount Disbursed</td>
      <td class="col-amount">₱${formatMoney(data.amount)}</td>
    </tr>`;

  return body + pad + footer;
}

export function buildDisbursementSlipStyles(): string {
  return `
    @page { size: portrait; margin: 8mm 10mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body, table, th, td, h1, h2, p, div, span, strong {
      font-family: Arial, Helvetica, sans-serif;
    }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      color: #111;
      background: #fff !important;
    }
    .dv-document {
      width: 100%;
      border: 1.5px solid #222;
      padding: 16px 20px 18px;
      background: #fff;
    }
    .letterhead {
      display: flex;
      align-items: center;
      gap: 12px;
      padding-bottom: 10px;
      border-bottom: 1.5px solid #222;
    }
    .college-logo-img { width: 64px; height: 64px; object-fit: contain; }
    .college-titles h1 {
      font-size: 14px;
      font-weight: 800;
      margin: 0;
      letter-spacing: 0.4px;
      text-transform: uppercase;
      line-height: 1.25;
    }
    .college-titles p { margin: 2px 0 0; font-size: 11px; color: #444; }
    .title-banner { text-align: center; margin: 10px 0 12px; }
    .doc-title {
      display: inline-block;
      font-size: 15px;
      font-weight: 900;
      letter-spacing: 1.6px;
      text-transform: uppercase;
      border-bottom: 2px solid #111;
      padding-bottom: 2px;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: 1.2fr 0.8fr;
      gap: 8px 18px;
      font-size: 11.5px;
      margin-bottom: 12px;
    }
    .meta-item { line-height: 1.45; }
    .meta-label { color: #444; }
    .code-highlight {
      display: inline-block;
      font-weight: 900;
      font-size: 13px;
      background: #f0f0f0;
      border: 1.5px solid #222;
      padding: 2px 8px;
      letter-spacing: 0.4px;
    }
    .purpose-card, .words-card {
      border: 1.5px solid #222;
      padding: 8px 12px;
      margin-bottom: 10px;
      font-size: 12px;
    }
    .purpose-card .label, .words-card .label {
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.4px;
      text-transform: uppercase;
      color: #333;
      margin-bottom: 3px;
    }
    table { width: 100%; border-collapse: collapse; margin: 4px 0 12px; font-size: 12px; }
    th, td { border: 1.5px solid #222; padding: 8px; text-align: left; vertical-align: top; }
    th {
      font-weight: 800;
      text-align: center;
      background: #fafafa;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .col-qty { width: 10%; text-align: center; font-weight: 700; }
    .col-desc { width: 50%; }
    .col-unit { width: 18%; text-align: right; white-space: nowrap; }
    .col-amount { width: 22%; text-align: right; font-weight: 700; white-space: nowrap; }
    .nothing-follows {
      text-align: center;
      font-weight: 700;
      font-style: italic;
      letter-spacing: 1.5px;
      color: #444;
      background: #fafafa;
      font-size: 11px;
    }
    .empty-row td { height: 26px; }
    .total-row td { border-top: 2px solid #111; font-weight: 800; }
    .total-label { text-align: right; text-transform: uppercase; letter-spacing: 0.4px; font-size: 11px; }
    .signatures {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 16px;
      margin-top: 22px;
      font-size: 11.5px;
    }
    .sig-label { font-weight: 700; margin-bottom: 28px; }
    .sig-line {
      border-bottom: 1.5px solid #222;
      min-height: 22px;
      text-align: center;
      font-weight: 700;
      padding-bottom: 2px;
    }
    .sig-title { text-align: center; color: #444; font-size: 10.5px; margin-top: 4px; }
    .slip-footer {
      margin-top: 14px;
      font-size: 9.5px;
      color: #666;
      display: flex;
      justify-content: space-between;
    }
    @media print {
      html, body { background: #fff !important; }
      .dv-document { page-break-inside: avoid; }
    }
  `;
}

export function buildDisbursementSlipBodyHtml(data: DisbursementSlipData): string {
  const poLine = data.purchaseOrderNumber
    ? `<div class="meta-item"><span class="meta-label">Purchase Order:</span> <strong>${escapeHtml(data.purchaseOrderNumber)}</strong></div>`
    : "";
  const extraLine =
    data.extraLabel && data.extraValue
      ? `<div class="meta-item"><span class="meta-label">${escapeHtml(data.extraLabel)}</span> <strong>${escapeHtml(data.extraValue)}</strong></div>`
      : "";
  const categoryLine = data.categoryLabel
    ? `<div class="meta-item"><span class="meta-label">Category:</span> <strong>${escapeHtml(data.categoryLabel)}</strong></div>`
    : "";

  return `
    <div class="dv-document">
      <div class="letterhead">
        <img src="${escapeHtml(data.logoUrl)}" alt="CRMC Logo" class="college-logo-img" />
        <div class="college-titles">
          <h1>Cebu Roosevelt Memorial Colleges, Inc.</h1>
          <p>Upper Pandan, Bogo City, Cebu, Philippines</p>
        </div>
      </div>
      <div class="title-banner">
        <span class="doc-title">${escapeHtml(data.documentTitle)}</span>
      </div>
      <div class="meta-grid">
        <div>
          <div class="meta-item">
            <span class="meta-label">${data.kind === "petty_cash" ? "PCV No." : "DV No."}</span>
            <span class="code-highlight">${escapeHtml(data.code)}</span>
          </div>
          <div class="meta-item"><span class="meta-label">Payee:</span> <strong>${escapeHtml(data.payeeName)}</strong></div>
          <div class="meta-item"><span class="meta-label">Charge to:</span> <strong>${escapeHtml(data.departmentLabel)}</strong></div>
          <div class="meta-item"><span class="meta-label">Supplier:</span> <strong>${escapeHtml(data.supplierName)}</strong></div>
          ${categoryLine}
        </div>
        <div>
          <div class="meta-item"><span class="meta-label">Date:</span> <strong>${escapeHtml(data.dateLabel)}</strong></div>
          <div class="meta-item"><span class="meta-label">Status:</span> <strong>${escapeHtml(data.statusLabel)}</strong></div>
          ${poLine}
          ${extraLine}
        </div>
      </div>
      <div class="purpose-card">
        <div class="label">Purpose</div>
        <div>${escapeHtml(data.purpose)}</div>
      </div>
      <table>
        <thead>
          <tr>
            <th class="col-qty">Qty</th>
            <th class="col-desc">Particulars</th>
            <th class="col-unit">Unit Cost</th>
            <th class="col-amount">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${buildLineRows(data)}
        </tbody>
      </table>
      <div class="words-card">
        <div class="label">Amount in words</div>
        <div><strong>${escapeHtml(data.amountWords)}</strong></div>
      </div>
      <div class="signatures">
        <div>
          <div class="sig-label">Prepared by:</div>
          <div class="sig-line">${escapeHtml(data.preparedBy)}</div>
          <div class="sig-title">Requesting Staff</div>
        </div>
        <div>
          <div class="sig-label">Received by:</div>
          <div class="sig-line">${escapeHtml(data.receivedBy)}</div>
          <div class="sig-title">Payee</div>
        </div>
        <div>
          <div class="sig-label">Approved by:</div>
          <div class="sig-line">${escapeHtml(data.approvedBy) || "&nbsp;"}</div>
          <div class="sig-title">${escapeHtml(data.approvedByTitle)}</div>
        </div>
      </div>
      <div class="slip-footer">
        <span>CRMC Property Custodian · Cash disbursement slip</span>
        <span>Printed ${escapeHtml(data.printedAt)}</span>
      </div>
    </div>
  `;
}

export function buildDisbursementSlipFullHtml(data: DisbursementSlipData): string {
  const title = `${data.documentTitle} - ${data.code}`;
  return `<!DOCTYPE html>
<html>
  <head>
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

export function disbursementSlipFilename(data: DisbursementSlipData): string {
  const prefix = data.kind === "petty_cash" ? "PCV" : "DV";
  const safeName = data.code.replace(/[\\/:*?"<>|]+/g, "-");
  return `${prefix}-${safeName}.pdf`;
}
