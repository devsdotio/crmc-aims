"use client";

import { HardHat, Layers, Package, Wrench } from "lucide-react";

export type ClassificationBadgeKind =
  | "supply"
  | "material"
  | "mixed"
  | "asset"
  | "miscellaneous";

interface ClassificationBadgeProps {
  classification?: string | null;
  compact?: boolean;
  className?: string;
}

export function normalizeBadgeKind(raw?: string | null): ClassificationBadgeKind {
  const val = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (val === "material") return "material";
  if (val === "mixed") return "mixed";
  if (val === "asset") return "asset";
  if (val === "miscellaneous" || val === "service") return "miscellaneous";
  return "supply";
}

export function ConsumableClassificationBadge({
  classification,
  compact = false,
  className = "",
}: ClassificationBadgeProps) {
  const kind = normalizeBadgeKind(classification);

  if (kind === "material") {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/12 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-300 ${className}`}
      >
        <HardHat className="size-3 shrink-0" aria-hidden="true" />
        <span>{compact ? "Material" : "Material"}</span>
      </span>
    );
  }

  if (kind === "mixed") {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-md border border-indigo-500/25 bg-indigo-500/10 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/15 dark:text-indigo-300 ${className}`}
      >
        <Layers className="size-3 shrink-0" aria-hidden="true" />
        <span>{compact ? "Mixed" : "Mixed (Supplies + Materials)"}</span>
      </span>
    );
  }

  if (kind === "asset") {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-md border border-sky-500/25 bg-sky-500/10 px-2 py-0.5 text-[11px] font-semibold text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/15 dark:text-sky-300 ${className}`}
      >
        <Wrench className="size-3 shrink-0" aria-hidden="true" />
        <span>Asset</span>
      </span>
    );
  }

  if (kind === "miscellaneous") {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-md border border-border bg-bg-subtle px-2 py-0.5 text-[11px] font-semibold text-text-secondary ${className}`}
      >
        <span>Service / Misc</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300 ${className}`}
    >
      <Package className="size-3 shrink-0" aria-hidden="true" />
      <span>{compact ? "Supply" : "Supply"}</span>
    </span>
  );
}

export interface ClassificationTabOption {
  id: string;
  label: string;
  count?: number;
}

interface ClassificationFilterPillsProps {
  value: string;
  onChange: (next: string) => void;
  options: ClassificationTabOption[];
  ariaLabel?: string;
  size?: "default" | "sm";
}

export function ClassificationFilterPills({
  value,
  onChange,
  options,
  ariaLabel = "Filter by consumable classification",
  size = "default",
}: ClassificationFilterPillsProps) {
  const heightCls = size === "sm" ? "min-h-10 sm:min-h-8 px-2.5 text-xs" : "min-h-11 sm:min-h-9 px-3 text-xs";

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="inline-flex flex-wrap items-center gap-1 rounded-xl border border-border bg-bg-subtle p-1"
    >
      {options.map((opt) => {
        const active = (value || "all") === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(opt.id)}
            className={`inline-flex items-center gap-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${heightCls} ${
              active
                ? "bg-card text-text shadow-xs border border-border"
                : "text-text-secondary hover:text-text border border-transparent"
            }`}
          >
            {opt.id === "supply" && (
              <Package className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
            )}
            {opt.id === "material" && (
              <HardHat className="size-3.5 text-amber-700 dark:text-amber-400 shrink-0" aria-hidden="true" />
            )}
            {opt.id === "mixed" && (
              <Layers className="size-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" aria-hidden="true" />
            )}
            <span>{opt.label}</span>
            {typeof opt.count === "number" && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-mono tabular-nums ${
                  active
                    ? "bg-primary/10 text-primary"
                    : "bg-card/80 text-text-secondary"
                }`}
              >
                {opt.count.toLocaleString()}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

