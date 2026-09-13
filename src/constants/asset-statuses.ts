/**
 * Canonical badge styling for asset lifecycle statuses.
 * Shared by the dashboard fleet table card, asset list views, and any other
 * component that renders an asset status pill — avoids drift between components.
 */

export type AssetDisplayStatus =
  | "active"
  | "needs_repair"
  | "out_of_service"
  | "retired"
  | "missing"
  // dashboard-computed compound statuses
  | "Available"
  | "In Custody"
  | "Maintenance"
  | "Out of Service"
  | "Retired"
  | "Missing";

export interface StatusBadgeMeta {
  label: string;
  /** Tailwind bg + text classes for the pill wrapper */
  badgeClass: string;
  /** Tailwind bg class for the dot indicator */
  dotClass: string;
  /** Simplified colour bucket for programmatic use */
  color: "green" | "yellow" | "gray" | "red" | "blue";
}

export const STATUS_BADGE_MAP: Record<string, StatusBadgeMeta> = {
  // ── DB enum values ──────────────────────────────────────────────────────────
  active: {
    label: "Active",
    badgeClass:
      "bg-emerald-50 text-emerald-700 border border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60",
    dotClass: "bg-emerald-500",
    color: "green",
  },
  needs_repair: {
    label: "Maintenance",
    badgeClass:
      "bg-amber-50 text-amber-800 border border-amber-200/60 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/60",
    dotClass: "bg-amber-500",
    color: "yellow",
  },
  out_of_service: {
    label: "Out of Service",
    badgeClass:
      "bg-rose-50 text-rose-700 border border-rose-200/60 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/60",
    dotClass: "bg-rose-500",
    color: "red",
  },
  retired: {
    label: "Retired",
    badgeClass:
      "bg-slate-100 text-slate-600 border border-slate-200/60 dark:bg-slate-800/40 dark:text-slate-400 dark:border-slate-700/60",
    dotClass: "bg-slate-400",
    color: "gray",
  },
  missing: {
    label: "Missing",
    badgeClass:
      "bg-rose-50 text-rose-700 border border-rose-200/60 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/60",
    dotClass: "bg-rose-500",
    color: "red",
  },

  // ── Dashboard-computed display labels ───────────────────────────────────────
  Available: {
    label: "Available",
    badgeClass:
      "bg-emerald-50 text-emerald-700 border border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60",
    dotClass: "bg-emerald-500",
    color: "green",
  },
  "In Custody": {
    label: "In Custody",
    badgeClass:
      "bg-blue-50 text-blue-700 border border-blue-200/60 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800/60",
    dotClass: "bg-blue-500",
    color: "blue",
  },
  Maintenance: {
    label: "Maintenance",
    badgeClass:
      "bg-amber-50 text-amber-800 border border-amber-200/60 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/60",
    dotClass: "bg-amber-500",
    color: "yellow",
  },
  "Out of Service": {
    label: "Out of Service",
    badgeClass:
      "bg-rose-50 text-rose-700 border border-rose-200/60 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/60",
    dotClass: "bg-rose-500",
    color: "red",
  },
  Retired: {
    label: "Retired",
    badgeClass:
      "bg-slate-100 text-slate-600 border border-slate-200/60 dark:bg-slate-800/40 dark:text-slate-400 dark:border-slate-700/60",
    dotClass: "bg-slate-400",
    color: "gray",
  },
  Missing: {
    label: "Missing",
    badgeClass:
      "bg-rose-50 text-rose-700 border border-rose-200/60 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/60",
    dotClass: "bg-rose-500",
    color: "red",
  },
};

/**
 * Look up badge meta for a given status string, falling back gracefully for
 * unknown or null values.
 */
export function getAssetStatusBadge(status: string | null | undefined): StatusBadgeMeta {
  if (!status) {
    return STATUS_BADGE_MAP["active"];
  }
  return (
    STATUS_BADGE_MAP[status] ?? {
      label: status,
      badgeClass:
        "bg-slate-100 text-slate-600 border border-slate-200/60 dark:bg-slate-800/40 dark:text-slate-400",
      dotClass: "bg-slate-400",
      color: "gray" as const,
    }
  );
}
