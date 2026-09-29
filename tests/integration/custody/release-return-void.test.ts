import { beforeEach, describe, expect, it } from "vitest";

import { AssetService } from "@/server/modules/assets/asset.service";
import { BorrowLogService } from "@/server/modules/borrow-log/borrow-log.service";
import { ConsumableService } from "@/server/modules/consumables/consumable.service";
import { StockMovementService } from "@/server/modules/stock-movements/stock-movement.service";
import { isVoidedNotes } from "@/server/modules/stock-movements/stock-movement.repository";
import { PurchaseLotService } from "@/server/modules/purchase-lots/purchase-lot.service";
import { hasTestDatabase, resetTestDatabase } from "../../setup/db";
import { seedCoreFixtures, type TestFixtures } from "../../setup/fixtures";

const describeIntegration = hasTestDatabase ? describe : describe.skip;

describeIntegration("custody / stock void (integration)", () => {
  const assets = new AssetService();
  const borrowLogs = new BorrowLogService();
  const consumables = new ConsumableService();
  const movements = new StockMovementService();
  const lots = new PurchaseLotService();
  let fx: TestFixtures;

  beforeEach(async () => {
    await resetTestDatabase();
    fx = await seedCoreFixtures();
  });

  it("releases and returns an asset, and can void a mistaken manual issue", async () => {
    const asset = await assets.createAsset(
      {
        name: "Custody Camera",
        category: fx.assetCategory,
        location: "Depot",
        assignmentType: "borrowable",
      },
      fx.actor
    );

    const released = await assets.releaseAsset(
      asset.id,
      {
        custodyKind: "borrow",
        departmentId: fx.departmentId,
        borrowerName: "Jane Doe",
        expectedReturnDate: "2026-10-01",
        notes: "Manual issue for event",
      },
      fx.actor
    );
    expect(released.currentHolder).toBeTruthy();

    const openLogsRaw = await borrowLogs.list(
      { assetId: asset.id, status: "active" },
      fx.actor
    );
    const openLogs = Array.isArray(openLogsRaw) ? openLogsRaw : openLogsRaw.data;
    expect(openLogs.length).toBe(1);
    const logId = openLogs[0].id;

    const returned = await assets.returnAsset(
      asset.id,
      { condition: "good" },
      fx.actor
    );
    expect(returned.currentHolder).toBeFalsy();

    const asset2 = await assets.createAsset(
      {
        name: "Mistaken Issue Radio",
        category: fx.assetCategory,
        location: "Depot",
        assignmentType: "borrowable",
      },
      fx.actor
    );
    await assets.releaseAsset(
      asset2.id,
      {
        custodyKind: "borrow",
        departmentId: fx.departmentId,
        borrowerName: "Wrong Person",
        expectedReturnDate: "2026-10-01",
      },
      fx.actor
    );
    const mistakenRaw = await borrowLogs.list(
      { assetId: asset2.id, status: "active" },
      fx.actor
    );
    const mistaken = Array.isArray(mistakenRaw) ? mistakenRaw : mistakenRaw.data;
    const voided = await borrowLogs.voidLog(
      mistaken[0].id,
      { reason: "Wrong borrower selected" },
      fx.actor
    );
    expect(voided.status).toBe("voided");

    // logId used only to assert we tracked the first log
    expect(logId).toBeTruthy();
  });

  it("issues consumable stock and voids the issue restoring qty", async () => {
    const item = await consumables.create(
      {
        name: "Markers",
        category: fx.consumableCategory,
        classification: "supply",
        unit: "pcs",
        currentQty: 8,
        unitCost: 15,
        supplierId: fx.supplierId,
        location: "Store",
      },
      fx.actor
    );

    const availableLots = await lots.list(
      { consumableId: item.id },
      fx.actor.tenantId
    );
    expect(availableLots.length).toBeGreaterThanOrEqual(1);
    const lotId = availableLots[0].id;

    await consumables.issue(
      item.id,
      {
        quantity: 3,
        departmentId: fx.departmentId,
        lotId,
        receivedBy: "Front desk",
      },
      fx.actor
    );

    const afterIssue = await consumables.getById(item.id, fx.actor.tenantId);
    expect(afterIssue.currentQty).toBe(5);

    const ledger = await movements.listByConsumable(item.id, fx.actor.tenantId);
    const issueMove = ledger.find(
      (m) => m.direction === "out" && m.reason === "issue" && !isVoidedNotes(m.notes)
    );
    expect(issueMove).toBeTruthy();

    await movements.voidIssue(
      issueMove!.id,
      { reason: "Issued wrong quantity" },
      fx.actor
    );

    const restored = await consumables.getById(item.id, fx.actor.tenantId);
    expect(restored.currentQty).toBe(8);

    const afterVoid = await movements.listByConsumable(item.id, fx.actor.tenantId);
    expect(
      afterVoid.some((m) => m.direction === "in" && m.notes?.includes("[REVERSES:"))
    ).toBe(true);
  });
});
