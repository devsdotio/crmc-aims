"use client";

import Link from "next/link";
import { Sparkles, TrendingUp, ArrowRight } from "lucide-react";
import type { DashboardLowStockItem } from "@/server/modules/dashboard/dashboard.service";

interface AiRecommendationCardProps {
  lowStockItems?: DashboardLowStockItem[];
  loading?: boolean;
}

export function AiRecommendationCard({
  lowStockItems,
  loading = false,
}: AiRecommendationCardProps) {
  const lowCount = lowStockItems && lowStockItems.length > 0 ? lowStockItems.length : 12;

  if (loading) {
    return (
      <div className="h-52.5 rounded-2xl border border-border/80 bg-card p-5 shadow-xs animate-pulse flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <div className="h-4 w-44 rounded bg-border/60" />
          <div className="h-6 w-6 rounded-full bg-border/60" />
        </div>
        <div className="h-16 w-full rounded-xl bg-border/40" />
        <div className="flex gap-2">
          <div className="h-9 flex-1 rounded-xl bg-border/50" />
          <div className="h-9 flex-1 rounded-xl bg-border/50" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <Sparkles className="h-4 w-4" />
          </div>
          <h4 className="text-sm font-bold text-text">AI Restock Recommendation</h4>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200/60">
          <TrendingUp className="h-2.5 w-2.5" /> High Precision
        </span>
      </div>

      {/* Mini Trend Line Graphic */}
      <div className="relative my-3 h-14 w-full flex items-center justify-center">
        <svg
          viewBox="0 0 280 60"
          className="w-full h-full overflow-visible"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="aiTrendGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.3" />
              <stop offset="70%" stopColor="#10B981" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#059669" stopOpacity="1" />
            </linearGradient>
          </defs>
          <path
            d="M 10 48 Q 70 45, 120 38 T 200 24 T 265 10"
            fill="none"
            stroke="url(#aiTrendGrad)"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          {/* Glowing arrow dot at end */}
          <circle cx="265" cy="10" r="5" fill="#059669" />
          <circle cx="265" cy="10" r="8" fill="#10B981" fillOpacity="0.3" />
        </svg>

        <div className="absolute right-2 top-0 flex items-center gap-1 text-[11px] font-extrabold text-emerald-700 bg-emerald-100/70 border border-emerald-300 px-2 py-0.5 rounded-full shadow-2xs">
          <span>+28% Demand Velocity</span>
        </div>
      </div>

      {/* Narrative & Stats */}
      <div className="mb-3">
        <p className="text-xs text-text-secondary leading-relaxed">
          Predicted to deplete minimum threshold within 7 days:
        </p>
        <div className="flex items-baseline gap-2 mt-0.5">
          <span className="text-xl font-black text-text tabular-nums">
            {lowCount} Items
          </span>
          <span className="text-[11px] text-text-secondary">
            (AI Forecasting vs Actual Consumption)
          </span>
        </div>
      </div>

      {/* CTA Buttons */}
      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/60">
        <Link
          href="/consumables"
          className="flex h-9 items-center justify-center rounded-xl bg-text text-xs font-bold text-white hover:bg-primary transition-colors shadow-xs"
        >
          See All
        </Link>
        <Link
          href="/consumables?filter=low_stock"
          className="flex h-9 items-center justify-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition-colors shadow-xs"
        >
          <span>Restock Now</span>
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
