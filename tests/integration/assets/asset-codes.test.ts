import { beforeEach, describe, expect, it } from "vitest";

import { AssetService } from "@/server/modules/assets/asset.service";
import { hasTestDatabase } from "../../setup/env";
import { resetTestDatabase } from "../../setup/db";
import { seedCoreFixtures, type TestFixtures } from "../../setup/fixtures";

const describeIntegration = hasTestDatabase ? describe : describe.skip;

const CP_CODE = /^CP-\d{3}$/;

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
    expect(peeked.assetCode).toMatch(CP_CODE);

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
    expect(first.name).toBe("Laptop A");
    expect(first.category).toBe(fx.assetCategory);
    expect(first.location).toBe("Depot");
    expect(first.status).toBe("active");
    expect(first.assignmentType).toBe("borrowable");
    expect(first.currentHolder).toBeFalsy();

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
    expect(second.assetCode).toMatch(CP_CODE);
    expect(second.assignmentType).toBe("assignable");
    expect(second.status).toBe("active");

    const lifecycle = await assets.listLifecycle(
      first.id,
      20,
      fx.actor.tenantId
    );
    // Newest-first ledger — oldest event is always registration.
    expect(lifecycle.length).toBeGreaterThanOrEqual(1);
    expect(lifecycle.at(-1)?.eventType).toBe("created");
    expect(lifecycle.at(-1)?.assetCode).toBe(first.assetCode);
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
    expect(retry.assetCode).toMatch(CP_CODE);
    expect(retry.name).toBe("Printer B");
    expect(retry.status).toBe("active");
  });
});
