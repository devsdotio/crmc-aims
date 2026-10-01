/**
 * Unit of measure (UoM) defaults for purchase-order lines.
 * Assets are no longer locked to a single label — callers may store any
 * free-text UoM (set, pair, pcs, …). These helpers only supply fallbacks
 * when a line has no explicit unit.
 */

export const DEFAULT_ASSET_UNIT = "unit" as const;
export const DEFAULT_CONSUMABLE_UNIT = "pcs" as const;

export type PurchaseItemType = "asset" | "consumable";

/** Fallback UoM when a line / draft leaves unit blank. */
export function defaultPurchaseUnit(itemType: PurchaseItemType): string {
  return itemType === "asset" ? DEFAULT_ASSET_UNIT : DEFAULT_CONSUMABLE_UNIT;
}

/**
 * Prefer an explicit unit; otherwise fall back by item type.
 * Blank / whitespace-only values are treated as unset.
 */
export function resolvePurchaseUnit(
  itemType: PurchaseItemType,
  unit?: string | null
): string {
  const trimmed = typeof unit === "string" ? unit.trim() : "";
  return trimmed || defaultPurchaseUnit(itemType);
}
