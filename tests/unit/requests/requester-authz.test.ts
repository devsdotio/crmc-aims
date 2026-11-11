import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockTransaction,
  mockInvalidateDashboardCache,
  mockDeptRow,
} = vi.hoisted(() => ({
  mockTransaction: vi.fn(async (cb: (tx: unknown) => Promise<unknown>) => cb({})),
  mockInvalidateDashboardCache: vi.fn(),
  mockDeptRow: {
    current: {
      id: "55555555-5555-4555-8555-555555555555",
      name: "Information Technology",
    } as { id: string; name: string } | null,
  },
}));

vi.mock("@/server/db", () => ({
  getDb: () => ({
    select: () => ({
      from: () => ({
        where: () => {
          const rows = mockDeptRow.current ? [mockDeptRow.current] : [];
          return Object.assign(Promise.resolve([]), {
            limit: async () => rows,
          });
        },
      }),
    }),
  }),
}));

vi.mock("@/server/shared/cache", () => ({
  serverCache: {
    wrap: async (_k: string, _ttl: number, fn: () => Promise<unknown>) => fn(),
    invalidateTag: vi.fn(),
  },
}));

vi.mock("@/server/db/transaction", () => ({
  withTransaction: mockTransaction,
}));

vi.mock("@/server/modules/dashboard/dashboard.service", () => ({
  invalidateDashboardCache: mockInvalidateDashboardCache,
}));

vi.mock("@/server/shared/linked-requests", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/shared/linked-requests")>();
  return {
    ...actual,
    loadLinkedRequestSummaries: vi.fn().mockResolvedValue(new Map()),
  };
});

vi.mock("@/server/modules/audit-logs/audit-logs.service", () => ({
  AuditLogService: class {
    record = vi.fn().mockResolvedValue(undefined);
  },
}));

import { BorrowRequestService } from "@/server/modules/borrow-requests/borrow-request.service";
import { BorrowRequestRepository } from "@/server/modules/borrow-requests/borrow-request.repository";
import { ConsumableRequestService } from "@/server/modules/consumable-requests/consumable-request.service";
import { ConsumableRequestRepository } from "@/server/modules/consumable-requests/consumable-request.repository";
import { resolveDepartmentSnapshot } from "@/server/shared/auth";
import { isAssetOperatorRole, isStaffShellRole } from "@/server/shared/roles";
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
} from "@/server/shared/errors";
import { makeActor } from "../../setup/actor";

const VALID_UUID = "11111111-1111-4111-8111-111111111111";
const OWNER_ID = "22222222-2222-4222-8222-222222222222";
const OTHER_BORROWER_ID = "33333333-3333-4333-8333-333333333333";
const ADMIN_ID = "44444444-4444-4444-8444-444444444444";
const DEPT_IT_ID = "55555555-5555-4555-8555-555555555555";
const DEPT_HR_ID = "66666666-6666-4666-8666-666666666666";

