"use client";

import { CheckCircle2, MinusCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SupplierStatus } from "@/types/suppliers";
import { SUPPLIER_STATUS_LABELS } from "@/types/suppliers";

export function SupplierStatusBadge({
  status,
  className,
}: {
  status: SupplierStatus;
  className?: string;
}) {
  const active = status === "active";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-tight shrink-0 shadow-2xs",
        active
          ? "bg-status-active-bg/15 border border-status-active-bg/25 text-status-active-text"
          : "bg-status-retired-bg/15 border border-status-retired-bg/25 text-status-retired-text",
        className
      )}
    >
      {active ? (
        <CheckCircle2 className="h-3 w-3 shrink-0" />
      ) : (
        <MinusCircle className="h-3 w-3 shrink-0" />
      )}
      <span>{SUPPLIER_STATUS_LABELS[status]}</span>
    </span>
  );
}
