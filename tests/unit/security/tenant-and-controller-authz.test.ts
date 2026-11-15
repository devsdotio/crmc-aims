import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockRequireActor,
  mockRequireStaffShell,
  mockRequireTenantAdmin,
  mockRequireAssetOperator,
  mockLoadLinkedRequestSummaries,
} = vi.hoisted(() => ({
  mockRequireActor: vi.fn(),
  mockRequireStaffShell: vi.fn(),
  mockRequireTenantAdmin: vi.fn(),
  mockRequireAssetOperator: vi.fn(),
  mockLoadLinkedRequestSummaries: vi.fn().mockResolvedValue(new Map()),
}));

vi.mock("@/server/shared/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/shared/auth")>();
  return {
    ...actual,
    requireActor: mockRequireActor,
    requireStaffShell: mockRequireStaffShell,
    requireTenantAdmin: mockRequireTenantAdmin,
    requireAssetOperator: mockRequireAssetOperator,
  };
});

vi.mock("@/server/shared/linked-requests", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/server/shared/linked-requests")>();
  return {
    ...actual,
    loadLinkedRequestSummaries: mockLoadLinkedRequestSummaries,
  };
});

vi.mock("@/server/db/transaction", () => ({
  withTransaction: vi.fn(async (cb: (tx: unknown) => Promise<unknown>) => cb({})),
}));

vi.mock("@/server/modules/audit-logs/audit-logs.service", () => ({
  AuditLogService: class {
    log = vi.fn().mockResolvedValue(undefined);
  },
}));

import { ReportController } from "@/server/modules/reports/report.controller";
import type { ReportService } from "@/server/modules/reports/report.service";
import { CustomReportController } from "@/server/modules/custom-reports/custom-report.controller";
import type { CustomReportService } from "@/server/modules/custom-reports/custom-report.service";
import { ConsumableRequestController } from "@/server/modules/consumable-requests";
import { ConsumableRequestService } from "@/server/modules/consumable-requests/consumable-request.service";
import type { ConsumableRequestRepository } from "@/server/modules/consumable-requests/consumable-request.repository";
import type { ConsumableRepository } from "@/server/modules/consumables/consumable.repository";
import {
  createTemplateSchema,
  exportReportBodySchema,
  runReportSchema,
} from "@/server/modules/custom-reports/custom-report.validation";
import {
  exportReportQuerySchema,
  reportPrintIntentSchema,
} from "@/server/modules/reports/report.validation";
import {
  createConsumableRequestSchema,
  updateConsumableRequestSchema,
} from "@/server/modules/consumable-requests/consumable-request.validation";
import {
  createBorrowRequestSchema,
  updateBorrowRequestSchema,
} from "@/server/modules/borrow-requests/borrow-request.validation";
import { ConsumableService } from "@/server/modules/consumables/consumable.service";
import { mergeConsumableLinesByPurpose } from "@/lib/request-purpose";
import {
  ForbiddenError,
  NotFoundError,
  ServiceUnavailableError,
  UnauthorizedError,
} from "@/server/shared/errors";
import { makeActor } from "../../setup/actor";

const UUID_A = "11111111-1111-4111-8111-111111111111";
const UUID_B = "22222222-2222-4222-8222-222222222222";
const GROUP_UUID = "33333333-3333-4333-8333-333333333333";

