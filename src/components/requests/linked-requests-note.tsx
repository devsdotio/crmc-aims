"use client";

import { Link2 } from "lucide-react";

const KIND_LABEL: Record<string, string> = {
  borrow: "Borrow",
  assign: "Assignment",
  supply: "Supplies",
};

export function LinkedRequestsNote({
  related,
}: {
  related?: Array<{
    requestCode: string;
    kind: "borrow" | "assign" | "supply" | string;
  }>;
}) {
  if (!related || related.length === 0) return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-text-secondary">
      <Link2 className="h-3.5 w-3.5 text-text-secondary/70 shrink-0" />
      <span className="truncate max-w-xs">
        Also submitted:{" "}
        {related
          .map(
            (entry) =>
              `${entry.requestCode} (${KIND_LABEL[entry.kind] ?? entry.kind})`
          )
          .join(", ")}
      </span>
    </span>
  );
}
