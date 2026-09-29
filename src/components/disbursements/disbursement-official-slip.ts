import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import type { Voucher } from "@/types/vouchers";
import type { PettyCashVoucher } from "@/types/petty-cash";
import type { ParticularLineItem } from "@/lib/voucher-particulars";
import {
  parseParticulars,
  particularLineAmount,
} from "@/lib/voucher-particulars";

/** Ruled item rows on the official form, including filled lines. */
const RULED_ROWS = 6;

export interface DisbursementSlipLine {
  quantity: string;
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
  forwardedDateLabel: string;
  lines: DisbursementSlipLine[];
  amount: number;
  requestedBy: string;
  verifiedBy: string;
  logoUrl: string;
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

function descriptionWithRate(item: ParticularLineItem): string {
  const description = item.description.trim();
  const unitRaw = item.unitCost.trim().replace(/,/g, "");
  if (!unitRaw || /@/.test(description)) return description;
  const unit = Number(unitRaw);
  if (!Number.isFinite(unit)) return description;
  return `${description} @ ${formatMoney(unit)}`;
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
        description: headerPurpose || "Disbursement",
        dealer: suggestedDealer,
        purpose: headerPurpose,
        amount,
      },
    ];
  }

  return items.map((item) => {
    const qty = item.quantity.trim() || "—";
    const uom = item.unitOfMeasure?.trim() ?? "";
    return {
      quantity: uom && qty !== "—" ? `${qty} ${uom}` : qty,
      description: descriptionWithRate(item),
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
    forwardedDateLabel: formatSlipDate(voucher.approvedAt),
    lines: slipLines(voucher.particulars, purpose, dealer, amount),
    amount,
    requestedBy: voucher.payeeName?.trim() || "",
    verifiedBy: voucher.approvedByName?.trim() || "",
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
    forwardedDateLabel: formatSlipDate(voucher.approvedAt),
    lines: slipLines(voucher.particulars, purpose, dealer, amount),
    amount,
    requestedBy: voucher.payeeName?.trim() || "",
    verifiedBy: voucher.approvedByName?.trim() || "",
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
        <td class="col-desc">${escapeHtml(line.description)}</td>
        ${dealerCell}
        ${purposeCell}
        <td class="col-amount">${formatMoney(line.amount)}</td>
      </tr>`;
    })
    .join("");

  const nothingFollows = `<tr class="nothing-row">
      <td colspan="5" class="nothing-follows">*** NOTHING FOLLOWS ***</td>
    </tr>`;

  const padCount = Math.max(0, RULED_ROWS - data.lines.length);
  const pad = Array.from({ length: padCount })
    .map(
      () =>
        `<tr class="empty-row"><td></td><td></td><td></td><td></td><td></td></tr>`
    )
    .join("");

  const forwarded = data.forwardedDateLabel
    ? escapeHtml(data.forwardedDateLabel)
    : "&nbsp;";

  const footer = `<tr class="total-row">
      <td colspan="3"></td>
      <td class="total-label">Total:</td>
      <td class="col-amount">${formatMoney(data.amount)}</td>
    </tr>
    <tr class="sign-row">
      <td colspan="3" class="sign-cell">
        <div class="sign-line">
          <span class="sign-label">Requested by:</span>
          <input class="sign-space" data-slip-field="requestedBy" value="${escapeHtml(data.requestedBy)}" aria-label="Requested by" autocomplete="off" />
        </div>
        <div class="sign-line">
          <span class="sign-label">Verified by:</span>
          <input class="sign-space" data-slip-field="verifiedBy" value="${escapeHtml(data.verifiedBy)}" aria-label="Verified by" autocomplete="off" />
        </div>
      </td>
      <td colspan="2" class="forwarded">Date Forwarded for Voucher: <strong>${forwarded}</strong></td>
    </tr>`;

  return body + nothingFollows + pad + footer;
}

export function buildDisbursementSlipStyles(): string {
  return `
    @page { size: portrait; margin: 6mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body, table, th, td, h1, h2, p, div, span, strong {
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
      margin: 0;
      background: #fff;
      padding: 0;
    }
    .letterhead { margin-bottom: 8px; }
    .letterhead-top {
      display: grid;
      grid-template-columns: 96px 1fr 96px;
      align-items: center;
    }
    .logo-block { width: 96px; }
    .college-logo-img { width: 80px; height: 80px; object-fit: contain; display: block; }
    .college-titles {
      text-align: center;
    }
    .college-titles h1 {
      font-size: 16px;
      font-weight: 800;
      margin: 0;
      letter-spacing: 0.2px;
      text-transform: uppercase;
      line-height: 1.25;
    }
    .college-titles .city {
      margin: 4px 0 0;
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 0.4px;
      text-transform: uppercase;
      color: #6b7280;
    }
    .title-banner {
      text-align: center;
      margin-top: 14px;
      margin-bottom: 14px;
    }
    .doc-title {
      display: inline-block;
      font-size: 18px;
      font-weight: 900;
      letter-spacing: 0.6px;
      text-transform: uppercase;
      line-height: 1.2;
    }
    .doc-meta {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-top: 8px;
      font-size: 13px;
      line-height: 1.35;
      color: #6b7280;
    }
    .doc-no {
      font-weight: 800;
      font-size: 14px;
      letter-spacing: 0.2px;
      color: #1f2937;
    }
    .request-line {
      margin: 0 0 8px;
      font-size: 13px;
      line-height: 1.35;
      color: #6b7280;
    }
    table { width: 100%; border-collapse: collapse; font-size: 14px; table-layout: fixed; }
    th, td {
      border: 1px solid #222;
      padding: 6px 8px;
      text-align: left;
      vertical-align: middle;
      line-height: 1.35;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }
    th,
    th.col-qty,
    th.col-desc,
    th.col-dealer,
    th.col-purpose,
    th.col-amount {
      font-weight: 800;
      text-align: center;
      font-size: 12px;
      letter-spacing: 0.3px;
      text-transform: uppercase;
      color: #374151;
      padding: 8px 6px;
      line-height: 1.25;
      white-space: normal;
      overflow-wrap: normal;
    }
    .col-qty { width: 11%; text-align: center; font-weight: 700; }
    .col-desc { width: 32%; }
    .col-dealer { width: 18%; vertical-align: middle; }
    .col-purpose { width: 24%; vertical-align: middle; }
    .col-amount { width: 15%; text-align: right; font-weight: 700; white-space: nowrap; overflow-wrap: normal; }
    .item-row td { height: 38px; }
    .empty-row td { height: 26px; }
    .nothing-follows {
      text-align: center;
      font-weight: 700;
      font-style: italic;
      letter-spacing: 1.2px;
      color: #9ca3af;
      font-size: 12px;
      padding: 8px 8px;
    }
    .sign-row td { height: 108px; }
    .sign-cell {
      padding: 14px 12px 12px;
      vertical-align: middle;
      border-right: none;
    }
    .sign-line {
      display: flex;
      align-items: flex-end;
      gap: 8px;
      font-size: 13px;
      font-weight: 600;
      line-height: 1.2;
      text-transform: uppercase;
      white-space: nowrap;
      color: #6b7280;
    }
    .sign-line + .sign-line { margin-top: 16px; }
    .sign-label { flex: 0 0 auto; }
    .sign-space {
      flex: 0 0 210px;
      min-height: 22px;
      width: 210px;
      border: none;
      border-bottom: 1px solid #222;
      border-radius: 0;
      background: transparent;
      color: #1f2937;
      font: inherit;
      font-weight: 700;
      text-transform: uppercase;
      text-align: center;
      padding: 0 8px 1px;
    }
    .sign-space:focus {
      outline: none;
      border-bottom-color: #2563eb;
    }
    .total-row td { height: 36px; }
    .total-label {
      text-align: right;
      font-weight: 800;
      font-size: 14px;
    }
    .total-row .col-amount { font-size: 15px; }
    .sign-row .forwarded {
      text-align: right;
      vertical-align: bottom;
      font-size: 13px;
      font-weight: 600;
      line-height: 1.35;
      padding: 10px 8px 8px;
      white-space: normal;
      border-left: none;
      color: #6b7280;
    }
    .sign-row .forwarded strong {
      color: #1f2937;
      font-weight: 700;
    }
    @media print {
      html, body { background: #fff !important; }
      .dv-document { page-break-inside: avoid; }
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
            <th class="col-qty">Quantity</th>
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
    const margin = 5;
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
