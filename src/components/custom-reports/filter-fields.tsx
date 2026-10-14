"use client";

import type { CustomReportDatasetMeta, CustomReportFilters } from "@/types/custom-reports";

interface FilterFieldsProps {
  meta: CustomReportDatasetMeta | undefined;
  filters: CustomReportFilters;
  onChange: (next: CustomReportFilters) => void;
}

const inputClass =
  "h-9 rounded-md border border-border bg-bg px-2.5 text-sm text-text outline-none focus:border-primary";

export function CustomReportFilterFields({ meta, filters, onChange }: FilterFieldsProps) {
  const keys = new Set(meta?.filterKeys ?? []);

  const set = (patch: Partial<CustomReportFilters>) => onChange({ ...filters, ...patch });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {keys.has("search") && (
        <label className="flex flex-col gap-1 text-xs text-text-secondary">
          Search
          <input
            className={inputClass}
            value={filters.search ?? ""}
            onChange={(e) => set({ search: e.target.value || undefined })}
            placeholder="Code, name…"
          />
        </label>
      )}
      {keys.has("department") && (
        <label className="flex flex-col gap-1 text-xs text-text-secondary">
          Department
          <input
            className={inputClass}
            value={filters.department ?? ""}
            onChange={(e) => set({ department: e.target.value || undefined })}
            placeholder="Department name"
          />
        </label>
      )}
      {keys.has("departmentId") && (
        <label className="flex flex-col gap-1 text-xs text-text-secondary">
          Department ID
          <input
            className={inputClass}
            value={filters.departmentId ?? ""}
            onChange={(e) => set({ departmentId: e.target.value || undefined })}
            placeholder="UUID (optional)"
          />
        </label>
      )}
      {keys.has("category") && (
        <label className="flex flex-col gap-1 text-xs text-text-secondary">
          Category
          <input
            className={inputClass}
            value={filters.category ?? ""}
            onChange={(e) => set({ category: e.target.value || undefined })}
          />
        </label>
      )}
      {keys.has("classification") && (
        <label className="flex flex-col gap-1 text-xs text-text-secondary">
          Classification
          <input
            className={inputClass}
            value={filters.classification ?? ""}
            onChange={(e) => set({ classification: e.target.value || undefined })}
          />
        </label>
      )}
      {keys.has("status") && (
        <label className="flex flex-col gap-1 text-xs text-text-secondary">
          Status
          <input
            className={inputClass}
            value={filters.status ?? ""}
            onChange={(e) => set({ status: e.target.value || undefined })}
            placeholder={
              meta?.key === "consumables"
                ? "low_stock"
                : meta?.key === "maintenance"
                  ? "open | resolved | condition"
                  : "Status value"
            }
          />
        </label>
      )}
      {keys.has("startDate") && (
        <label className="flex flex-col gap-1 text-xs text-text-secondary">
          Start date
          <input
            type="date"
            className={inputClass}
            value={filters.startDate ?? ""}
            onChange={(e) => set({ startDate: e.target.value || undefined })}
          />
        </label>
      )}
      {keys.has("endDate") && (
        <label className="flex flex-col gap-1 text-xs text-text-secondary">
          End date
          <input
            type="date"
            className={inputClass}
            value={filters.endDate ?? ""}
            onChange={(e) => set({ endDate: e.target.value || undefined })}
          />
        </label>
      )}
    </div>
  );
}
