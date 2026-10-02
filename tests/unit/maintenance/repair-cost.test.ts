import { describe, expect, it } from "vitest";
import { effectiveRepairAmount } from "@/lib/repair-cost";

describe("effectiveRepairAmount", () => {
  it("adds part lines instead of keeping a smaller overall cost", () => {
    expect(
      effectiveRepairAmount(12334, [
        { cost: "4542300.00" },
        { cost: "112336.00" },
      ])
    ).toBe(4654636);
  });

  it("keeps a typed overall cost when no part line has a cost", () => {
    expect(effectiveRepairAmount("800.50", [{ cost: null }])).toBe(
      800.5
    );
  });

  it("returns null when nothing was recorded", () => {
    expect(effectiveRepairAmount(null, [])).toBeNull();
  });
});
