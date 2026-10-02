/**
 * Helpers for general consumable classifications
 * (Settings → Categories type=consumable_class).
 *
 * Distinct from supply|material (`consumables.classification`):
 * specific categories (type=consumable) optionally parent to a class; items
 * store the class name denormalized on `consumables.category_class`.
 */

export const CONSUMABLE_CLASS_CATEGORY_TYPE = "consumable_class" as const;

export function normalizeConsumableCategoryClass(
  value: string | null | undefined
): string {
  return typeof value === "string" ? value.trim() : "";
}

export function hasConsumableCategoryClass(
  value: string | null | undefined
): boolean {
  return normalizeConsumableCategoryClass(value).length > 0;
}

export function resolveConsumableCategoryClassLabel(
  explicit: string | null | undefined,
  parentClassName?: string | null | undefined
): string {
  const fromExplicit = normalizeConsumableCategoryClass(explicit);
  if (fromExplicit) return fromExplicit;
  return normalizeConsumableCategoryClass(parentClassName);
}
