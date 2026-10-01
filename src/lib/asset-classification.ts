/**
 * Helpers for general asset classifications (Settings → Categories type=asset_class).
 * Specific categories (type=asset) optionally parent to a class; assets store the
 * class name denormalized on `assets.classification` (empty when unset).
 */

export const ASSET_CLASS_CATEGORY_TYPE = "asset_class" as const;

export function normalizeAssetClassification(
  value: string | null | undefined
): string {
  return typeof value === "string" ? value.trim() : "";
}

export function hasAssetClassification(
  value: string | null | undefined
): boolean {
  return normalizeAssetClassification(value).length > 0;
}

/**
 * Prefer an explicit class name, else fall back to a linked category parent label.
 */
export function resolveAssetClassificationLabel(
  explicit: string | null | undefined,
  parentClassName?: string | null | undefined
): string {
  const fromExplicit = normalizeAssetClassification(explicit);
  if (fromExplicit) return fromExplicit;
  return normalizeAssetClassification(parentClassName);
}
