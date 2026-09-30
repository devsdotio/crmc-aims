import { beforeEach, describe, expect, it } from "vitest";

import { AssetService } from "@/server/modules/assets/asset.service";
import { BorrowLogService } from "@/server/modules/borrow-log/borrow-log.service";
import { BorrowRequestService } from "@/server/modules/borrow-requests/borrow-request.service";
import { ConsumableService } from "@/server/modules/consumables/consumable.service";
import { ConsumableRequestService } from "@/server/modules/consumable-requests/consumable-request.service";
import { PurchaseLotService } from "@/server/modules/purchase-lots/purchase-lot.service";
import { StockMovementService } from "@/server/modules/stock-movements/stock-movement.service";
import { AuditLogService } from "@/server/modules/audit-logs/audit-logs.service";
import { AUDIT_ACTION, AUDIT_ENTITY } from "@/server/modules/audit-logs/audit-events";
import { hasTestDatabase, resetTestDatabase } from "../../setup/db";
import { seedCoreFixtures, type TestFixtures } from "../../setup/fixtures";

const describeIntegration = hasTestDatabase ? describe : describe.skip;

describeIntegration("requests approve → release (integration)", () => {
  const assets = new AssetService();
  const borrowRequests = new BorrowRequestService();
  const borrowLogs = new BorrowLogService();
  const consumables = new ConsumableService();
  const consumableRequests = new ConsumableRequestService();
  const lots = new PurchaseLotService();
  const movements = new StockMovementService();
  const audit = new AuditLogService();
  let fx: TestFixtures;

  beforeEach(async () => {
    await resetTestDatabase();
    fx = await seedCoreFixtures();
  });

  it("approves then releases a borrowable request onto a selected asset + custody log", async () => {
    const unit = await assets.createAsset(
      {
        name: "Release Laptop",
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
            itemDescription: "Laptop",
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
    expect(pending.status).toBe("pending");

    const approved = await borrowRequests.approve(
      pending.id,
      { note: "Unit reserved" },
      fx.actor
    );
    expect(approved.status).toBe("approved");

    const released = await borrowRequests.release(
      approved.id,
      {
        pickedUpBy: "Jane Pickup",
        note: "Issued at counter",
        lineAllocations: [{ lineIndex: 0, assetIds: [unit.id] }],
      },
      fx.actor
    );
    expect(released.status).toBe("released");
    expect(released.pickedUpBy).toBe("Jane Pickup");
    expect(released.history.some((h) => h.action === "released")).toBe(true);
    expect(released.history.some((h) => h.note?.includes("Jane Pickup"))).toBe(
      true
    );

    const held = await assets.getAssetById(unit.id, fx.actor.tenantId);
    expect(held.currentHolder).toMatch(/Dept:|Jane Pickup|Information Technology/i);

    const openLogsRaw = await borrowLogs.list(
      { assetId: unit.id, status: "active", custodyKind: "borrow" },
      fx.actor
    );
    const openLogs = Array.isArray(openLogsRaw) ? openLogsRaw : openLogsRaw.data;
    expect(openLogs).toHaveLength(1);
    expect(openLogs[0].borrowerName).toBe("Jane Pickup");
    expect(openLogs[0].custodyKind).toBe("borrow");
    expect(openLogs[0].departmentId).toBe(fx.departmentId);
    expect(openLogs[0].assetCode).toBe(unit.assetCode);
    expect(openLogs[0].dueDate).toBe("2026-10-30");
    expect(openLogs[0].requestCode).toBe(released.requestCode);

    const lifecycle = await assets.listLifecycle(
      unit.id,
      20,
      fx.actor.tenantId
    );
    expect(lifecycle.some((e) => e.eventType === "released")).toBe(true);
    expect(lifecycle.at(-1)?.eventType).toBe("created");

    const logs = await audit.list(
      {
        entityType: AUDIT_ENTITY.borrowRequest,
        action: AUDIT_ACTION.released,
      },
      fx.actor
    );
    expect(logs.length).toBeGreaterThanOrEqual(1);
    expect(logs[0].entityId).toBe(released.id);
    expect(logs[0].actorUserId).toBe(fx.actor.userId);
    expect(logs[0].notes).toMatch(/released/i);
  });

  it("approves then releases an assignable request without a due date", async () => {
    const unit = await assets.createAsset(
      {
        name: "Desk Workstation",
        category: fx.assetCategory,
        location: "Depot",
        assignmentType: "assignable",
      },
      fx.actor
    );

    const pending = await borrowRequests.create(
      {
        requesterName: fx.borrower.displayName,
        requesterEmail: fx.borrower.email!,
        departmentId: fx.departmentId,
        requestType: "assignable",
        assignedToName: "New Hire",
        items: [
          {
            itemDescription: "Desktop",
            category: fx.assetCategory,
            quantity: 1,
            itemType: "asset",
            purpose: "Onboarding",
          },
        ],
        requesterUserId: fx.borrower.userId,
      },
      fx.borrower
    );

    await borrowRequests.approve(pending.id, {}, fx.actor);

    const released = await borrowRequests.release(
      pending.id,
      {
        pickedUpBy: "IT Desk",
        lineAllocations: [{ lineIndex: 0, assetIds: [unit.id] }],
      },
      fx.actor
    );
    expect(released.status).toBe("released");
    expect(released.requestType).toBe("assignable");

    const openLogsRaw = await borrowLogs.list(
      { assetId: unit.id, status: "active", custodyKind: "assignment" },
      fx.actor
    );
    const openLogs = Array.isArray(openLogsRaw) ? openLogsRaw : openLogsRaw.data;
    expect(openLogs).toHaveLength(1);
    expect(openLogs[0].custodyKind).toBe("assignment");
    expect(openLogs[0].dueDate).toBeFalsy();
    expect(openLogs[0].borrowerName).toBe("IT Desk");
  });

  it("approves a consumable request (reserves stock) then releases from a lot", async () => {
    const item = await consumables.create(
      {
        name: "Release Bond Paper",
        category: fx.consumableCategory,
        classification: "supply",
        unit: "ream",
        currentQty: 10,
        unitCost: 120,
        supplierId: fx.supplierId,
        location: "Store",
      },
      fx.actor
    );
    expect(item.reservedQty ?? 0).toBe(0);

    const pending = await consumableRequests.create(
      {
        requesterName: fx.borrower.displayName,
        requesterEmail: fx.borrower.email!,
        departmentId: fx.departmentId,
        lines: [
          {
            consumableId: item.id,
            quantity: 3,
            purpose: "Exam week",
          },
        ],
        requesterUserId: fx.borrower.userId,
      },
      fx.borrower
    );
    expect(pending.status).toBe("pending");
    expect(pending.lines[0]?.quantityRequested).toBe(3);
    const lineId = pending.lines[0]!.id;

    const approved = await consumableRequests.approve(
      pending.id,
      { note: "Stock reserved" },
      fx.actor
    );
    expect(approved.status).toBe("approved");
    expect(approved.approvedByName).toBe(fx.actor.displayName);
    expect(approved.history.some((h) => h.action === "approved")).toBe(true);

    const reserved = await consumables.getById(item.id, fx.actor.tenantId);
    expect(reserved.currentQty).toBe(10);
    expect(reserved.reservedQty).toBe(3);
    expect(reserved.availableQty).toBe(7);

    const availableLots = await lots.list(
      { consumableId: item.id },
      fx.actor.tenantId
    );
    expect(availableLots.length).toBeGreaterThanOrEqual(1);
    const lotId = availableLots[0].id;
    expect(availableLots[0].quantityRemaining).toBe(10);

    const released = await consumableRequests.release(
      approved.id,
      {
        receivedBy: "Dept Clerk",
        note: "Handed over at store room",
        lines: [
          {
            lineId,
            allocations: [{ lotId, quantity: 3 }],
          },
        ],
      },
      fx.actor
    );
    expect(released.status).toBe("released");
    expect(released.receivedBy).toBe("Dept Clerk");
    expect(released.releasedByName).toBe(fx.actor.displayName);
    expect(released.history.some((h) => h.action === "released")).toBe(true);
    expect(released.allocations.length).toBeGreaterThanOrEqual(1);
    expect(released.allocations[0]?.quantity).toBe(3);
    expect(released.allocations[0]?.purchaseLotId).toBe(lotId);

    const after = await consumables.getById(item.id, fx.actor.tenantId);
    expect(after.currentQty).toBe(7);
    expect(after.reservedQty).toBe(0);
    expect(after.availableQty).toBe(7);

    const lotsAfter = await lots.list(
      { consumableId: item.id },
      fx.actor.tenantId
    );
    expect(lotsAfter[0].quantityRemaining).toBe(7);

    const ledger = await movements.listByConsumable(item.id, fx.actor.tenantId);
    const issue = ledger.find(
      (m) => m.direction === "out" && m.reason === "issue"
    );
    expect(issue).toBeTruthy();
    expect(issue!.qty).toBe(3);
    expect(issue!.departmentId).toBe(fx.departmentId);
    expect(issue!.requestId).toBe(released.id);
    expect(issue!.notes).toMatch(/Dept Clerk/);

    const logs = await audit.list(
      {
        entityType: AUDIT_ENTITY.consumableRequest,
        action: AUDIT_ACTION.released,
      },
      fx.actor
    );
    expect(logs.length).toBeGreaterThanOrEqual(1);
    expect(logs[0].entityId).toBe(released.id);
    expect(logs[0].actorUserId).toBe(fx.actor.userId);
    expect(logs[0].notes).toMatch(/released/i);
  });
});
