"use client";

import type {
  CustomReportColumnDef,
  CustomReportFilters,
  CustomReportLayoutBlock,
} from "@/types/custom-reports";

export interface CustomPrintPayload {
  templateName?: string;
  organizationName?: string;
  organizationSubtitle?: string;
  logoUrl?: string;
  columns: CustomReportColumnDef[];
  rows: Record<string, string | number | boolean | null>[];
  filters: CustomReportFilters;
  layout: CustomReportLayoutBlock[];
  total?: number;
}

function filtersSummary(filters: CustomReportFilters): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(filters)) {
    if (v !== undefined && v !== null && v !== "") parts.push(`${k}: ${v}`);
  }
  return parts.length ? parts.join(" · ") : "None";
}

interface Props {
  data: CustomPrintPayload;
}

export function CustomPrintableReport({ data }: Props) {
  const blocks =
    data.layout?.length > 0
      ? data.layout
      : ([
          { id: "h", type: "header" as const, props: {} },
          {
            id: "t",
            type: "title" as const,
            props: { title: data.templateName ?? "Custom report" },
          },
          { id: "f", type: "filters_summary" as const, props: {} },
          { id: "tbl", type: "table" as const, props: {} },
          {
            id: "ft",
            type: "footer" as const,
            props: { footerText: "Generated from CRMC AIMS Custom Reports" },
          },
        ] satisfies CustomReportLayoutBlock[]);

  return (
    <div className="custom-print-root bg-white text-black p-6 max-w-[210mm] mx-auto">
      <style>{`
        @media print {
          body { background: white !important; }
          .custom-print-root { padding: 0 !important; max-width: none !important; }
          .page-break { break-before: page; page-break-before: always; }
        }
        .custom-print-root table { border-collapse: collapse; width: 100%; font-size: 11px; }
        .custom-print-root th, .custom-print-root td {
          border: 1px solid #ccc; padding: 4px 6px; text-align: left;
        }
        .custom-print-root th { background: #f5f5f5; font-weight: 600; }
      `}</style>

      {blocks.map((block) => {
        if (block.type === "header") {
          const logo = block.props?.logoUrl || data.logoUrl || "/CRMC LOGO.png";
          const org = block.props?.orgName || data.organizationName || "Institution";
          const sub = block.props?.orgSubtitle || data.organizationSubtitle;
          return (
            <header key={block.id} className="flex items-center gap-3 mb-4 border-b border-gray-300 pb-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logo} alt="" className="w-14 h-14 object-contain" />
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
              <strong>Applied filters:</strong> {filtersSummary(data.filters)}
            </p>
          );
        }

        if (block.type === "table") {
          return (
            <table key={block.id} className="mb-4">
              <thead>
                <tr>
                  {data.columns.map((c) => (
                    <th key={c.key}>{c.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row, idx) => (
                  <tr key={idx}>
                    {data.columns.map((c) => (
                      <td key={c.key}>
                        {row[c.key] === null || row[c.key] === undefined
                          ? "—"
                          : String(row[c.key])}
                      </td>
                    ))}
                  </tr>
                ))}
                {data.rows.length === 0 && (
                  <tr>
                    <td colSpan={Math.max(data.columns.length, 1)}>No data</td>
                  </tr>
                )}
              </tbody>
            </table>
          );
        }

        if (block.type === "footer") {
          return (
            <footer key={block.id} className="mt-6 pt-3 border-t border-gray-300 text-xs text-gray-600">
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
