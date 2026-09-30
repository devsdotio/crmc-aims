import { beforeEach, describe, expect, it } from "vitest";

import { ConsumableService } from "@/server/modules/consumables/consumable.service";
import { ConsumableRequestService } from "@/server/modules/consumable-requests/consumable-request.service";
import { BadRequestError, ConflictError } from "@/server/shared/errors";
import { hasTestDatabase, resetTestDatabase } from "../../setup/db";
import { seedCoreFixtures, type TestFixtures } from "../../setup/fixtures";

const describeIntegration = hasTestDatabase ? describe : describe.skip;

describeIntegration("consumable reservedQty undo / cancel (integration)", () => {
  const consumables = new ConsumableService();
  const consumableRequests = new ConsumableRequestService();
  let fx: TestFixtures;

  beforeEach(async () => {
    await resetTestDatabase();
    fx = await seedCoreFixtures();
  });

  async function seedItemAndApprovedRequest(qty: number, stock = 10) {
    const item = await consumables.create(
      {
        name: `Reserve Item ${qty}`,
        category: fx.consumableCategory,
        classification: "supply",
        unit: "ream",
        currentQty: stock,
        unitCost: 100,
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
            quantity: qty,
            purpose: "Exam week",
          },
        ],
        requesterUserId: fx.borrower.userId,
      },
      fx.borrower
    );

    const approved = await consumableRequests.approve(
      pending.id,
      { note: "Stock reserved" },
      fx.actor
    );

    return { item, approved };
  }

  it("drops reservedQty when approval is undone", async () => {
    const { item, approved } = await seedItemAndApprovedRequest(4);

    const reserved = await consumables.getById(item.id, fx.actor.tenantId);
    expect(reserved.currentQty).toBe(10);
    expect(reserved.reservedQty).toBe(4);
    expect(reserved.availableQty).toBe(6);

    const undone = await consumableRequests.undoApproval(
      approved.id,
      { note: "Wrong qty" },
      fx.actor
    );
    expect(undone.status).toBe("pending");
    expect(undone.approvedAt).toBeFalsy();
    expect(undone.approvedByName).toBeFalsy();
    expect(undone.history.some((h) => h.action === "approval_undone")).toBe(
      true
    );

    const after = await consumables.getById(item.id, fx.actor.tenantId);
    expect(after.currentQty).toBe(10);
    expect(after.reservedQty).toBe(0);
    expect(after.availableQty).toBe(10);

    // Can re-approve after undo
    const reapproved = await consumableRequests.approve(
      approved.id,
      {},
      fx.actor
    );
    expect(reapproved.status).toBe("approved");
    const reservedAgain = await consumables.getById(item.id, fx.actor.tenantId);
    expect(reservedAgain.reservedQty).toBe(4);
  });

  it("drops reservedQty when an approved request is cancelled", async () => {
    const { item, approved } = await seedItemAndApprovedRequest(3);

    const reserved = await consumables.getById(item.id, fx.actor.tenantId);
    expect(reserved.reservedQty).toBe(3);

    const cancelled = await consumableRequests.cancel(
      approved.id,
      { reason: "No longer needed" },
      fx.actor
    );
    expect(cancelled.status).toBe("cancelled");
    expect(cancelled.cancellationReason).toBe("No longer needed");
    expect(cancelled.history.some((h) => h.action === "cancelled")).toBe(true);

    const after = await consumables.getById(item.id, fx.actor.tenantId);
    expect(after.currentQty).toBe(10);
    expect(after.reservedQty).toBe(0);
    expect(after.availableQty).toBe(10);

    await expect(
      consumableRequests.undoApproval(approved.id, {}, fx.actor)
    ).rejects.toBeInstanceOf(ConflictError);

    await expect(
      consumableRequests.approve(approved.id, {}, fx.actor)
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("blocks approve when unreserved stock is insufficient (overlapping reserves)", async () => {
    const item = await consumables.create(
      {
        name: "Tight Stock Paper",
        category: fx.consumableCategory,
        classification: "supply",
        unit: "ream",
        currentQty: 5,
        unitCost: 80,
        supplierId: fx.supplierId,
        location: "Store",
      },
      fx.actor
    );

    const first = await consumableRequests.create(
      {
        requesterName: fx.borrower.displayName,
        requesterEmail: fx.borrower.email!,
        departmentId: fx.departmentId,
        lines: [{ consumableId: item.id, quantity: 4, purpose: "Batch A" }],
        requesterUserId: fx.borrower.userId,
      },
      fx.borrower
    );
    await consumableRequests.approve(first.id, {}, fx.actor);

    const second = await consumableRequests.create(
      {
        requesterName: fx.borrower.displayName,
        requesterEmail: fx.borrower.email!,
        departmentId: fx.departmentId,
        lines: [{ consumableId: item.id, quantity: 3, purpose: "Batch B" }],
        requesterUserId: fx.borrower.userId,
      },
      fx.borrower
    );

    await expect(
      consumableRequests.approve(second.id, {}, fx.actor)
    ).rejects.toBeInstanceOf(BadRequestError);

    const stock = await consumables.getById(item.id, fx.actor.tenantId);
    expect(stock.reservedQty).toBe(4);
    expect(stock.availableQty).toBe(1);
  });

  it("lets the requester cancel their own approved request and frees reserve", async () => {
    const { item, approved } = await seedItemAndApprovedRequest(2);

    const cancelled = await consumableRequests.cancel(
      approved.id,
      { reason: "Changed mind" },
      fx.borrower
    );
    expect(cancelled.status).toBe("cancelled");

    const after = await consumables.getById(item.id, fx.actor.tenantId);
    expect(after.reservedQty).toBe(0);
  });
});
