/**
 * Format amounts as Philippine peso with 2 decimal places.
 */
export function formatPhp(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "₱0.00";
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return "₱0.00";
  return `₱${n.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
