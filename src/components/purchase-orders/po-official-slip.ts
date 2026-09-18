import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import type { PurchaseLot, POLineItemDetail } from "@/types/purchase-lots";

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
  `;
}

function buildLineItemsRows(lot: PurchaseLot): string {
  const unitCostNum = parseFloat(lot.unitCost) || 0;
  const totalCostNum = parseFloat(lot.totalCost) || 0;

  if (lot.items && lot.items.length > 1) {
    return (
      lot.items
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
    );
  }

  return `<tr>
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
    <tr class="empty-row"><td></td><td></td><td></td><td></td><td></td></tr>`;
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
            <th class="col-dealer">Suggested Dealer</th>
            <th class="col-unit-price">Unit Price</th>
            <th class="col-estimated">Estimated</th>
          </tr>
        </thead>
        <tbody>
          ${buildLineItemsRows(lot)}
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
