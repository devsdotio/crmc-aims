export const CONSUMABLE_CLASSIFICATIONS = ["supply", "material"] as const;

export type ConsumableClassification =
  (typeof CONSUMABLE_CLASSIFICATIONS)[number];

export const CONSUMABLE_REQUEST_KINDS = ["supply", "material", "mixed"] as const;

export type ConsumableRequestKind = (typeof CONSUMABLE_REQUEST_KINDS)[number];

export const DEFAULT_CONSUMABLE_CLASSIFICATION: ConsumableClassification =
  "supply";

export function normalizeConsumableClassification(
  value: unknown
): ConsumableClassification {
  return typeof value === "string" && value.trim().toLowerCase() === "material"
    ? "material"
    : DEFAULT_CONSUMABLE_CLASSIFICATION;
}

export const CONSUMABLE_CLASSIFICATION_LABELS: Record<
  ConsumableClassification,
  string
> = {
  supply: "Consumable Supplies",
  material: "Consumable Materials",
};

/**
 * Derive request-level classification from its line classifications.
 * Mixed requests keep both visible in UI instead of collapsing into "supply".
 */
export function deriveConsumableRequestKind(
  classifications: Array<string | null | undefined>
): ConsumableRequestKind {
  let hasSupply = false;
  let hasMaterial = false;
  for (const raw of classifications) {
    const normalized = typeof raw === "string" ? raw.trim().toLowerCase() : "";
    if (normalized === "material") {
      hasMaterial = true;
    } else if (normalized === "supply") {
      hasSupply = true;
    }
  }
  if (hasSupply && hasMaterial) return "mixed";
  if (hasMaterial) return "material";
  return "supply";
}

/**
 * Partition line items into separate Supplies and Materials buckets so combined
 * requisitions stay visually separated across UI detail, edit, approval, and issue views.
 */
export function splitByConsumableClassification<
  T extends { classification?: string | null },
>(
  lines: readonly T[]
): {
  supplies: T[];
  materials: T[];
  isCombined: boolean;
} {
  const supplies: T[] = [];
  const materials: T[] = [];
  for (const line of lines) {
    const normalized =
      typeof line.classification === "string"
        ? line.classification.trim().toLowerCase()
        : "";
    if (normalized === "material") {
      materials.push(line);
    } else {
      supplies.push(line);
    }
  }
  return {
    supplies,
    materials,
    isCombined: supplies.length > 0 && materials.length > 0,
  };
}

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
