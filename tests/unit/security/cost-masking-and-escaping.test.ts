import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockLoadLinked } = vi.hoisted(() => ({
  mockLoadLinked: vi.fn().mockResolvedValue(new Map()),
}));

vi.mock("@/server/db", () => {
  const chain: Record<string, unknown> = {};
  const terminal = Object.assign(Promise.resolve([]), {
    limit: async () => [],
    orderBy: async () => [],
  });
  Object.assign(chain, {
    select: () => chain,
    from: () => chain,
    innerJoin: () => chain,
    leftJoin: () => chain,
    where: () => terminal,
  });
  return { getDb: () => chain };
});

vi.mock("@/server/shared/cache", () => ({
  serverCache: {
    wrap: async (_key: string, _ttl: number, fn: () => Promise<unknown>) =>
      fn(),
    invalidateTag: vi.fn(),
  },
}));

vi.mock("@/server/shared/linked-requests", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/server/shared/linked-requests")>();
  return {
    ...actual,
    loadLinkedRequestSummaries: mockLoadLinked,
  };
});

vi.mock("@/server/modules/disbursements/disbursement-departments", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("@/server/modules/disbursements/disbursement-departments")
    >();
  return {
    ...actual,
    listVoucherDepartmentLinks: vi.fn().mockResolvedValue(new Map()),
    listPettyCashDepartmentLinks: vi.fn().mockResolvedValue(new Map()),
  };
});

vi.mock("@/server/modules/purchase-lots/po-disbursement", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("@/server/modules/purchase-lots/po-disbursement")
    >();
  return {
    ...actual,
    listActivePoDisbursements: vi.fn().mockResolvedValue(new Map()),
  };
});

import { escapeCsvField, toCsv } from "@/lib/csv";
import { escapeHtml, isSafeLogoUrl, sanitizeImgSrc } from "@/lib/html";
import { parseParticulars, redactParticularsCosts } from "@/lib/voucher-particulars";
import { serverCache } from "@/server/shared/cache";
import { DashboardService } from "@/server/modules/dashboard/dashboard.service";
import {
  buildPoSlipBodyHtml,
  buildPoSlipFullHtml,
  type PoSlipRenderData,
} from "@/components/purchase-orders/po-official-slip";
import { ConsumableRequestService } from "@/server/modules/consumable-requests/consumable-request.service";
import type { ConsumableRequestRepository } from "@/server/modules/consumable-requests/consumable-request.repository";
import type { ConsumableRepository } from "@/server/modules/consumables/consumable.repository";
import { AssetService } from "@/server/modules/assets/asset.service";
import type { AssetRepository } from "@/server/modules/assets/asset.repository";
import type { AssetLifecycleService } from "@/server/modules/assets/asset.lifecycle.service";
import type { BorrowLogService } from "@/server/modules/borrow-log/borrow-log.service";
import type { BorrowLogRepository } from "@/server/modules/borrow-log/borrow-log.repository";
import type { MaintenanceRepository } from "@/server/modules/maintenance/maintenance.repository";
import type { SupplierRepository } from "@/server/modules/suppliers/supplier.repository";
import type { ProjectAssetAssignmentRepository } from "@/server/modules/projects/project-asset.repository";
import type { CategoryRepository } from "@/server/modules/categories/category.repository";
import { AssetModelService } from "@/server/modules/assets/asset.model.service";
import type { AssetModelRepository } from "@/server/modules/assets/asset.model.repository";
import { MaintenanceLogService } from "@/server/modules/maintenance/maintenance.service";
import { StockMovementService } from "@/server/modules/stock-movements/stock-movement.service";
import type { StockMovementRepository } from "@/server/modules/stock-movements/stock-movement.repository";
import type { PurchaseLotRepository } from "@/server/modules/purchase-lots/purchase-lot.repository";
import type { ProjectExpenseRepository } from "@/server/modules/projects/project-expense.repository";
import { PurchaseLotService } from "@/server/modules/purchase-lots/purchase-lot.service";
import { VoucherService } from "@/server/modules/vouchers/voucher.service";
import type { VoucherRepository } from "@/server/modules/vouchers/voucher.repository";
import { PettyCashService } from "@/server/modules/petty-cash/petty-cash.service";
import type { PettyCashRepository } from "@/server/modules/petty-cash/petty-cash.repository";
import type { AuditLogService } from "@/server/modules/audit-logs/audit-logs.service";
import type { PurchaseLot } from "@/types/purchase-lots";
import { makeActor } from "../../setup/actor";

