"use client";

import { useState } from "react";
import { useCategoryStyleMap } from "@/features/categories/client/use-categories";
import { BarChart2, PieChart as PieChartIcon, X } from "lucide-react";
import {
  BarChart,
  Bar,
  type BarShapeProps,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart as RechartsPieChart,
  Pie,
  type PieSectorShapeProps,
  type PieSectorDataItem,
  Cell,
  ResponsiveContainer,
  Tooltip,
  type LabelProps,
  Sector,
} from "recharts";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CategoryCount {
  category: string;
  label: string;
  count: number;
}

export interface AssetsByCategoryChartProps {
  data: CategoryCount[];
  loading?: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function Skeleton({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={cn("animate-pulse rounded bg-border", className)}
      style={style}
      aria-hidden="true"
    />
  );
}

// Improved tooltip card used across charts
function ChartTooltipContent({
  item,
  total,
  categoryStyle,
}: {
  item: { label: string; value: number; category?: string };
  total?: number;
  categoryStyle?: { cssVar?: string; text?: string; bg?: string };
}) {
  const pct =
    total && total > 0 ? ((item.value / total) * 100).toFixed(1) : null;

  return (
    <div className="rounded-xl border border-border/80 bg-card/95 backdrop-blur-md px-3.5 py-2.5 shadow-xl min-w-44 z-50 animate-in fade-in-0 zoom-in-95 duration-150">
      <div className="flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-1.5 min-w-0">
          {categoryStyle?.cssVar && (
            <span
              className="h-2.5 w-2.5 rounded-full shrink-0 shadow-2xs"
              style={{ backgroundColor: categoryStyle.cssVar }}
            />
          )}
          <span className="text-xs font-bold text-text truncate">
            {item.label}
          </span>
        </div>
        {pct !== null && (
          <span className="text-[10px] font-black text-accent tabular-nums bg-accent/10 border border-accent/20 px-1.5 py-0.5 rounded shrink-0">
            {pct}%
          </span>
        )}
      </div>
      <div className="flex items-baseline justify-between gap-3 mt-2 pt-2 border-t border-border/60">
        <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider">
          Asset Count
        </span>
        <span className="text-xs font-extrabold tabular-nums text-text">
          {item.value.toLocaleString()} {item.value === 1 ? "unit" : "units"}
        </span>
      </div>
    </div>
  );
}

function BarTooltipWrapper({
  active,
  payload,
  total,
  getCategoryStyle,
}: {
  active?: boolean;
  payload?: Array<{ value: number; payload: { label: string; category?: string } }>;
  total?: number;
  getCategoryStyle: (category: string) => { cssVar?: string; text?: string; bg?: string };
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  const cat = item.payload.category || "";
  return (
    <ChartTooltipContent
      item={{
        label: item.payload.label,
        value: item.value,
        category: cat,
      }}
      total={total}
      categoryStyle={getCategoryStyle(cat)}
    />
  );
}

interface CustomBarShapeProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  fill?: string;
  payload?: { category?: string };
  selectedCategory?: string | null;
  onSelect?: (category: string) => void;
}

// Custom bar shape to zoom in active bar without black borders
function CustomBarShape(props: CustomBarShapeProps) {
  const { x = 0, y = 0, width = 0, height = 0, fill, payload, selectedCategory, onSelect } = props;
  const isSelected = selectedCategory === payload?.category;
  const isDimmed = selectedCategory !== null && !isSelected;

  const barY = isSelected ? Number(y) - 2 : Number(y);
  const barHeight = isSelected ? Number(height) + 4 : Number(height);
  const barWidth = isSelected ? Number(width) + 5 : Number(width);

  return (
    <rect
      x={x}
      y={barY}
      width={Math.max(0, barWidth)}
      height={Math.max(0, barHeight)}
      rx={isSelected ? 6 : 4}
      ry={isSelected ? 6 : 4}
      fill={fill}
      opacity={isDimmed ? 0.25 : 1}
      onClick={() => {
        if (payload?.category) onSelect?.(payload.category);
      }}
      style={{
        filter: isSelected ? "drop-shadow(0 2px 6px rgba(0,0,0,0.18))" : "none",
        transition: "all 0.2s ease-in-out",
        cursor: "pointer",
      }}
    />
  );
}

interface CustomPieSectorProps {
  cx?: number;
  cy?: number;
  innerRadius?: number;
  outerRadius?: number;
  startAngle?: number;
  endAngle?: number;
  fill?: string;
  payload?: { category?: string };
  selectedCategory?: string | null;
  onSelect?: (category: string) => void;
  onHover?: (hoverData: { category: string; midAngle: number } | null) => void;
}

// Custom pie sector to zoom in active slice without borders
function CustomPieSector(props: CustomPieSectorProps) {
  const {
    cx,
    cy,
    innerRadius,
    outerRadius,
    startAngle = 0,
    endAngle = 0,
    fill,
    payload,
    selectedCategory,
    onSelect,
    onHover,
  } = props;
  const isSelected = selectedCategory === payload?.category;
  const isDimmed = selectedCategory !== null && !isSelected;

  const actualInner = isSelected ? Number(innerRadius ?? 0) - 3 : Number(innerRadius ?? 0);
  const actualOuter = isSelected ? Number(outerRadius ?? 0) + 8 : Number(outerRadius ?? 0);

  return (
    <g
      onClick={() => {
        if (payload?.category) onSelect?.(payload.category);
      }}
      onMouseEnter={() => {
        const midAngle = (startAngle + endAngle) / 2;
        if (payload?.category) {
          onHover?.({ category: payload.category, midAngle });
        }
      }}
      onMouseLeave={() => onHover?.(null)}
      className="cursor-pointer transition-all duration-200"
    >
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={actualInner}
        outerRadius={actualOuter}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        opacity={isDimmed ? 0.25 : 1}
        stroke="none"
        strokeWidth={0}
        style={{
          filter: isSelected ? "drop-shadow(0 4px 10px rgba(0, 0, 0, 0.22))" : "none",
        }}
      />
    </g>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export function AssetsByCategoryChart({
  data,
  loading = false,
}: AssetsByCategoryChartProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [hoveredSlice, setHoveredSlice] = useState<{
    category: string;
    midAngle: number;
  } | null>(null);
  const { getCategoryStyle } = useCategoryStyleMap();
  const total = data.reduce((sum, d) => sum + d.count, 0);

  const selectedItem = data.find((d) => d.category === selectedCategory);
  const hoveredItem = hoveredSlice
    ? data.find((d) => d.category === hoveredSlice.category)
    : null;
  const isSliceOnLeft = hoveredSlice
    ? Math.cos((hoveredSlice.midAngle * Math.PI) / 180) < 0
    : false;

  function handleToggleCategory(category: string) {
    setSelectedCategory((prev) => (prev === category ? null : category));
  }

  return (
    <section
      className="flex flex-col h-100 rounded-lg border border-border bg-card overflow-hidden shadow-xs"
      aria-labelledby="assets-by-category-heading"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-7 w-7 rounded-lg bg-category-av-bg/15 border border-category-av-bg/30 flex items-center justify-center text-category-av-bg shrink-0">
            <BarChart2 className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h2
              id="assets-by-category-heading"
              className="text-sm font-bold text-text leading-none truncate"
            >
              Assets by Category
            </h2>
            {!loading && (
              <p className="text-xs text-text-secondary mt-1 truncate">
                {total.toLocaleString()} fixed asset{total !== 1 ? "s" : ""} registered
              </p>
            )}
          </div>
        </div>

        {!loading && data.length > 0 && (
          <div className="flex items-center gap-2 shrink-0">
            {selectedCategory && (
              <button
                type="button"
                onClick={() => setSelectedCategory(null)}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent hover:underline cursor-pointer"
              >
                <X className="h-3 w-3" />
                Reset Filter
              </button>
            )}
            <span className="text-[11px] font-semibold text-text-secondary bg-bg-subtle border border-border px-2.5 py-1 rounded-full">
              {data.length} {data.length === 1 ? "category" : "categories"}
            </span>
          </div>
        )}
      </div>

      {/* Body */}
      {loading ? (
        <div className="flex-1 p-5 space-y-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <div className="flex justify-between">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-3.5 w-8" />
              </div>
              <Skeleton
                className="h-7 rounded-md"
                style={{ width: `${60 + i * 10}%` }}
              />
            </div>
          ))}
        </div>
      ) : data.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 py-12 px-5 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-bg-subtle border border-border text-text-secondary shadow-xs">
            <BarChart2 className="h-6 w-6" strokeWidth={1.8} />
          </span>
          <div>
            <p className="text-sm font-bold text-text">No category data available</p>
            <p className="text-xs text-text-secondary mt-1 max-w-xs leading-relaxed">
              Add fixed assets with category tags to visualize department and equipment distribution.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex flex-col justify-between">
          {/* Side-by-side Bar Chart + Pie Chart */}
          <div className="flex-1 min-h-0 grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border/60">
            {/* Left: Horizontal Bar Chart */}
            <div className="flex flex-col min-w-0 min-h-0">
              <div className="flex items-center justify-between px-4 py-1.5 border-b border-border/50 bg-bg-subtle/30 shrink-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                  <BarChart2 className="h-3 w-3 text-accent" />
                  Asset Volume
                </span>
                <span className="text-[10px] font-medium text-text-secondary">
                  {selectedCategory ? "Filtered" : "by count"}
                </span>
              </div>
              <div
                className="flex-1 min-w-0 min-h-0 px-3 py-2 overflow-y-auto flex flex-col justify-center"
                aria-hidden="true"
              >
                <ResponsiveContainer
                  width="100%"
                  height={Math.max(data.length * 36, 170)}
                >
                  <BarChart
                    data={data}
                    layout="vertical"
                    margin={{ top: 4, right: 36, left: 0, bottom: 4 }}
                    barCategoryGap="25%"
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      horizontal={false}
                      stroke="var(--color-border)"
                      opacity={0.4}
                    />
                    <XAxis type="number" hide />
                    <YAxis
                      type="category"
                      dataKey="label"
                      width={88}
                      tick={{
                        fontSize: 11,
                        fill: "var(--color-text)",
                        fontWeight: 600,
                      }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      content={
                        <BarTooltipWrapper
                          total={total}
                          getCategoryStyle={getCategoryStyle}
                        />
                      }
                      cursor={{ fill: "var(--color-bg-subtle)" }}
                    />
                    <Bar
                      dataKey="count"
                      shape={(props: BarShapeProps) => (
                        <CustomBarShape
                          {...props}
                          selectedCategory={selectedCategory}
                          onSelect={handleToggleCategory}
                        />
                      )}
                      label={(props: LabelProps & { index?: number }) => {
                        const { x, y, width, height, value, index } = props;
                        const item = index !== undefined ? data[index] : undefined;
                        const isSelected = selectedCategory === item?.category;
                        const isDimmed = selectedCategory !== null && !isSelected;
                        if (value === undefined || value === null) return null;

                        return (
                          <text
                            x={Number(x ?? 0) + Number(width ?? 0) + (isSelected ? 9 : 5)}
                            y={Number(y ?? 0) + Number(height ?? 0) / 2}
                            fill="var(--color-text)"
                            textAnchor="start"
                            dominantBaseline="central"
                            opacity={isDimmed ? 0.3 : 1}
                            className={cn(
                              "select-none pointer-events-none tabular-nums font-bold",
                              isSelected ? "text-xs font-black" : "text-[11px]"
                            )}
                          >
                            {value}
                          </text>
                        );
                      }}
                    >
                      {data.map((entry) => (
                        <Cell
                          key={entry.category}
                          fill={getCategoryStyle(entry.category).cssVar}
                          cursor="pointer"
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Right: Donut / Pie Chart */}
            <div className="flex flex-col min-w-0 min-h-0">
              <div className="flex items-center justify-between px-4 py-1.5 border-b border-border/50 bg-bg-subtle/30 shrink-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                  <PieChartIcon className="h-3 w-3 text-accent" />
                  Inventory Share
                </span>
                <span className="text-[10px] font-medium text-text-secondary">
                  {selectedItem
                    ? `${total > 0 ? Math.round((selectedItem.count / total) * 100) : 0}% of total`
                    : "% of total"}
                </span>
              </div>
              <div
                className="relative flex-1 min-w-0 min-h-55 flex items-center justify-center p-1"
                aria-hidden="true"
              >
                <ResponsiveContainer width="100%" height="100%" minHeight={220}>
                  <RechartsPieChart margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
                    <Pie
                      data={data}
                      dataKey="count"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      innerRadius={58}
                      outerRadius={96}
                      paddingAngle={2.5}
                      stroke="none"
                      strokeWidth={0}
                      shape={(props: PieSectorShapeProps) => (
                        <CustomPieSector
                          {...props}
                          selectedCategory={selectedCategory}
                          onSelect={handleToggleCategory}
                          onHover={setHoveredSlice}
                        />
                      )}
                      onClick={(entry: PieSectorDataItem) => {
                        const cat = (entry as PieSectorDataItem & { category?: string }).category;
                        if (cat) handleToggleCategory(cat);
                      }}
                      isAnimationActive={true}
                    >
                      {data.map((entry) => {
                        const isDimmed =
                          selectedCategory !== null && selectedCategory !== entry.category;
                        return (
                          <Cell
                            key={entry.category}
                            fill={getCategoryStyle(entry.category).cssVar}
                            opacity={isDimmed ? 0.25 : 1}
                            stroke="none"
                            strokeWidth={0}
                            cursor="pointer"
                          />
                        );
                      })}
                    </Pie>
                  </RechartsPieChart>
                </ResponsiveContainer>

                {/* Improved outside tooltip card */}
                {hoveredItem && (
                  <div
                    className={cn(
                      "pointer-events-none absolute top-2 z-30 transition-all duration-200 animate-in fade-in-0 zoom-in-95",
                      isSliceOnLeft ? "right-2" : "left-2"
                    )}
                  >
                    <ChartTooltipContent
                      item={{
                        label: hoveredItem.label,
                        value: hoveredItem.count,
                        category: hoveredItem.category,
                      }}
                      total={total}
                      categoryStyle={getCategoryStyle(hoveredItem.category)}
                    />
                  </div>
                )}

                {/* Centered Total / Selected Count Label inside Donut */}
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center transition-all duration-200">
                  {selectedItem ? (
                    <>
                      <span className="text-2xl sm:text-3xl font-black tracking-tight text-text tabular-nums leading-none">
                        {selectedItem.count.toLocaleString()}
                      </span>
                      <span className="text-[10px] sm:text-xs font-bold text-accent uppercase tracking-wider mt-1.5 truncate max-w-25 text-center">
                        {selectedItem.label}
                      </span>
                      <span className="text-[10px] sm:text-xs font-semibold text-text-secondary tabular-nums mt-0.5">
                        {total > 0 ? `${Math.round((selectedItem.count / total) * 100)}% of total` : ""}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-2xl sm:text-3xl font-black tracking-tight text-text tabular-nums leading-none">
                        {total.toLocaleString()}
                      </span>
                      <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mt-1.5">
                        Total Units
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Accessible text summary */}
          <ul className="sr-only" aria-label="Asset count by category">
            {data.map((d) => (
              <li key={d.category}>
                {d.label}: {d.count} assets
              </li>
            ))}
          </ul>

          {/* Interactive bottom category pill legend */}
          <div className="mt-auto shrink-0 border-t border-border bg-bg-subtle/40 px-4 py-2.5 max-h-20 overflow-y-auto">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary mr-1 shrink-0">
                Categories:
              </span>
              {data.map((d) => {
                const isSelected = selectedCategory === d.category;
                const isDimmed = selectedCategory !== null && !isSelected;
                const pct =
                  total > 0 ? Math.round((d.count / total) * 100) : 0;
                return (
                  <button
                    type="button"
                    key={d.category}
                    onClick={() => handleToggleCategory(d.category)}
                    aria-pressed={isSelected}
                    title={isSelected ? `Click to deselect ${d.label}` : `Click to highlight ${d.label}`}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-all duration-200 cursor-pointer select-none",
                      getCategoryStyle(d.category).bg,
                      getCategoryStyle(d.category).text,
                      isSelected
                        ? "border-transparent scale-105 shadow-md font-bold"
                        : isDimmed
                          ? "border border-border/40 opacity-35 hover:opacity-80 scale-95"
                          : "border border-border/60 hover:scale-102 hover:shadow-2xs"
                    )}
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full shrink-0"
                      style={{
                        backgroundColor: getCategoryStyle(d.category).cssVar,
                      }}
                    />
                    <span className="font-semibold">{d.label}</span>
                    <span className="tabular-nums font-bold">{d.count}</span>
                    <span className="text-[10px] opacity-75 font-normal">
                      ({pct}%)
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
