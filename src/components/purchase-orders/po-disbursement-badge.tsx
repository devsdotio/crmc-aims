"use client";

import { Banknote, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

export type PoDisbursementInfo = {
  kind: "voucher" | "petty_cash";
  code: string;
  status?: string;
};

interface PoDisbursementBadgeProps {
  disbursement: PoDisbursementInfo | null | undefined;
  className?: string;
  /** Show the linked document code next to the label. */
  showCode?: boolean;
}

/**
 * Labels a PO that is already claimed by a non-cancelled voucher or petty cash.
 */
export function PoDisbursementBadge({
  disbursement,
  className,
  showCode = false,
}: PoDisbursementBadgeProps) {
  if (!disbursement) return null;

  const isVoucher = disbursement.kind === "voucher";
  const label = isVoucher ? "Vouched" : "Petty cashed";
  const Icon = isVoucher ? FileText : Banknote;

  return (
    <span
      title={`${label} via ${disbursement.code}${
        disbursement.status ? ` (${disbursement.status})` : ""
      }`}
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border shadow-2xs",
        isVoucher
          ? "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/25"
          : "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/25",
        className
      )}
    >
      <Icon className="h-3 w-3" />
      {label}
      {showCode ? (
        <span className="font-mono normal-case tracking-normal opacity-90">
          {disbursement.code}
        </span>
      ) : null}
    </span>
  );
}
