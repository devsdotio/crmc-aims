import { roundQty } from "@/lib/qty";

/**
 * Join unique non-empty purpose strings for request header summary / list search.
 */
export function summarizePurposes(
  purposes: Array<string | null | undefined>,
  maxLen = 1000
): string {
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const raw of purposes) {
    const p = (raw ?? "").trim();
    if (!p) continue;
    const key = p.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(p);
  }
  if (unique.length === 0) return "General";
  const joined = unique.join("; ");
  if (joined.length <= maxLen) return joined;
  return `${joined.slice(0, maxLen - 1).trimEnd()}…`;
}

/**
 * Group lines/items by purpose for detail panels and print slips.
 * Legacy rows without line purpose fall back to `headerPurpose`.
 */
export function groupByPurpose<T extends { purpose?: string | null }>(
  lines: T[],
  headerPurpose?: string | null
): Array<{ purpose: string; lines: T[] }> {
  const fallback = (headerPurpose ?? "").trim() || "General";
  const order: string[] = [];
  const map = new Map<string, T[]>();
  for (const line of lines) {
    const purpose = (line.purpose ?? "").trim() || fallback;
    const key = purpose.toLowerCase();
    if (!map.has(key)) {
      map.set(key, []);
      order.push(purpose);
    }
    map.get(key)!.push(line);
  }
  return order.map((purpose) => ({
    purpose,
    lines: map.get(purpose.toLowerCase()) ?? [],
  }));
}

/** List/queue chip: "N purposes" when more than one distinct line purpose. */
export function purposePreviewLabel(
  headerPurpose?: string | null,
  linePurposes?: Array<string | null | undefined>
): string {
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const raw of linePurposes ?? []) {
    const p = (raw ?? "").trim();
    if (!p) continue;
    const key = p.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(p);
  }
  if (unique.length > 1) return `${unique.length} purposes`;
  if (unique.length === 1) return unique[0];
  return (headerPurpose ?? "").trim();
}

/**
 * Merge duplicate consumable lines ONLY when both `consumableId` and trimmed
 * case-insensitive `purpose` match, preserving separate lines for different purposes.
 */
export function mergeConsumableLinesByPurpose(
  rawLines: Array<{
    consumableId?: string | null;
    quantity: number;
    purpose?: string | null;
    notes?: string | null;
  }>,
  fallbackPurpose = "General"
): Array<{
  consumableId: string;
  quantity: number;
  purpose: string;
  notes?: string;
}> {
  const merged = new Map<
    string,
    { consumableId: string; quantity: number; purpose: string; notes?: string }
  >();
  for (const line of rawLines) {
    if (!line.consumableId) continue;
    const resolvedPurpose = (line.purpose || fallbackPurpose).trim() || "General";
    const key = `${line.consumableId}::${resolvedPurpose.toLowerCase()}`;
    const note = line.notes?.trim() || undefined;
    const prev = merged.get(key);
    if (prev) {
      prev.quantity = roundQty(prev.quantity + Number(line.quantity));
      if (!prev.notes && note) prev.notes = note;
    } else {
      merged.set(key, {
        consumableId: line.consumableId,
        quantity: roundQty(Number(line.quantity)),
        purpose: resolvedPurpose,
        ...(note ? { notes: note } : {}),
      });
    }
  }
  return Array.from(merged.values());
}
