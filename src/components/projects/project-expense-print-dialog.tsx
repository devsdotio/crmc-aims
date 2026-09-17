"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { X, Printer, FileText, Calendar, Filter } from "lucide-react";
import type { Project, ProjectExpenseLine } from "@/types/projects";
import {
  expenseCategoryDisplay,
} from "@/types/projects";
import { formatPhp } from "./format-money";
import { cn } from "@/lib/utils";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatLongDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso.includes("T") ? iso : `${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatMoneyNum(n: number): string {
  return `₱${n.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
}

/** Drop redundant " × 16 pcs" when qty is shown in its own column. */
function cleanItemDescription(description: string): string {
  return description
    .replace(/\s*[×x]\s*[\d.,]+\s*[a-zA-Z/%°]+\s*$/u, "")
    .trim();
}

type SectionKey =
  | "inventory"
  | "manual"
  | "misc"
  | "adjustment"
  | "writeoff";

const SECTION_ORDER: SectionKey[] = [
  "inventory",
  "manual",
  "misc",
  "adjustment",
  "writeoff",
];

const SECTION_BASE_TITLES: Record<SectionKey, string> = {
  inventory: "Inventory materials (from stock)",
  manual: "Manual materials (not in inventory)",
  misc: "Miscellaneous expenses",
  adjustment: "Adjustments / credits",
  writeoff: "Asset write-offs",
};

/** Sections that show qty + unit cost columns. */
function sectionHasQtyCols(key: SectionKey): boolean {
  return key === "inventory" || key === "manual" || key === "writeoff";
}

function sectionKey(line: ProjectExpenseLine): SectionKey {
  if (line.lineType === "consumable") return "inventory";
  if (line.lineType === "material") return "manual";
  if (line.lineType === "adjustment") return "adjustment";
  if (line.lineType === "asset_writeoff") return "writeoff";
  return "misc";
}

function categoryLabel(line: ProjectExpenseLine): string {
  if (line.lineType === "consumable") return "Inventory";
  if (line.lineType === "material") return "Manual material";
  if (line.lineType === "asset_writeoff") return "Write-off";
  if (line.lineType === "adjustment") return "Adjustment / credit";
  return expenseCategoryDisplay(line.category, line.categoryLabel);
}

function sortByDate(a: ProjectExpenseLine, b: ProjectExpenseLine): number {
  return (
    a.incurredOn.localeCompare(b.incurredOn) ||
    a.createdAt.localeCompare(b.createdAt)
  );
}

function sectionLetter(index: number): string {
  return String.fromCharCode(65 + index); // A, B, C...
}

export type DateFilterMode =
  | "all"
  | "this_month"
  | "last_month"
  | "specific_month"
  | "custom";

