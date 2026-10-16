/**
 * Global display sanitizers to guarantee UUIDs, raw database keys, and technical identifiers
 * are never rendered directly on user screens.
 */

import { displayQty } from "@/lib/qty";

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
 * Supports fractional warehouse quantities (up to 2 decimal places).
 */
export function formatQuantityWithUnit(
  qty: number,
  unit?: string | null,
  itemType?: "asset" | "consumable" | string
): string {
  const parsed = Number(qty);
  const count = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  const shown = displayQty(count);
  if (itemType === "consumable" || unit) {
    if (unit && unit.trim()) {
      const rawUnit = unit.trim();
      const lower = rawUnit.toLowerCase();
      if (count === 1) {
        // Singular
        if (lower.endsWith("s") && !lower.endsWith("ss") && lower !== "pcs") {
          if (lower.endsWith("boxes")) return `${shown} box`;
          if (lower.endsWith("ies")) return `${shown} ${rawUnit.slice(0, -3)}y`;
          if (lower.endsWith("es")) return `${shown} ${rawUnit.slice(0, -2)}`;
          return `${shown} ${rawUnit.slice(0, -1)}`;
        }
        return `${shown} ${rawUnit}`;
      } else {
        // Plural (includes fractional amounts like 0.5)
        if (lower === "box") return `${shown} boxes`;
        if (lower === "ream") return `${shown} reams`;
        if (lower === "piece" || lower === "pc") return `${shown} pcs`;
        if (lower === "bottle") return `${shown} bottles`;
        if (lower === "pack" || lower === "pkg") return `${shown} packs`;
        if (lower === "roll") return `${shown} rolls`;
        if (lower === "kilo" || lower === "kg" || lower === "kilogram") return `${shown} kilos`;
        if (lower === "gram" || lower === "g") return `${shown} grams`;
        if (lower === "liter" || lower === "litre" || lower === "l") return `${shown} liters`;
        if (lower === "set") return `${shown} sets`;
        if (lower === "pad") return `${shown} pads`;
        if (lower === "can") return `${shown} cans`;
        if (lower === "tube") return `${shown} tubes`;
        if (lower === "pair") return `${shown} pairs`;
        if (lower === "sheet") return `${shown} sheets`;
        if (!lower.endsWith("s")) return `${shown} ${rawUnit}s`;
        return `${shown} ${rawUnit}`;
      }
    }
  }
  return `${shown} ${count === 1 ? "unit" : "units"}`;
}
