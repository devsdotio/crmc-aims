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

  it("approves then releases a fractional material request from a lot", async () => {
    const item = await consumables.create(
      {
        name: "Fractional Paint",
        category: fx.consumableCategory,
        classification: "material",
        unit: "liter",
        currentQty: 8,
        unitCost: 90,
        supplierId: fx.supplierId,
        location: "Store",
      },
      fx.actor
    );

    const pending = await consumableRequests.create(
      {
        requesterName: fx.borrower.displayName,
        requesterEmail: fx.borrower.email!,
        departmentId: fx.departmentId,
        lines: [
          {
            consumableId: item.id,
            quantity: 1.5,
            purpose: "Touch-up",
          },
        ],
        requesterUserId: fx.borrower.userId,
      },
      fx.borrower
    );
    expect(pending.lines[0]?.quantityRequested).toBe(1.5);
    const lineId = pending.lines[0]!.id;

    const approved = await consumableRequests.approve(
      pending.id,
      { note: "Fractional reserve" },
      fx.actor
    );
    expect(approved.status).toBe("approved");

    const reserved = await consumables.getById(item.id, fx.actor.tenantId);
    expect(reserved.currentQty).toBe(8);
    expect(reserved.reservedQty).toBe(1.5);
    expect(reserved.availableQty).toBe(6.5);

    const availableLots = await lots.list(
      { consumableId: item.id },
      fx.actor.tenantId
    );
    const lotId = availableLots[0]!.id;
    expect(availableLots[0]!.quantityRemaining).toBe(8);

    const released = await consumableRequests.release(
      approved.id,
      {
        receivedBy: "Site Foreman",
        note: "Partial liter issue",
        lines: [
          {
            lineId,
            allocations: [{ lotId, quantity: 1.5 }],
          },
        ],
      },
      fx.actor
    );
    expect(released.status).toBe("released");
    expect(released.allocations[0]?.quantity).toBe(1.5);

    const after = await consumables.getById(item.id, fx.actor.tenantId);
    expect(after.currentQty).toBe(6.5);
    expect(after.reservedQty).toBe(0);
    expect(after.availableQty).toBe(6.5);

    const lotsAfter = await lots.list(
      { consumableId: item.id },
      fx.actor.tenantId
    );
    expect(lotsAfter[0]!.quantityRemaining).toBe(6.5);

    const ledger = await movements.listByConsumable(item.id, fx.actor.tenantId);
    const issue = ledger.find(
      (m) => m.direction === "out" && m.reason === "issue"
    );
    expect(issue).toBeTruthy();
    expect(issue!.qty).toBe(1.5);
    expect(issue!.requestId).toBe(released.id);
  });

  it("approves then releases a fractional supply request from a lot", async () => {
    const item = await consumables.create(
      {
        name: "Fractional Toner Bottle",
        category: fx.consumableCategory,
        classification: "supply",
        unit: "bottle",
        currentQty: 5,
        unitCost: 320,
        supplierId: fx.supplierId,
        location: "Store",
      },
      fx.actor
    );

    const pending = await consumableRequests.create(
      {
        requesterName: fx.borrower.displayName,
        requesterEmail: fx.borrower.email!,
        departmentId: fx.departmentId,
        lines: [
          {
            consumableId: item.id,
            quantity: 0.75,
            purpose: "Printer top-up",
          },
        ],
        requesterUserId: fx.borrower.userId,
      },
      fx.borrower
    );
    expect(pending.lines[0]?.quantityRequested).toBe(0.75);
    const lineId = pending.lines[0]!.id;

    const approved = await consumableRequests.approve(
      pending.id,
      { note: "Fractional supply reserve" },
      fx.actor
    );
    expect(approved.status).toBe("approved");

    const reserved = await consumables.getById(item.id, fx.actor.tenantId);
    expect(reserved.reservedQty).toBe(0.75);
    expect(reserved.availableQty).toBe(4.25);

    const availableLots = await lots.list(
      { consumableId: item.id },
      fx.actor.tenantId
    );
    const lotId = availableLots[0]!.id;

    const released = await consumableRequests.release(
      approved.id,
      {
        receivedBy: "Department Clerk",
        note: "Three-quarter bottle issue",
        lines: [
          {
            lineId,
            allocations: [{ lotId, quantity: 0.75 }],
          },
        ],
      },
      fx.actor
    );
    expect(released.status).toBe("released");
    expect(released.allocations[0]?.quantity).toBe(0.75);

    const after = await consumables.getById(item.id, fx.actor.tenantId);
    expect(after.currentQty).toBe(4.25);
    expect(after.reservedQty).toBe(0);
    expect(after.availableQty).toBe(4.25);

    const ledger = await movements.listByConsumable(item.id, fx.actor.tenantId);
    const issue = ledger.find(
      (m) => m.direction === "out" && m.reason === "issue"
    );
    expect(issue).toBeTruthy();
    expect(issue!.qty).toBe(0.75);
    expect(issue!.departmentId).toBe(fx.departmentId);
    expect(issue!.requestId).toBe(released.id);
  });

  it("partially issues an approved consumable request then finishes the remainder", async () => {
    const item = await consumables.create(
      {
        name: "Partial Issue Paper",
        category: fx.consumableCategory,
        classification: "supply",
        unit: "ream",
        currentQty: 20,
        unitCost: 110,
        supplierId: fx.supplierId,
        location: "Store",
      },
      fx.actor
    );

    const pending = await consumableRequests.create(
      {
        requesterName: fx.borrower.displayName,
        requesterEmail: fx.borrower.email!,
        departmentId: fx.departmentId,
        lines: [
          {
            consumableId: item.id,
            quantity: 10,
            purpose: "Staggered pickup",
          },
        ],
        requesterUserId: fx.borrower.userId,
      },
      fx.borrower
    );
    const lineId = pending.lines[0]!.id;

    const approved = await consumableRequests.approve(
      pending.id,
      { note: "Reserve all 10" },
      fx.actor
    );
    expect(approved.status).toBe("approved");
    expect(approved.lines[0]?.quantityReleased).toBe(0);
    expect(approved.lines[0]?.quantityRemaining).toBe(10);

    const availableLots = await lots.list(
      { consumableId: item.id },
      fx.actor.tenantId
    );
    const lotId = availableLots[0]!.id;

    const partial = await consumableRequests.release(
      approved.id,
      {
        receivedBy: "First Pickup",
        note: "Took what fits in the cart",
        lines: [
          {
            lineId,
            allocations: [{ lotId, quantity: 4 }],
          },
        ],
      },
      fx.actor
    );
    expect(partial.status).toBe("approved");
    expect(partial.lines[0]?.quantityReleased).toBe(4);
    expect(partial.lines[0]?.quantityRemaining).toBe(6);
    expect(partial.allocations).toHaveLength(1);
    expect(partial.allocations[0]?.quantity).toBe(4);

    const mid = await consumables.getById(item.id, fx.actor.tenantId);
    expect(mid.currentQty).toBe(16);
    expect(mid.reservedQty).toBe(6);
    expect(mid.availableQty).toBe(10);

    await expect(
      consumableRequests.undoApproval(partial.id, {}, fx.actor)
    ).rejects.toThrow(/already been issued/i);

    const finished = await consumableRequests.release(
      partial.id,
      {
        receivedBy: "Second Pickup",
        lines: [
          {
            lineId,
            allocations: [{ lotId, quantity: 6 }],
          },
        ],
      },
      fx.actor
    );
    expect(finished.status).toBe("released");
    expect(finished.lines[0]?.quantityReleased).toBe(10);
    expect(finished.lines[0]?.quantityRemaining).toBe(0);
    expect(finished.allocations).toHaveLength(2);

    const after = await consumables.getById(item.id, fx.actor.tenantId);
    expect(after.currentQty).toBe(10);
    expect(after.reservedQty).toBe(0);
    expect(after.availableQty).toBe(10);

    const lotsAfter = await lots.list(
      { consumableId: item.id },
      fx.actor.tenantId
    );
    expect(lotsAfter[0]!.quantityRemaining).toBe(10);
  });

  it("rejects over-issuing beyond remaining approved quantity", async () => {
    const item = await consumables.create(
      {
        name: "Over Issue Guard",
        category: fx.consumableCategory,
        classification: "supply",
        unit: "pcs",
        currentQty: 15,
        unitCost: 20,
        supplierId: fx.supplierId,
        location: "Store",
      },
      fx.actor
    );
    const pending = await consumableRequests.create(
      {
        requesterName: fx.borrower.displayName,
        requesterEmail: fx.borrower.email!,
        departmentId: fx.departmentId,
        lines: [
          {
            consumableId: item.id,
            quantity: 5,
            purpose: "Guard test",
          },
        ],
        requesterUserId: fx.borrower.userId,
      },
      fx.borrower
    );
    const approved = await consumableRequests.approve(
      pending.id,
      {},
      fx.actor
    );
    const lotId = (
      await lots.list({ consumableId: item.id }, fx.actor.tenantId)
    )[0]!.id;

    await expect(
      consumableRequests.release(
        approved.id,
        {
          receivedBy: "Clerk",
          lines: [
            {
              lineId: pending.lines[0]!.id,
              allocations: [{ lotId, quantity: 6 }],
            },
          ],
        },
        fx.actor
      )
    ).rejects.toThrow(/remains to issue|only .* remains/i);
  });
});
