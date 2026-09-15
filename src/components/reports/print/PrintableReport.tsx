"use client";

import {
  PrintDonutChart,
  PrintBarChart,
  PrintGaugeChart,
  type DonutDatum,
  type BarSeriesKey,
} from "./PrintCharts";

export interface ReportKpi {
  label: string;
  value: string;
  delta?: string;
  deltaDirection?: "up" | "down" | "neutral";
}

export interface ChartBlock {
  type: "donut" | "bar" | "gauge";
  title: string;
  donutData?: DonutDatum[];
  barData?: Record<string, string | number>[];
  barKeys?: BarSeriesKey[];
  gaugeValue?: number;
  gaugeLabel?: string;
}

export interface TableColumn {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
}

export interface TableBlock {
  title: string;
  columns: TableColumn[];
  rows: Record<string, string | number>[];
}

export interface ReportSection {
  id: string;
  title: string;
  kpis: ReportKpi[];
  charts?: ChartBlock[];
  table?: TableBlock;
  pageBreakBefore?: boolean;
}

export interface PrintableReportProps {
  organizationName?: string;
  organizationSubtitle?: string;
  reportTitle: string;
  generatedAt?: Date;
  periodLabel?: string;
  filtersSummary?: string;
  sections: ReportSection[];
}

function DeltaBadge({ delta, direction }: { delta?: string; direction?: ReportKpi["deltaDirection"] }) {
  if (!delta) return null;
  const color =
    direction === "down" ? "text-red-700" : direction === "neutral" ? "text-neutral-600" : "text-emerald-700";
  return <span className={`text-[9px] font-semibold ${color}`}>{delta}</span>;
}

function KpiRow({ kpis }: { kpis: ReportKpi[] }) {
  return (
    <div className="avoid-break grid grid-cols-4 gap-2">
      {kpis.map((kpi) => (
        <div key={kpi.label} className="rounded-xs border border-neutral-300 bg-neutral-50/50 p-2">
          <div className="text-[9px] font-bold uppercase tracking-wider text-neutral-600">{kpi.label}</div>
          <div className="mt-0.5 flex items-baseline gap-1.5">
            <span className="text-sm font-extrabold text-[#2A3260]">{kpi.value}</span>
            <DeltaBadge delta={kpi.delta} direction={kpi.deltaDirection} />
          </div>
        </div>
      ))}
    </div>
  );
}

function ChartsRow({ charts }: { charts: ChartBlock[] }) {
  return (
    <div className="mt-2.5 grid grid-cols-2 gap-3">
      {charts.map((chart) => {
        if (chart.type === "donut" && chart.donutData) {
          return <PrintDonutChart key={chart.title} title={chart.title} data={chart.donutData} />;
        }
        if (chart.type === "bar" && chart.barData && chart.barKeys) {
          return (
            <PrintBarChart key={chart.title} title={chart.title} data={chart.barData} seriesKeys={chart.barKeys} />
          );
        }
        if (chart.type === "gauge" && chart.gaugeValue !== undefined) {
          return (
            <PrintGaugeChart
              key={chart.title}
              title={chart.title}
              value={chart.gaugeValue}
              label={chart.gaugeLabel}
            />
          );
        }
        return null;
      })}
    </div>
  );
}

function ReportTable({ table }: { table: TableBlock }) {
  return (
    <div className="mt-2.5 rounded-xs border border-neutral-300 bg-white">
      <div className="border-b border-neutral-300 bg-neutral-100 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-neutral-700">
        {table.title}
      </div>
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="border-b border-neutral-300 bg-neutral-50 text-[9px] font-semibold text-neutral-600">
            {table.columns.map((col) => (
              <th key={col.key} className="py-1 px-2.5" style={{ textAlign: col.align ?? "left" }}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200">
          {table.rows.map((row, i) => (
            <tr key={i}>
              {table.columns.map((col) => (
                <td key={col.key} className="py-1 px-2.5 text-neutral-800" style={{ textAlign: col.align ?? "left" }}>
                  {row[col.key]}
                </td>
              ))}
            </tr>
          ))}
          {table.rows.length === 0 && (
            <tr>
              <td colSpan={table.columns.length} className="py-3 text-center text-neutral-400">
                No records for the selected period.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function PrintableReport({
  organizationName = "Cebu Roosevelt Memorial Colleges, Inc.",
  organizationSubtitle = "Asset & Inventory Management System (CRMC-AIMS)",
  reportTitle,
  generatedAt = new Date(),
  periodLabel,
  filtersSummary,
  sections,
}: PrintableReportProps) {
  return (
    <div className="print-page mx-auto w-full max-w-[7.6in] bg-white text-[#1B2140] text-xs leading-tight font-sans">
      <header className="avoid-break mb-3 flex items-start justify-between border-b-2 border-[#2A3260] pb-2.5">
        <div>
          <div className="text-[9px] font-bold tracking-widest text-[#FF4E45] uppercase">
            Upper Pandan, Bogo City, Cebu, Philippines
          </div>
          <div className="text-sm font-extrabold tracking-tight text-[#2A3260] uppercase">{organizationName}</div>
          {organizationSubtitle && <div className="text-[11px] font-semibold text-neutral-600">{organizationSubtitle}</div>}
        </div>
        <div className="rounded-xs border border-neutral-300 bg-neutral-50 px-2.5 py-1 text-right font-mono text-[9px] space-y-0.5 shrink-0">
          <div>Generated: <span className="font-medium text-neutral-800">{generatedAt.toLocaleDateString("en-PH")}</span></div>
          {periodLabel && <div>Period: <span className="font-medium text-neutral-800">{periodLabel}</span></div>}
        </div>
      </header>

      <div className="mb-3">
        <h1 className="text-xs font-bold uppercase tracking-wide text-[#2A3260]">{reportTitle}</h1>
        {filtersSummary && <p className="text-[9px] text-neutral-500 mt-0.5">{filtersSummary}</p>}
      </div>

      {sections.map((section) => (
        <section key={section.id} className={`mb-4 ${section.pageBreakBefore ? "page-break-before" : ""}`}>
          <h2 className="avoid-break mb-1.5 border-b border-neutral-200 pb-0.5 text-[11px] font-bold uppercase tracking-wider text-[#2A3260]">
            {section.title}
          </h2>
          <KpiRow kpis={section.kpis} />
          {section.charts && section.charts.length > 0 && <ChartsRow charts={section.charts} />}
          {section.table && <ReportTable table={section.table} />}
        </section>
      ))}

      {/* ─── Institutional Footer ───────────────────────────────────────── */}
      <footer className="avoid-break mt-6 pt-3 border-t border-neutral-300">
        <div className="flex items-center justify-between text-[9px] text-neutral-500 font-mono">
          <div>Cebu Roosevelt Memorial Colleges, Inc. · Upper Pandan, Bogo City, Cebu 6010</div>
          <div>
            CRMC-AIMS Report · Generated {generatedAt.toLocaleDateString("en-PH")}
          </div>
        </div>
      </footer>
    </div>
  );
}
