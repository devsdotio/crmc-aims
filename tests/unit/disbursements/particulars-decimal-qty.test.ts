import { describe, expect, it } from "vitest";

import {
  particularLineAmount,
  patchParticularLine,
  serializeParticulars,
  parseParticulars,
  blankParticular,
} from "@/lib/voucher-particulars";

describe("disbursement particulars decimal quantity", () => {
  it("accepts fractional quantity keystrokes like money inputs", () => {
    const base = blankParticular();
    const withQty = patchParticularLine(base, "quantity", "1.25");
    expect(withQty).not.toBeNull();
    expect(withQty!.quantity).toBe("1.25");

    const withCost = patchParticularLine(withQty!, "unitCost", "40");
    expect(withCost).not.toBeNull();
    expect(withCost!.amount).toBe("50.00");
    expect(particularLineAmount(withCost!)).toBe(50);
  });

  it("rejects more than 2 decimal places on quantity", () => {
    const base = blankParticular();
    expect(patchParticularLine(base, "quantity", "1.234")).toBeNull();
  });

  it("serializes and re-parses fractional quantities", () => {
    const line = patchParticularLine(
      {
        description: "Sealant",
        quantity: "0.5",
        unitOfMeasure: "L",
        unitCost: "120.00",
        amount: "",
      },
      "quantity",
      "0.5"
    )!;
    const withCost = patchParticularLine(line, "unitCost", "120")!;
    const raw = serializeParticulars([
      { ...withCost, description: "Sealant", unitOfMeasure: "L" },
    ]);
    const parsed = parseParticulars(raw);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].quantity).toBe("0.5");
    expect(parsed[0].amount).toBe("60.00");
  });

  it("parses legacy fractional Nx prefix in descriptions", () => {
    const parsed = parseParticulars("1.5x Epoxy resin ₱300.00");
    expect(parsed).toHaveLength(1);
    expect(parsed[0].quantity).toBe("1.5");
    expect(parsed[0].description).toMatch(/Epoxy resin/i);
  });
});
