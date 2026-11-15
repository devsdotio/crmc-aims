import { describe, expect, it } from "vitest";

import {
  CONSUMABLE_CLASSIFICATIONS,
  CONSUMABLE_REQUEST_KINDS,
  deriveConsumableRequestKind,
  splitByConsumableClassification,
} from "@/lib/consumable-classification";

describe("consumable classification & requisition kind helpers", () => {
  it("exposes distinct supply, material, and mixed request kinds", () => {
    expect(CONSUMABLE_CLASSIFICATIONS).toEqual(["supply", "material"]);
    expect(CONSUMABLE_REQUEST_KINDS).toEqual(["supply", "material", "mixed"]);
  });

  it("derives supply when lines are empty or contain only supplies", () => {
    expect(deriveConsumableRequestKind([])).toBe("supply");
    expect(deriveConsumableRequestKind(["supply", null, undefined])).toBe(
      "supply"
    );
  });

  it("derives material when all non-null lines are classified as materials", () => {
    expect(deriveConsumableRequestKind(["material"])).toBe("material");
    expect(deriveConsumableRequestKind(["material", "material"])).toBe(
      "material"
    );
    expect(deriveConsumableRequestKind(["material", null])).toBe("material");
  });

  it("derives mixed when a requisition mixes supplies and materials", () => {
    expect(deriveConsumableRequestKind(["supply", "material"])).toBe("mixed");
  });

  it("splits combined lines into separate supplies and materials arrays", () => {
    const combined = splitByConsumableClassification([
      { id: "1", classification: "supply" },
      { id: "2", classification: "material" },
      { id: "3", classification: null },
    ]);
    expect(combined.isCombined).toBe(true);
    expect(combined.supplies.map((x) => x.id)).toEqual(["1", "3"]);
    expect(combined.materials.map((x) => x.id)).toEqual(["2"]);

    const pure = splitByConsumableClassification([
      { id: "4", classification: "material" },
    ]);
    expect(pure.isCombined).toBe(false);
    expect(pure.supplies).toEqual([]);
    expect(pure.materials.map((x) => x.id)).toEqual(["4"]);
  });
});

