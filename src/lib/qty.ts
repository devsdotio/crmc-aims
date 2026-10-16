import { z } from "zod";

/**
 * Warehouse quantity helpers (numeric(12, 2)).
 * Drizzle returns numeric columns as strings — always coerce before arithmetic.
 */

export function toQty(value: string | number | null | undefined): number {
  if (value == null || value === "") return 0;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** Persist / compare at 2 decimal places. */
export function formatQty(value: number): string {
  return toQty(value).toFixed(2);
}

export function roundQty(value: number): number {
  return Number(formatQty(value));
}

export function qtyEquals(a: number, b: number): boolean {
  return formatQty(a) === formatQty(b);
}

/** Display: trim trailing zeros (10.00 → 10, 1.50 → 1.5). */
export function displayQty(value: string | number | null | undefined): string {
  const n = toQty(value);
  if (Number.isInteger(n)) return String(n);
  return String(parseFloat(n.toFixed(2)));
}

function hasAtMostTwoDecimals(n: number): boolean {
  return Math.abs(n * 100 - Math.round(n * 100)) < 1e-9;
}

function parseQtyInput(
  value: string | number,
  ctx: z.RefinementCtx,
  opts: { min: number; minInclusive: boolean; max?: number; message: string }
): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || !hasAtMostTwoDecimals(n)) {
    ctx.addIssue({
      code: "custom",
      message: opts.message,
    });
    return z.NEVER;
  }
  if (opts.minInclusive ? n < opts.min : n <= opts.min) {
    ctx.addIssue({
      code: "custom",
      message: opts.message,
    });
    return z.NEVER;
  }
  if (opts.max !== undefined && n > opts.max) {
    ctx.addIssue({
      code: "custom",
      message: opts.message,
    });
    return z.NEVER;
  }
  return roundQty(n);
}

/** Positive warehouse qty (max 2 decimal places). */
export const positiveQtySchema = z
  .union([z.string(), z.number()])
  .transform((value, ctx) =>
    parseQtyInput(value, ctx, {
      min: 0,
      minInclusive: false,
      max: 999_999,
      message: "Quantity must be a positive number with at most 2 decimal places.",
    })
  );

/** Non-negative warehouse qty (opening stock / thresholds). */
export const nonNegativeQtySchema = z
  .union([z.string(), z.number()])
  .transform((value, ctx) =>
    parseQtyInput(value, ctx, {
      min: 0,
      minInclusive: true,
      max: 999_999,
      message:
        "Quantity must be zero or a positive number with at most 2 decimal places.",
    })
  );

/** Signed non-zero adjustment delta (max 2 dp). */
export const signedQtyChangeSchema = z
  .union([z.string(), z.number()])
  .transform((value, ctx) => {
    const n = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(n) || n === 0 || !hasAtMostTwoDecimals(n)) {
      ctx.addIssue({
        code: "custom",
        message:
          "Quantity change must be a non-zero number with at most 2 decimal places.",
      });
      return z.NEVER;
    }
    if (Math.abs(n) > 999_999) {
      ctx.addIssue({
        code: "custom",
        message: "Quantity change is too large.",
      });
      return z.NEVER;
    }
    return roundQty(n);
  });
