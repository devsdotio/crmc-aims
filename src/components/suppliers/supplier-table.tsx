"use client";

import { Loader2, Truck, Pencil, PowerOff, Eye, User, Phone, Mail } from "lucide-react";
import type { Supplier } from "@/types/suppliers";
import { SupplierStatusBadge } from "./supplier-status-badge";

function SkeletonTableRow() {
  return (
    <tr className="border-b border-border bg-bg animate-pulse">
      <td className="px-5 py-3.5">
        <div className="h-4 w-40 bg-border rounded mb-1" />
        <div className="h-3 w-24 bg-border rounded" />
      </td>
      <td className="px-3 py-3.5">
        <div className="h-5 w-20 bg-border rounded-full" />
      </td>
      <td className="px-3 py-3.5 hidden md:table-cell">
        <div className="h-3.5 w-32 bg-border rounded" />
      </td>
      <td className="px-3 py-3.5 hidden lg:table-cell">
        <div className="h-3.5 w-24 bg-border rounded" />
      </td>
      <td className="px-5 py-3.5 text-right">
        <div className="flex justify-end gap-1.5">
          <div className="h-7 w-12 bg-border rounded-lg" />
          <div className="h-7 w-20 bg-border rounded-lg" />
        </div>
      </td>
    </tr>
  );
}

function TableHead() {
  return (
    <thead>
      <tr className="border-b border-border bg-bg-subtle text-[11px] font-bold uppercase tracking-wider text-text-secondary">
        <th className="px-5 py-3">Supplier</th>
        <th className="px-3 py-3">Status</th>
        <th className="px-3 py-3 hidden md:table-cell">Contact Person</th>
        <th className="px-3 py-3 hidden lg:table-cell">Phone</th>
        <th className="px-5 py-3 text-right">
          <span className="sr-only">Actions</span>
        </th>
      </tr>
    </thead>
  );
}

export function SupplierTable({
  suppliers,
  loading,
  deactivatingSupplierId = null,
  onSelect,
  onEdit,
  onDeactivate,
}: {
  suppliers: Supplier[];
  loading?: boolean;
  deactivatingSupplierId?: string | null;
  onSelect: (s: Supplier) => void;
  onEdit?: (s: Supplier) => void;
  onDeactivate?: (s: Supplier) => void;
}) {
  if (loading) {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm" aria-label="Suppliers loading">
          <TableHead />
          <tbody className="divide-y divide-border">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonTableRow key={i} />
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (suppliers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 border border-blue-500/25 text-blue-600 dark:text-blue-400 shadow-xs mb-3">
          <Truck className="h-7 w-7" strokeWidth={1.8} />
        </span>
        <p className="text-base font-bold text-text">No suppliers found</p>
        <p className="text-xs text-text-secondary mt-1 max-w-sm leading-relaxed">
          Register vendor profiles to track unit costs, lot codes, and intake shipments.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm" aria-label="Suppliers">
        <TableHead />
        <tbody className="divide-y divide-border">
          {suppliers.map((s) => (
            <tr
              key={s.id}
              className="border-b border-border bg-bg hover:bg-bg-subtle/70 transition-colors cursor-pointer group"
              onClick={() => onSelect(s)}
            >
              <td className="px-5 py-3.5">
                <div className="font-bold text-sm text-text leading-tight group-hover:text-accent transition-colors">
                  {s.name}
                </div>
                <div className="text-[11px] font-mono text-text-secondary mt-0.5">
                  {s.supplierCode}
                </div>
              </td>
              <td className="px-3 py-3.5">
                <SupplierStatusBadge status={s.status} />
              </td>
              <td className="px-3 py-3.5 text-xs text-text-secondary hidden md:table-cell">
                {s.contactName ? (
                  <div className="flex items-center gap-1.5 text-text font-medium">
                    <User className="h-3 w-3 text-text-secondary shrink-0" />
                    <span>{s.contactName}</span>
                  </div>
                ) : s.contactEmail ? (
                  <div className="flex items-center gap-1.5 text-text-secondary">
                    <Mail className="h-3 w-3 text-text-secondary shrink-0" />
                    <span className="truncate max-w-40">{s.contactEmail}</span>
                  </div>
                ) : (
                  "—"
                )}
              </td>
              <td className="px-3 py-3.5 text-xs text-text-secondary hidden lg:table-cell">
                {s.contactPhone ? (
                  <span className="inline-flex items-center gap-1">
                    <Phone className="h-3 w-3 text-text-secondary shrink-0" />
                    <span>{s.contactPhone}</span>
                  </span>
                ) : (
                  "—"
                )}
              </td>
              <td
                className="px-5 py-3.5 text-right"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-end items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onSelect(s)}
                    className="inline-flex items-center gap-1 h-7 px-2.5 text-[11px] font-bold rounded-lg border border-border bg-bg-subtle text-text hover:bg-border/70 transition-colors cursor-pointer"
                    title="View Supplier"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    View
                  </button>
                  {onEdit && (
                    <button
                      type="button"
                      onClick={() => onEdit(s)}
                      className="inline-flex items-center gap-1 h-7 px-2.5 text-[11px] font-bold rounded-lg border border-border bg-bg text-text hover:bg-bg-subtle transition-colors cursor-pointer"
                      title="Edit Supplier"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </button>
                  )}
                  {onDeactivate && s.status === "active" && (
                    <button
                      type="button"
                      onClick={() => onDeactivate(s)}
                      disabled={deactivatingSupplierId === s.id}
                      className="inline-flex items-center gap-1 h-7 px-2.5 text-[11px] font-bold rounded-lg border border-border text-status-repair-text hover:bg-status-repair-bg/15 hover:border-status-repair-bg/30 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                      title="Deactivate Supplier"
                    >
                      {deactivatingSupplierId === s.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <PowerOff className="h-3 w-3" />
                      )}
                      {deactivatingSupplierId === s.id
                        ? "Deactivating…"
                        : "Deactivate"}
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
