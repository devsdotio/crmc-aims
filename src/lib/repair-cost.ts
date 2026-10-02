export type RepairPartCost = {
  cost?: string | number | null;
};

/** Parse a stored or typed money value. Commas are ignored. */
export function parseRepairAmount(value: unknown): number | null {
  if (value == null || value === "") return null;
  const amount =
    typeof value === "number" ? value : Number(String(value).replace(/,/g, ""));
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
}

/** Sum of part lines that have a cost. Null when no line has a cost. */
export function sumRepairPartCosts(
  parts: readonly RepairPartCost[] | null | undefined
): number | null {
  if (!parts || parts.length === 0) return null;
  let sum = 0;
  let sawCost = false;
  for (const part of parts) {
    const amount = parseRepairAmount(part.cost);
    if (amount == null) continue;
    sawCost = true;
    sum += amount;
  }
  return sawCost ? sum : null;
}

/**
 * Service cost for a maintenance log.
 * Part lines that have costs are the total. A typed overall cost applies only
 * when no part line has a cost (labor or an unitemized repair).
 */
export function effectiveRepairAmount(
  repairCost: unknown,
  parts: readonly RepairPartCost[] | null | undefined
): number | null {
  const fromParts = sumRepairPartCosts(parts);
  if (fromParts != null) return fromParts;
  return parseRepairAmount(repairCost);
}

export function formatRepairAmount(amount: number | null): string | null {
  if (amount == null) return null;
  return amount.toFixed(2);
}
