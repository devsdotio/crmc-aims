/**
 * Global display sanitizers to guarantee UUIDs, raw database keys, and technical identifiers
 * are never rendered directly on user screens.
 */

export const UUID_REGEX = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

/** Checks if a given string is a raw UUID */
export function isUuid(val?: string | null): boolean {
  if (!val) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim());
}

/**
 * Sanitizes any string to ensure UUIDs are replaced with a friendly fallback
 * or stripped if embedded in longer text.
 */
export function sanitizeDisplay(val?: string | null, fallback = "—"): string {
  if (!val) return fallback;
  const trimmed = val.trim();
  if (isUuid(trimmed)) return fallback;
  if (UUID_REGEX.test(trimmed)) {
    const cleaned = trimmed.replace(UUID_REGEX, "").trim();
    return cleaned.length > 0 ? cleaned : fallback;
  }
  return trimmed;
}

/**
 * Ensures item descriptions never show raw UUIDs, defaulting to clean category titles.
 */
export function formatItemDescription(
  description?: string | null,
  categoryLabel?: string | null,
  itemType?: "asset" | "consumable"
): string {
  if (description && !isUuid(description)) {
    return description;
  }
  const cat = categoryLabel ? `${categoryLabel} ` : "";
  return itemType === "consumable" ? `${cat}Supply` : `${cat}Equipment`;
}

/**
 * Ensures asset code badges only show real human codes (e.g. AST-001, AV-012)
 * and never internal UUIDs or category IDs.
 */
export function formatAssetCodeDisplay(
  code?: string | null
): string | null {
  if (!code) return null;
  const trimmed = code.trim();
  if (isUuid(trimmed) || trimmed.toLowerCase().startsWith("cat-") || trimmed.toLowerCase().startsWith("cons-")) {
    return null;
  }
  return trimmed;
}

/**
 * Formats quantity with its appropriate unit measurement (e.g. "2 reams", "1 kilo", "5 boxes", "1 unit").
 */
export function formatQuantityWithUnit(
  qty: number,
  unit?: string | null,
  itemType?: "asset" | "consumable" | string
): string {
  const count = Number(qty) || 1;
  if (itemType === "consumable" || unit) {
    if (unit && unit.trim()) {
      const rawUnit = unit.trim();
      const lower = rawUnit.toLowerCase();
      if (count === 1) {
        // Singular
        if (lower.endsWith("s") && !lower.endsWith("ss") && lower !== "pcs") {
          if (lower.endsWith("boxes")) return `${count} box`;
          if (lower.endsWith("ies")) return `${count} ${rawUnit.slice(0, -3)}y`;
          if (lower.endsWith("es")) return `${count} ${rawUnit.slice(0, -2)}`;
          return `${count} ${rawUnit.slice(0, -1)}`;
        }
        return `${count} ${rawUnit}`;
      } else {
        // Plural
        if (lower === "box") return `${count} boxes`;
        if (lower === "ream") return `${count} reams`;
        if (lower === "piece" || lower === "pc") return `${count} pcs`;
        if (lower === "bottle") return `${count} bottles`;
        if (lower === "pack" || lower === "pkg") return `${count} packs`;
        if (lower === "roll") return `${count} rolls`;
        if (lower === "kilo" || lower === "kg" || lower === "kilogram") return `${count} kilos`;
        if (lower === "gram" || lower === "g") return `${count} grams`;
        if (lower === "liter" || lower === "litre" || lower === "l") return `${count} liters`;
        if (lower === "set") return `${count} sets`;
        if (lower === "pad") return `${count} pads`;
        if (lower === "can") return `${count} cans`;
        if (lower === "tube") return `${count} tubes`;
        if (lower === "pair") return `${count} pairs`;
        if (lower === "sheet") return `${count} sheets`;
        if (!lower.endsWith("s")) return `${count} ${rawUnit}s`;
        return `${count} ${rawUnit}`;
      }
    }
  }
  return `${count} ${count === 1 ? "unit" : "units"}`;
}
