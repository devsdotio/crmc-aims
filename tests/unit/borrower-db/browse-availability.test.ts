import { describe, expect, it } from "vitest";

import {
  canRequestBrowseItem,
  isBrowseItemInStock,
} from "@/components/borrower-db/browse-availability";

describe("requester catalog requestability", () => {
  it("keeps out-of-stock supplies and materials requestable for Admin restock", () => {
    expect(canRequestBrowseItem({ type: "consumable", status: "out_of_stock" })).toBe(true);
    expect(canRequestBrowseItem({ type: "consumable", status: "low_stock" })).toBe(true);
    expect(canRequestBrowseItem({ type: "consumable", status: "available" })).toBe(true);

    expect(isBrowseItemInStock({ type: "consumable", status: "out_of_stock" })).toBe(false);
    expect(isBrowseItemInStock({ type: "consumable", status: "low_stock" })).toBe(true);
    expect(isBrowseItemInStock({ type: "consumable", status: "available" })).toBe(true);
  });

  it("requires serialized assets to be active before requesting", () => {
    expect(canRequestBrowseItem({ type: "asset", status: "active" })).toBe(true);
    expect(canRequestBrowseItem({ type: "asset", status: "needs_repair" })).toBe(false);
    expect(canRequestBrowseItem({ type: "asset", status: "out_of_service" })).toBe(false);
    expect(canRequestBrowseItem({ type: "asset", status: "retired" })).toBe(false);

    expect(isBrowseItemInStock({ type: "asset", status: "active" })).toBe(true);
    expect(isBrowseItemInStock({ type: "asset", status: "needs_repair" })).toBe(false);
  });
});

