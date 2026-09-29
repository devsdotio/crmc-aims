import { beforeEach, describe, expect, it } from "vitest";

import { AssetService } from "@/server/modules/assets/asset.service";
import { hasTestDatabase } from "../../setup/env";
import { resetTestDatabase } from "../../setup/db";
import { seedCoreFixtures, type TestFixtures } from "../../setup/fixtures";

const describeIntegration = hasTestDatabase ? describe : describe.skip;


describeIntegration("assets / codes (integration)", () => {
  const assets = new AssetService();
  let fx: TestFixtures;

  beforeEach(async () => {
    await resetTestDatabase();
    fx = await seedCoreFixtures();
  });

  it("allocates unique category-prefixed codes and starts lifecycle at created", async () => {
    const peeked = await assets.peekNextAssetCode(
      fx.assetCategory,
      fx.actor.tenantId
    );
    expect(peeked.prefix).toBe("CP");
    expect(peeked.assetCode).toMatch(/^CP-\d{3}$/);

    const first = await assets.createAsset(
      {
        name: "Laptop A",
        category: fx.assetCategory,
        location: "Depot",
        assignmentType: "borrowable",
      },
      fx.actor
    );
    expect(first.assetCode).toBe(peeked.assetCode);
    expect(first.assignmentType).toBe("borrowable");

    const second = await assets.createAsset(
      {
        name: "Laptop B",
        category: fx.assetCategory,
        location: "Depot",
        assignmentType: "assignable",
      },
      fx.actor
    );
    expect(second.assetCode).not.toBe(first.assetCode);
    expect(second.assetCode).toMatch(/^CP-\d{3}$/);
    expect(second.assignmentType).toBe("assignable");

    const lifecycle = await assets.listLifecycle(
      first.id,
      20,
      fx.actor.tenantId
    );
    expect(lifecycle.length).toBeGreaterThanOrEqual(1);
    // Newest-first ledger — created is present (and first when only one event).
    expect(lifecycle.some((e) => e.eventType === "created")).toBe(true);
  });

  it("does not collide when preferred code is already taken", async () => {
    const first = await assets.createAsset(
      {
        name: "Printer A",
        category: fx.assetCategory,
        location: "Depot",
      },
      fx.actor
    );

    const retry = await assets.createAsset(
      {
        assetCode: first.assetCode,
        name: "Printer B",
        category: fx.assetCategory,
        location: "Depot",
      },
      fx.actor
    );
    expect(retry.assetCode).not.toBe(first.assetCode);
  });
});
