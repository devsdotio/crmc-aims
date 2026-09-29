export type DisbursementFieldChange = {
  label: string;
  before: unknown;
  after: unknown;
  /** Compare as money so "100" and "100.00" are the same value. */
  numeric?: boolean;
  /** Record that the field changed without dumping the stored text. */
  terse?: boolean;
};

function asText(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function valuesMatch(change: DisbursementFieldChange): boolean {
  if (change.numeric) {
    const before = Number(asText(change.before).replace(/,/g, ""));
    const after = Number(asText(change.after).replace(/,/g, ""));
    if (Number.isFinite(before) && Number.isFinite(after)) {
      return Math.abs(before - after) < 0.005;
    }
  }
  return asText(change.before) === asText(change.after);
}

function displayValue(value: unknown): string {
  const text = asText(value);
  if (!text) return "—";
  if (text.length > 80) return `${text.slice(0, 77)}…`;
  return text;
}

export type DisbursementChangeItem = {
  label: string;
  before: string;
  after: string;
  terse?: boolean;
};

export function describeDisbursementChanges(changes: DisbursementFieldChange[]): {
  labels: string[];
  summary: string;
  items: DisbursementChangeItem[];
} {
  const changed = changes.filter((change) => !valuesMatch(change));
  const items: DisbursementChangeItem[] = changed.map((change) => ({
    label: change.label,
    before: change.terse ? "" : displayValue(change.before),
    after: change.terse ? "" : displayValue(change.after),
    ...(change.terse ? { terse: true } : {}),
  }));
  const summary = items
    .map((item) =>
      item.terse
        ? `${item.label}: updated`
        : `${item.label}: "${item.before}" → "${item.after}"`
    )
    .join("; ");

  return {
    labels: items.map((item) => item.label),
    summary,
    items,
  };
}
