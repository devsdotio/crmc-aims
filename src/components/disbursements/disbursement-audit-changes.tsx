export type DisbursementChangeView = {
  label: string;
  before: string;
  after: string;
  terse?: boolean;
};

function isChangeItem(value: unknown): value is DisbursementChangeView {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return typeof item.label === "string";
}

/** Field edits stored on an audit log, including older rows that only have a summary string. */
export function readDisbursementChanges(
  metadata: unknown
): DisbursementChangeView[] {
  if (!metadata || typeof metadata !== "object") return [];
  const record = metadata as Record<string, unknown>;
  if (Array.isArray(record.changes)) {
    return record.changes.filter(isChangeItem).map((item) => ({
      label: item.label,
      before: item.before ?? "",
      after: item.after ?? "",
      terse: Boolean(item.terse),
    }));
  }

  if (typeof record.summary !== "string" || !record.summary.trim()) return [];
  return record.summary
    .split("; ")
    .map((part) => {
      const terse = part.match(/^(.+?): updated$/);
      if (terse) {
        return { label: terse[1], before: "", after: "", terse: true };
      }
      const arrow = part.match(/^(.+?): "(.*)" → "(.*)"$/);
      if (!arrow) return null;
      return { label: arrow[1], before: arrow[2], after: arrow[3] };
    })
    .filter((item): item is DisbursementChangeView => item !== null);
}

export function DisbursementAuditChanges({
  items,
}: {
  items: DisbursementChangeView[];
}) {
  if (items.length === 0) return null;

  return (
    <ul className="mt-1.5 space-y-1">
      {items.map((item) => (
        <li
          key={item.label}
          className="flex flex-wrap items-center gap-1.5 text-[11px]"
        >
          <span
            className="h-2 w-2 shrink-0 rounded-full bg-amber-500"
            aria-hidden
          />
          <span className="font-semibold text-text">{item.label}</span>
          {item.terse ? (
            <span className="rounded-full border border-amber-500/30 bg-amber-500/15 px-1.5 py-0.5 font-semibold text-amber-800 dark:text-amber-300">
              updated
            </span>
          ) : (
            <>
              <span className="rounded bg-rose-500/15 px-1.5 py-0.5 font-medium text-rose-800 line-through decoration-rose-500/70 dark:text-rose-300">
                {item.before || "—"}
              </span>
              <span className="text-text-muted" aria-hidden>
                →
              </span>
              <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 font-semibold text-emerald-800 dark:text-emerald-300">
                {item.after || "—"}
              </span>
            </>
          )}
        </li>
      ))}
    </ul>
  );
}

const AUDIT_RAIL: Record<string, string> = {
  created: "bg-blue-500",
  updated: "bg-amber-500",
  approved: "bg-emerald-500",
  disbursed: "bg-orange-500",
  completed: "bg-primary",
  cancelled: "bg-rose-500",
};

export function auditActionRail(action: string): string {
  return AUDIT_RAIL[action] ?? "bg-gray-400";
}

const HIDDEN_AUDIT_KEYS = new Set(["changes", "summary", "updatedFields"]);

export function leftoverAuditMeta(metadata: unknown): Array<[string, string]> {
  if (!metadata || typeof metadata !== "object") return [];
  return Object.entries(metadata as Record<string, unknown>)
    .filter(([key, value]) => !HIDDEN_AUDIT_KEYS.has(key) && value != null && typeof value !== "object")
    .map(([key, value]) => [key, String(value)]);
}