const TENANT_ID = "00000000-0000-0000-0000-000000000001";
const REQ_ID = "11111111-1111-4111-8111-111111111111";
const ASSET_ID = "22222222-2222-4222-8222-222222222222";
const CONS_ID = "33333333-3333-4333-8333-333333333333";
const LOT_ID = "44444444-4444-4444-8444-444444444444";
const VOUCHER_ID = "55555555-5555-4555-8555-555555555555";
const PCV_ID = "66666666-6666-4666-8666-666666666666";
const MNT_ID = "77777777-7777-4777-8777-777777777777";
const DEPT_ID = "88888888-8888-4888-8888-888888888888";

describe("Security regression: F-01..F-05 cost masking, XSS escaping, CSV injection & logoUrl", () => {
  beforeEach(() => {
    mockLoadLinked.mockClear();
  });

  it("F-01: redacts allocation costs, lot codes, supplier metadata, and totalCost for borrower and staff on ConsumableRequestService", async () => {
    const reqRow = {
      id: REQ_ID,
      tenantId: TENANT_ID,
      requestCode: "CRQ-2026-0001",
      requesterUserId: "borrower-1",
      requesterName: "CS Dept",
      requesterEmail: "cs@crmc.edu",
      requesterPhone: "",
      department: "Computer Science",
      departmentId: DEPT_ID,
      projectId: null,
      source: "portal" as const,
      requestedByName: "Prof. Cruz",
      submissionGroupId: null,
      purpose: "Exam printing",
      status: "released" as const,
      notes: null,
      rejectionReason: null,
      cancellationReason: null,
      receivedBy: "Lab Aide",
      history: [],
      approvedAt: new Date("2026-10-01T00:00:00Z"),
      approvedByUserId: "admin-1",
      approvedByName: "Chief Custodian",
      releasedAt: new Date("2026-10-02T00:00:00Z"),
      releasedByUserId: "admin-1",
      releasedByName: "Chief Custodian",
      requestedAt: new Date("2026-10-01T00:00:00Z"),
      createdAt: new Date("2026-10-01T00:00:00Z"),
      updatedAt: new Date("2026-10-02T00:00:00Z"),
    };
    const lineRow = {
      id: "line-1",
      requestId: REQ_ID,
      lineNo: 1,
      consumableId: CONS_ID,
      itemCode: "SUP-001",
      itemName: "Bond Paper",
      category: "Office Supplies",
      unit: "ream",
      quantityRequested: "3",
      purpose: "Exam printing",
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const allocRow = {
      id: "alloc-1",
      requestId: REQ_ID,
      requestLineId: "line-1",
      consumableId: CONS_ID,
      purchaseLotId: LOT_ID,
      lotCode: "LOT-SECRET-01",
      supplierId: "sup-1",
      supplierName: "Confidential Paper Co",
      quantity: "3",
      unitCost: "180.00",
      lineTotal: "540.00",
      releasedAt: new Date("2026-10-02T00:00:00Z"),
      releasedByUserId: "admin-1",
      releasedByName: "Chief Custodian",
      createdAt: new Date("2026-10-02T00:00:00Z"),
    };

    const repoStub: Partial<ConsumableRequestRepository> = {
      findById: vi.fn(async () => reqRow),
      list: vi.fn(async () => [reqRow]),
      count: vi.fn(async () => 1),
      countByStatus: vi.fn(async () => ({ released: 1 })),
      listLinesByRequestId: vi.fn(async () => [lineRow]),
      listLinesByRequestIds: vi.fn(async () => [lineRow]),
      listAllocationsByRequestId: vi.fn(async () => [allocRow]),
      listAllocationsByRequestIds: vi.fn(async () => [allocRow]),
    };
    const consumablesStub: Partial<ConsumableRepository> = {
      listClassificationsByIds: vi.fn(async () => new Map([[CONS_ID, "supply" as const]])),
    };

    const service = new ConsumableRequestService(
      repoStub as ConsumableRequestRepository,
      consumablesStub as ConsumableRepository
    );

    for (const role of ["borrower", "staff"] as const) {
      const actor = makeActor({ role, userId: "borrower-1", tenantId: TENANT_ID });
      const listed = await service.list({}, actor);
      expect(listed.data[0]?.totalCost).toBeNull();
      expect(listed.data[0]?.allocations[0]).toMatchObject({
        quantity: 3,
        purchaseLotId: null,
        lotCode: null,
        supplierId: null,
        supplierName: null,
        unitCost: null,
        lineTotal: null,
      });

      const detail = await service.getById(REQ_ID, actor);
      expect(detail.totalCost).toBeNull();
      expect(detail.allocations[0]?.unitCost).toBeNull();
      expect(detail.allocations[0]?.supplierName).toBeNull();
    }

    const adminActor = makeActor({ role: "admin", userId: "admin-1", tenantId: TENANT_ID });
    const adminDetail = await service.getById(REQ_ID, adminActor);
    expect(adminDetail.totalCost).toBe("540.00");
    expect(adminDetail.allocations[0]).toMatchObject({
      lotCode: "LOT-SECRET-01",
      supplierName: "Confidential Paper Co",
      unitCost: "180.00",
      lineTotal: "540.00",
    });
  });

  it("F-03: strips asset value, supplierId, serialNumber, and maintenance cost for borrower (even without catalog=1) and staff", async () => {
    const assetRow = {
      id: ASSET_ID,
      tenantId: TENANT_ID,
      assetCode: "CE-0001",
      name: "Projector",
      category: "Multimedia",
      classification: "Electronics",
      unit: "unit",
      status: "active" as const,
      assignmentType: "borrowable" as const,
      modelId: null,
      serialNumber: "SN-999-SECRET",
      location: "AV Room",
      currentHolder: "Dept - Computer Science",
      reservedForRequestId: "res-1",
      department: "Computer Science",
      purchaseDate: "2026-01-15",
      value: "45000.00",
      supplierId: "sup-99",
      imageUrl: null,
      notes: "Internal vendor note",
      isSandbox: false,
      lastUpdated: new Date("2026-10-01T00:00:00Z"),
      createdAt: new Date("2026-01-15T00:00:00Z"),
      updatedAt: new Date("2026-10-01T00:00:00Z"),
      maintenanceHistory: [],
    };
    const maintRow = {
      id: MNT_ID,
      tenantId: TENANT_ID,
      logCode: "MNT-2026-0001",
      assetId: ASSET_ID,
      assetCode: "CE-0001",
      assetName: "Projector",
      category: "Multimedia",
      condition: "resolved" as const,
      source: "manual_flag" as const,
      dateLogged: "2026-09-10",
      loggedByUserId: "admin-1",
      loggedByName: "Chief Custodian",
      notes: "Bulb replaced",
      workNotes: null,
      isResolved: true,
      resolutionDate: "2026-09-12",
      resolutionNotes: "Done",
      resolvedByUserId: "admin-1",
      resolvedByName: "Chief Custodian",
      repairCost: "3200.00",
      repairParts: [{ name: "Lamp", cost: "3200.00" }],
      relatedBorrowLogCode: null,
      assignedToName: null,
      scheduledDate: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const assetRepoStub: Partial<AssetRepository> = {
      findMany: vi.fn(async () => [assetRow]),
      findById: vi.fn(async () => assetRow),
      findByAssetCode: vi.fn(async () => assetRow),
      findByModelId: vi.fn(async () => [assetRow]),
    };
    const maintRepoStub: Partial<MaintenanceRepository> = {
      listByAssetId: vi.fn(async () => [maintRow]),
      list: vi.fn(async () => [maintRow]),
      findById: vi.fn(async () => maintRow),
    };
    const projectAssignStub: Partial<ProjectAssetAssignmentRepository> = {
      findOpenHolderLabelsByAssetIds: vi.fn(async () => new Map()),
    };
    const borrowLogRepoStub: Partial<BorrowLogRepository> = {
      findActiveHolderLabelsByAssetIds: vi.fn(async () => new Map()),
    };

    const assetService = new AssetService(
      assetRepoStub as AssetRepository,
      {} as AssetLifecycleService,
      {} as BorrowLogService,
      borrowLogRepoStub as BorrowLogRepository,
      maintRepoStub as MaintenanceRepository,
      {} as PurchaseLotService,
      {} as SupplierRepository,
      projectAssignStub as ProjectAssetAssignmentRepository,
      {} as CategoryRepository,
      { requireModel: vi.fn(async () => ({ id: "m1" })) } as unknown as AssetModelService
    );

    const borrower = makeActor({
      role: "borrower",
      tenantId: TENANT_ID,
      departmentId: DEPT_ID,
    });
    const borrowerListNoCatalog = await assetService.listAssets({}, TENANT_ID, borrower);
    expect(borrowerListNoCatalog[0]?.value).toBeUndefined();
    expect(borrowerListNoCatalog[0]?.supplierId).toBeUndefined();
    expect(borrowerListNoCatalog[0]?.purchaseDate).toBeUndefined();
    expect(borrowerListNoCatalog[0]?.serialNumber).toBeUndefined();
    expect(borrowerListNoCatalog[0]?.notes).toBeUndefined();
    expect(borrowerListNoCatalog[0]?.currentHolder).toBe("In Custody");

    const staff = makeActor({ role: "staff", tenantId: TENANT_ID });
    const staffDetail = await assetService.getAssetById(ASSET_ID, TENANT_ID, staff);
    expect(staffDetail.value).toBeUndefined();
    expect(staffDetail.maintenanceHistory[0]?.cost).toBeUndefined();

    const admin = makeActor({ role: "admin", tenantId: TENANT_ID });
    const adminDetail = await assetService.getAssetById(ASSET_ID, TENANT_ID, admin);
    expect(adminDetail.value).toBe(45000);
    expect(adminDetail.maintenanceHistory[0]?.cost).toBe(3200);

    const maintService = new MaintenanceLogService(
      maintRepoStub as MaintenanceRepository,
      assetRepoStub as AssetRepository
    );
    const staffMaint = await maintService.getById(MNT_ID, staff);
    expect(staffMaint.repairCost).toBeNull();
    expect(staffMaint.repairParts?.[0]?.cost).toBeNull();
  });

  it("F-03: redacts monetary & lot fields for staff across StockMovementService, PurchaseLotService, VoucherService, and PettyCashService", async () => {
    const movRow = {
      id: "mov-1",
      tenantId: TENANT_ID,
      movementCode: "MOV-001",
      consumableId: CONS_ID,
      qty: "5",
      direction: "out" as const,
      reason: "issue" as const,
      departmentId: DEPT_ID,
      projectId: null,
      purchaseLotId: LOT_ID,
      lotCode: "LOT-001",
      unitCost: "120.00",
      lineTotal: "600.00",
      requestId: null,
      notes: null,
      actorUserId: "admin-1",
      actorName: "Admin",
      createdAt: new Date("2026-10-01T00:00:00Z"),
      itemCode: "SUP-001",
      itemName: "Paper",
      unit: "ream",
      classification: "supply",
      requestCode: null,
    };
    const consRow = {
      id: CONS_ID,
      tenantId: TENANT_ID,
      itemCode: "SUP-001",
      name: "Paper",
      category: "Office Supplies",
      classification: "supply",
      categoryClass: null,
      unit: "ream",
      currentQty: "10",
      reservedQty: "0",
      minThreshold: 2,
      location: "Store",
      supplier: null,
      notes: null,
      isSandbox: false,
      lastRestocked: new Date(),
      history: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const stockService = new StockMovementService(
      {
        listRecent: vi.fn(async () => [movRow]),
        findReversalsForIds: vi.fn(async () => new Map()),
        listByConsumableId: vi.fn(async () => [movRow]),
      } as unknown as StockMovementRepository,
      { findById: vi.fn(async () => consRow) } as unknown as ConsumableRepository,
      {} as PurchaseLotRepository,
      {} as ProjectExpenseRepository
    );

    const staff = makeActor({ role: "staff", tenantId: TENANT_ID });
    const admin = makeActor({ role: "admin", tenantId: TENANT_ID });

    const staffMoves = await stockService.list({}, staff);
    expect(staffMoves[0]?.unitCost).toBeNull();
    expect(staffMoves[0]?.lineTotal).toBeNull();
    expect(staffMoves[0]?.lotCode).toBeNull();

    const staffByCons = await stockService.listByConsumable(CONS_ID, TENANT_ID, staff);
    expect(staffByCons[0]?.unitCost).toBeNull();
    expect(staffByCons[0]?.lineTotal).toBeNull();

    const adminByCons = await stockService.listByConsumable(CONS_ID, TENANT_ID, admin);
    expect(adminByCons[0]?.unitCost).toBe("120.00");

    const lotRow = {
      id: LOT_ID,
      tenantId: TENANT_ID,
      lotCode: "PO-2026-001",
      status: "ordered" as const,
      itemType: "consumable" as const,
      consumableId: null,
      assetId: null,
      itemCode: "SUP-001",
      itemName: "Paper",
      supplierId: null,
      supplierName: "Acme",
      quantity: "10",
      quantityRemaining: "10",
      unitCost: "150.00",
      totalCost: "1500.00",
      purchasedOn: "2026-10-01",
      reference: null,
      purpose: "Restock",
      departmentId: null,
      departmentName: null,
      projectId: null,
      projectName: null,
      notes: null,
      receiptUrl: null,
      recordedByUserId: "admin-1",
      recordedByName: "Admin",
      approvedByUserId: null,
      approvedByName: null,
      approvedAt: null,
      orderedAt: null,
      deliveredAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const poService = new PurchaseLotService(
      {
        list: vi.fn(async () => [lotRow]),
        findById: vi.fn(async () => lotRow),
      } as unknown as PurchaseLotRepository,
      {} as SupplierRepository
    );
    const staffPo = await poService.getById(LOT_ID, TENANT_ID, staff);
    expect(staffPo.unitCost).toBeNull();
    expect(staffPo.totalCost).toBeNull();
    const adminPo = await poService.getById(LOT_ID, TENANT_ID, admin);
    expect(adminPo.unitCost).toBe("150.00");

    const voucherRow = {
      id: VOUCHER_ID,
      tenantId: TENANT_ID,
      voucherCode: "DRR2026-000001",
      type: "disbursement" as const,
      status: "approved" as const,
      voucherDate: "2026-10-01",
      payeeName: "Vendor",
      amount: "9900.00",
      supplierId: null,
      supplierName: null,
      purchaseOrderNumber: null,
      assetId: null,
      assetCode: null,
      assetName: null,
      purpose: "Supplies",
      particulars: JSON.stringify([
        {
          description: "Bond Paper A4",
          quantity: "10",
          unitOfMeasure: "ream",
          unitCost: "190.00",
          amount: "1900.00",
          purpose: "Exam printing",
        },
      ]),
      checkNumber: null,
      departmentId: null,
      departmentName: null,
      isLegacy: false,
      createdByUserId: "admin-1",
      createdByName: "Admin",
      approvedByUserId: null,
      approvedByName: null,
      approvedAt: null,
      completedByUserId: null,
      completedByName: null,
      completedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const voucherService = new VoucherService(
      {
        findById: vi.fn(async () => voucherRow),
        list: vi.fn(async () => ({ vouchers: [voucherRow], total: 1 })),
      } as unknown as VoucherRepository,
      {} as AuditLogService
    );
    const staffVoucher = await voucherService.getById(VOUCHER_ID, TENANT_ID, staff);
    expect(staffVoucher.amount).toBeNull();
    expect(staffVoucher.particulars).not.toContain("190.00");
    expect(staffVoucher.particulars).not.toContain("1900.00");
    expect(parseParticulars(staffVoucher.particulars)).toEqual([
      {
        description: "Bond Paper A4",
        quantity: "10",
        unitOfMeasure: "ream",
        unitCost: "",
        amount: "",
        purpose: "Exam printing",
      },
    ]);
    const adminVoucher = await voucherService.getById(VOUCHER_ID, TENANT_ID, admin);
    expect(adminVoucher.amount).toBe("9900.00");
    expect(adminVoucher.particulars).toContain("1900.00");

    const pcvRow = {
      id: PCV_ID,
      tenantId: TENANT_ID,
      pcvNumber: "PCV2026-000001",
      status: "approved" as const,
      voucherDate: "2026-10-01",
      payeeName: "Runner",
      amount: "500.00",
      category: "supplies",
      purpose: "Urgent",
      particulars: "2x Whiteboard Markers - ₱500.00",
      receiptNumber: null,
      supplierId: null,
      supplierName: null,
      purchaseOrderNumber: null,
      departmentId: null,
      departmentName: null,
      isLegacy: false,
      createdByUserId: "admin-1",
      createdByName: "Admin",
      approvedByUserId: null,
      approvedByName: null,
      approvedAt: null,
      completedByUserId: null,
      completedByName: null,
      completedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const pcvService = new PettyCashService(
      {
        findById: vi.fn(async () => pcvRow),
        list: vi.fn(async () => ({ vouchers: [pcvRow], total: 1 })),
      } as unknown as PettyCashRepository,
      {} as AuditLogService
    );
    const staffPcv = await pcvService.getById(PCV_ID, TENANT_ID, staff);
    expect(staffPcv.amount).toBeNull();
    expect(staffPcv.particulars).not.toContain("500");
    expect(parseParticulars(staffPcv.particulars)).toEqual([
      {
        description: "Whiteboard Markers",
        quantity: "2",
        unitCost: "",
        amount: "",
      },
    ]);
    const adminPcv = await pcvService.getById(PCV_ID, TENANT_ID, admin);
    expect(adminPcv.amount).toBe("500.00");
    expect(adminPcv.particulars).toContain("500.00");
    expect(redactParticularsCosts(null)).toBeNull();
  });

  it("F-03-R2 & F-03-R3: masks dashboard asset valuation/price after shared cache and masks asset model defaultUnitValue for staff", async () => {
    const staff = makeActor({ role: "staff", userId: "staff-1", tenantId: TENANT_ID });
    const admin = makeActor({ role: "admin", userId: "admin-1", tenantId: TENANT_ID });

    const cachedRow = {
      id: ASSET_ID,
      name: "Workstation",
      sku: "CE-001",
      category: "Computers",
      type: "Borrowable" as const,
      custodyHolder: "Depot Storage",
      department: "IT Dept",
      custody: {
        holder: "Depot Storage",
        department: "IT Dept",
        type: "unassigned" as const,
      },
      totalQty: 1,
      stockIn: 1,
      valuation: 45000,
      price: "₱45,000.00",
      status: "Available",
      condition: "Available",
      statusType: "good" as const,
      href: "/assets",
      imageUrl: null,
    };

    const wrapSpy = vi
      .spyOn(serverCache, "wrap")
      .mockResolvedValueOnce([cachedRow])
      .mockResolvedValueOnce([cachedRow]);

    try {
      const dashboard = new DashboardService();
      const staffRows = await dashboard.getDashboardAssetRows(
        { limit: 5, tenantId: TENANT_ID },
        TENANT_ID,
        staff
      );
      expect(staffRows[0]?.valuation).toBeNull();
      expect(staffRows[0]?.price).toBeNull();
      expect(cachedRow.valuation).toBe(45000);

      const adminRows = await dashboard.getDashboardAssetRows(
        { limit: 5, tenantId: TENANT_ID },
        TENANT_ID,
        admin
      );
      expect(adminRows[0]?.valuation).toBe(45000);
      expect(adminRows[0]?.price).toBe("₱45,000.00");
    } finally {
      wrapSpy.mockRestore();
    }

    const modelRow = {
      id: "99999999-9999-4999-8999-999999999999",
      tenantId: TENANT_ID,
      modelCode: "MOD-001",
      name: "Laser Printer",
      category: "Printers",
      classification: "IT Equipment",
      description: null,
      manufacturer: "Epson",
      defaultAssignmentType: "borrowable" as const,
      defaultLocation: "Print Room",
      defaultUnitValue: "18500.00",
      imageUrl: null,
      notes: null,
      isSandbox: false,
      createdByUserId: "admin-1",
      createdByName: "Admin",
      createdAt: new Date("2026-10-01T00:00:00Z"),
      updatedAt: new Date("2026-10-01T00:00:00Z"),
    };
    const modelService = new AssetModelService(
      {
        list: vi.fn(async () => [modelRow]),
        findById: vi.fn(async () => modelRow),
        countUnits: vi.fn(async () => 4),
        countAvailableUnits: vi.fn(async () => 3),
      } as unknown as AssetModelRepository,
      {} as CategoryRepository
    );

    const staffModels = await modelService.list({}, TENANT_ID, staff);
    expect(staffModels[0]?.defaultUnitValue).toBeUndefined();
    const staffModel = await modelService.getById(modelRow.id, TENANT_ID, staff);
    expect(staffModel.defaultUnitValue).toBeUndefined();

    const adminModels = await modelService.list({}, TENANT_ID, admin);
    expect(adminModels[0]?.defaultUnitValue).toBe(18500);
    const adminModel = await modelService.getById(modelRow.id, TENANT_ID, admin);
    expect(adminModel.defaultUnitValue).toBe(18500);
  });

  it("F-02 & F-05: escapes HTML in PO slip templates and blocks unsafe logo URLs", () => {
    expect(escapeHtml(`</title><script>alert(1)</script>'`)).toBe(
      "&lt;/title&gt;&lt;script&gt;alert(1)&lt;/script&gt;&#39;"
    );

    expect(isSafeLogoUrl("/CRMC%20LOGO.png")).toBe(true);
    expect(isSafeLogoUrl("data:image/png;base64,iVBORw0KGgo=")).toBe(true);
    expect(isSafeLogoUrl("data:image/svg+xml;base64,PHN2Zz4=")).toBe(false);
    expect(isSafeLogoUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeLogoUrl("https://evil.example/tracker.png")).toBe(false);
    expect(sanitizeImgSrc("data:image/svg+xml;base64,PHN2Zz4=", "/safe.png")).toBe(
      "/safe.png"
    );

    const lot: PurchaseLot = {
      id: "lot-xss",
      poNumber: `PO-<script>alert(1)</script>`,
      lotCode: "LOT-1",
      status: "ordered",
      itemType: "consumable",
      consumableId: null,
      assetId: null,
      itemCode: "SUP-1",
      itemName: "Paper",
      supplierId: null,
      supplierName: `Dealer" onmouseover="alert(1)`,
      quantity: 1,
      quantityRemaining: 1,
      unit: "ream",
      unitCost: "10.00",
      totalCost: "10.00",
      purchasedOn: "2026-10-01",
      reference: null,
      purpose: "Ops",
      departmentId: null,
      departmentName: null,
      notes: null,
      recordedByUserId: "u1",
      recordedByName: `<b>Signer</b>`,
      createdAt: "2026-10-01T00:00:00Z",
      updatedAt: "2026-10-01T00:00:00Z",
    };

    const data: PoSlipRenderData = {
      lot,
      requestedBy: `</title><img src=x onerror=alert(1)>`,
      requestedByTitle: `<script>evil()</script>`,
      poDate: "2026-10-01",
      poTimestamp: "08:00 AM",
      displayDealer: `<svg onload=alert(1)>`,
      displayLotCode: `"quote"`,
      logoUrl: "javascript:alert(1)",
    };

    const body = buildPoSlipBodyHtml(data);
    const full = buildPoSlipFullHtml(data);
    expect(body).not.toContain("<script>");
    expect(body).not.toContain("<svg");
    expect(body).not.toContain("javascript:alert");
    expect(full).toContain("<title>CRMC Purchase Order - PO-&lt;script&gt;alert(1)&lt;/script&gt;</title>");
  });

  it("F-04: neutralizes spreadsheet formula triggers in CSV export strings while preserving negative numbers", () => {
    expect(escapeCsvField("=CMD|'/C calc'!A0")).toBe("'=CMD|'/C calc'!A0");
    expect(escapeCsvField("+2+3")).toBe("'+2+3");
    expect(escapeCsvField("-1+1")).toBe("'-1+1");
    expect(escapeCsvField("@SUM(A1:A2)")).toBe("'@SUM(A1:A2)");
    expect(escapeCsvField("\t=1+1")).toBe("'\t=1+1");
    expect(escapeCsvField("  =HYPERLINK(\"http://evil\")")).toBe(
      "\"'  =HYPERLINK(\"\"http://evil\"\")\""
    );
    expect(escapeCsvField(-42.5)).toBe("-42.5");

    const csv = toCsv(["Note", "Delta"], [["=1+1,test", -5]]);
    expect(csv).toBe("Note,Delta\r\n\"'=1+1,test\",-5");
  });
});

