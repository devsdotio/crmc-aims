"use client";

import { Printer } from "lucide-react";

interface PrintTriggerButtonProps {
  label?: string;
  className?: string;
}

export function PrintTriggerButton({
  label = "Print / Save as PDF",
  className = "",
}: PrintTriggerButtonProps) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className={`no-print inline-flex items-center gap-2 rounded-md bg-[#2A3260] px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-[#1f2549] transition-all cursor-pointer ${className}`}
    >
      <Printer className="h-4 w-4" />
      <span>{label}</span>
    </button>
  );
}
