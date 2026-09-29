import { beforeEach, describe, expect, it } from "vitest";

import { AssetService } from "@/server/modules/assets/asset.service";
import { BorrowRequestService } from "@/server/modules/borrow-requests/borrow-request.service";
import { ConsumableService } from "@/server/modules/consumables/consumable.service";
import { ConsumableRequestService } from "@/server/modules/consumable-requests/consumable-request.service";
import { AuditLogService } from "@/server/modules/audit-logs/audit-logs.service";
import { AUDIT_ACTION, AUDIT_ENTITY } from "@/server/modules/audit-logs/audit-events";
import { hasTestDatabase, resetTestDatabase } from "../../setup/db";
import { seedCoreFixtures, type TestFixtures } from "../../setup/fixtures";

const describeIntegration = hasTestDatabase ? describe : describe.skip;

describeIntegration("requests approve / reject / edit (integration)", () => {
  const assets = new AssetService();
  const borrowRequests = new BorrowRequestService();
  const consumables = new ConsumableService();
  const consumableRequests = new ConsumableRequestService();
  const audit = new AuditLogService();
  let fx: TestFixtures;

  beforeEach(async () => {
    await resetTestDatabase();
    fx = await seedCoreFixtures();
  });

  it("lets admin edit pending borrow qty then approve, and reject another", async () => {
    await assets.createAsset(
      {
        name: "Request Laptop",
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
        expectedReturnDate: "2026-10-15",
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
    expect(pending.status).toBe("pending");

    const approved = await borrowRequests.approve(
      pending.id,
      {
        note: "Adjusted qty",
        items: [
          {
            itemDescription: "Laptop",
            category: fx.assetCategory,
            quantity: 2,
            itemType: "asset",
            purpose: "Training",
          },
        ],
      },
      fx.actor
    );
    expect(approved.status).toBe("approved");
    expect(approved.items[0]?.quantity).toBe(2);

    const logs = await audit.list(
      {
        entityType: AUDIT_ENTITY.borrowRequest,
        action: AUDIT_ACTION.approved,
      },
      fx.actor
    );
    expect(logs.length).toBeGreaterThanOrEqual(1);
    expect(logs[0].actorUserId).toBe(fx.actor.userId);
    expect(logs[0].actorName).toBe(fx.actor.displayName);
    expect(logs[0].entityId).toBeTruthy();
    expect(logs[0].timestamp).toBeTruthy();

    const toReject = await borrowRequests.create(
      {
        requesterName: fx.borrower.displayName,
        requesterEmail: fx.borrower.email!,
        departmentId: fx.departmentId,
        requestType: "borrowable",
        expectedReturnDate: "2026-10-20",
        items: [
          {
            itemDescription: "Spare laptop",
            category: fx.assetCategory,
            quantity: 1,
            itemType: "asset",
            purpose: "Event",
          },
        ],
        requesterUserId: fx.borrower.userId,
      },
      fx.borrower
    );

    const rejected = await borrowRequests.reject(
      toReject.id,
      { reason: "Not available this week" },
      fx.actor
    );
    expect(rejected.status).toBe("rejected");
  });

  it("creates and rejects a consumable request", async () => {
    const item = await consumables.create(
      {
        name: "Paper for requests",
        category: fx.consumableCategory,
        classification: "supply",
        unit: "ream",
        currentQty: 20,
        unitCost: 100,
        supplierId: fx.supplierId,
        location: "Store",
      },
      fx.actor
    );

    const req = await consumableRequests.create(
      {
        requesterName: fx.borrower.displayName,
        requesterEmail: fx.borrower.email!,
        departmentId: fx.departmentId,
        lines: [
          {
            consumableId: item.id,
            quantity: 2,
            purpose: "Classroom use",
          },
        ],
        requesterUserId: fx.borrower.userId,
      },
      fx.borrower
    );
    expect(req.status).toBe("pending");

    const rejected = await consumableRequests.reject(
      req.id,
      { reason: "Use existing stock in room" },
      fx.actor
    );
    expect(rejected.status).toBe("rejected");
  });
});