describe("Security regression: controller HTTP authz/503 gates, F-08 submissionGroupId scoping & Zod rejections", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLoadLinkedRequestSummaries.mockResolvedValue(new Map());
  });

  it("maps 401/403 authz failures and 503 DB unavailability in ReportController, CustomReportController, and ConsumableRequestController", async () => {
    const reportSvcStub = {
      getExecutiveSummary: vi.fn(async () => {
        throw new ServiceUnavailableError("Database connection lost");
      }),
    } as unknown as ReportService;
    const reportCtrl = new ReportController(reportSvcStub);

    mockRequireStaffShell.mockRejectedValueOnce(new UnauthorizedError("Sign in required"));
    const res401 = await reportCtrl.getSummary(
      new Request("http://localhost/api/reports/summary")
    );
    expect(res401.status).toBe(401);

    mockRequireStaffShell.mockRejectedValueOnce(
      new ForbiddenError("Staff workspace access is limited")
    );
    const res403 = await reportCtrl.getSummary(
      new Request("http://localhost/api/reports/summary")
    );
    expect(res403.status).toBe(403);

    const admin = makeActor({ role: "admin" });
    mockRequireStaffShell.mockResolvedValueOnce({
      actor: admin,
      profile: { role: "admin" },
    });
    const res503 = await reportCtrl.getSummary(
      new Request("http://localhost/api/reports/summary")
    );
    expect(res503.status).toBe(503);

    const customCtrl = new CustomReportController({} as CustomReportService);
    mockRequireTenantAdmin.mockRejectedValueOnce(new ForbiddenError("Admins only"));
    const custom403 = await customCtrl.listTemplates();
    expect(custom403.status).toBe(403);

    const crqCtrl = new ConsumableRequestController({} as ConsumableRequestService);
    mockRequireAssetOperator.mockRejectedValueOnce(new ForbiddenError("Operators only"));
    const crq403 = await crqCtrl.approve(
      new Request("http://localhost/api/consumable-requests/id/approve", {
        method: "POST",
        body: "{}",
      }),
      UUID_A
    );
    expect(crq403.status).toBe(403);
  });

  it("F-08: scopes loadLinkedRequestSummaries by actor.userId for non-operators", async () => {
    const reqRow = {
      id: UUID_A,
      tenantId: UUID_B,
      requestCode: "CRQ-2026-0099",
      requesterUserId: "borrower-owner",
      requesterName: "Dept A",
      requesterEmail: "depta@crmc.edu",
      requesterPhone: "",
      department: "IT",
      departmentId: UUID_A,
      projectId: null,
      source: "portal" as const,
      requestedByName: null,
      submissionGroupId: GROUP_UUID,
      purpose: "Supplies",
      status: "pending" as const,
      notes: null,
      rejectionReason: null,
      cancellationReason: null,
      receivedBy: null,
      history: [],
      approvedAt: null,
      approvedByUserId: null,
      approvedByName: null,
      releasedAt: null,
      releasedByUserId: null,
      releasedByName: null,
      requestedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const repoStub: Partial<ConsumableRequestRepository> = {
      list: vi.fn(async () => [reqRow]),
      count: vi.fn(async () => 1),
      countByStatus: vi.fn(async () => ({ pending: 1 })),
      listLinesByRequestIds: vi.fn(async () => []),
      listAllocationsByRequestIds: vi.fn(async () => []),
      findById: vi.fn(async () => reqRow),
      listLinesByRequestId: vi.fn(async () => []),
      listAllocationsByRequestId: vi.fn(async () => []),
    };
    const consStub: Partial<ConsumableRepository> = {
      listClassificationsByIds: vi.fn(async () => new Map()),
    };

    const service = new ConsumableRequestService(
      repoStub as ConsumableRequestRepository,
      consStub as ConsumableRepository
    );

    const borrower = makeActor({
      role: "borrower",
      userId: "borrower-owner",
      tenantId: UUID_B,
    });
    await service.list({}, borrower);
    expect(mockLoadLinkedRequestSummaries).toHaveBeenCalledWith(
      [GROUP_UUID],
      UUID_B,
      "borrower-owner"
    );

    await service.getById(UUID_A, borrower);
    expect(mockLoadLinkedRequestSummaries).toHaveBeenLastCalledWith(
      [GROUP_UUID],
      UUID_B,
      "borrower-owner"
    );

    const admin = makeActor({ role: "admin", userId: "admin-1", tenantId: UUID_B });
    await service.getById(UUID_A, admin);
    expect(mockLoadLinkedRequestSummaries).toHaveBeenLastCalledWith(
      [GROUP_UUID],
      UUID_B,
      undefined
    );
  });

  it("rejects invalid inputs across custom-reports, reports export/print-intent, consumable-requests, and borrow-requests Zod schemas", () => {
    // Custom reports Zod rejections + F-05 logoUrl hardening
    expect(
      createTemplateSchema.safeParse({
        name: "Unsafe Logo",
        dataset: "assets",
        columns: ["assetCode"],
        layout: [
          {
            id: "hdr",
            type: "header",
            props: { logoUrl: "data:image/svg+xml;base64,PHN2Zz4=" },
          },
        ],
      }).success
    ).toBe(false);

    expect(
      createTemplateSchema.safeParse({
        name: "Invalid Dataset",
        dataset: "nonexistent_dataset",
        columns: ["assetCode"],
      }).success
    ).toBe(false);

    expect(
      createTemplateSchema.safeParse({
        name: "Empty Columns",
        dataset: "assets",
        columns: [],
      }).success
    ).toBe(false);

    expect(
      createTemplateSchema.safeParse({
        name: "Too Many Columns",
        dataset: "assets",
        columns: Array.from({ length: 51 }, (_, i) => `c${i}`),
      }).success
    ).toBe(false);

    expect(
      runReportSchema.safeParse({
        dataset: "assets",
        columns: ["assetCode"],
        pageSize: 2001,
      }).success
    ).toBe(false);

    expect(
      exportReportBodySchema.safeParse({ templateId: "not-a-uuid" }).success
    ).toBe(false);

    // Reports Zod rejections
    expect(
      exportReportQuerySchema.safeParse({ reportType: "unknown_tab", format: "csv" })
        .success
    ).toBe(false);
    expect(
      exportReportQuerySchema.safeParse({ reportType: "consumables", format: "xlsx" })
        .success
    ).toBe(false);
    expect(
      reportPrintIntentSchema.safeParse({ reportType: "invalid" }).success
    ).toBe(false);

    // Consumable request XOR destination & line/reason bounds
    expect(
      createConsumableRequestSchema.safeParse({
        requesterName: "IT Dept",
        requesterEmail: "it@crmc.edu",
        departmentId: UUID_A,
        projectId: UUID_B,
        lines: [{ consumableId: UUID_A, quantity: 1, purpose: "Class" }],
      }).success
    ).toBe(false);

    expect(
      updateConsumableRequestSchema.safeParse({
        editReason: "1234",
      }).success
    ).toBe(false);

    // Borrow request type requirements
    expect(
      createBorrowRequestSchema.safeParse({
        requesterName: "IT Dept",
        requesterEmail: "it@crmc.edu",
        requestType: "borrowable",
        items: [
          {
            itemDescription: "Projector",
            category: "Multimedia",
            quantity: 1,
            itemType: "asset",
            purpose: "Lecture",
          },
        ],
      }).success
    ).toBe(false);

    expect(
      createBorrowRequestSchema.safeParse({
        requesterName: "IT Dept",
        requesterEmail: "it@crmc.edu",
        requestType: "assignable",
        items: [
          {
            itemDescription: "Laptop",
            category: "Laptops",
            quantity: 1,
            itemType: "asset",
            purpose: "Staff setup",
          },
        ],
      }).success
    ).toBe(false);

    expect(
      updateBorrowRequestSchema.safeParse({
        departmentId: "invalid-uuid",
        editReason: "Valid reason here",
      }).success
    ).toBe(false);
  });

  it("enforces tenantId scoping on ConsumableService.delete and cross-tenant request reads, and preserves multi-purpose SKU lines", async () => {
    const deleteRelatedChildren = vi.fn(async () => undefined);
    const deleteItem = vi.fn(async () => true);
    const consRepoStub = {
      findByIdForUpdate: vi.fn(async (_id: string, _s: unknown, tenantId?: string) =>
        tenantId === UUID_B
          ? null
          : {
              id: UUID_A,
              itemCode: "SUP-1",
              name: "Paper",
              category: "Office Supplies",
              currentQty: "5",
            }
      ),
      deleteRelatedChildren,
      delete: deleteItem,
    } as unknown as ConsumableRepository;
    const consService = new ConsumableService(consRepoStub);

    const tenantAActor = makeActor({ role: "admin", tenantId: UUID_A });
    const tenantBActor = makeActor({ role: "admin", tenantId: UUID_B });

    await expect(consService.delete(UUID_A, tenantBActor)).rejects.toThrow(NotFoundError);
    expect(deleteRelatedChildren).not.toHaveBeenCalled();

    await consService.delete(UUID_A, tenantAActor);
    expect(deleteRelatedChildren).toHaveBeenCalledWith(UUID_A, expect.anything(), UUID_A);
    expect(deleteItem).toHaveBeenCalledWith(UUID_A, expect.anything(), UUID_A);

    const merged = mergeConsumableLinesByPurpose([
      { consumableId: UUID_A, quantity: 2, purpose: "Dept Exam" },
      { consumableId: UUID_A, quantity: 3, purpose: "Office Admin" },
      { consumableId: UUID_A, quantity: 1.5, purpose: "dept exam" },
    ]);
    expect(merged).toEqual([
      { consumableId: UUID_A, quantity: 3.5, purpose: "Dept Exam" },
      { consumableId: UUID_A, quantity: 3, purpose: "Office Admin" },
    ]);
  });
});