describe("requester & admin authorization guarantees", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockTransaction.mockClear();
    mockInvalidateDashboardCache.mockClear();
    mockDeptRow.current = {
      id: DEPT_IT_ID,
      name: "Information Technology",
    };
  });

  it("blocks borrowers from staff-shell or asset-operator gates", () => {
    expect(isStaffShellRole("borrower")).toBe(false);
    expect(isAssetOperatorRole("borrower")).toBe(false);
    expect(isAssetOperatorRole("staff")).toBe(false);
    expect(isStaffShellRole("staff")).toBe(true);
    expect(isAssetOperatorRole("admin")).toBe(true);
    expect(isAssetOperatorRole("superadmin")).toBe(true);
  });

  it("locks resolveDepartmentSnapshot strictly to borrower session department", async () => {
    const linkedBorrower = makeActor({
      role: "borrower",
      userId: OWNER_ID,
      departmentId: DEPT_IT_ID,
      departmentName: "Information Technology",
    });
    const unlinkedBorrower = makeActor({
      role: "borrower",
      userId: OTHER_BORROWER_ID,
      departmentId: null,
    });

    await expect(
      resolveDepartmentSnapshot({
        actor: linkedBorrower,
        submittedDepartmentId: DEPT_HR_ID,
        requireDepartment: true,
      })
    ).rejects.toThrow(ForbiddenError);

    await expect(
      resolveDepartmentSnapshot({
        actor: unlinkedBorrower,
        submittedDepartmentId: DEPT_HR_ID,
        requireDepartment: true,
      })
    ).rejects.toThrow(BadRequestError);

    const resolved = await resolveDepartmentSnapshot({
      actor: linkedBorrower,
      submittedDepartmentId: DEPT_IT_ID,
      submittedDepartmentName: "Spoofed Office Name",
      requireDepartment: true,
    });
    expect(resolved).toEqual({
      departmentId: DEPT_IT_ID,
      departmentName: "Information Technology",
    });
  });

  it("lets owner and admin office edit pending borrow requests, while blocking other requesters", async () => {
    const existingRow = {
      id: VALID_UUID,
      tenantId: "00000000-0000-0000-0000-000000000001",
      requestCode: "REQ-001",
      requesterUserId: OWNER_ID,
      requesterName: "IT Dept",
      requesterEmail: "it@crmc.edu",
      requesterPhone: "",
      departmentId: DEPT_IT_ID,
      department: "Information Technology",
      requestType: "borrowable" as const,
      requestedByName: "Alice",
      assignedToName: null,
      submissionGroupId: null,
      items: [
        {
          itemDescription: "Projector",
          category: "Audio Visual",
          quantity: 1,
          itemType: "asset" as const,
          purpose: "Seminar",
        },
      ],
      purpose: "Seminar",
      requestedAt: new Date("2026-11-10T08:00:00Z"),
      expectedReturnDate: "2026-11-15",
      status: "pending" as const,
      notes: null,
      rejectionReason: null,
      cancellationReason: null,
      pickedUpBy: null,
      history: [],
      createdAt: new Date("2026-11-10T08:00:00Z"),
      updatedAt: new Date("2026-11-10T08:00:00Z"),
    };

    const findByIdSpy = vi
      .spyOn(BorrowRequestRepository.prototype, "findById")
      .mockResolvedValue(existingRow);
    const updateSpy = vi
      .spyOn(BorrowRequestRepository.prototype, "update")
      .mockImplementation(async (_id, patch) => ({
        ...existingRow,
        ...patch,
      }));

    const svc = new BorrowRequestService();

    const otherBorrower = makeActor({
      role: "borrower",
      userId: OTHER_BORROWER_ID,
      departmentId: DEPT_HR_ID,
    });
    await expect(
      svc.update(
        VALID_UUID,
        { purpose: "Hijack", editReason: "Attempting unauthorized edit" },
        otherBorrower
      )
    ).rejects.toThrow(ForbiddenError);

    const staffNonOwner = makeActor({
      role: "staff",
      userId: "77777777-7777-4777-8777-777777777777",
    });
    await expect(
      svc.update(
        VALID_UUID,
        { purpose: "Browse staff attempt", editReason: "Attempting unauthorized edit" },
        staffNonOwner
      )
    ).rejects.toThrow(ForbiddenError);

    const owner = makeActor({
      role: "borrower",
      userId: OWNER_ID,
      departmentId: DEPT_IT_ID,
      displayName: "IT Office",
    });
    const ownerUpdated = await svc.update(
      VALID_UUID,
      { purpose: "Updated Seminar", editReason: "Correcting event schedule" },
      owner
    );
    expect(ownerUpdated.purpose).toBe("Updated Seminar");

    const admin = makeActor({
      role: "admin",
      userId: ADMIN_ID,
      displayName: "Admin Custodian",
    });
    const adminUpdated = await svc.update(
      VALID_UUID,
      {
        purpose: "Custodian adjusted purpose",
        editReason: "Admin office fixed typo on requester ticket",
      },
      admin
    );
    expect(adminUpdated.purpose).toBe("Custodian adjusted purpose");
    expect(updateSpy).toHaveBeenCalledTimes(2);
    expect(mockInvalidateDashboardCache).toHaveBeenCalledTimes(2);

    findByIdSpy.mockResolvedValue({ ...existingRow, status: "approved" });
    await expect(
      svc.update(
        VALID_UUID,
        { purpose: "Too late", editReason: "Already approved check" },
        admin
      )
    ).rejects.toThrow(ConflictError);
  });

  it("lets owner and admin office edit pending consumable requests and forbids borrower projectId override", async () => {
    const existingRow = {
      id: VALID_UUID,
      tenantId: "00000000-0000-0000-0000-000000000001",
      requestCode: "CRQ-001",
      requesterUserId: OWNER_ID,
      requesterName: "IT Dept",
      requesterEmail: "it@crmc.edu",
      requesterPhone: "",
      departmentId: DEPT_IT_ID,
      projectId: null,
      department: "Information Technology",
      requestedByName: "Alice",
      submissionGroupId: null,
      source: "portal" as const,
      purpose: "Stationery",
      requestedAt: new Date("2026-11-10T08:00:00Z"),
      status: "pending" as const,
      notes: null,
      rejectionReason: null,
      cancellationReason: null,
      approvedAt: null,
      approvedByUserId: null,
      approvedByName: null,
      releasedAt: null,
      releasedByUserId: null,
      releasedByName: null,
      receivedBy: null,
      history: [],
      createdAt: new Date("2026-11-10T08:00:00Z"),
      updatedAt: new Date("2026-11-10T08:00:00Z"),
    };

    vi.spyOn(ConsumableRequestRepository.prototype, "findById").mockResolvedValue(
      existingRow
    );
    vi.spyOn(ConsumableRequestRepository.prototype, "listLinesByRequestId").mockResolvedValue([]);
    vi.spyOn(ConsumableRequestRepository.prototype, "listAllocationsByRequestId").mockResolvedValue([]);
    vi.spyOn(ConsumableRequestRepository.prototype, "update").mockImplementation(
      async (_id, patch) => ({
        ...existingRow,
        ...patch,
      })
    );

    const svc = new ConsumableRequestService();

    const owner = makeActor({
      role: "borrower",
      userId: OWNER_ID,
      departmentId: DEPT_IT_ID,
    });
    await expect(
      svc.update(
        VALID_UUID,
        {
          projectId: DEPT_HR_ID,
          editReason: "Trying to assign request to project",
        },
        owner
      )
    ).rejects.toThrow(ForbiddenError);

    const otherBorrower = makeActor({
      role: "borrower",
      userId: OTHER_BORROWER_ID,
      departmentId: DEPT_HR_ID,
    });
    await expect(
      svc.update(
        VALID_UUID,
        { purpose: "Forbidden edit", editReason: "Not the owner" },
        otherBorrower
      )
    ).rejects.toThrow(ForbiddenError);

    const admin = makeActor({
      role: "admin",
      userId: ADMIN_ID,
      displayName: "Admin Officer",
    });
    const adminUpdated = await svc.update(
      VALID_UUID,
      {
        purpose: "Admin updated supply purpose",
        editReason: "Admin office edited requester request",
      },
      admin
    );
    expect(adminUpdated.purpose).toBe("Admin updated supply purpose");
  });
});
