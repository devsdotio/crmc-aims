"use client";

import {
  PrintDonutChart,
  PrintBarChart,
  PrintGaugeChart,
  PrintHorizontalDistribution,
  PrintVerticalValueBars,
  PrintMetricBar,
  PrintObservationsBox,
  PrintSignatories,
  PrintStatusBadge,
  type DonutDatum,
  type BarSeriesKey,
  type DistributionItem,
  type MetricItem,
} from "./PrintCharts";

export interface ReportKpi {
  label: string;
  value: string;
  delta?: string;
  deltaType?: "positive" | "negative" | "warning" | "neutral";
  subtext?: string;
}

export interface ChartBlock {
  type: "donut" | "bar" | "gauge" | "horizontal" | "vertical-values";
  title: string;
  donutData?: DonutDatum[];
  barData?: Record<string, string | number>[];
  barKeys?: BarSeriesKey[];
  gaugeValue?: number;
  gaugeLabel?: string;
  distributionItems?: DistributionItem[];
  verticalBarData?: { label: string; value: number }[];
  valueFormatter?: (val: number) => string;
}

export interface TableColumn {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
  isStatus?: boolean;
}

export interface TableBlock {
  title?: string;
  columns: TableColumn[];
  rows: Record<string, string | number>[];
}

export interface ReportSection {
  id: string;
  title: string;
  subtitle?: string;
  kpis?: ReportKpi[];
  charts?: ChartBlock[];
  table?: TableBlock;
  observations?: string[];
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
  signers?: { name: string; role: string; title?: string }[];
  showSignatories?: boolean;
  totalPages?: number;
}

