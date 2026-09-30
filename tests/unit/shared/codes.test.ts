import { describe, expect, it } from "vitest";

import {
  formatSequentialCode,
  generateOperationalCode,
  yearPrefix,
} from "@/server/shared/codes";

describe("operational codes", () => {
  const fixed = new Date("2026-06-15T12:00:00.000Z");

  it("formats sequential codes as PREFIX-YYYY-NNNN", () => {
    expect(formatSequentialCode("PO", 1, fixed)).toBe("PO-2026-0001");
    expect(formatSequentialCode("LOT", 42, fixed)).toBe("LOT-2026-0042");
    expect(formatSequentialCode("AST", 0, fixed)).toBe("AST-2026-0001");
  });

  it("builds year prefix", () => {
    expect(yearPrefix("PO", fixed)).toBe("PO-2026-");
  });

  it("generates collision-resistant operational codes", () => {
    const a = generateOperationalCode("PO", fixed);
    const b = generateOperationalCode("PO", fixed);
    expect(a).toMatch(/^PO-2026-[0-9A-F]{8}$/);
    expect(b).toMatch(/^PO-2026-[0-9A-F]{8}$/);
    expect(a).not.toBe(b);
  });
});
