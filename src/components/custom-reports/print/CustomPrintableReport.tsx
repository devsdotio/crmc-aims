"use client";

import { summarizeCustomReportFilters } from "@/types/custom-reports";
import {
  ensurePrintableLayout,
  type CustomPrintPayload,
} from "@/lib/custom-reports/print-payload";

export type { CustomPrintPayload };

interface Props {
  data: CustomPrintPayload;
}

const DEFAULT_LOGO = "/CRMC%20LOGO.png";

export function CustomPrintableReport({ data }: Props) {
  const blocks = ensurePrintableLayout(
    data.layout,
    data.templateName || "Custom report"
  );

  return (
    <div className="custom-print-root bg-white text-black p-6 max-w-[210mm] mx-auto print:p-0 print:max-w-none">
      <style>{`
        @page {
          size: A4 portrait;
          margin: 12mm;
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
            padding: 0 !important;
            max-width: none !important;
            margin: 0 !important;
            box-shadow: none !important;
          }
          .custom-print-root table {
            width: 100% !important;
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
          font-size: 11px;
        }
        .custom-print-root th,
        .custom-print-root td {
          border: 1px solid #ccc;
          padding: 4px 6px;
          text-align: left;
          vertical-align: top;
        }
        .custom-print-root th {
          background: #f5f5f5;
          font-weight: 600;
        }
      `}</style>

      {blocks.map((block) => {
        if (block.type === "header") {
          const logo = block.props?.logoUrl || data.logoUrl || DEFAULT_LOGO;
          const org = block.props?.orgName || data.organizationName || "Institution";
          const sub = block.props?.orgSubtitle || data.organizationSubtitle;
          return (
            <header
              key={block.id}
              className="flex items-center gap-3 mb-4 border-b border-gray-300 pb-3"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logo}
                alt=""
                className="w-14 h-14 object-contain"
                data-print-logo="true"
              />
              <div>
                <div className="text-base font-bold">{org}</div>
                {sub ? <div className="text-xs text-gray-600">{sub}</div> : null}
              </div>
            </header>
          );
        }

        if (block.type === "title") {
          return (
            <div key={block.id} className="mb-3">
              <h1 className="text-lg font-bold">
                {block.props?.title || data.templateName || "Custom report"}
              </h1>
              {block.props?.periodLabel ? (
                <p className="text-xs text-gray-600 mt-0.5">{block.props.periodLabel}</p>
              ) : null}
              <p className="text-xs text-gray-500 mt-0.5">
                Generated {new Date().toLocaleString()}
                {typeof data.total === "number" ? ` · ${data.total} rows` : ""}
              </p>
            </div>
          );
        }

        if (block.type === "text") {
          return (
            <p key={block.id} className="text-sm mb-3 whitespace-pre-wrap">
              {block.props?.text}
            </p>
          );
        }

        if (block.type === "filters_summary") {
          return (
            <p key={block.id} className="text-xs text-gray-600 mb-3">
              <strong>Applied filters:</strong>{" "}
              {summarizeCustomReportFilters(data.filters ?? {})}
            </p>
          );
        }

        if (block.type === "table") {
          return (
            <table key={block.id} className="mb-4">
              <thead>
                <tr>
                  {(data.columns ?? []).map((c) => (
                    <th key={c.key}>{c.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(data.rows ?? []).map((row, idx) => (
                  <tr key={idx}>
                    {(data.columns ?? []).map((c) => (
                      <td key={c.key}>
                        {row[c.key] === null || row[c.key] === undefined
                          ? "—"
                          : String(row[c.key])}
                      </td>
                    ))}
                  </tr>
                ))}
                {(data.rows?.length ?? 0) === 0 && (
                  <tr>
                    <td colSpan={Math.max(data.columns?.length ?? 0, 1)}>No data</td>
                  </tr>
                )}
              </tbody>
            </table>
          );
        }

        if (block.type === "footer") {
          return (
            <footer
              key={block.id}
              className="mt-6 pt-3 border-t border-gray-300 text-xs text-gray-600"
            >
              {block.props?.footerText || "Generated from CRMC AIMS Custom Reports"}
            </footer>
          );
        }

        if (block.type === "signatories") {
          const sigs = block.props?.signatories ?? [];
          return (
            <div key={block.id} className="mt-8 grid grid-cols-2 gap-8">
              {sigs.map((sig, i) => (
                <div key={i} className="text-xs">
                  <div className="border-b border-gray-400 h-10 mb-1" />
                  <div className="font-medium">{sig.name || "________________"}</div>
                  <div className="text-gray-600">{sig.role}</div>
                  {sig.title ? <div className="text-gray-500">{sig.title}</div> : null}
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
