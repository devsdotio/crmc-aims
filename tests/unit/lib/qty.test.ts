import { describe, expect, it } from "vitest";

import {
  displayQty,
  formatQty,
  nonNegativeQtySchema,
  positiveQtySchema,
  qtyEquals,
  roundQty,
  signedQtyChangeSchema,
  toQty,
} from "@/lib/qty";
import { formatQuantityWithUnit } from "@/lib/sanitize-display";

describe("warehouse qty helpers", () => {
  it("coerces numeric strings and formats to 2 dp", () => {
    expect(toQty("9.50")).toBe(9.5);
    expect(toQty(10)).toBe(10);
    expect(toQty(null)).toBe(0);
    expect(formatQty(1.5)).toBe("1.50");
    expect(roundQty(1.239)).toBe(1.24);
    expect(displayQty("10.00")).toBe("10");
    expect(displayQty(1.5)).toBe("1.5");
  });

  it("compares quantities at fixed 2 dp", () => {
    expect(qtyEquals(1.1 + 1.2, 2.3)).toBe(true);
    expect(qtyEquals(1.25, 1.2500001)).toBe(true);
    expect(qtyEquals(1.25, 1.26)).toBe(false);
  });

  it("accepts fractional positive quantities and rejects invalid ones", () => {
    expect(positiveQtySchema.parse(0.5)).toBe(0.5);
    expect(positiveQtySchema.parse("1.25")).toBe(1.25);
    expect(positiveQtySchema.parse(10)).toBe(10);
    expect(() => positiveQtySchema.parse(0)).toThrow();
    expect(() => positiveQtySchema.parse(-1)).toThrow();
    expect(() => positiveQtySchema.parse(1.234)).toThrow();
  });

  it("accepts zero for non-negative opening qty", () => {
    expect(nonNegativeQtySchema.parse(0)).toBe(0);
    expect(nonNegativeQtySchema.parse("0.25")).toBe(0.25);
    expect(() => nonNegativeQtySchema.parse(-0.01)).toThrow();
  });

  it("accepts signed non-zero adjustment deltas", () => {
    expect(signedQtyChangeSchema.parse(-1.5)).toBe(-1.5);
    expect(signedQtyChangeSchema.parse(0.25)).toBe(0.25);
    expect(() => signedQtyChangeSchema.parse(0)).toThrow();
  });
});

describe("formatQuantityWithUnit (fractional)", () => {
  it("renders fractional consumable quantities with units", () => {
    expect(formatQuantityWithUnit(0.5, "kg", "consumable")).toBe("0.5 kilos");
    expect(formatQuantityWithUnit(1.25, "ream", "consumable")).toBe(
      "1.25 reams"
    );
    expect(formatQuantityWithUnit(1, "ream", "consumable")).toBe("1 ream");
  });
});

describe("numeric-input decimal qty filters", () => {
  it("allows clearing and up to 2 decimal places", async () => {
    const {
      filterUnsignedDecimalInput,
      parseUnsignedDecimal,
    } = await import("@/lib/numeric-input");
    expect(filterUnsignedDecimalInput("")).toBe("");
    expect(filterUnsignedDecimalInput("0.5")).toBe("0.5");
    expect(filterUnsignedDecimalInput("1.25")).toBe("1.25");
    expect(filterUnsignedDecimalInput("1.234")).toBeNull();
    expect(parseUnsignedDecimal("2.5", 0)).toBe(2.5);
    expect(parseUnsignedDecimal(".", 0)).toBe(0);
  });
});
