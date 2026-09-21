/**
 * Helpers for controlled quantity/cost fields that must allow clearing
 * (empty string) while still rejecting non-numeric keystrokes.
 */

/** Empty or digits only. Returns null if the keystroke should be ignored. */
export function filterUnsignedIntInput(value: string): string | null {
  if (value === "") return "";
  return /^\d+$/.test(value) ? value : null;
}

/** Empty or decimal with up to 2 fractional digits. */
export function filterMoneyInput(value: string): string | null {
  if (value === "") return "";
  return /^\d*\.?\d{0,2}$/.test(value) ? value : null;
}

export function parseUnsignedInt(value: string, fallback = 0): number {
  const trimmed = value.trim();
  if (trimmed === "") return fallback;
  const n = Number(trimmed);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

export function parseMoney(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "" || trimmed === ".") return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}
