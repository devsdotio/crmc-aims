"use client";

import { summarizeCustomReportFilters, type CustomReportColumnDef } from "@/types/custom-reports";
import {
  ensurePrintableLayout,
  type CustomPrintPayload,
} from "@/lib/custom-reports/print-payload";

export type { CustomPrintPayload };

export type PaperSize = "long" | "legal" | "a4" | "letter";

interface Props {
  data: CustomPrintPayload;
  orientation?: "portrait" | "landscape";
  paperSize?: PaperSize;
  fitWidth?: boolean;
  margin?: "narrow" | "normal";
}

const DEFAULT_LOGO = "/CRMC%20LOGO.png";

function formatPrintCell(col: CustomReportColumnDef, rawVal: unknown): string {
  if (rawVal === null || rawVal === undefined || rawVal === "") return "—";

  const isFinancial =
    col.sensitive ||
    col.key.toLowerCase().includes("cost") ||
    col.key.toLowerCase().includes("amount") ||
    col.key.toLowerCase().includes("price") ||
    col.key.toLowerCase().includes("spend") ||
    col.key.toLowerCase().includes("value");

  if (isFinancial) {
    const num = typeof rawVal === "number" ? rawVal : parseFloat(String(rawVal));
    if (!isNaN(num)) {
      return `₱${num.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    }
  }

  if (typeof rawVal === "boolean") {
    return rawVal ? "Yes" : "No";
  }

  const str = String(rawVal);
  if (col.type === "date" || /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2})?/.test(str)) {
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    }
  }

  return str;
}

export const PHILIPPINE_LEGAL_DIMENSIONS = {
  widthMm: 216,
  heightMm: 330,
  name: "Philippine Long Bond Paper",
  inches: "8.5in x 13in",
};

export function CustomPrintableReport({
  data,
  orientation = "portrait",
  paperSize = "long",
  fitWidth = false,
  margin = "narrow",
}: Props) {
  const blocks = ensurePrintableLayout(
    data.layout,
    data.templateName || "Custom report"
  );

  const isLandscape = orientation === "landscape";

  // Philippine Long Bond Paper is 8.5in x 13in (216mm x 330mm)
  const pageSizeRule =
    paperSize === "long"
      ? isLandscape
        ? "13in 8.5in"
        : "8.5in 13in"
      : paperSize === "legal"
      ? isLandscape
        ? "14in 8.5in"
        : "8.5in 14in"
      : paperSize === "letter"
      ? isLandscape
        ? "11in 8.5in"
        : "8.5in 11in"
      : `A4 ${orientation}`;

  // Standard Narrow print margin (approx 8mm top/bottom, 10mm left/right) to prevent zero-margin clipping
  const pageMarginRule = margin === "narrow" ? "8mm 10mm" : "14mm 16mm";
  const screenPaddingClass = margin === "narrow" ? "p-3 sm:p-5 md:p-6" : "p-6 sm:p-8 md:p-10";
  const printPaddingRule = margin === "narrow" ? "8mm 10mm" : "14mm 16mm";

  // Dimensions for simulated paper sheet (fitWidth expands to container width, otherwise simulated physical mm)
  const containerDimensionClasses = fitWidth
    ? "w-full max-w-full"
    : paperSize === "long"
      ? isLandscape
        ? "w-[330mm] min-h-[216mm]"
        : "w-[216mm] min-h-[330mm]"
      : paperSize === "legal"
      ? isLandscape
        ? "w-[356mm] min-h-[216mm]"
        : "w-[216mm] min-h-[356mm]"
      : paperSize === "letter"
      ? isLandscape
        ? "w-[279mm] min-h-[216mm]"
        : "w-[216mm] min-h-[279mm]"
      : isLandscape
      ? "w-[297mm] min-h-[210mm]"
      : "w-[210mm] min-h-[297mm]";

  return (
    <div
      className={`custom-print-root bg-white text-black ${screenPaddingClass} mx-auto print:m-0 print:w-full print:max-w-none print:min-h-0 shadow-md print:shadow-none box-border ${containerDimensionClasses}`}
    >
      <style>{`
        @page {
          size: ${pageSizeRule};
          margin: ${pageMarginRule};
        }
        @media print {
          html, body {
            background: #ffffff !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .no-print,
          .print\\:hidden {
            display: none !important;
          }
          .custom-print-root {
            padding: ${printPaddingRule} !important;
            max-width: none !important;
            width: 100% !important;
            min-height: auto !important;
            margin: 0 auto !important;
            box-shadow: none !important;
            box-sizing: border-box !important;
          }
          .custom-print-root table {
            width: 100% !important;
            table-layout: auto !important;
          }
          .custom-print-root tr {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          .page-break {
            break-before: page;
            page-break-before: always;
          }
        }
        .custom-print-root table {
          border-collapse: collapse;
          width: 100%;
          table-layout: auto;
        }
        .custom-print-root th,
        .custom-print-root td {
          border: 1px solid #d1d5db;
          text-align: left;
          vertical-align: top;
          word-break: break-word;
          overflow-wrap: anywhere;
        }
        .custom-print-root th {
          background: #f3f4f6;
          font-weight: 600;
        }
      `}</style>

      {/* On-Screen Long Sheet Format Indicator Banner */}
      <div className="no-print print:hidden mb-4 pb-2 border-b border-gray-200 flex items-center justify-between text-[11px] text-gray-500 font-mono">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-emerald-500" />
          {paperSize === "long"
            ? "Long Bond Paper (8.5\" × 13\" / 216mm × 330mm)"
            : paperSize === "legal"
            ? "US Legal (8.5\" × 14\" / 216mm × 356mm)"
            : paperSize === "letter"
            ? "US Letter (8.5\" × 11\" / 216mm × 279mm)"
            : "ISO A4 (210mm × 297mm)"}
          {" · "}
          {isLandscape ? "Landscape View" : "Portrait View"}
          {margin === "narrow" ? " · Narrow Margin (6mm)" : " · Normal Margin (15mm)"}
        </span>
        <span className="text-gray-400">
          {fitWidth ? "Fit to Dialog Width" : "Sheet Dimensions Simulated (1:1)"}
        </span>
      </div>

      {blocks.map((block) => {
        if (block.type === "header") {
          const logo = block.props?.logoUrl || data.logoUrl || DEFAULT_LOGO;
          const org = block.props?.orgName || data.organizationName || "Institution";
          const sub = block.props?.orgSubtitle || data.organizationSubtitle;
          return (
            <header
              key={block.id}
              className="flex items-center gap-3.5 mb-4 border-b border-gray-300 pb-3"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logo}
                alt=""
                className="w-14 h-14 object-contain"
                data-print-logo="true"
              />
              <div>
                <div className="text-base font-bold text-gray-900 leading-tight">{org}</div>
                {sub ? <div className="text-xs text-gray-600 mt-0.5">{sub}</div> : null}
              </div>
            </header>
          );
        }

        if (block.type === "title") {
          return (
            <div key={block.id} className="mb-3">
              <h1 className="text-lg font-bold text-gray-900 leading-tight">
                {block.props?.title || data.templateName || "Custom report"}
              </h1>
              {block.props?.periodLabel ? (
                <p className="text-xs text-gray-600 mt-0.5">{block.props.periodLabel}</p>
              ) : null}
              <p className="text-xs text-gray-500 mt-0.5">
                Generated {new Date().toLocaleString()}
                {typeof data.total === "number" ? ` · ${data.total} records` : ""}
              </p>
            </div>
          );
        }

        if (block.type === "text") {
          return (
            <p key={block.id} className="text-xs mb-3 whitespace-pre-wrap text-gray-800 leading-relaxed">
              {block.props?.text}
            </p>
          );
        }

        if (block.type === "filters_summary") {
          return (
            <p key={block.id} className="text-xs text-gray-600 mb-3 bg-gray-50 p-2 rounded border border-gray-200">
              <strong>Applied Filters:</strong>{" "}
              {summarizeCustomReportFilters(data.filters ?? {})}
            </p>
          );
        }

        if (block.type === "table") {
          const colCount = data.columns?.length ?? 0;
          const tableFontSize =
            colCount > 10
              ? "text-[8px] leading-tight"
              : colCount > 7
              ? "text-[9px] leading-snug"
              : "text-[10px] leading-normal";
          const cellPadding =
            colCount > 10 ? "py-0.5 px-1" : colCount > 7 ? "py-1 px-1.5" : "py-1 px-2";

          return (
            <div key={block.id} className="w-full overflow-x-auto print:overflow-visible mb-2 sm:mb-3">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-300">
                    {(data.columns ?? []).map((c) => (
                      <th
                        key={c.key}
                        className={`${cellPadding} ${tableFontSize} text-left font-semibold wrap-anywhere`}
                      >
                        {c.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(data.rows ?? []).map((row, idx) => (
                    <tr key={idx} className="border-b border-gray-100 print:border-gray-200">
                      {(data.columns ?? []).map((c) => (
                        <td
                          key={c.key}
                          className={`${cellPadding} ${tableFontSize} text-left align-top wrap-anywhere`}
                        >
                          {formatPrintCell(c, row[c.key])}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {(data.rows?.length ?? 0) === 0 && (
                    <tr>
                      <td colSpan={Math.max(data.columns?.length ?? 0, 1)} className="text-center py-4 text-gray-500">
                        No records match the applied criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          );
        }

        if (block.type === "footer") {
          return (
            <footer
              key={block.id}
              className="mt-4 pt-2 border-t border-gray-300 text-[11px] text-gray-600 break-inside-avoid [page-break-inside:avoid]"
            >
              {block.props?.footerText || "Generated from CRMC AIMS Custom Reports"}
            </footer>
          );
        }

        if (block.type === "signatories") {
          const sigs = block.props?.signatories ?? [];
          return (
            <div
              key={block.id}
              className="signatories-block mt-5 sm:mt-6 grid grid-cols-2 gap-6 sm:gap-10 break-inside-avoid [page-break-inside:avoid]"
            >
              {sigs.map((sig, i) => (
                <div
                  key={i}
                  className="text-xs text-center flex flex-col items-center justify-start wrap-break-word"
                >
                  <div className="signature-line w-48 sm:w-56 max-w-[220px] border-b border-gray-400 h-7 sm:h-8 mb-1.5 mx-auto" />
                  <div className="signatory-name font-bold text-gray-900 wrap-break-word uppercase tracking-wide">
                    {sig.name ? sig.name.toUpperCase() : "________________"}
                  </div>
                  <div className="text-gray-600 text-[11px] wrap-break-word mt-0.5">{sig.role}</div>
                  {sig.title ? (
                    <div className="text-gray-500 text-[10px] wrap-break-word mt-0.5">{sig.title}</div>
                  ) : null}
                </div>
              ))}
            </div>
          );
        }

        if (block.type === "page_break") {
          return <div key={block.id} className="page-break" />;
        }

        return null;
      })}
    </div>
  );
}
