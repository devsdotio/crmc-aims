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
