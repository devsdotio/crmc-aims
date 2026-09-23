"use client";

import { Plus, Trash2 } from "lucide-react";
import { filterMoneyInput } from "@/lib/numeric-input";

export type RepairPartLine = { id: string; name: string; cost: string };

export function newRepairPartLine(): RepairPartLine {
  return {
    id: `part-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: "",
    cost: "",
  };
}

export function partLinesFromRecord(
  parts: Array<{ name: string; cost?: string | null }> | null | undefined
): RepairPartLine[] {
  if (!parts?.length) return [newRepairPartLine()];
  return parts.map((p) => ({
    id: `part-${Math.random().toString(36).slice(2, 10)}`,
    name: p.name,
    cost: p.cost ?? "",
  }));
}

export function serializePartLines(parts: RepairPartLine[]) {
  return parts
    .filter((p) => p.name.trim())
    .map((p) => ({
      name: p.name.trim(),
      cost: p.cost.trim() ? p.cost.trim() : null,
    }));
}

export function partsCostSummary(parts: RepairPartLine[]) {
  const filled = parts.filter((p) => p.name.trim());
  const partsSum = filled.reduce((sum, p) => {
    if (!p.cost.trim()) return sum;
    const n = Number(p.cost);
    return Number.isFinite(n) ? sum + n : sum;
  }, 0);
  const hasAnyPartCost = filled.some((p) => p.cost.trim() !== "");
  return { filled, partsSum, hasAnyPartCost };
}

export interface RepairPartsCostFieldsProps {
  parts: RepairPartLine[];
  onPartsChange: (parts: RepairPartLine[]) => void;
  overallCost: string;
  onOverallCostChange: (value: string) => void;
  disabled?: boolean;
  noPartsUsed?: boolean;
  onNoPartsUsedChange?: (value: boolean) => void;
  showNoPartsToggle?: boolean;
}

export function RepairPartsCostFields({
  parts,
  onPartsChange,
  overallCost,
  onOverallCostChange,
  disabled,
  noPartsUsed = false,
  onNoPartsUsedChange,
  showNoPartsToggle = false,
}: RepairPartsCostFieldsProps) {
  const { partsSum, hasAnyPartCost } = partsCostSummary(parts);
  const overallBlank = !overallCost.trim();
  const isAutoCalculated = overallBlank && hasAnyPartCost && !noPartsUsed;

  const updatePart = (id: string, patch: Partial<Omit<RepairPartLine, "id">>) => {
    onPartsChange(parts.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  };

  return (
    <div className="space-y-3">
      {showNoPartsToggle && onNoPartsUsedChange && (
        <label className="flex items-start gap-2 text-xs text-text cursor-pointer">
          <input
            type="checkbox"
            checked={noPartsUsed}
            disabled={disabled}
            onChange={(e) => {
              const next = e.target.checked;
              onNoPartsUsedChange(next);
              if (next) {
                onPartsChange([newRepairPartLine()]);
                onOverallCostChange("");
              }
            }}
            className="mt-0.5"
          />
          <span>
            <span className="font-semibold">No parts or materials used</span>
            <span className="block text-text-secondary mt-0.5">
              Check this when the repair was labor/cleaning only.
            </span>
          </span>
        </label>
      )}

      {!noPartsUsed && (
        <>
          <div className="flex items-center justify-between gap-2">
            <label className="block text-xs font-semibold text-text">
              Parts &amp; materials
            </label>
            <button
              type="button"
              disabled={disabled || parts.length >= 20}
              onClick={() => onPartsChange([...parts, newRepairPartLine()])}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent hover:underline cursor-pointer disabled:opacity-50"
            >
              <Plus className="h-3 w-3" />
              Add line
            </button>
          </div>

          <div className="space-y-2 rounded-xl border border-border bg-bg-subtle/40 p-2.5">
            <div className="hidden sm:grid grid-cols-[1fr_7.5rem_2rem] gap-2 px-0.5 text-[10px] font-bold uppercase tracking-wider text-text-secondary">
              <span>Part name</span>
              <span>Cost (₱)</span>
              <span className="sr-only">Remove</span>
            </div>
            {parts.map((part) => (
              <div
                key={part.id}
                className="grid grid-cols-1 sm:grid-cols-[1fr_7.5rem_2rem] gap-2"
              >
                <input
                  type="text"
                  value={part.name}
                  onChange={(e) => updatePart(part.id, { name: e.target.value })}
                  placeholder="e.g. Autofocus gear ring"
                  disabled={disabled}
                  className="w-full h-9 px-3 text-xs bg-bg border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-accent"
                  aria-label="Part name"
                />
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-text-secondary">
                    ₱
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={part.cost}
                    onChange={(e) => {
                      const next = filterMoneyInput(e.target.value);
                      if (next !== null) updatePart(part.id, { cost: next });
                    }}
                    placeholder="0.00"
                    disabled={disabled}
                    className="w-full h-9 pl-6 pr-2 text-xs bg-bg border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-accent"
                    aria-label="Part cost"
                  />
                </div>
                <button
                  type="button"
                  disabled={disabled || parts.length <= 1}
                  onClick={() =>
                    onPartsChange(parts.filter((p) => p.id !== part.id))
                  }
                  className="h-9 w-8 inline-flex items-center justify-center rounded-lg border border-border text-text-secondary hover:text-status-outofservice-text hover:bg-bg cursor-pointer disabled:opacity-40"
                  aria-label="Remove part line"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-text-secondary px-0.5">
            Cost is optional per part. Leave blank if unrecorded.
          </p>
        </>
      )}

      <div className="space-y-1">
        <label
          htmlFor="overall-repair-cost"
          className="block text-xs font-semibold text-text"
        >
          Overall repair cost{" "}
          <span className="text-text-secondary font-normal">(optional)</span>
        </label>
        <div className="relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-text-secondary">
            ₱
          </span>
          <input
            id="overall-repair-cost"
            type="text"
            inputMode="decimal"
            value={overallCost}
            onChange={(e) => {
              const next = filterMoneyInput(e.target.value);
              if (next !== null) onOverallCostChange(next);
            }}
            placeholder={
              isAutoCalculated
                ? partsSum.toLocaleString("en-PH", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })
                : "0.00"
            }
            disabled={disabled}
            className="w-full h-9 pl-6 pr-3 text-xs bg-bg border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
        <p className="text-[11px] text-text-secondary">
          {isAutoCalculated ? (
            <>
              Auto-calculated from line items:{" "}
              <span className="font-mono font-bold text-text">
                ₱
                {partsSum.toLocaleString("en-PH", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
              . Enter a value to override.
            </>
          ) : (
            <>Leave blank to auto-sum costs from parts &amp; materials.</>
          )}
        </p>
      </div>
    </div>
  );
}
