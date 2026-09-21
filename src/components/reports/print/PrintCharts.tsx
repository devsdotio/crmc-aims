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
      className={`avoid-break grid divide-x divide-black rounded-xs border border-black bg-white p-2.5 text-black ${className}`}
      style={{ gridTemplateColumns: `repeat(${metrics.length}, minmax(0, 1fr))` }}
    >
      {metrics.map((m, idx) => (
        <div key={idx} className="px-2.5 first:pl-1 last:pr-1">
          <div className="text-[9.5px] font-bold uppercase tracking-wider text-black truncate">
            {m.label}
          </div>
          <div className="mt-0.5 flex items-baseline gap-1.5 flex-wrap">
            <span className="text-[14px] font-extrabold text-black font-mono tracking-tight">
              {m.value}
            </span>
            {m.delta && (
              <span className="text-[8.5px] font-bold px-1 py-0.5 rounded-xs border border-black text-black">
                {m.delta}
              </span>
            )}
          </div>
          {m.subtext && (
            <div className="mt-0.5 text-[8.5px] text-black truncate">
              {m.subtext}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * Status Badge for Tables & Lists (Pure Black Ink)
 */
export function PrintStatusBadge({
  status,
  label,
}: {
  status: string;
  label?: string;
}) {
  const text = label || status;

  return (
    <span className="inline-flex items-center rounded-xs px-1.5 py-0.5 text-[9px] font-bold font-mono uppercase border border-black text-black bg-white">
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
    <div className={`avoid-break rounded-xs border border-neutral-200 bg-white p-3 ${className}`}>
      {title && (
        <h4 className="mb-2 text-[11.5px] font-bold uppercase tracking-wider text-teal-800">
          {title}
        </h4>
      )}
      <div className="space-y-2">
        {items.map((item, idx) => {
          const pct = Math.min(100, Math.max(4, Math.round((item.value / calculatedMax) * 100)));
          const barColor = item.color || "#0D9488";

          return (
            <div key={idx} className="flex items-center gap-3 text-[11px]">
              <div className="w-36 shrink-0 font-semibold text-neutral-800 truncate">
                {item.label}
              </div>
              <div className="flex-1 bg-neutral-100 h-3 rounded-xs overflow-hidden flex items-center">
                <div
                  className="h-full rounded-xs transition-all duration-300"
                  style={{ width: `${pct}%`, backgroundColor: barColor }}
                />
              </div>
              <div className="w-20 shrink-0 text-right font-bold text-neutral-900 font-mono text-[11px]">
                {item.displayValue || `${item.value.toLocaleString()}${valueSuffix}`}
              </div>
            </div>
          );
        })}
        {items.length === 0 && (
          <div className="text-[11px] text-neutral-400 italic py-1">No distribution data available</div>
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
  height = 110,
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
    <div className={`avoid-break rounded-xs border border-neutral-200 bg-white p-3 flex flex-col justify-between ${className}`}>
      <h4 className="mb-1 text-[11.5px] font-bold uppercase tracking-wider text-teal-800">
        {title}
      </h4>
      <div className="flex items-end justify-between gap-2 pt-4 pb-1" style={{ height: `${height}px` }}>
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
              <span className="text-[9.5px] font-bold font-mono text-neutral-800 mb-1 whitespace-nowrap">
                {display}
              </span>
              <div
                className="w-full max-w-12 rounded-t-xs"
                style={{ height: `${heightPct}%`, backgroundColor: barColor }}
              />
              <span className="text-[10px] font-medium text-neutral-700 mt-1 truncate max-w-16 text-center">
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
    <div className={`avoid-break rounded-r-md border-l-4 border-teal-600 bg-teal-50/50 p-3 ${className}`}>
      <div className="text-[11px] font-bold uppercase tracking-wider text-teal-800 mb-1.5 flex items-center gap-1.5">
        <span className="inline-block h-2 w-2 rounded-full bg-teal-600" />
        {title}
      </div>
      <ul className="space-y-1 text-[11px] text-neutral-800 leading-normal">
        {observations.map((obs, idx) => (
          <li key={idx} className="flex items-start gap-2">
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
    <div className={`avoid-break pt-4 border-t border-black grid grid-cols-3 gap-6 ${className}`}>
      {signers.map((s, idx) => (
        <div key={idx} className="text-center">
          <div className="h-7 border-b border-black mx-auto w-4/5" />
          <div className="mt-1 text-[10px] font-bold text-black uppercase">{s.name}</div>
          <div className="text-[8.5px] text-black uppercase tracking-wider">{s.role}</div>
          {s.title && <div className="text-[8px] text-black italic">{s.title}</div>}
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
  pieSize = 110,
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
    <div className={`avoid-break rounded-xs border border-neutral-200 bg-white p-3 overflow-hidden flex flex-col justify-between ${className}`}>
      <h4 className="mb-2 text-[11.5px] font-bold uppercase tracking-wider text-teal-800">
        {title}
      </h4>
      <div className="flex items-center gap-4 my-auto">
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
        <ul className="flex-1 space-y-1.5 text-[11px]">
          {data.map((d, i) => {
            const color = d.color ?? PRINT_PALETTE[i % PRINT_PALETTE.length];
            const pct = total ? Math.round((d.value / total) * 100) : 0;
            const displayVal = valueFormatter
              ? valueFormatter(d.value)
              : d.value.toLocaleString();

            return (
              <li
                key={d.name}
                className="flex items-center justify-between gap-2 border-b border-neutral-100 pb-1 last:border-0"
              >
                <span className="flex items-center gap-2 text-neutral-800 font-medium truncate">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-xs"
                    style={{ backgroundColor: color }}
                  />
                  <span className="truncate text-[11px]">{d.name}</span>
                </span>
                <span className="font-bold text-neutral-900 shrink-0 text-right text-[11px]">
                  {displayVal}{" "}
                  <span className="text-[10px] font-normal text-neutral-500">
                    ({pct}%)
                  </span>
                </span>
              </li>
            );
          })}
          {data.length === 0 && (
            <li className="text-[10.5px] text-neutral-400 italic">No category data recorded</li>
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
  height = 125,
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
    <div className={`avoid-break rounded-xs border border-neutral-200 bg-white p-3 overflow-hidden flex flex-col justify-between ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-[11.5px] font-bold uppercase tracking-wider text-teal-800">
          {title}
        </h4>
        <div className="flex items-center gap-3 text-[10.5px] text-neutral-700 font-medium">
          {seriesKeys.map((s) => (
            <span key={s.key} className="flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-xs"
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
            tick={{ fontSize: 10, fill: "#374151" }}
            axisLine={{ stroke: "#D1D5DB" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "#374151" }}
            axisLine={false}
            tickLine={false}
            width={45}
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
    <div className={`avoid-break rounded-xs border border-neutral-200 bg-white p-3 overflow-hidden flex flex-col items-center justify-between text-center ${className}`}>
      <h4 className="w-full text-left text-[11.5px] font-bold uppercase tracking-wider text-teal-800 mb-0.5">
        {title}
      </h4>
      <div className="relative my-auto flex flex-col items-center">
        <RadialBarChart
          width={130}
          height={80}
          cx="50%"
          cy="95%"
          innerRadius={46}
          outerRadius={68}
          barSize={10}
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
        <div className="-mt-6">
          <span className="text-xl font-extrabold text-neutral-900 tracking-tight">
            {value}%
          </span>
        </div>
      </div>
      {(label || sublabel) && (
        <div className="mt-1">
          {label && (
            <div className="text-[11px] font-bold text-neutral-800">{label}</div>
          )}
          {sublabel && (
            <div className="text-[9.5px] text-neutral-500">{sublabel}</div>
          )}
        </div>
      )}
    </div>
  );
}
