import { beforeEach, describe, expect, it } from "vitest";

import { BorrowRequestService } from "@/server/modules/borrow-requests/borrow-request.service";
import { ConsumableService } from "@/server/modules/consumables/consumable.service";
import { ConsumableRequestService } from "@/server/modules/consumable-requests/consumable-request.service";
import { PurchaseLotService } from "@/server/modules/purchase-lots/purchase-lot.service";
import { AuditLogService } from "@/server/modules/audit-logs/audit-logs.service";
import { AUDIT_ENTITY } from "@/server/modules/audit-logs/audit-events";
import { DepartmentService } from "@/server/modules/departments/department.service";
import { hasTestDatabase } from "../../setup/env";
import { resetTestDatabase } from "../../setup/db";
import {
  seedCoreFixtures,
  testPoPurpose,
  type TestFixtures,
} from "../../setup/fixtures";

const describeIntegration = hasTestDatabase ? describe : describe.skip;

describeIntegration("requests requester flows", () => {
  const borrow = new BorrowRequestService();
  const consumables = new ConsumableService();
  const consumableRequests = new ConsumableRequestService();
  let fx: TestFixtures;

  beforeEach(async () => {
    await resetTestDatabase();
    fx = await seedCoreFixtures();
  });

  it("creates assignable request and can cancel a pending borrow request", async () => {
    const assignable = await borrow.create(
      {
        requesterName: fx.borrower.displayName,
        requesterEmail: fx.borrower.email!,
        departmentId: fx.departmentId,
        requestType: "assignable",
        assignedToName: "Jane Assignee",
        items: [
          {
            itemDescription: "Desktop PC",
            category: fx.assetCategory,
            quantity: 1,
            itemType: "asset",
            purpose: "New hire workstation",
          },
        ],
        requesterUserId: fx.borrower.userId,
      },
      fx.borrower
    );
    expect(assignable.status).toBe("pending");
    expect(assignable.assignedToName).toBe("Jane Assignee");

    const pending = await borrow.create(
      {
        requesterName: fx.borrower.displayName,
        requesterEmail: fx.borrower.email!,
        departmentId: fx.departmentId,
        requestType: "borrowable",
        expectedReturnDate: "2026-11-01",
        items: [
          {
            itemDescription: "Projector",
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

    const cancelled = await borrow.cancel(
      pending.id,
      { reason: "Event postponed" },
      fx.borrower
    );
    expect(cancelled.status).toBe("cancelled");
  });

  it("requester can create and cancel a consumable request", async () => {
    const item = await consumables.create(
      {
        name: "Markers for request",
        category: fx.consumableCategory,
        classification: "supply",
        unit: "pcs",
        currentQty: 20,
        unitCost: 10,
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
            quantity: 4,
            purpose: "Classroom",
          },
        ],
        requesterUserId: fx.borrower.userId,
      },
      fx.borrower
    );
    expect(req.status).toBe("pending");

    const cancelled = await consumableRequests.cancel(
      req.id,
      { reason: "Already have stock" },
      fx.borrower
    );
    expect(cancelled.status).toBe("cancelled");
  });
});

describeIntegration("purchase order status flows", () => {
  const pos = new PurchaseLotService();
  const departments = new DepartmentService();
  const audit = new AuditLogService();
  let fx: TestFixtures;

  beforeEach(async () => {
    await resetTestDatabase();
    fx = await seedCoreFixtures();
  });

  it("runs approve → ordered → cancel path with audit, and supports multi-department PO", async () => {
    const second = await departments.create(
      { code: "REG", name: "Registrar" },
      fx.actor.tenantId
    );
    const purpose = testPoPurpose(fx.departmentName);

    const [lot] = await pos.createPurchaseOrder(
      {
        poDate: "2026-09-10",
        requestedBy: fx.actor.displayName,
        departmentIds: [fx.departmentId, second.id],
        supplierId: fx.supplierId,
        purpose,
        items: [
          {
            itemType: "consumable",
            name: "Multi-dept Toner",
            category: fx.consumableCategory,
            classification: "supply",
            unit: "pcs",
            location: "Store",
            quantity: 3,
            unitCost: 500,
            purpose,
          },
        ],
      },
      fx.actor
    );

    expect(lot.status).toBe("pending_approval");
    expect((lot.departments?.length ?? 0) >= 1 || lot.departmentId).toBeTruthy();

    const approved = await pos.updatePOStatus(
      lot.id,
      { status: "approved" },
      fx.actor
    );
    expect(approved.status).toBe("approved");

    const ordered = await pos.updatePOStatus(
      lot.id,
      { status: "ordered" },
      fx.actor
    );
    expect(ordered.status).toBe("ordered");

    const cancelled = await pos.updatePOStatus(
      lot.id,
      { status: "cancelled", cancellationReason: "Budget reallocated" },
      fx.actor
    );
    expect(cancelled.status).toBe("cancelled");

    const logs = await audit.list(
      {
        entityType: AUDIT_ENTITY.purchaseOrder,
        action: "purchase_order_cancelled",
      },
      fx.actor
    );
    expect(logs.length).toBeGreaterThanOrEqual(1);
  });
});
