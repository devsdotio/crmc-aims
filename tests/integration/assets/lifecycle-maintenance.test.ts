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

const LOT_CODE = /^LOT-\d{4}-[A-F0-9]{8}$/i;
const MNT_CODE = /^MNT-\d{4}-[A-F0-9]{8}$/i;

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
    expect(created.status).toBe("active");
    expect(created.assignmentType).toBe("borrowable");
    expect(created.category).toBe(fx.assetCategory);
    expect(created.classification).toBe(fx.assetClassification);
    expect(created.unit).toBe("unit");

    const byClass = await assets.listAssets(
      { classification: fx.assetClassification },
      fx.actor.tenantId
    );
    expect(byClass.some((a) => a.id === created.id)).toBe(true);

    const byWrongClass = await assets.listAssets(
      { classification: "Furniture" },
      fx.actor.tenantId
    );
    expect(byWrongClass.some((a) => a.id === created.id)).toBe(false);

    const updated = await assets.updateAsset(
      created.id,
      {
        location: "IT Storeroom",
        notes: "Moved for inventory",
        unit: "set",
      },
      fx.actor
    );
    expect(updated.location).toBe("IT Storeroom");
    expect(updated.notes).toBe("Moved for inventory");
    expect(updated.name).toBe("Scanner Unit");
    expect(updated.unit).toBe("set");

    const lifecycleBeforeFlag = await assets.listLifecycle(
      created.id,
      50,
      fx.actor.tenantId
    );
    expect(lifecycleBeforeFlag.at(-1)?.eventType).toBe("created");
    expect(lifecycleBeforeFlag.some((e) => e.eventType === "updated")).toBe(
      true
    );

    await assets.flagForMaintenance(
      created.id,
      { notes: "Feed roller worn" },
      fx.actor
    );
    const afterFlag = await assets.getAssetById(created.id);
    expect(afterFlag.status).toBe("needs_repair");

    const lifecycle = await assets.listLifecycle(
      created.id,
      50,
      fx.actor.tenantId
    );
    expect(lifecycle.at(-1)?.eventType).toBe("created");
    expect(lifecycle.some((e) => e.eventType === "flagged_maintenance")).toBe(
      true
    );
    expect(lifecycle.some((e) => e.eventType === "status_changed")).toBe(true);

    const openLogs = await maintenance.list(
      { assetId: created.id, openOnly: true },
      fx.actor
    );
    expect(openLogs).toHaveLength(1);
    expect(openLogs[0].assetId).toBe(created.id);
    expect(openLogs[0].assetCode).toBe(created.assetCode);
    expect(openLogs[0].isResolved).toBe(false);
    expect(openLogs[0].notes).toMatch(/Feed roller worn/i);
    expect(openLogs[0].logCode).toMatch(MNT_CODE);

    const disposable = await assets.createAsset(
      {
        name: "Disposable Webcam",
        category: fx.assetCategory,
        location: "Depot",
      },
      fx.actor
    );
    await assets.deleteAsset(disposable.id, fx.actor);
    await expect(
      assets.getAssetById(disposable.id, fx.actor.tenantId)
    ).rejects.toThrow();
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
    // Department release stores a Dept: custody label; person is on the borrow log.
    expect(after.currentHolder).toMatch(/Dept:|Field Tech|Information Technology/i);

    const openLogs = await maintenance.list(
      { assetId: asset.id, openOnly: true },
      fx.actor
    );
    expect(openLogs).toHaveLength(1);
    expect(openLogs[0].isResolved).toBe(false);
    expect(openLogs[0].assignedToName).toMatch(/Field Tech/i);
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
    expect(asset.status).toBe("needs_repair");

    const logs = await maintenance.list(
      { assetId: asset.id, openOnly: true },
      fx.actor
    );
    const open = logs[0];
    expect(open).toBeTruthy();
    expect(open.isResolved).toBe(false);
    expect(open.assetCode).toBe(asset.assetCode);

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
    expect(resolved.condition).toBe("resolved");
    expect(resolved.resolvedBy).toBe("Tech A");
    expect(resolved.resolutionNotes).toBe("Replaced power board");
    expect(resolved.repairParts).toEqual([]);

    const after = await assets.getAssetById(asset.id, fx.actor.tenantId);
    expect(after.status).toBe("active");

    const stillOpen = await maintenance.list(
      { assetId: asset.id, openOnly: true },
      fx.actor
    );
    expect(stillOpen).toHaveLength(0);
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
    expect(item.currentQty).toBe(5);
    expect(item.classification).toBe("supply");

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
    const adjusts = ledger.filter((m) => m.reason === "adjust");
    expect(adjusts.length).toBeGreaterThanOrEqual(2);
    expect(adjusts.some((m) => m.direction === "in" && m.qty === 3)).toBe(true);
    expect(adjusts.some((m) => m.direction === "out" && m.qty === 2)).toBe(
      true
    );

    const lots = await getDb()
      .select()
      .from(purchaseLots)
      .where(eq(purchaseLots.consumableId, item.id));
    const codes = lots.map((l) => l.lotCode);
    expect(new Set(codes).size).toBe(codes.length);
    expect(codes.every((c) => LOT_CODE.test(c))).toBe(true);
    expect(lots.reduce((sum, l) => sum + l.quantityRemaining, 0)).toBe(6);
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
    expect(lots).toHaveLength(1);
    expect(lots[0].quantityRemaining).toBe(10);

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
    const issue = outs.find(
      (m) => m.direction === "out" && m.reason === "issue"
    );
    expect(issue).toBeTruthy();
    expect(issue!.qty).toBe(2);
    expect(issue!.departmentId).toBe(fx.departmentId);
    expect(issue!.purchaseLotId).toBe(lots[0].id);

    const lotsAfter = await getDb()
      .select()
      .from(purchaseLots)
      .where(eq(purchaseLots.consumableId, item.id));
    expect(lotsAfter[0].quantityRemaining).toBe(8);
  });
});
