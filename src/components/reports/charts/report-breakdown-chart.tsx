"use client";

import { cn } from "@/lib/utils";

interface BreakdownItem {
  name: string;
  count: number;
  value?: number;
}

interface ReportBreakdownChartProps {
  data: BreakdownItem[];
  showValue?: boolean;
}

export function ReportBreakdownChart({
  data,
  showValue = false,
}: ReportBreakdownChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-[240px] items-center justify-center text-xs text-text-secondary">
        No category distribution recorded yet.
      </div>
    );
  }

  const maxVal = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="flex flex-col justify-center space-y-3.5 my-auto py-2">
      {data.map((row, idx) => {
        const percentage = Math.min(100, Math.round((row.count / maxVal) * 100));

        return (
          <div key={row.name} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-text truncate capitalize">
                {row.name.replace(/_/g, " ")}
              </span>
              <div className="flex items-center gap-2">
                {showValue && row.value != null && (
                  <span className="font-mono text-[10px] text-text-secondary">
                    ₱{Number(row.value).toLocaleString()}
                  </span>
                )}
                <span className="font-mono font-bold text-text text-[11px]">
                  {row.count.toLocaleString()} units
                </span>
              </div>
            </div>

            {/* Progress bar track */}
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-bg-subtle border border-border/40">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500 ease-out",
                  idx === 0
                    ? "bg-primary"
                    : idx === 1
                    ? "bg-accent"
                    : idx === 2
                    ? "bg-primary/70"
                    : idx === 3
                    ? "bg-accent/70"
                    : "bg-primary/40"
                )}
                style={{ width: `${Math.max(percentage, 6)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
