import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";

import { getDb } from "@/server/db";
import { purchaseLots, stockMovements } from "@/server/db/schema";
import { AssetService } from "@/server/modules/assets/asset.service";
import { ConsumableService } from "@/server/modules/consumables/consumable.service";
import { StockMovementService } from "@/server/modules/stock-movements/stock-movement.service";
import { MaintenanceLogService } from "@/server/modules/maintenance/maintenance.service";
import { hasTestDatabase } from "../../setup/env";
import { resetTestDatabase } from "../../setup/db";
import { seedCoreFixtures, type TestFixtures } from "../../setup/fixtures";

const describeIntegration = hasTestDatabase ? describe : describe.skip;

describeIntegration("assets expand (CRUD / history / maintenance)", () => {
  const assets = new AssetService();
  const maintenance = new MaintenanceLogService();
  let fx: TestFixtures;

  beforeEach(async () => {
    await resetTestDatabase();
    fx = await seedCoreFixtures();
  });

  it("updates and deletes an asset; flags maintenance; lifecycle stays chronological", async () => {
    const created = await assets.createAsset(
      {
        name: "Scanner Unit",
        category: fx.assetCategory,
        location: "Depot",
        assignmentType: "borrowable",
      },
      fx.actor
    );

    const updated = await assets.updateAsset(
      created.id,
      { location: "IT Storeroom", notes: "Moved for inventory" },
      fx.actor
    );
    expect(updated.location).toBe("IT Storeroom");

    const lifecycle = await assets.listLifecycle(
      created.id,
      50,
      fx.actor.tenantId
    );
    expect(lifecycle.some((e) => e.eventType === "created")).toBe(true);

    await assets.flagForMaintenance(
      created.id,
      { notes: "Feed roller worn" },
      fx.actor
    );
    const afterFlag = await assets.getAssetById(created.id);
    expect(afterFlag.status).toBe("needs_repair");

    const openLogs = await maintenance.list(
      { assetId: created.id, openOnly: true },
      fx.actor
    );
    expect(openLogs.length).toBeGreaterThanOrEqual(1);

    // Create a disposable asset to delete (flagged ones may block delete)
    const disposable = await assets.createAsset(
      {
        name: "Disposable Webcam",
        category: fx.assetCategory,
        location: "Depot",
      },
      fx.actor
    );
    await assets.deleteAsset(disposable.id, fx.actor);
  });

  it("flags maintenance while asset is still in custody", async () => {
    const asset = await assets.createAsset(
      {
        name: "Loaned Tablet",
        category: fx.assetCategory,
        location: "Depot",
        assignmentType: "borrowable",
      },
      fx.actor
    );

    await assets.releaseAsset(
      asset.id,
      {
        custodyKind: "borrow",
        departmentId: fx.departmentId,
        borrowerName: "Field Tech",
        expectedReturnDate: "2026-10-20",
      },
      fx.actor
    );

    await assets.flagForMaintenance(
      asset.id,
      { notes: "Cracked screen while on loan" },
      fx.actor
    );

    const after = await assets.getAssetById(asset.id);
    expect(after.status).toBe("needs_repair");
    expect(after.currentHolder).toBeTruthy();

    const openLogs = await maintenance.list(
      { assetId: asset.id, openOnly: true },
      fx.actor
    );
    expect(openLogs.length).toBeGreaterThanOrEqual(1);
  });

  it("resolves an open maintenance log", async () => {
    const asset = await assets.createAsset(
      {
        name: "Broken Monitor",
        category: fx.assetCategory,
        location: "Depot",
        status: "needs_repair",
        notes: "No power",
      },
      fx.actor
    );

    const logs = await maintenance.list(
      { assetId: asset.id, openOnly: true },
      fx.actor
    );
    const open = logs[0];
    expect(open).toBeTruthy();

    const resolved = await maintenance.resolve(
      open.id,
      {
        resolutionNotes: "Replaced power board",
        technician: "Tech A",
        noPartsUsed: true,
      },
      fx.actor
    );
    expect(resolved.isResolved).toBe(true);
  });
});

describeIntegration("inventory expand (adjust / ledger / issue)", () => {
  const consumables = new ConsumableService();
  const movements = new StockMovementService();
  let fx: TestFixtures;

  beforeEach(async () => {
    await resetTestDatabase();
    fx = await seedCoreFixtures();
  });

  it("adjusts stock up and down with ledger lines; lot codes stay unique", async () => {
    const item = await consumables.create(
      {
        name: "Stapler Boxes",
        category: fx.consumableCategory,
        classification: "supply",
        unit: "box",
        currentQty: 5,
        unitCost: 80,
        supplierId: fx.supplierId,
        location: "Store",
      },
      fx.actor
    );

    await consumables.adjust(
      item.id,
      { quantityChange: 3, reason: "Found unlogged stock" },
      fx.actor
    );
    let current = await consumables.getById(item.id, fx.actor.tenantId);
    expect(current.currentQty).toBe(8);

    await consumables.adjust(
      item.id,
      { quantityChange: -2, reason: "Damaged units", useFifo: true },
      fx.actor
    );
    current = await consumables.getById(item.id, fx.actor.tenantId);
    expect(current.currentQty).toBe(6);

    const ledger = await movements.listByConsumable(item.id, fx.actor.tenantId);
    expect(ledger.length).toBeGreaterThanOrEqual(3);
    expect(ledger.some((m) => m.reason === "adjust")).toBe(true);

    const lots = await getDb()
      .select()
      .from(purchaseLots)
      .where(eq(purchaseLots.consumableId, item.id));
    const codes = lots.map((l) => l.lotCode);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("issues to a department and records an out movement", async () => {
    const item = await consumables.create(
      {
        name: "Bond Paper",
        category: fx.consumableCategory,
        classification: "supply",
        unit: "ream",
        currentQty: 10,
        unitCost: 200,
        supplierId: fx.supplierId,
        location: "Store",
      },
      fx.actor
    );
    const lots = await getDb()
      .select()
      .from(purchaseLots)
      .where(eq(purchaseLots.consumableId, item.id));

    await consumables.issue(
      item.id,
      {
        quantity: 2,
        departmentId: fx.departmentId,
        lotId: lots[0].id,
        receivedBy: "Front desk",
      },
      fx.actor
    );

    const after = await consumables.getById(item.id, fx.actor.tenantId);
    expect(after.currentQty).toBe(8);

    const outs = await getDb()
      .select()
      .from(stockMovements)
      .where(eq(stockMovements.consumableId, item.id));
    expect(outs.some((m) => m.direction === "out" && m.reason === "issue")).toBe(
      true
    );
  });
});
