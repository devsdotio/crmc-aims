/**
 * Utilities for asset custom maintenance conditions and condition notes parsing.
 */

export const CUSTOM_CONDITIONS_STORAGE_KEY = "crmc_aims_custom_asset_conditions";

export const DEFAULT_SUGGESTED_CONDITIONS = [
  "Calibration Required",
  "Overheating / Fan Issue",
  "Display / Screen Defect",
  "Physical Wear & Tear",
  "Battery / Power Issue",
  "Loose Connection / Ports",
] as const;

/**
 * Extracts any structured custom condition prefix from a notes string.
 * Format: `[Condition: Screen Flickering]\nDetailed issue description`
 */
export function parseConditionNotes(notes: string | null | undefined): {
  customCondition: string | null;
  notes: string;
} {
  if (!notes) return { customCondition: null, notes: "" };
  const trimmed = notes.trim();
  const match = trimmed.match(/^\[Condition:\s*([^\]]+)\](?:\r?\n|\s+)?([\s\S]*)$/);
  if (match) {
    const customCondition = match[1]?.trim() || null;
    const cleanNotes = match[2]?.trim() || "";
    return {
      customCondition,
      notes: cleanNotes,
    };
  }
  return { customCondition: null, notes: trimmed };
}

/**
 * Prepends a structured custom condition tag to issue notes.
 */
export function formatConditionNotes(
  notes: string,
  customCondition?: string | null
): string {
  const trimmedNotes = notes.trim();
  const trimmedCondition = customCondition?.trim();
  if (!trimmedCondition) {
    return trimmedNotes;
  }
  return `[Condition: ${trimmedCondition}]\n${trimmedNotes}`;
}

/**
 * Retrieves user-defined custom conditions from localStorage safely.
 */
export function getSavedCustomConditions(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CUSTOM_CONDITIONS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
    }
  } catch {
    // Gracefully ignore corrupt local storage
  }
  return [];
}

/**
 * Persists a new custom condition to localStorage.
 */
export function saveCustomCondition(condition: string): string[] {
  if (typeof window === "undefined") return [];
  const trimmed = condition.trim();
  if (!trimmed) return getSavedCustomConditions();

  try {
    const existing = getSavedCustomConditions();
    const normalized = trimmed.toLowerCase();
    const filtered = existing.filter((c) => c.toLowerCase() !== normalized);
    const updated = [trimmed, ...filtered].slice(0, 20); // Keep up to 20 recent custom conditions
    window.localStorage.setItem(CUSTOM_CONDITIONS_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return getSavedCustomConditions();
  }
}

/**
 * Removes a custom condition from localStorage.
 */
export function removeCustomCondition(condition: string): string[] {
  if (typeof window === "undefined") return [];
  const trimmed = condition.trim().toLowerCase();
  try {
    const existing = getSavedCustomConditions();
    const updated = existing.filter((c) => c.toLowerCase() !== trimmed);
    window.localStorage.setItem(CUSTOM_CONDITIONS_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return getSavedCustomConditions();
  }
}
