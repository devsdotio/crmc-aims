"use client";

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

// CRMC-AIMS Institutional Palette
export const PRINT_PALETTE = [
  "#2A3260", // Primary Navy
  "#FF4E45", // Accent Coral
  "#10B981", // Emerald
  "#6366F1", // Indigo
  "#F59E0B", // Amber
  "#0284C7", // Sky Blue
  "#7C3AED", // Violet
  "#64748B", // Slate
];

export interface DonutDatum {
  name: string;
  value: number;
  color?: string;
}

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
    <div className={`avoid-break rounded-xs border border-neutral-300 bg-white p-3 overflow-hidden flex flex-col justify-between ${className}`}>
      <h4 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#2A3260]">
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
                <span className="flex items-center gap-1.5 text-neutral-700 font-medium truncate max-w-[140px]">
                  <span
                    className="h-2 w-2 shrink-0 rounded-xs"
                    style={{ backgroundColor: color }}
                  />
                  <span className="truncate text-[10.5px]">{d.name}</span>
                </span>
                <span className="font-semibold text-neutral-900 shrink-0 text-right text-[10.5px]">
                  {displayVal}{" "}
                  <span className="text-[9px] font-normal text-neutral-500">
                    ({pct}%)
                  </span>
                </span>
              </li>
            );
          })}
          {data.length === 0 && (
            <li className="text-[10px] text-neutral-400 italic">No category data recorded</li>
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
    <div className={`avoid-break rounded-xs border border-neutral-300 bg-white p-3 overflow-hidden flex flex-col justify-between ${className}`}>
      <div className="flex items-center justify-between mb-1.5">
        <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#2A3260]">
          {title}
        </h4>
        <div className="flex items-center gap-3 text-[9px] text-neutral-600 font-medium">
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
            tick={{ fontSize: 9, fill: "#4B5563" }}
            axisLine={{ stroke: "#D1D5DB" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 9, fill: "#4B5563" }}
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
  const data = [{ name: "value", value, fill: "#10B981" }];

  return (
    <div className={`avoid-break rounded-xs border border-neutral-300 bg-white p-3 overflow-hidden flex flex-col items-center justify-between text-center ${className}`}>
      <h4 className="w-full text-left text-[10px] font-bold uppercase tracking-wider text-[#2A3260] mb-0.5">
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
        <div className="mt-0.5">
          {label && (
            <div className="text-[10.5px] font-bold text-neutral-800">{label}</div>
          )}
          {sublabel && (
            <div className="text-[9px] text-neutral-500">{sublabel}</div>
          )}
        </div>
      )}
    </div>
  );
}
