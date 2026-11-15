"use client";

import { useMemo } from "react";

import { MultiSelectDropdown } from "@/components/ui/multi-select-dropdown";
import { useCustomReportFilterOptionsQuery } from "@/features/custom-reports/client";
import type {
  CustomReportDatasetMeta,
  CustomReportFilterFieldDef,
  CustomReportFilterOption,
  CustomReportFilterOptions,
  CustomReportFilters,
} from "@/types/custom-reports";

interface FilterFieldsProps {
  meta: CustomReportDatasetMeta | undefined;
  filters: CustomReportFilters;
  onChange: (next: CustomReportFilters) => void;
}

const inputClass =
  "h-9 rounded-md border border-border bg-bg px-2.5 text-sm text-text outline-none focus:border-primary";

function optionsForField(
  field: CustomReportFilterFieldDef,
  catalog: CustomReportFilterOptions | undefined
): CustomReportFilterOption[] {
  if (field.optionsSource === "static") return field.staticOptions ?? [];
  if (!catalog) return [];
  switch (field.optionsSource) {
    case "departments":
      return catalog.departments;
    case "projects":
      return catalog.projects;
    case "assetCategories":
      return catalog.assetCategories;
    case "consumableCategories":
      return catalog.consumableCategories;
    case "assetClasses":
      return catalog.assetClasses;
    case "consumableClasses":
      return catalog.consumableClasses;
    case "assets":
      return catalog.assets;
    case "consumables":
      return catalog.consumables;
    default:
      return [];
  }
}

function selectedForField(
  field: CustomReportFilterFieldDef,
  filters: CustomReportFilters
): string[] {
  if (!field.filterKey) return [];
  const value = filters[field.filterKey];
  return Array.isArray(value) ? value : [];
}

export function CustomReportFilterFields({ meta, filters, onChange }: FilterFieldsProps) {
  const { data: catalog, isLoading } = useCustomReportFilterOptionsQuery();
  const fields = useMemo(() => meta?.filterFields ?? [], [meta?.filterFields]);

  const set = (patch: Partial<CustomReportFilters>) => onChange({ ...filters, ...patch });

  const toggleMulti = (filterKey: keyof CustomReportFilters, id: string) => {
    const current = Array.isArray(filters[filterKey])
      ? ([...(filters[filterKey] as string[])] as string[])
      : [];
    const next = current.includes(id)
      ? current.filter((x) => x !== id)
      : [...current, id];
    set({ [filterKey]: next });
  };

  const multiFields = useMemo(
    () => fields.filter((f) => f.control === "multi"),
    [fields]
  );
  const activeMultiKeys = useMemo(() => {
    const keys = new Set<keyof CustomReportFilters>([
      "departmentIds",
      "departmentNames",
      "projectIds",
      "categories",
      "classifications",
      "categoryClasses",
      "statuses",
      "assignmentTypes",
      "itemTypes",
      "requestTypes",
      "assetIds",
      "consumableIds",
      "conditions",
      "reasons",
      "directions",
    ]);
    for (const f of multiFields) {
      if (f.filterKey) keys.add(f.filterKey);
    }
    return [...keys];
  }, [multiFields]);

  const hasSelectedMultiFilters = activeMultiKeys.some((key) => {
    const val = filters[key];
    return Array.isArray(val) && val.length > 0;
  });

  const handleClearMultiFilters = () => {
    const cleared: Partial<CustomReportFilters> = {};
    for (const key of activeMultiKeys) {
      (cleared as Record<string, unknown>)[key] = [];
    }
    onChange({
      ...cleared,
      search: filters.search,
      startDate: filters.startDate,
      endDate: filters.endDate,
    });
  };
  const hasSearch = fields.some((f) => f.control === "search");
  const hasDateRange = fields.some((f) => f.control === "dateRange");

  return (
    <div className="flex flex-col gap-3">
      {isLoading && (
        <p className="text-xs text-text-secondary">Loading filter options…</p>
      )}

      <div className="flex flex-wrap gap-2 items-start">
        {hasSearch && (
          <label className="flex flex-col gap-1 text-xs text-text-secondary min-w-50 flex-1">
            <span>Search</span>
            <input
              className={inputClass}
              value={filters.search ?? ""}
              onChange={(e) => set({ search: e.target.value })}
              placeholder="Code, name…"
            />
          </label>
        )}

        {multiFields.map((field) => {
          const options = optionsForField(field, catalog).map((o) => ({
            id: o.id,
            label: o.label,
          }));
          const selectedIds = selectedForField(field, filters);
          const filterKey = field.filterKey;
          if (!filterKey) return null;
          return (
            <div key={field.key} className="min-w-50 flex flex-col gap-1">
              <span className="text-xs text-text-secondary">{field.label}</span>
              <MultiSelectDropdown
                label={field.label}
                options={options}
                selectedIds={selectedIds}
                onToggle={(id) => toggleMulti(filterKey, id)}
                variant="form"
                searchable={field.searchable ?? options.length > 8}
                placeholder={`Any ${field.label.toLowerCase()}`}
                emptyMessage="No options"
              />
            </div>
          );
        })}
      </div>

      {hasDateRange && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
          <label className="flex flex-col gap-1 text-xs text-text-secondary">
            <span>Start date</span>
            <input
              type="date"
              className={inputClass}
              value={filters.startDate ?? ""}
              onChange={(e) => set({ startDate: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-text-secondary">
            <span>End date</span>
            <input
              type="date"
              className={inputClass}
              value={filters.endDate ?? ""}
              onChange={(e) => set({ endDate: e.target.value })}
            />
          </label>
        </div>
      )}

      {hasSelectedMultiFilters && (
        <button
          type="button"
          className="self-start text-xs text-text-secondary underline hover:text-text cursor-pointer"
          onClick={handleClearMultiFilters}
        >
          Clear selected filters
        </button>
      )}
    </div>
  );
}
