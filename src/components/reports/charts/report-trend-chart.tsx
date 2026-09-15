"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface TrendDataPoint {
  month: string;
  procurement: number;
  maintenance: number;
}

interface ReportTrendChartProps {
  data: TrendDataPoint[];
  canViewCosts?: boolean;
}

export function ReportTrendChart({
  data,
  canViewCosts = true,
}: ReportTrendChartProps) {
  if (!canViewCosts) {
    return (
      <div className="flex h-65 items-center justify-center rounded-2xl border border-dashed border-border text-xs text-text-secondary">
        Financial spend trends are restricted to administrative roles.
      </div>
    );
  }

  return (
    <div className="h-70 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 12, right: 12, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="procurementGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#000B58" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#000B58" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="maintenanceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#FF4E45" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#FF4E45" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
          <XAxis
            dataKey="month"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "#5A5F73", fontWeight: 600 }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 10, fill: "#5A5F73", fontFamily: "monospace" }}
            tickFormatter={(v) => `₱${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--card, #ffffff)",
              borderRadius: "12px",
              border: "1px solid var(--border, #E5E7EB)",
              fontSize: "12px",
              fontWeight: 600,
              boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
            }}
            formatter={(value: unknown) => [`₱${Number(value || 0).toLocaleString()}`, ""]}
          />
          <Legend
            verticalAlign="top"
            align="right"
            iconType="circle"
            wrapperStyle={{ fontSize: "11px", fontWeight: 600, paddingBottom: "12px" }}
          />
          <Area
            type="monotone"
            dataKey="procurement"
            name="Procurement Spend"
            stroke="#000B58"
            strokeWidth={2.5}
            fillOpacity={1}
            fill="url(#procurementGradient)"
          />
          <Area
            type="monotone"
            dataKey="maintenance"
            name="Maintenance Spend"
            stroke="#FF4E45"
            strokeWidth={2.5}
            fillOpacity={1}
            fill="url(#maintenanceGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
