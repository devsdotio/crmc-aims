import { beforeEach, describe, expect, it } from "vitest";

import { BadRequestError } from "@/server/shared/errors";

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

  it("rejects release of a fixed asset and still releases a borrowable asset", async () => {
    const building = await assets.createAsset(
      {
        name: "Main Gym",
        category: fx.assetCategory,
        location: "Campus",
        assignmentType: "fixed",
      },
      fx.actor
    );

    await expect(
      assets.releaseAsset(
        building.id,
        {
          custodyKind: "borrow",
          departmentId: fx.departmentId,
          borrowerName: "Jane Doe",
        },
        fx.actor
      )
    ).rejects.toBeInstanceOf(BadRequestError);

    const borrowable = await assets.createAsset(
      {
        name: "Loaner Camera",
        category: fx.assetCategory,
        location: "Depot",
        assignmentType: "borrowable",
      },
      fx.actor
    );
    const dueDate = new Date();
    dueDate.setUTCDate(dueDate.getUTCDate() + 14);
    const released = await assets.releaseAsset(
      borrowable.id,
      {
        custodyKind: "borrow",
        departmentId: fx.departmentId,
        borrowerName: "Jane Doe",
        expectedReturnDate: dueDate.toISOString().slice(0, 10),
      },
      fx.actor
    );
    expect(released.currentHolder).toBeTruthy();
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

    // Keep due date in the future so status=active list does not treat it as overdue.
    const dueDate = new Date();
    dueDate.setUTCDate(dueDate.getUTCDate() + 14);
    const expectedReturnDate = dueDate.toISOString().slice(0, 10);

    const released = await assets.releaseAsset(
      asset.id,
      {
        custodyKind: "borrow",
        departmentId: fx.departmentId,
        borrowerName: "Jane Doe",
        expectedReturnDate,
        notes: "Manual issue for event",
      },
      fx.actor
    );
    expect(released.currentHolder).toMatch(/Dept:|Jane Doe|Information Technology/i);
    expect(released.status).toBe("active");

    const openLogsRaw = await borrowLogs.list(
      { assetId: asset.id, status: "active" },
      fx.actor
    );
    const openLogs = Array.isArray(openLogsRaw) ? openLogsRaw : openLogsRaw.data;
    expect(openLogs).toHaveLength(1);
    expect(openLogs[0].borrowerName).toBe("Jane Doe");
    expect(openLogs[0].custodyKind).toBe("borrow");
    expect(openLogs[0].departmentId).toBe(fx.departmentId);
    expect(openLogs[0].assetCode).toBe(asset.assetCode);
    expect(openLogs[0].assetName).toBe("Custody Camera");
    expect(openLogs[0].status).toBe("active");
    expect(openLogs[0].dueDate).toBe(expectedReturnDate);
    expect(openLogs[0].department).toBe(fx.departmentName);
    const logId = openLogs[0].id;

    const returned = await assets.returnAsset(
      asset.id,
      { condition: "good" },
      fx.actor
    );
    expect(returned.currentHolder).toBeFalsy();
    expect(returned.status).toBe("active");

    const lifecycle = await assets.listLifecycle(
      asset.id,
      50,
      fx.actor.tenantId
    );
    const types = lifecycle.map((e) => e.eventType);
    expect(types).toContain("released");
    expect(types).toContain("returned");
    expect(lifecycle.at(-1)?.eventType).toBe("created");

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
        expectedReturnDate,
      },
      fx.actor
    );
    const mistakenRaw = await borrowLogs.list(
      { assetId: asset2.id, status: "active" },
      fx.actor
    );
    const mistaken = Array.isArray(mistakenRaw) ? mistakenRaw : mistakenRaw.data;
    expect(mistaken[0].borrowerName).toBe("Wrong Person");

    const voided = await borrowLogs.voidLog(
      mistaken[0].id,
      { reason: "Wrong borrower selected" },
      fx.actor
    );
    expect(voided.status).toBe("voided");
    expect(voided.borrowerName).toBe("Wrong Person");

    const freed = await assets.getAssetById(asset2.id, fx.actor.tenantId);
    expect(freed.currentHolder).toBeFalsy();
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
    expect(availableLots[0].quantityRemaining).toBe(8);

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
    expect(issueMove!.qty).toBe(3);
    expect(issueMove!.departmentId).toBe(fx.departmentId);
    expect(issueMove!.purchaseLotId).toBe(lotId);

    await movements.voidIssue(
      issueMove!.id,
      { reason: "Issued wrong quantity" },
      fx.actor
    );

    const restored = await consumables.getById(item.id, fx.actor.tenantId);
    expect(restored.currentQty).toBe(8);

    const afterVoid = await movements.listByConsumable(item.id, fx.actor.tenantId);
    const voidedOriginal = afterVoid.find((m) => m.id === issueMove!.id);
    expect(voidedOriginal?.voided || isVoidedNotes(voidedOriginal?.notes)).toBe(
      true
    );
    const reversal = afterVoid.find(
      (m) => m.direction === "in" && m.isReversal
    );
    expect(reversal).toBeTruthy();
    expect(reversal!.qty).toBe(3);

    const lotsAfter = await lots.list(
      { consumableId: item.id },
      fx.actor.tenantId
    );
    expect(lotsAfter[0].quantityRemaining).toBe(8);
  });
});
