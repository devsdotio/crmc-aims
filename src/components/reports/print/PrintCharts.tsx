"use client";

import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
} from "recharts";

// CRMC-AIMS Institutional Palette (Teal & Navy primary)
export const PRINT_PALETTE = [
  "#0D9488", // Primary Teal
  "#14B8A6", // Light Teal
  "#0F766E", // Deep Teal
  "#2A3260", // Dark Navy
  "#6366F1", // Indigo
  "#F59E0B", // Amber
  "#EF4444", // Coral Red
  "#64748B", // Slate
];

export interface DonutDatum {
  name: string;
  value: number;
  color?: string;
}

/**
 * Connected Metric Row / Bar
 * Divides metrics in a single continuous card with vertical dividers
 */
export interface MetricItem {
  label: string;
  value: string | number;
  delta?: string;
  deltaType?: "positive" | "negative" | "warning" | "neutral";
  subtext?: string;
}

export function PrintMetricBar({
  metrics,
  className = "",
}: {
  metrics: MetricItem[];
  className?: string;
}) {
  return (
    <div
      className={`avoid-break grid divide-x divide-neutral-200 rounded-md border border-neutral-200 bg-white p-2.5 ${className}`}
      style={{ gridTemplateColumns: `repeat(${metrics.length}, minmax(0, 1fr))` }}
    >
      {metrics.map((m, idx) => {
        let deltaColor = "text-emerald-700 bg-emerald-50 border-emerald-200";
        if (m.deltaType === "negative") deltaColor = "text-rose-700 bg-rose-50 border-rose-200";
        if (m.deltaType === "warning") deltaColor = "text-amber-700 bg-amber-50 border-amber-200";
        if (m.deltaType === "neutral") deltaColor = "text-neutral-600 bg-neutral-100 border-neutral-200";

        return (
          <div key={idx} className={`px-2.5 first:pl-1 last:pr-1`}>
            <div className="text-[8.5px] font-bold uppercase tracking-wider text-neutral-500 truncate">
              {m.label}
            </div>
            <div className="mt-1 flex items-baseline gap-1.5 flex-wrap">
              <span className="text-[13.5px] font-extrabold text-neutral-900 tracking-tight">
                {m.value}
              </span>
              {m.delta && (
                <span className={`text-[8.5px] font-semibold px-1 py-0.2 rounded-xs border ${deltaColor}`}>
                  {m.delta}
                </span>
              )}
            </div>
            {m.subtext && (
              <div className="mt-0.5 text-[8px] text-neutral-500 truncate">
                {m.subtext}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Status Badge for Tables & Lists
 */
export function PrintStatusBadge({
  status,
  label,
}: {
  status: string;
  label?: string;
}) {
  const s = (status || "").toLowerCase();
  const text = label || status;

  let style = "bg-neutral-100 text-neutral-700 border-neutral-300";
  if (s.includes("active") || s.includes("fulfilled") || s.includes("approved") || s.includes("completed") || s.includes("optimal") || s.includes("good")) {
    style = "bg-emerald-50 text-emerald-800 border-emerald-200";
  } else if (s.includes("repair") || s.includes("pending") || s.includes("low") || s.includes("ordered") || s.includes("preventive")) {
    style = "bg-amber-50 text-amber-800 border-amber-200";
  } else if (s.includes("reorder") || s.includes("reject") || s.includes("breach") || s.includes("corrective") || s.includes("critical")) {
    style = "bg-rose-50 text-rose-800 border-rose-200";
  } else if (s.includes("draft") || s.includes("retired")) {
    style = "bg-slate-100 text-slate-700 border-slate-300";
  }

  return (
    <span className={`inline-flex items-center rounded-xs px-1.5 py-0.5 text-[8.5px] font-semibold border ${style}`}>
      {text}
    </span>
  );
}

/**
 * Horizontal Progress Bar Distribution
 * (e.g. Assets by Department, Assets by Location, Turnaround time)
 */
export interface DistributionItem {
  label: string;
  value: number;
  displayValue?: string;
  color?: string;
}

export function PrintHorizontalDistribution({
  title,
  items,
  maxVal,
  valueSuffix = "",
  className = "",
}: {
  title?: string;
  items: DistributionItem[];
  maxVal?: number;
  valueSuffix?: string;
  className?: string;
}) {
  const calculatedMax = maxVal || Math.max(...items.map((i) => i.value), 1);

  return (
    <div className={`avoid-break rounded-xs border border-neutral-200 bg-white p-2.5 ${className}`}>
      {title && (
        <h4 className="mb-2 text-[9.5px] font-bold uppercase tracking-wider text-teal-800">
          {title}
        </h4>
      )}
      <div className="space-y-1.5">
        {items.map((item, idx) => {
          const pct = Math.min(100, Math.max(4, Math.round((item.value / calculatedMax) * 100)));
          const barColor = item.color || "#0D9488";

          return (
            <div key={idx} className="flex items-center gap-2 text-[10px]">
              <div className="w-24 shrink-0 font-medium text-neutral-700 truncate">
                {item.label}
              </div>
              <div className="flex-1 bg-neutral-100 h-2.5 rounded-xs overflow-hidden flex items-center">
                <div
                  className="h-full rounded-xs transition-all duration-300"
                  style={{ width: `${pct}%`, backgroundColor: barColor }}
                />
              </div>
              <div className="w-12 shrink-0 text-right font-bold text-neutral-800 font-mono text-[9.5px]">
                {item.displayValue || `${item.value.toLocaleString()}${valueSuffix}`}
              </div>
            </div>
          );
        })}
        {items.length === 0 && (
          <div className="text-[9.5px] text-neutral-400 italic py-1">No distribution data available</div>
        )}
      </div>
    </div>
  );
}

/**
 * Vertical Value Bar Chart with Top Values
 * (e.g. Value by Category, Monthly Usage)
 */
export function PrintVerticalValueBars({
  title,
  data,
  valueFormatter,
  className = "",
  barColor = "#0D9488",
  height = 100,
}: {
  title: string;
  data: { label: string; value: number }[];
  valueFormatter?: (val: number) => string;
  className?: string;
  barColor?: string;
  height?: number;
}) {
  const maxVal = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className={`avoid-break rounded-xs border border-neutral-200 bg-white p-2.5 flex flex-col justify-between ${className}`}>
      <h4 className="mb-1 text-[9.5px] font-bold uppercase tracking-wider text-teal-800">
        {title}
      </h4>
      <div className="flex items-end justify-between gap-1.5 pt-4 pb-1" style={{ height: `${height}px` }}>
        {data.map((d, i) => {
          const heightPct = Math.max(8, Math.min(100, Math.round((d.value / maxVal) * 100)));
          const display = valueFormatter
            ? valueFormatter(d.value)
            : d.value >= 1000000
            ? `${(d.value / 1000000).toFixed(1)}M`
            : d.value >= 1000
            ? `${(d.value / 1000).toFixed(0)}k`
            : d.value.toLocaleString();

          return (
            <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group">
              <span className="text-[7.5px] font-bold font-mono text-neutral-700 mb-0.5 whitespace-nowrap">
                {display}
              </span>
              <div
                className="w-full max-w-10 rounded-t-xs"
                style={{ height: `${heightPct}%`, backgroundColor: barColor }}
              />
              <span className="text-[8px] font-medium text-neutral-600 mt-1 truncate max-w-12 text-center">
                {d.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Key Observations Callout Box
 */
export function PrintObservationsBox({
  title = "KEY OBSERVATIONS",
  observations,
  className = "",
}: {
  title?: string;
  observations: string[];
  className?: string;
}) {
  if (!observations || observations.length === 0) return null;

  return (
    <div className={`avoid-break rounded-r-md border-l-4 border-teal-600 bg-teal-50/50 p-2.5 ${className}`}>
      <div className="text-[9.5px] font-bold uppercase tracking-wider text-teal-800 mb-1 flex items-center gap-1.5">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-teal-600" />
        {title}
      </div>
      <ul className="space-y-0.5 text-[9.5px] text-neutral-700 leading-snug">
        {observations.map((obs, idx) => (
          <li key={idx} className="flex items-start gap-1.5">
            <span className="text-teal-700 font-bold">•</span>
            <span>{obs}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Formal Signatories Block
 */
export function PrintSignatories({
  signers = [
    { name: "Juan Dela Cruz", role: "Prepared by" },
    { name: "Maria Santos", role: "Reviewed by" },
    { name: "Dr. Jose Rizal", role: "Approved by" },
  ],
  className = "",
}: {
  signers?: { name: string; role: string; title?: string }[];
  className?: string;
}) {
  return (
    <div className={`avoid-break pt-4 border-t border-neutral-200 grid grid-cols-3 gap-6 ${className}`}>
      {signers.map((s, idx) => (
        <div key={idx} className="text-center">
          <div className="h-6 border-b border-neutral-400 mx-auto w-4/5" />
          <div className="mt-1 text-[9.5px] font-bold text-neutral-800">{s.name}</div>
          <div className="text-[8px] text-neutral-500 uppercase tracking-wider">{s.role}</div>
          {s.title && <div className="text-[7.5px] text-neutral-400 italic">{s.title}</div>}
        </div>
      ))}
    </div>
  );
}

/**
 * Donut Chart with Count and Percentage Legend
 */
export function PrintDonutChart({
  title,
  data,
  valueFormatter,
  className = "",
  pieSize = 100,
}: {
  title: string;
  data: DonutDatum[];
  valueFormatter?: (val: number) => string;
  className?: string;
  pieSize?: number;
}) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const outerRadius = Math.round(pieSize * 0.46);
  const innerRadius = Math.round(pieSize * 0.28);

  return (
    <div className={`avoid-break rounded-xs border border-neutral-200 bg-white p-2.5 overflow-hidden flex flex-col justify-between ${className}`}>
      <h4 className="mb-1 text-[9.5px] font-bold uppercase tracking-wider text-teal-800">
        {title}
      </h4>
      <div className="flex items-center gap-3 my-auto">
        <div className="shrink-0 flex items-center justify-center">
          <PieChart width={pieSize} height={pieSize}>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={innerRadius}
              outerRadius={outerRadius}
              isAnimationActive={false}
              stroke="#ffffff"
              strokeWidth={1.5}
            >
              {data.map((entry, i) => (
                <Cell
                  key={`cell-${entry.name}-${i}`}
                  fill={entry.color ?? PRINT_PALETTE[i % PRINT_PALETTE.length]}
                />
              ))}
            </Pie>
          </PieChart>
        </div>
        <ul className="flex-1 space-y-1 text-xs">
          {data.map((d, i) => {
            const color = d.color ?? PRINT_PALETTE[i % PRINT_PALETTE.length];
            const pct = total ? Math.round((d.value / total) * 100) : 0;
            const displayVal = valueFormatter
              ? valueFormatter(d.value)
              : d.value.toLocaleString();

            return (
              <li
                key={d.name}
                className="flex items-center justify-between gap-1.5 border-b border-neutral-100 pb-0.5 last:border-0"
              >
                <span className="flex items-center gap-1.5 text-neutral-700 font-medium truncate max-w-35">
                  <span
                    className="h-2 w-2 shrink-0 rounded-xs"
                    style={{ backgroundColor: color }}
                  />
                  <span className="truncate text-[9.5px]">{d.name}</span>
                </span>
                <span className="font-bold text-neutral-900 shrink-0 text-right text-[9.5px]">
                  {displayVal}{" "}
                  <span className="text-[8.5px] font-normal text-neutral-500">
                    ({pct}%)
                  </span>
                </span>
              </li>
            );
          })}
          {data.length === 0 && (
            <li className="text-[9px] text-neutral-400 italic">No category data recorded</li>
          )}
        </ul>
      </div>
    </div>
  );
}

export interface BarSeriesKey {
  key: string;
  label: string;
  color: string;
}

export function PrintBarChart({
  title,
  data,
  seriesKeys,
  valueFormatter,
  width = 680,
  height = 115,
  className = "",
}: {
  title: string;
  data: Record<string, string | number>[];
  seriesKeys: BarSeriesKey[];
  valueFormatter?: (val: number) => string;
  width?: number;
  height?: number;
  className?: string;
}) {
  return (
    <div className={`avoid-break rounded-xs border border-neutral-200 bg-white p-2.5 overflow-hidden flex flex-col justify-between ${className}`}>
      <div className="flex items-center justify-between mb-1.5">
        <h4 className="text-[9.5px] font-bold uppercase tracking-wider text-teal-800">
          {title}
        </h4>
        <div className="flex items-center gap-3 text-[8.5px] text-neutral-600 font-medium">
          {seriesKeys.map((s) => (
            <span key={s.key} className="flex items-center gap-1">
              <span
                className="h-1.5 w-1.5 rounded-xs"
                style={{ backgroundColor: s.color }}
              />
              {s.label}
            </span>
          ))}
        </div>
      </div>

      <div className="w-full overflow-hidden flex items-center justify-center">
        <BarChart
          width={width}
          height={height}
          data={data}
          margin={{ top: 4, right: 10, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="2 2" vertical={false} stroke="#E5E7EB" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 8.5, fill: "#4B5563" }}
            axisLine={{ stroke: "#D1D5DB" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 8.5, fill: "#4B5563" }}
            axisLine={false}
            tickLine={false}
            width={40}
            tickFormatter={(v) =>
              valueFormatter
                ? valueFormatter(v)
                : v >= 1000
                ? `${(v / 1000).toFixed(0)}k`
                : v
            }
          />
          {seriesKeys.map((s) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.label}
              fill={s.color}
              isAnimationActive={false}
              radius={[1, 1, 0, 0]}
            />
          ))}
        </BarChart>
      </div>
    </div>
  );
}

export function PrintGaugeChart({
  title,
  value,
  label,
  sublabel,
  className = "",
}: {
  title: string;
  value: number; // 0–100
  label?: string;
  sublabel?: string;
  className?: string;
}) {
  const data = [{ name: "value", value, fill: "#0D9488" }];

  return (
    <div className={`avoid-break rounded-xs border border-neutral-200 bg-white p-2.5 overflow-hidden flex flex-col items-center justify-between text-center ${className}`}>
      <h4 className="w-full text-left text-[9.5px] font-bold uppercase tracking-wider text-teal-800 mb-0.5">
        {title}
      </h4>
      <div className="relative my-auto flex flex-col items-center">
        <RadialBarChart
          width={120}
          height={75}
          cx="50%"
          cy="95%"
          innerRadius={42}
          outerRadius={62}
          barSize={9}
          data={data}
          startAngle={180}
          endAngle={0}
        >
          <PolarAngleAxis
            type="number"
            domain={[0, 100]}
            angleAxisId={0}
            tick={false}
          />
          <RadialBar
            background={{ fill: "#F3F4F6" }}
            dataKey="value"
            cornerRadius={2}
            isAnimationActive={false}
          />
        </RadialBarChart>
        <div className="-mt-5">
          <span className="text-lg font-extrabold text-neutral-900 tracking-tight">
            {value}%
          </span>
        </div>
      </div>
      {(label || sublabel) && (
        <div className="mt-0.5">
          {label && (
            <div className="text-[10px] font-bold text-neutral-800">{label}</div>
          )}
          {sublabel && (
            <div className="text-[8.5px] text-neutral-500">{sublabel}</div>
          )}
        </div>
      )}
    </div>
  );
}
