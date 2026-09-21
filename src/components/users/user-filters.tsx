"use client";

import { Search, FilterX } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserFilterState } from "@/types/users";

export interface UserFiltersProps {
  filters: UserFilterState;
  onFilterChange: (updated: Partial<UserFilterState>) => void;
  onResetFilters: () => void;
  totalUsersCount: number;
  tenants?: { id: string; name: string }[];
}

export function UserFilters({
  filters,
  onFilterChange,
  onResetFilters,
  tenants,
}: UserFiltersProps) {
  const isFiltered =
    Boolean(filters.searchQuery) ||
    (Boolean(filters.role) && filters.role !== "all") ||
    (Boolean(filters.status) && filters.status !== "all") ||
    (Boolean(filters.tenantId) && filters.tenantId !== "all");

  return (
    <div className="flex flex-col gap-3 p-4 md:px-6 bg-bg border-b border-border shrink-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-60 max-w-md">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-text-secondary">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            value={filters.searchQuery}
            onChange={(e) => onFilterChange({ searchQuery: e.target.value })}
            placeholder="Search by name or email…"
            className={cn(
              "w-full h-9 pl-9 pr-3 text-xs bg-bg-subtle border border-border rounded-lg text-text placeholder:text-text-secondary/60",
              "focus:outline-none focus:ring-2 focus:ring-accent focus:bg-bg transition-colors"
            )}
          />
        </div>

        {/* Filter controls row */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Institution/Tenant Filter (Superadmin only) */}
          {tenants && tenants.length > 0 && (
            <div className="flex items-center gap-1.5">
              <label htmlFor="user-tenant-filter" className="sr-only">
                Filter by institution
              </label>
              <select
                id="user-tenant-filter"
                value={filters.tenantId || "all"}
                onChange={(e) => onFilterChange({ tenantId: e.target.value })}
                className="h-9 px-3 text-xs bg-bg-subtle border border-border rounded-lg text-text font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent focus:bg-bg transition-colors max-w-40"
              >
                <option value="all">All Institutions</option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Role Filter Select */}
          <div className="flex items-center gap-1.5">
            <label htmlFor="user-role-filter" className="sr-only">
              Filter by system role
            </label>
            <select
              id="user-role-filter"
              value={filters.role}
              onChange={(e) => onFilterChange({ role: e.target.value })}
              className="h-9 px-3 text-xs bg-bg-subtle border border-border rounded-lg text-text font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent focus:bg-bg transition-colors"
            >
              <option value="all">All System Roles</option>
              <option value="admin">Admin</option>
              <option value="staff">Staff</option>
              <option value="borrower">Department account</option>
            </select>
          </div>

          {/* Status Filter Select */}
          <div className="flex items-center gap-1.5">
            <label htmlFor="user-status-filter" className="sr-only">
              Filter by account status
            </label>
            <select
              id="user-status-filter"
              value={filters.status}
              onChange={(e) => onFilterChange({ status: e.target.value })}
              className="h-9 px-3 text-xs bg-bg-subtle border border-border rounded-lg text-text font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent focus:bg-bg transition-colors"
            >
              <option value="all">All Account Statuses</option>
              <option value="active">Active Only</option>
              <option value="deactivated">Deactivated Only</option>
            </select>
          </div>

          {/* Reset Filters */}
          {isFiltered && (
            <button
              type="button"
              onClick={onResetFilters}
              className="inline-flex items-center gap-1 h-9 px-3 text-xs font-semibold text-accent hover:bg-bg-subtle rounded-lg border border-border transition-colors cursor-pointer"
            >
              <FilterX className="h-3.5 w-3.5" />
              Reset
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
