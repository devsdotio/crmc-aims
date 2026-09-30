import { beforeEach, describe, expect, it } from "vitest";

import { AssetService } from "@/server/modules/assets/asset.service";
import { BorrowLogService } from "@/server/modules/borrow-log/borrow-log.service";
import { BorrowRequestService } from "@/server/modules/borrow-requests/borrow-request.service";
import { MaintenanceLogService } from "@/server/modules/maintenance/maintenance.service";
import { ConflictError } from "@/server/shared/errors";
import { hasTestDatabase, resetTestDatabase } from "../../setup/db";
import { seedCoreFixtures, type TestFixtures } from "../../setup/fixtures";

const describeIntegration = hasTestDatabase ? describe : describe.skip;

describeIntegration("borrow request release → return (integration)", () => {
  const assets = new AssetService();
  const borrowRequests = new BorrowRequestService();
  const borrowLogs = new BorrowLogService();
  const maintenance = new MaintenanceLogService();
  let fx: TestFixtures;

  beforeEach(async () => {
    await resetTestDatabase();
    fx = await seedCoreFixtures();
  });

  async function releaseBorrowableUnit(name: string) {
    const unit = await assets.createAsset(
      {
        name,
        category: fx.assetCategory,
        location: "Depot",
        assignmentType: "borrowable",
      },
      fx.actor
    );

    const pending = await borrowRequests.create(
      {
        requesterName: fx.borrower.displayName,
        requesterEmail: fx.borrower.email!,
        departmentId: fx.departmentId,
        requestType: "borrowable",
        expectedReturnDate: "2026-10-30",
        items: [
          {
            itemDescription: name,
            category: fx.assetCategory,
            quantity: 1,
            itemType: "asset",
            purpose: "Field work",
          },
        ],
        requesterUserId: fx.borrower.userId,
      },
      fx.borrower
    );

    await borrowRequests.approve(pending.id, { note: "Ok" }, fx.actor);

    const released = await borrowRequests.release(
      pending.id,
      {
        pickedUpBy: "Jane Pickup",
        lineAllocations: [{ lineIndex: 0, assetIds: [unit.id] }],
      },
      fx.actor
    );

    return { unit, released };
  }

  it("returns a released borrow request: closes custody, clears holder, records condition + lifecycle", async () => {
    const { unit, released } = await releaseBorrowableUnit("Return Path Laptop");
    expect(released.status).toBe("released");
    expect(released.items[0]?.assetId).toBe(unit.id);

    const returned = await borrowRequests.markReturned(
      released.id,
      {
        returnedBy: "Jane Pickup",
        condition: "good",
        note: "All accessories present",
      },
      fx.actor
    );

    expect(returned.status).toBe("returned");
    expect(returned.history.some((h) => h.action === "returned")).toBe(true);
    expect(
      returned.history.some((h) => h.note?.includes("Jane Pickup"))
    ).toBe(true);

    const freed = await assets.getAssetById(unit.id, fx.actor.tenantId);
    expect(freed.currentHolder).toBeFalsy();
    expect(freed.status).toBe("active");

    const closedLogsRaw = await borrowLogs.list(
      { assetId: unit.id, status: "returned", custodyKind: "borrow" },
      fx.actor
    );
    const closedLogs = Array.isArray(closedLogsRaw)
      ? closedLogsRaw
      : closedLogsRaw.data;
    expect(closedLogs).toHaveLength(1);
    expect(closedLogs[0].status).toBe("returned");
    expect(closedLogs[0].conditionOnReturn).toBe("good");
    expect(closedLogs[0].conditionNotes).toMatch(/Jane Pickup/);
    expect(closedLogs[0].requestCode).toBe(released.requestCode);
    expect(closedLogs[0].receivedBy).toBe(fx.actor.displayName);

    const openLogsRaw = await borrowLogs.list(
      { assetId: unit.id, status: "active" },
      fx.actor
    );
    const openLogs = Array.isArray(openLogsRaw) ? openLogsRaw : openLogsRaw.data;
    expect(openLogs).toHaveLength(0);

    const lifecycle = await assets.listLifecycle(
      unit.id,
      50,
      fx.actor.tenantId
    );
    expect(lifecycle.some((e) => e.eventType === "released")).toBe(true);
    expect(lifecycle.some((e) => e.eventType === "returned")).toBe(true);
    const returnEvent = lifecycle.find((e) => e.eventType === "returned");
    expect(returnEvent?.payload).toMatchObject({
      condition: "good",
      requestCode: released.requestCode,
    });

    await expect(
      borrowRequests.markReturned(
        released.id,
        { returnedBy: "Someone Else" },
        fx.actor
      )
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("return with needs_repair flags maintenance and asset status", async () => {
    const { unit, released } = await releaseBorrowableUnit("Damaged Tablet");

    const returned = await borrowRequests.markReturned(
      released.id,
      {
        returnedBy: "Field Tech",
        condition: "needs_repair",
        note: "Cracked screen",
        flagMaintenance: true,
      },
      fx.actor
    );
    expect(returned.status).toBe("returned");

    const held = await assets.getAssetById(unit.id, fx.actor.tenantId);
    expect(held.currentHolder).toBeFalsy();
    expect(held.status).toBe("needs_repair");

    const closedLogsRaw = await borrowLogs.list(
      { assetId: unit.id, status: "returned" },
      fx.actor
    );
    const closedLogs = Array.isArray(closedLogsRaw)
      ? closedLogsRaw
      : closedLogsRaw.data;
    expect(closedLogs[0].conditionOnReturn).toBe("needs_repair");

    const openMaint = await maintenance.list(
      { assetId: unit.id, openOnly: true },
      fx.actor
    );
    expect(openMaint.length).toBeGreaterThanOrEqual(1);
    expect(openMaint[0].assetId).toBe(unit.id);
    expect(openMaint[0].isResolved).toBe(false);
  });

  it("rejects return before release and rejects duplicate release", async () => {
    const unit = await assets.createAsset(
      {
        name: "Guard Laptop",
        category: fx.assetCategory,
        location: "Depot",
        assignmentType: "borrowable",
      },
      fx.actor
    );

    const pending = await borrowRequests.create(
      {
        requesterName: fx.borrower.displayName,
        requesterEmail: fx.borrower.email!,
        departmentId: fx.departmentId,
        requestType: "borrowable",
        expectedReturnDate: "2026-11-01",
        items: [
          {
            itemDescription: "Laptop",
            category: fx.assetCategory,
            quantity: 1,
            itemType: "asset",
            purpose: "Training",
          },
        ],
        requesterUserId: fx.borrower.userId,
      },
      fx.borrower
    );

    await expect(
      borrowRequests.markReturned(
        pending.id,
        { returnedBy: "Too Early" },
        fx.actor
      )
    ).rejects.toBeInstanceOf(ConflictError);

    await borrowRequests.approve(pending.id, {}, fx.actor);

    const released = await borrowRequests.release(
      pending.id,
      {
        pickedUpBy: "Clerk",
        lineAllocations: [{ lineIndex: 0, assetIds: [unit.id] }],
      },
      fx.actor
    );
    expect(released.status).toBe("released");

    await expect(
      borrowRequests.release(
        pending.id,
        {
          pickedUpBy: "Clerk",
          lineAllocations: [{ lineIndex: 0, assetIds: [unit.id] }],
        },
        fx.actor
      )
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("undoes approval before release and blocks undo after release", async () => {
    const unit = await assets.createAsset(
      {
        name: "Undo Path Laptop",
        category: fx.assetCategory,
        location: "Depot",
        assignmentType: "borrowable",
      },
      fx.actor
    );

    const pending = await borrowRequests.create(
      {
        requesterName: fx.borrower.displayName,
        requesterEmail: fx.borrower.email!,
        departmentId: fx.departmentId,
        requestType: "borrowable",
        expectedReturnDate: "2026-11-02",
        items: [
          {
            itemDescription: "Laptop",
            category: fx.assetCategory,
            quantity: 1,
            itemType: "asset",
            purpose: "Training",
          },
        ],
        requesterUserId: fx.borrower.userId,
      },
      fx.borrower
    );

    await borrowRequests.approve(pending.id, {}, fx.actor);
    const undone = await borrowRequests.undoApproval(
      pending.id,
      { note: "Wrong unit reserved" },
      fx.actor
    );
    expect(undone.status).toBe("pending");
    expect(undone.history.some((h) => h.action === "approval_undone")).toBe(
      true
    );

    await borrowRequests.approve(pending.id, {}, fx.actor);
    await borrowRequests.release(
      pending.id,
      {
        pickedUpBy: "Clerk",
        lineAllocations: [{ lineIndex: 0, assetIds: [unit.id] }],
      },
      fx.actor
    );

    await expect(
      borrowRequests.undoApproval(pending.id, {}, fx.actor)
    ).rejects.toBeInstanceOf(ConflictError);
  });
});
