export const CONSUMABLE_CLASSIFICATIONS = ["supply", "material"] as const;

export type ConsumableClassification =
  (typeof CONSUMABLE_CLASSIFICATIONS)[number];

export const DEFAULT_CONSUMABLE_CLASSIFICATION: ConsumableClassification =
  "supply";

export const CONSUMABLE_CLASSIFICATION_LABELS: Record<
  ConsumableClassification,
  string
> = {
  supply: "Consumable Supplies",
  material: "Consumable Materials",
};

export function isConsumableClassification(
  value: unknown
): value is ConsumableClassification {
  return (
    typeof value === "string" &&
    (CONSUMABLE_CLASSIFICATIONS as readonly string[]).includes(value)
  );
}

export function consumableClassificationLabel(
  value: ConsumableClassification | string | null | undefined
): string {
  if (isConsumableClassification(value)) {
    return CONSUMABLE_CLASSIFICATION_LABELS[value];
  }
  return CONSUMABLE_CLASSIFICATION_LABELS[DEFAULT_CONSUMABLE_CLASSIFICATION];
}

/**
 * Resolve supply vs material for a purchase-lot row in scoped PO indexes.
 * Prefer the lot's own classification (draft new-item or server-enriched),
 * then project destination, then a linked-consumable lookup map.
 * Never invent "supply" for undelivered new items that already carry classification.
 */
export function resolvePurchaseLotClassification(
  lot: {
    itemType?: string | null;
    projectId?: string | null;
    classification?: ConsumableClassification | string | null;
    consumableId?: string | null;
  },
  classificationByConsumableId?: Map<string, ConsumableClassification>
): ConsumableClassification | null {
  if (lot.itemType !== "consumable") return null;
  if (lot.projectId) return "material";
  if (isConsumableClassification(lot.classification)) {
    return lot.classification;
  }
  if (lot.consumableId && classificationByConsumableId?.has(lot.consumableId)) {
    return (
      classificationByConsumableId.get(lot.consumableId) ??
      DEFAULT_CONSUMABLE_CLASSIFICATION
    );
  }
  return DEFAULT_CONSUMABLE_CLASSIFICATION;
}