function ChartsRow({ charts }: { charts: ChartBlock[] }) {
  return (
    <div className="mt-2 grid grid-cols-2 gap-2.5">
      {charts.map((chart, idx) => {
        if (chart.type === "donut" && chart.donutData) {
          return (
            <PrintDonutChart
              key={idx}
              title={chart.title}
              data={chart.donutData}
              valueFormatter={chart.valueFormatter}
            />
          );
        }
        if (chart.type === "bar" && chart.barData && chart.barKeys) {
          return (
            <PrintBarChart
              key={idx}
              title={chart.title}
              data={chart.barData}
              seriesKeys={chart.barKeys}
              valueFormatter={chart.valueFormatter}
              className="col-span-2"
            />
          );
        }
        if (chart.type === "gauge" && chart.gaugeValue !== undefined) {
          return (
            <PrintGaugeChart
              key={idx}
              title={chart.title}
              value={chart.gaugeValue}
              label={chart.gaugeLabel}
            />
          );
        }
        if (chart.type === "horizontal" && chart.distributionItems) {
          return (
            <PrintHorizontalDistribution
              key={idx}
              title={chart.title}
              items={chart.distributionItems}
            />
          );
        }
        if (chart.type === "vertical-values" && chart.verticalBarData) {
          return (
            <PrintVerticalValueBars
              key={idx}
              title={chart.title}
              data={chart.verticalBarData}
              valueFormatter={chart.valueFormatter}
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
    <div className="mt-2 rounded-xs border border-neutral-200 bg-white overflow-hidden">
      {table.title && (
        <div className="border-b border-neutral-200 bg-neutral-50 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-teal-800">
          {table.title}
        </div>
      )}
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="border-b border-neutral-200 bg-neutral-50 text-[8.5px] font-bold uppercase tracking-wider text-neutral-600">
            {table.columns.map((col) => (
              <th key={col.key} className="py-1 px-2" style={{ textAlign: col.align ?? "left" }}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100 text-neutral-800 text-[9.5px]">
          {table.rows.map((row, i) => (
            <tr key={i}>
              {table.columns.map((col) => {
                const val = row[col.key];
                return (
                  <td key={col.key} className="py-1 px-2" style={{ textAlign: col.align ?? "left" }}>
                    {col.isStatus ? (
                      <PrintStatusBadge status={String(val)} />
                    ) : (
                      String(val ?? "—")
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
          {table.rows.length === 0 && (
            <tr>
              <td colSpan={table.columns.length} className="py-3 text-center text-neutral-400 italic">
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
  organizationName = "CRMC-AIMS",
  organizationSubtitle = "Cebu Roosevelt Memorial Colleges, Inc. · Asset & Inventory Management System",
  reportTitle,
  generatedAt = new Date(),
  periodLabel,
  filtersSummary = "Department: All · Location: All",
  sections,
  signers,
  showSignatories = false,
  totalPages = 1,
}: PrintableReportProps) {
  const formattedDate = generatedAt.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const formattedTime = generatedAt.toLocaleTimeString("en-PH", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="print-page mx-auto w-full max-w-[7.6in] bg-white text-text text-xs leading-tight font-sans">
      {/* ─── Standard Report Header ───────────────────────────────────── */}
      <header className="avoid-break mb-2.5 border-b-2 border-[#2A3260] pb-2">
        <div className="flex items-start justify-between">
          <div className="space-y-0.5">
            <h1 className="text-base font-extrabold tracking-tight text-[#2A3260] uppercase">
              {organizationName}
            </h1>
            <div className="text-[10px] font-semibold text-neutral-600">
              {organizationSubtitle}
            </div>
            <div className="text-[8.5px] font-medium text-neutral-500">
              Upper Pandan, Bogo City, Cebu, Philippines
            </div>
          </div>
          <div className="rounded-xs border border-neutral-200 bg-neutral-50/80 px-2.5 py-1 text-right font-mono text-[8.5px] space-y-0.5 shrink-0">
            <div>
              <span className="text-neutral-500">Generated:</span>{" "}
              <span className="font-semibold text-neutral-800">{formattedDate}, {formattedTime}</span>
            </div>
            {periodLabel && (
              <div>
                <span className="text-neutral-500">Period:</span>{" "}
                <span className="font-semibold text-neutral-800">{periodLabel}</span>
              </div>
            )}
          </div>
        </div>

        <div className="mt-2 flex items-baseline justify-between border-t border-neutral-200 pt-1.5">
          <div>
            <h2 className="text-sm font-extrabold text-[#2A3260] tracking-tight uppercase">
              {reportTitle}
            </h2>
            {filtersSummary && (
              <div className="text-[9px] text-neutral-500 mt-0.5">{filtersSummary}</div>
            )}
          </div>
        </div>
      </header>

      {/* ─── Sections ─────────────────────────────────────────────────── */}
      <div className="space-y-3">
        {sections.map((section, idx) => (
          <section
            key={section.id}
            className={`avoid-break space-y-2 ${section.pageBreakBefore ? "break-before-page pt-3" : ""}`}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-teal-800">
                {section.title}
              </h3>
              {section.subtitle && (
                <span className="text-[8.5px] text-neutral-500">{section.subtitle}</span>
              )}
            </div>

            {section.kpis && section.kpis.length > 0 && (
              <PrintMetricBar
                metrics={section.kpis.map((k) => ({
                  label: k.label,
                  value: k.value,
                  delta: k.delta,
                  deltaType: k.deltaType,
                  subtext: k.subtext,
                }))}
              />
            )}

            {section.charts && section.charts.length > 0 && (
              <ChartsRow charts={section.charts} />
            )}

            {section.table && <ReportTable table={section.table} />}

            {section.observations && section.observations.length > 0 && (
              <PrintObservationsBox observations={section.observations} />
            )}
          </section>
        ))}
      </div>

      {/* ─── Optional Signatories ─────────────────────────────────────── */}
      {showSignatories && (
        <section className="avoid-break mt-4">
          <PrintSignatories signers={signers} />
        </section>
      )}

      {/* ─── Standard Report Footer ───────────────────────────────────── */}
      <footer className="avoid-break mt-3 pt-1.5 border-t border-neutral-200">
        <div className="flex items-center justify-between text-[8px] text-neutral-400 font-mono">
          <div>Cebu Roosevelt Memorial Colleges, Inc. · CRMC-AIMS</div>
          <div>Page 1 of {totalPages}</div>
          <div>
            CRMC-RPT-{generatedAt.getFullYear()}
            {String(generatedAt.getMonth() + 1).padStart(2, "0")}
          </div>
        </div>
      </footer>
    </div>
  );
}