export function ProjectExpensePrintDialog({
  project,
  expenses,
  isOpen,
  onClose,
}: {
  project: Project | null;
  expenses: ProjectExpenseLine[];
  isOpen: boolean;
  onClose: () => void;
}) {
  const [dateFilterMode, setDateFilterMode] = useState<DateFilterMode>("all");
  const [specificMonth, setSpecificMonth] = useState(() =>
    new Date().toISOString().slice(0, 7)
  );
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const filteredExpenses = useMemo(() => {
    if (dateFilterMode === "this_month") {
      const cur = new Date().toISOString().slice(0, 7);
      return expenses.filter((e) => e.incurredOn.startsWith(cur));
    }
    if (dateFilterMode === "last_month") {
      const d = new Date();
      d.setMonth(d.getMonth() - 1);
      const last = d.toISOString().slice(0, 7);
      return expenses.filter((e) => e.incurredOn.startsWith(last));
    }
    if (dateFilterMode === "specific_month") {
      if (!specificMonth) return expenses;
      return expenses.filter((e) => e.incurredOn.startsWith(specificMonth));
    }
    if (dateFilterMode === "custom") {
      return expenses.filter((e) => {
        if (customStart && e.incurredOn < customStart) return false;
        if (customEnd && e.incurredOn > customEnd) return false;
        return true;
      });
    }
    return expenses;
  }, [expenses, dateFilterMode, specificMonth, customStart, customEnd]);

  const periodLabel = useMemo(() => {
    if (dateFilterMode === "this_month") {
      const d = new Date();
      return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    }
    if (dateFilterMode === "last_month") {
      const d = new Date();
      d.setMonth(d.getMonth() - 1);
      return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    }
    if (dateFilterMode === "specific_month" && specificMonth) {
      const [y, m] = specificMonth.split("-");
      const d = new Date(Number(y), Number(m) - 1, 1);
      return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    }
    if (dateFilterMode === "custom") {
      if (customStart && customEnd) {
        return `${formatLongDate(customStart)} – ${formatLongDate(customEnd)}`;
      }
      if (customStart) return `From ${formatLongDate(customStart)}`;
      if (customEnd) return `Until ${formatLongDate(customEnd)}`;
      return "Custom Date Range (All Records)";
    }
    return "All Time (Whole Project)";
  }, [dateFilterMode, specificMonth, customStart, customEnd]);

  const sections = useMemo(() => {
    const map = new Map<SectionKey, ProjectExpenseLine[]>();
    for (const key of SECTION_ORDER) map.set(key, []);
    for (const line of filteredExpenses) {
      map.get(sectionKey(line))!.push(line);
    }
    for (const key of SECTION_ORDER) {
      map.get(key)!.sort(sortByDate);
    }
    return SECTION_ORDER.filter((key) => (map.get(key)?.length ?? 0) > 0).map(
      (key, index) => ({
        key,
        title: `${sectionLetter(index)}. ${SECTION_BASE_TITLES[key]}`,
        showQty: sectionHasQtyCols(key),
        lines: map.get(key)!,
        subtotal: map
          .get(key)!
          .reduce((s, l) => s + (Number(l.amount) || 0), 0),
      })
    );
  }, [filteredExpenses]);

  const totals = useMemo(() => {
    let spend = 0;
    let credits = 0;
    for (const line of filteredExpenses) {
      const n = Number(line.amount) || 0;
      if (n < 0) credits += Math.abs(n);
      else spend += n;
    }
    return { spend, credits, net: spend - credits };
  }, [filteredExpenses]);

  if (!isOpen || !project) return null;

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

    const sectionsHtml =
      sections.length === 0
        ? `<p class="empty">No expense lines recorded for this project in the selected period (${escapeHtml(periodLabel)}).</p>`
        : sections
            .map((section) => {
              const colCount = section.showQty ? 7 : 5;
              const rows = section.lines
                .map((line, lineIdx) => {
                  const itemNo = lineIdx + 1;
                  const qty =
                    line.quantity != null &&
                    Number.isFinite(Number(line.quantity))
                      ? String(Number(line.quantity))
                      : "—";
                  const unit =
                    line.unitCost != null
                      ? formatMoneyNum(Number(line.unitCost))
                      : "—";
                  const amountNum = Number(line.amount) || 0;
                  const desc = cleanItemDescription(line.description);
                  const notes = line.notes?.trim()
                    ? `<div class="sub">${escapeHtml(line.notes.trim())}</div>`
                    : "";

                  if (section.showQty) {
                    return `<tr>
                      <td class="col-no">${itemNo}</td>
                      <td class="col-date">${escapeHtml(line.incurredOn)}</td>
                      <td class="col-cat">${escapeHtml(categoryLabel(line))}</td>
                      <td class="col-desc">
                        <strong>${escapeHtml(desc)}</strong>
                        ${notes}
                      </td>
                      <td class="col-qty">${escapeHtml(qty)}</td>
                      <td class="col-unit">${escapeHtml(unit)}</td>
                      <td class="col-amt${amountNum < 0 ? " credit" : ""}">${formatMoneyNum(amountNum)}</td>
                    </tr>`;
                  }

                  return `<tr>
                    <td class="col-no">${itemNo}</td>
                    <td class="col-date">${escapeHtml(line.incurredOn)}</td>
                    <td class="col-cat">${escapeHtml(categoryLabel(line))}</td>
                    <td class="col-desc">
                      <strong>${escapeHtml(desc)}</strong>
                      ${notes}
                    </td>
                    <td class="col-amt${amountNum < 0 ? " credit" : ""}">${formatMoneyNum(amountNum)}</td>
                  </tr>`;
                })
                .join("");

              const head = section.showQty
                ? `<tr>
                    <th class="col-no">#</th>
                    <th class="col-date">Date</th>
                    <th class="col-cat">Category</th>
                    <th class="col-desc">Item / Description</th>
                    <th class="col-qty">Qty</th>
                    <th class="col-unit">Unit cost</th>
                    <th class="col-amt">Amount</th>
                  </tr>`
                : `<tr>
                    <th class="col-no">#</th>
                    <th class="col-date">Date</th>
                    <th class="col-cat">Category</th>
                    <th class="col-desc">Description</th>
                    <th class="col-amt">Amount</th>
                  </tr>`;

              return `
                <div class="section">
                  <div class="section-head">
                    <span>${escapeHtml(section.title)}</span>
                    <span class="section-count">${section.lines.length} item${section.lines.length === 1 ? "" : "s"}</span>
                  </div>
                  <table>
                    <thead>${head}</thead>
                    <tbody>${rows}</tbody>
                    <tfoot>
                      <tr>
                        <td colspan="${colCount - 1}" class="subtotal-label">Section subtotal</td>
                        <td class="col-amt">${formatMoneyNum(section.subtotal)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>`;
            })
            .join("");

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>CRMC Project Breakdown - ${escapeHtml(project.projectCode)}</title>
          <style>
            @page { size: portrait; margin: 10mm 12mm; }
            * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            body, table, th, td, h1, h2, p, div, span, strong {
              font-family: Arial, Helvetica, sans-serif;
            }
            html, body {
              margin: 0 !important; padding: 0 !important; width: 100% !important;
              color: #111; background: #FFF !important;
            }
            .doc {
              width: 100%; padding: 4px 0;
              display: flex; flex-direction: column;
            }
            .letterhead {
              display: flex; align-items: center; gap: 12px;
              border-bottom: 1.5px solid #222; padding-bottom: 12px; margin-bottom: 12px;
            }
            .college-logo-img { width: 64px; height: 64px; object-fit: contain; }
            .college-titles h1 {
              font-size: 14px; font-weight: 800; margin: 0; letter-spacing: 0.4px;
              text-transform: uppercase; line-height: 1.25;
            }
            .college-titles p { font-size: 11px; margin: 2px 0 0; color: #444; line-height: 1.3; }
            .title-banner { text-align: center; margin: 4px 0 16px; }
            .title-banner h2 {
              font-size: 15px; font-weight: 900; letter-spacing: 1.5px; margin: 0;
              text-transform: uppercase;
            }
            .meta-block {
              display: grid;
              grid-template-columns: 1.4fr 1fr;
              gap: 8px 32px;
              margin-bottom: 14px;
              font-size: 11.5px;
              line-height: 1.45;
            }
            .meta-block .label {
              font-weight: 800; color: #333; display: inline-block; min-width: 78px;
            }
            .meta-block .value { color: #111; }
            .meta-block .code {
              font-weight: 700; font-family: Arial, Helvetica, sans-serif;
              letter-spacing: 0.2px;
            }
            .meta-right { text-align: right; }
            .meta-right .label { min-width: 0; margin-right: 6px; }
            .period-banner {
              background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 4px;
              padding: 4px 8px; font-size: 10px; font-weight: 700; margin-bottom: 12px;
              color: #1e293b;
            }
            .purpose-block {
              margin-bottom: 16px; font-size: 12px; line-height: 1.45;
            }
            .purpose-block .lbl {
              font-weight: 800; font-size: 11px; margin-bottom: 3px;
              text-transform: uppercase; letter-spacing: 0.3px; color: #333;
            }
            .section { margin-bottom: 16px; page-break-inside: avoid; }
            .section-head {
              display: flex; justify-content: space-between; align-items: baseline;
              font-size: 11.5px; font-weight: 900; text-transform: uppercase;
              letter-spacing: 0.4px; border-bottom: 2px solid #111;
              padding-bottom: 4px; margin-bottom: 0;
            }
            .section-count { font-size: 10px; font-weight: 700; color: #555; text-transform: none; letter-spacing: 0; }
            table { width: 100%; border-collapse: collapse; font-size: 10.5px; margin-top: 0; }
            th, td { border: 1.5px solid #222; padding: 6px 5px; vertical-align: top; }
            th {
              font-weight: 800; text-align: center; background: #fafafa;
              text-transform: uppercase; font-size: 9px; letter-spacing: 0.3px;
            }
            tfoot td { background: #f7f7f7; font-weight: 800; }
            .subtotal-label { text-align: right; font-size: 10px; text-transform: uppercase; letter-spacing: 0.3px; }
            .col-no { width: 5%; text-align: center; }
            .col-date { width: 12%; text-align: center; white-space: nowrap; }
            .col-cat { width: 15%; }
            .col-desc { width: 36%; }
            .col-qty { width: 8%; text-align: center; }
            .col-unit { width: 12%; text-align: right; white-space: nowrap; }
            .col-amt { width: 14%; text-align: right; font-weight: 700; white-space: nowrap; }
            .col-amt.credit { color: #166534; }
            .sub { font-size: 9px; color: #444; margin-top: 2px; line-height: 1.35; }
            .empty { text-align: center; color: #666; padding: 20px; font-size: 12px; }
            .totals {
              margin-top: 6px; display: flex; justify-content: flex-end;
            }
            .totals-box {
              border: 1.5px solid #222; min-width: 280px; font-size: 11.5px;
            }
            .totals-row {
              display: flex; justify-content: space-between; padding: 4px 10px;
              border-bottom: 1px solid #ddd;
            }
            .totals-row.net {
              border-bottom: none; background: #f0f0f0; font-weight: 900;
              font-size: 12.5px;
            }
            .totals-row .val { font-family: ui-monospace, SFMono-Regular, monospace; font-weight: 700; }
            .signatories {
              margin-top: 28px; display: grid; grid-template-columns: repeat(3, 1fr);
              gap: 20px; page-break-inside: avoid;
            }
            .sig-block { text-align: center; }
            .sig-line {
              border-bottom: 1px solid #222; margin-top: 36px; margin-bottom: 4px;
            }
            .sig-label { font-size: 9.5px; color: #444; text-transform: uppercase; font-weight: 700; letter-spacing: 0.3px; }
            .sig-name { font-size: 11px; font-weight: 800; margin-top: 1px; }
          </style>
        </head>
        <body>
          <div class="doc">
            <div class="letterhead">
              <img src="${logoUrl}" class="college-logo-img" alt="CRMC Logo" />
              <div class="college-titles">
                <h1>Cebu Roosevelt Memorial Colleges, Inc.</h1>
                <p>Upper Pandan, Bogo City, Cebu, Philippines · 6010<br/>Property Custodian Office · Project Spend Ledger</p>
              </div>
            </div>

            <div class="title-banner">
              <h2>Project Expense Breakdown</h2>
            </div>

            <div class="meta-block">
              <div>
                <div><span class="label">Project:</span> <span class="value"><strong>${escapeHtml(project.name)}</strong> (<span class="code">${escapeHtml(project.projectCode)}</span>)</span></div>
                <div><span class="label">Department:</span> <span class="value">${escapeHtml(project.department || "—")}</span></div>
                <div><span class="label">Location:</span> <span class="value">${escapeHtml(project.location || "—")}</span></div>
              </div>
              <div class="meta-right">
                <div><span class="label">Start:</span> <span class="value">${escapeHtml(formatLongDate(project.startDate))}</span></div>
                <div><span class="label">Target End:</span> <span class="value">${escapeHtml(formatLongDate(project.endDate))}</span></div>
                <div><span class="label">Lead:</span> <span class="value">${escapeHtml(project.createdByName)}</span></div>
              </div>
            </div>

            <div class="period-banner">
              <strong>Expense Report Period:</strong> ${escapeHtml(periodLabel)}
            </div>

            ${
              project.description
                ? `<div class="purpose-block">
                    <div class="lbl">Project Overview</div>
                    <div>${escapeHtml(project.description)}</div>
                  </div>`
                : ""
            }

            ${sectionsHtml}

            <div class="totals">
              <div class="totals-box">
                <div class="totals-row">
                  <span>Gross spend:</span>
                  <span class="val">${formatMoneyNum(totals.spend)}</span>
                </div>
                <div class="totals-row">
                  <span>Credits / adjustments:</span>
                  <span class="val">−${formatMoneyNum(totals.credits)}</span>
                </div>
                <div class="totals-row net">
                  <span>Net charged (${escapeHtml(periodLabel)}):</span>
                  <span class="val">${formatMoneyNum(totals.net)}</span>
                </div>
              </div>
            </div>

            <div class="signatories">
              <div class="sig-block">
                <div class="sig-line"></div>
                <div class="sig-name">${escapeHtml(project.createdByName)}</div>
                <div class="sig-label">Prepared by / Project Lead</div>
              </div>
              <div class="sig-block">
                <div class="sig-line"></div>
                <div class="sig-name">Property Custodian</div>
                <div class="sig-label">Verified by</div>
              </div>
              <div class="sig-block">
                <div class="sig-line"></div>
                <div class="sig-name">Administration</div>
                <div class="sig-label">Approved by</div>
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
    <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-report-title"
        className="relative w-full max-w-4xl max-h-[90vh] rounded-2xl border border-border bg-bg shadow-2xl z-10 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
      >
        <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-border bg-bg-subtle/50 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 text-accent shrink-0">
              <FileText className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h2
                id="project-report-title"
                className="text-sm font-bold text-text truncate"
              >
                Project Expense Report
              </h2>
              <p className="text-[11px] text-text-secondary truncate">
                {project.projectCode} · {periodLabel}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-bold rounded-lg bg-accent text-accent-foreground hover:opacity-90 cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" />
              Print / PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-text-secondary hover:text-text hover:bg-border cursor-pointer"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Date Filter Bar */}
        <div className="px-5 py-2.5 bg-bg-subtle/80 border-b border-border flex items-center justify-between gap-3 flex-wrap text-xs">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1">
              <Filter className="h-3 w-3" />
              Period:
            </span>
            <button
              type="button"
              onClick={() => setDateFilterMode("all")}
              className={cn(
                "h-7 px-2.5 rounded-md font-bold text-[11px] transition-colors cursor-pointer",
                dateFilterMode === "all"
                  ? "bg-accent text-accent-foreground"
                  : "bg-bg border border-border text-text hover:bg-bg-subtle"
              )}
            >
              All Time
            </button>
            <button
              type="button"
              onClick={() => setDateFilterMode("this_month")}
              className={cn(
                "h-7 px-2.5 rounded-md font-bold text-[11px] transition-colors cursor-pointer",
                dateFilterMode === "this_month"
                  ? "bg-accent text-accent-foreground"
                  : "bg-bg border border-border text-text hover:bg-bg-subtle"
              )}
            >
              This Month
            </button>
            <button
              type="button"
              onClick={() => setDateFilterMode("last_month")}
              className={cn(
                "h-7 px-2.5 rounded-md font-bold text-[11px] transition-colors cursor-pointer",
                dateFilterMode === "last_month"
                  ? "bg-accent text-accent-foreground"
                  : "bg-bg border border-border text-text hover:bg-bg-subtle"
              )}
            >
              Last Month
            </button>
            <button
              type="button"
              onClick={() => setDateFilterMode("specific_month")}
              className={cn(
                "h-7 px-2.5 rounded-md font-bold text-[11px] transition-colors cursor-pointer",
                dateFilterMode === "specific_month"
                  ? "bg-accent text-accent-foreground"
                  : "bg-bg border border-border text-text hover:bg-bg-subtle"
              )}
            >
              Specific Month
            </button>
            <button
              type="button"
              onClick={() => setDateFilterMode("custom")}
              className={cn(
                "h-7 px-2.5 rounded-md font-bold text-[11px] transition-colors cursor-pointer",
                dateFilterMode === "custom"
                  ? "bg-accent text-accent-foreground"
                  : "bg-bg border border-border text-text hover:bg-bg-subtle"
              )}
            >
              Custom Range
            </button>
          </div>

          {dateFilterMode === "specific_month" && (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-text-secondary font-bold">Month:</span>
              <input
                type="month"
                value={specificMonth}
                onChange={(e) => setSpecificMonth(e.target.value)}
                className="h-7 px-2 text-xs bg-bg border border-border rounded-md text-text"
              />
            </div>
          )}

          {dateFilterMode === "custom" && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                placeholder="From"
                className="h-7 px-2 text-xs bg-bg border border-border rounded-md text-text"
              />
              <span className="text-text-secondary font-bold">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                placeholder="To"
                className="h-7 px-2 text-xs bg-bg border border-border rounded-md text-text"
              />
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-5 bg-bg-subtle/30">
          <div className="mx-auto max-w-215 rounded-xl border border-border bg-bg p-5 shadow-xs space-y-5">
            <div className="flex items-center gap-3 border-b border-border pb-3">
              <Image
                src="/CRMC LOGO.png"
                alt="CRMC"
                width={48}
                height={48}
                className="object-contain"
              />
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wide text-text">
                  Cebu Roosevelt Memorial Colleges, Inc.
                </p>
                <p className="text-[10px] text-text-secondary">
                  Property Custodian Office
                </p>
              </div>
            </div>

            <p className="text-center text-sm font-extrabold uppercase tracking-wider text-text">
              Project Expense Breakdown
            </p>

            <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 text-xs">
              <div className="space-y-1.5">
                <div>
                  <span className="font-bold text-text-secondary inline-block w-19">
                    Project
                  </span>
                  <span className="font-semibold text-text">
                    {project.name}{" "}
                    <span className="font-mono text-[11px] font-bold text-text-secondary">
                      ({project.projectCode})
                    </span>
                  </span>
                </div>
                <div>
                  <span className="font-bold text-text-secondary inline-block w-19">
                    Department
                  </span>
                  <span className="text-text">{project.department || "—"}</span>
                </div>
                <div>
                  <span className="font-bold text-text-secondary inline-block w-19">
                    Location
                  </span>
                  <span className="text-text">{project.location || "—"}</span>
                </div>
              </div>

              <div className="space-y-1.5 text-right text-text-secondary">
                <div>
                  <span className="font-bold">Start</span>{" "}
                  {formatLongDate(project.startDate)}
                </div>
                <div>
                  <span className="font-bold">End</span>{" "}
                  {formatLongDate(project.endDate)}
                </div>
                <div className="text-[11px] font-bold text-accent">
                  Period: {periodLabel}
                </div>
              </div>
            </div>

            {project.description ? (
              <div className="text-xs">
                <p className="font-bold uppercase tracking-wide text-text-secondary text-[10px] mb-1">
                  Project overview
                </p>
                <p className="text-text leading-relaxed whitespace-pre-wrap">
                  {project.description}
                </p>
              </div>
            ) : null}

            {sections.length === 0 ? (
              <p className="text-xs text-text-secondary text-center py-8 border border-dashed border-border rounded-lg">
                No expense lines recorded for this project in the selected period ({periodLabel}).
              </p>
            ) : (
              sections.map((section) => (
                <section key={section.key} className="space-y-2">
                  <div className="flex items-center justify-between gap-2 border-b border-border pb-1">
                    <h3 className="text-[11px] font-extrabold uppercase tracking-wide text-text">
                      {section.title}
                    </h3>
                    <span className="text-[10px] font-bold text-text-secondary">
                      {section.lines.length} item
                      {section.lines.length === 1 ? "" : "s"} ·{" "}
                      {formatPhp(section.subtotal)}
                    </span>
                  </div>
                  <ul className="space-y-1.5">
                    {section.lines.map((line, lineIdx) => {
                      const amountNum = Number(line.amount) || 0;
                      return (
                        <li
                          key={line.id}
                          className="rounded-lg border border-border bg-bg-subtle/40 px-3 py-2 text-[11px]"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono text-[10px] text-text-secondary">
                                  #{lineIdx + 1}
                                </span>
                                <span className="font-bold text-text truncate">
                                  {cleanItemDescription(line.description)}
                                </span>
                                <span className="text-[10px] text-text-secondary border border-border rounded px-1.5 py-0.5">
                                  {categoryLabel(line)}
                                </span>
                              </div>
                              <div className="text-text-secondary mt-0.5 flex flex-wrap gap-x-2">
                                <span>{line.incurredOn}</span>
                                {section.showQty && line.quantity != null && (
                                  <span>qty {Number(line.quantity)}</span>
                                )}
                                {section.showQty && line.unitCost != null && (
                                  <span>@ {formatPhp(line.unitCost)}</span>
                                )}
                                {line.notes && (
                                  <span className="truncate max-w-full">
                                    {line.notes}
                                  </span>
                                )}
                              </div>
                            </div>
                            <span
                              className={cn(
                                "font-mono font-bold tabular-nums shrink-0",
                                amountNum < 0
                                  ? "text-status-active-text"
                                  : "text-text"
                              )}
                            >
                              {formatPhp(line.amount)}
                            </span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))
            )}

            <div className="rounded-lg border border-border bg-bg-subtle/50 p-3 text-[11px] space-y-1.5">
              <div className="flex justify-between gap-4">
                <span className="text-text-secondary">Gross spend</span>
                <span className="font-mono font-bold">{formatPhp(totals.spend)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-text-secondary">Credits / adjustments</span>
                <span className="font-mono font-bold">
                  −{formatPhp(totals.credits)}
                </span>
              </div>
              <div className="flex justify-between gap-4 border-t border-border pt-1.5">
                <span className="font-bold text-text">Net charged ({periodLabel})</span>
                <span className="font-mono font-bold text-accent">
                  {formatPhp(totals.net)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
