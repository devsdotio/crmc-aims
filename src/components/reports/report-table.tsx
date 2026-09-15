"use client";

import { ChevronLeft, ChevronRight, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ColumnDef<T> {
  key: string;
  header: string;
  align?: "left" | "center" | "right";
  className?: string;
  render?: (row: T) => React.ReactNode;
}

interface ReportTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  onPageChange?: (page: number) => void;
  isLoading?: boolean;
  onRowClick?: (row: T) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
}

export function ReportTable<T>({
  columns,
  data,
  total,
  page,
  pageSize,
  totalPages,
  onPageChange,
  isLoading = false,
  onRowClick,
  emptyTitle = "No records found",
  emptyDescription = "Try adjusting your filters or date range.",
  className,
}: ReportTableProps<T>) {
  const startRow = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endRow = Math.min(page * pageSize, total);

  return (
    <div
      className={cn(
        "flex flex-col rounded-2xl border border-border/80 bg-card shadow-xs overflow-hidden",
        className
      )}
    >
      <div className="overflow-x-auto min-h-115">
        <table className="w-full text-left text-xs" aria-label="Report Data Table">
          <thead className="sticky top-0 z-10 border-b border-border/80 bg-bg-subtle/80 backdrop-blur-xs text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-text-secondary">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={cn(
                    "px-4 py-3.5",
                    col.align === "right" && "text-right",
                    col.align === "center" && "text-center",
                    col.className
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {isLoading ? (
              Array.from({ length: 8 }).map((_, idx) => (
                <tr key={idx} className="animate-pulse bg-card">
                  {columns.map((col, cIdx) => (
                    <td key={cIdx} className="px-4 py-4">
                      <div className="h-4 w-3/4 rounded-md bg-border/40" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-28 sm:py-36 text-center">
                  <div className="flex flex-col items-center justify-center gap-3.5 max-w-sm mx-auto">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-bg-subtle border border-border/80 text-text-secondary/70 shadow-xs">
                      <Inbox className="h-8 w-8 text-text-secondary" />
                    </div>
                    <div className="text-base sm:text-lg font-bold text-text tracking-tight">{emptyTitle}</div>
                    <div className="text-xs text-text-secondary leading-relaxed max-w-xs">{emptyDescription}</div>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((row, idx) => (
                <tr
                  key={
                    String(
                      (row as Record<string, unknown>).id ||
                        (row as Record<string, unknown>).poNumber ||
                        (row as Record<string, unknown>).logCode ||
                        idx
                    )
                  }
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    "transition-colors hover:bg-bg-subtle/60",
                    onRowClick && "cursor-pointer"
                  )}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        "px-4 py-3 text-text",
                        col.align === "right" && "text-right",
                        col.align === "center" && "text-center",
                        col.className
                      )}
                    >
                      {col.render
                        ? col.render(row)
                        : ((row as Record<string, unknown>)[col.key] as React.ReactNode) ?? "—"}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex items-center justify-between border-t border-border/80 bg-card px-4 py-3 text-xs text-text-secondary">
        <div>
          Showing{" "}
          <span className="font-mono font-bold text-text">{startRow}</span> to{" "}
          <span className="font-mono font-bold text-text">{endRow}</span> of{" "}
          <span className="font-mono font-bold text-text">{total}</span> records
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onPageChange?.(page - 1)}
            disabled={page <= 1 || isLoading}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-text transition-colors hover:bg-bg-subtle disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="px-2 text-xs font-mono font-bold text-text">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => onPageChange?.(page + 1)}
            disabled={page >= totalPages || isLoading}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-text transition-colors hover:bg-bg-subtle disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
