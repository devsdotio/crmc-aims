import { describe, expect, it } from "vitest";

import { resolvePurchaseLotClassification } from "@/lib/consumable-classification";

describe("resolvePurchaseLotClassification (PO supplies/materials scope)", () => {
  it("keeps undelivered new material lots out of the supplies scope", () => {
    const lot = {
      itemType: "consumable" as const,
      projectId: null,
      consumableId: null,
      classification: "material" as const,
    };

    expect(resolvePurchaseLotClassification(lot)).toBe("material");
    expect(resolvePurchaseLotClassification(lot) === "supply").toBe(false);
  });

  it("keeps undelivered new supply lots in the supplies scope", () => {
    expect(
      resolvePurchaseLotClassification({
        itemType: "consumable",
        projectId: null,
        consumableId: null,
        classification: "supply",
      })
    ).toBe("supply");
  });

  it("treats project-linked lots as material even without classification", () => {
    expect(
      resolvePurchaseLotClassification({
        itemType: "consumable",
        projectId: "proj-1",
        consumableId: null,
        classification: null,
      })
    ).toBe("material");
  });

  it("prefers lot.classification over a stale consumable lookup map", () => {
    const map = new Map([["c-1", "supply" as const]]);
    expect(
      resolvePurchaseLotClassification(
        {
          itemType: "consumable",
          projectId: null,
          consumableId: "c-1",
          classification: "material",
        },
        map
      )
    ).toBe("material");
  });

  it("falls back to linked consumable map when lot.classification is absent", () => {
    const map = new Map([["c-2", "material" as const]]);
    expect(
      resolvePurchaseLotClassification(
        {
          itemType: "consumable",
          projectId: null,
          consumableId: "c-2",
          classification: null,
        },
        map
      )
    ).toBe("material");
  });

  it("returns null for asset lots", () => {
    expect(
      resolvePurchaseLotClassification({
        itemType: "asset",
        classification: "supply",
      })
    ).toBeNull();
  });
});
