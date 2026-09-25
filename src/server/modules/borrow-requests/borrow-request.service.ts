import type {
  BorrowRequestHistoryEntry,
  BorrowRequestRow,
} from "@/server/db/schema";
import { formatRelativeTime } from "@/lib/format-relative-time";
import {
  generateOperationalCode,
  isoNow,
} from "@/server/shared/codes";
import type { ActorContext } from "@/server/shared/auth";
import { resolveDepartmentSnapshot } from "@/server/shared/auth";
import { isAssetOperatorRole } from "@/server/shared/roles";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  ForbiddenError,
} from "@/server/shared/errors";

import { BorrowRequestRepository } from "./borrow-request.repository";
import type {
  BorrowRequestDTO,
  IBorrowRequestRepository,
} from "./borrow-request.types";
import { AssetRepository } from "../assets/asset.repository";
import { BorrowLogService } from "../borrow-log/borrow-log.service";
import { BorrowLogRepository } from "../borrow-log/borrow-log.repository";
import { DepartmentRepository } from "../departments/department.repository";
import { invalidateDashboardCache } from "../dashboard/dashboard.service";
import { ProjectAssetAssignmentRepository } from "../projects/project-asset.repository";
import { withTransaction, type DbSession } from "@/server/db/transaction";
import type { AssetRow } from "@/server/db/schema";
import {
  approveBorrowRequestSchema,
  borrowRequestIdSchema,
  cancelBorrowRequestSchema,
  createBorrowRequestSchema,
  listBorrowRequestsQuerySchema,
  rejectBorrowRequestSchema,
  releaseBorrowRequestSchema,
  markUnreleasedBorrowRequestSchema,
  returnBorrowRequestSchema,
  undoBorrowRequestApprovalSchema,
  updateBorrowRequestSchema,
} from "./borrow-request.validation";
import { summarizePurposes } from "@/lib/request-purpose";
import {
  loadLinkedRequestSummaries,
  relatedForRow,
  type LinkedRequestSummary,
} from "@/server/shared/linked-requests";
import { AuditLogService } from "@/server/modules/audit-logs/audit-logs.service";
import { AUDIT_ACTION, AUDIT_ENTITY } from "@/server/modules/audit-logs/audit-events";

function toDTO(
  row: BorrowRequestRow,
  relatedRequests: LinkedRequestSummary[] = []
): BorrowRequestDTO {
  const history = Array.isArray(row.history) ? row.history : [];
  const headerPurpose = row.purpose;
  const items = (Array.isArray(row.items) ? row.items : []).map((item) => ({
    ...item,
    purpose: item.purpose?.trim() || headerPurpose,
  }));
  return {
    id: row.id,
    requestCode: row.requestCode,
    requesterName: row.requesterName,
    requesterEmail: row.requesterEmail,
    requesterPhone: row.requesterPhone,
    department: row.department,
    departmentId: row.departmentId,
    requestType: row.requestType ?? undefined,
    requestedByName: row.requestedByName ?? undefined,
    submissionGroupId: row.submissionGroupId ?? undefined,
    relatedRequests,
    items,
    purpose: headerPurpose,
    requestedAt:
      row.requestedAt instanceof Date
        ? row.requestedAt.toISOString()
        : String(row.requestedAt),
    relativeTime: formatRelativeTime(row.requestedAt),
    expectedReturnDate: row.expectedReturnDate,
    status: row.status,
    notes: row.notes ?? undefined,
    rejectionReason: row.rejectionReason ?? undefined,
    cancellationReason: row.cancellationReason ?? undefined,
    pickedUpBy: row.pickedUpBy ?? undefined,
    history,
  };
}

function historyEntry(
  action: BorrowRequestHistoryEntry["action"],
  actor: string,
  note?: string
): BorrowRequestHistoryEntry {
  return {
    id: crypto.randomUUID(),
    action,
    actor,
    timestamp: isoNow(),
    ...(note ? { note } : {}),
  };
}

type RequestAssetItem = BorrowRequestRow["items"][number];

function normalizeCategoryOnlyItems(
  items: RequestAssetItem[]
): RequestAssetItem[] {
  return items.map((item) => ({
    itemDescription: item.itemDescription,
    category: item.category,
    quantity: item.quantity,
    itemType: "asset" as const,
    ...(item.purpose?.trim() ? { purpose: item.purpose.trim() } : {}),
  }));
}

function expandItemsWithIssuedAssets(
  items: RequestAssetItem[],
  allocations: { lineIndex: number; assetIds: string[] }[],
  assetsById: Map<string, { assetCode: string; name: string }>
): RequestAssetItem[] {
  const expanded: RequestAssetItem[] = [];

  for (let lineIndex = 0; lineIndex < items.length; lineIndex++) {
    const item = items[lineIndex];
    const allocation = allocations.find((a) => a.lineIndex === lineIndex);
    if (!allocation) {
      expanded.push(item);
      continue;
    }

    for (const assetId of allocation.assetIds) {
      const asset = assetsById.get(assetId);
      if (!asset) continue;
      expanded.push({
        itemDescription: asset.name,
        assetId,
        assetCode: asset.assetCode,
        category: item.category,
        quantity: 1,
        itemType: "asset",
        ...(item.purpose?.trim() ? { purpose: item.purpose.trim() } : {}),
      });
    }
  }

  return expanded;
}

export interface PaginatedMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  counts: Record<string, number>;
}

export class BorrowRequestService {
  private readonly auditLogs = new AuditLogService();

  constructor(
    private readonly repo: IBorrowRequestRepository = new BorrowRequestRepository(),
    private readonly assetRepo = new AssetRepository(),
    private readonly borrowLogs = new BorrowLogService(),
    private readonly borrowLogRepo = new BorrowLogRepository(),
    private readonly departments = new DepartmentRepository(),
    private readonly projectAssignments = new ProjectAssetAssignmentRepository()
  ) {}

  private async toDTOWithLinked(
    row: BorrowRequestRow,
    tenantId?: string
  ): Promise<BorrowRequestDTO> {
    const linked = await loadLinkedRequestSummaries(
      [row.submissionGroupId],
      tenantId
    );
    return toDTO(row, relatedForRow(row.id, row.submissionGroupId, linked));
  }

  /** Shared gate: unit must be free of holder and open project custody. */
  private assertAssetFreeForRequest(
    asset: AssetRow,
    openProjectByAssetId: Map<string, string>,
    openBorrowByAssetId: Map<string, string>
  ): void {
    if (asset.status !== "active") {
      throw new ConflictError(
        `Asset ${asset.assetCode} is not available (${asset.status.replace(/_/g, " ")}).`
      );
    }
    if (asset.currentHolder) {
      throw new ConflictError(
        `Asset ${asset.assetCode} is currently in custody (${asset.currentHolder}).`
      );
    }
    if (openProjectByAssetId.has(asset.id)) {
      throw new ConflictError(
        `Asset ${asset.assetCode} is assigned to a project. Return it from the project panel first.`
      );
    }
    if (openBorrowByAssetId.has(asset.id)) {
      throw new ConflictError(
        `Asset ${asset.assetCode} already has an active custody log. Return it first.`
      );
    }
  }

  async list(
    rawQuery: unknown,
    actor?: ActorContext
  ): Promise<{ data: BorrowRequestDTO[]; meta: PaginatedMeta }> {
    const filters = listBorrowRequestsQuerySchema.parse(rawQuery ?? {});
    if (actor && !isAssetOperatorRole(actor.role)) {
      filters.requesterUserId = actor.userId;
    }
    
    const { page, limit, status, ...countFilters } = filters;
    const [rows, total, counts] = await Promise.all([
      this.repo.list(filters, undefined, actor?.tenantId),
      this.repo.count(filters, undefined, actor?.tenantId),
      this.repo.countByStatus(countFilters, undefined, actor?.tenantId),
    ]);
    const linked = await loadLinkedRequestSummaries(
      rows.map((row) => row.submissionGroupId),
      actor?.tenantId
    );

    return {
      data: rows.map((row) =>
        toDTO(row, relatedForRow(row.id, row.submissionGroupId, linked))
      ),
      meta: {
        total,
        page: filters.page || 1,
        limit: filters.limit || 20,
        totalPages: Math.ceil(total / (filters.limit || 20)),
        counts,
      },
    };
  }

  async getById(rawId: string, actor?: ActorContext): Promise<BorrowRequestDTO> {
    const id = borrowRequestIdSchema.parse(rawId);
    const row = await this.repo.findById(id, undefined, actor?.tenantId);
    if (!row) throw new NotFoundError("Borrow request", id);
    if (actor && !isAssetOperatorRole(actor.role) && row.requesterUserId !== actor.userId) {
      throw new ForbiddenError("You are not allowed to view this request.");
    }
    return this.toDTOWithLinked(row, actor?.tenantId);
  }

  async create(rawInput: unknown, actor: ActorContext): Promise<BorrowRequestDTO> {
    const input = createBorrowRequestSchema.parse(rawInput);
    const requestCode = generateOperationalCode("REQ");

    const requesterUserId = isAssetOperatorRole(actor.role)
      ? (input.requesterUserId ?? actor.userId)
      : actor.userId;

    const dest = await resolveDepartmentSnapshot({
      actor,
      submittedDepartmentId: input.departmentId,
      submittedDepartmentName: input.department ?? null,
      requireDepartment: true,
    });

    const submitted = historyEntry("submitted", actor.displayName, "Request recorded");

    const requestType = input.requestType ?? "borrowable";
    const items = normalizeCategoryOnlyItems(input.items);
    const headerPurpose =
      input.purpose?.trim() ||
      summarizePurposes(items.map((i) => i.purpose));

    const row = await withTransaction(async (tx) => {
      const created = await this.repo.create({
        tenantId: actor.tenantId,
        requestCode,
        requesterUserId,
        requesterName: input.requesterName,
        requesterEmail: input.requesterEmail.toLowerCase(),
        requesterPhone: input.requesterPhone ?? "",
        department: dest.departmentName!,
        departmentId: dest.departmentId,
        requestType,
        requestedByName: input.requestedByName ?? null,
        submissionGroupId: input.submissionGroupId ?? null,
        items,
        purpose: headerPurpose,
        expectedReturnDate:
          requestType === "borrowable"
            ? (input.expectedReturnDate ?? new Date().toISOString().slice(0, 10))
            : null,
        status: "pending",
        notes: input.notes ?? null,
        rejectionReason: null,
        history: [submitted],
        requestedAt: new Date(),
      }, tx);

      return created;
    });

    invalidateDashboardCache(actor.tenantId);
    await this.auditLogs.log({
      entityType: AUDIT_ENTITY.borrowRequest,
      entityId: row.id,
      action: AUDIT_ACTION.created,
      actorName: actor.displayName,
      actorUserId: actor.userId,
      notes: `Created borrow request ${row.requestCode}.`,
      metadata: {
        requestCode: row.requestCode,
        requestType: row.requestType,
        status: row.status,
        itemCount: row.items.length,
        departmentId: row.departmentId,
      },
    });
    return toDTO(row);
  }

  async approve(
    rawId: string,
    rawInput: unknown,
    actor: ActorContext
  ): Promise<BorrowRequestDTO> {
    const id = borrowRequestIdSchema.parse(rawId);
    const input = approveBorrowRequestSchema.parse(rawInput ?? {});
    const existing = await this.repo.findById(id, undefined, actor.tenantId);
    if (!existing) throw new NotFoundError("Borrow request", id);
    if (existing.status !== "pending") {
      throw new ConflictError("Only pending requests can be approved.");
    }

    const nextItems = normalizeCategoryOnlyItems(
      input.items ?? existing.items
    );

    const quantityChanged =
      Boolean(input.items) &&
      nextItems.some((item, idx) => {
        const prior = existing.items[idx];
        return !prior || prior.quantity !== item.quantity;
      });

    const approveNote = input.note?.trim();
    const historyNote = quantityChanged
      ? approveNote
        ? `${approveNote} (quantities adjusted at approval)`
        : "Quantities adjusted at approval"
      : approveNote;

    const history = [
      ...(Array.isArray(existing.history) ? existing.history : []),
      historyEntry("approved", actor.displayName, historyNote),
    ];

    const updated = await withTransaction(async (tx) => {
      const up = await this.repo.update(
        id,
        {
          status: "approved",
          items: nextItems,
          history,
        },
        tx,
        actor.tenantId
      );
      if (!up) throw new NotFoundError("Borrow request", id);

      return up;
    });
    await this.auditLogs.log({
      entityType: AUDIT_ENTITY.borrowRequest,
      entityId: updated.id,
      action: AUDIT_ACTION.approved,
      actorName: actor.displayName,
      actorUserId: actor.userId,
      notes: `Approved borrow request ${updated.requestCode}.`,
      metadata: {
        requestCode: updated.requestCode,
        status: updated.status,
        note: historyNote ?? null,
      },
    });
    return toDTO(updated);
  }

  async reject(
    rawId: string,
    rawInput: unknown,
    actor: ActorContext
  ): Promise<BorrowRequestDTO> {
    const id = borrowRequestIdSchema.parse(rawId);
    const input = rejectBorrowRequestSchema.parse(rawInput);
    const existing = await this.repo.findById(id, undefined, actor.tenantId);
    if (!existing) throw new NotFoundError("Borrow request", id);
    if (existing.status !== "pending") {
      throw new ConflictError("Only pending requests can be rejected.");
    }

    const history = [
      ...(Array.isArray(existing.history) ? existing.history : []),
      historyEntry("rejected", actor.displayName, input.reason),
    ];

    const updated = await withTransaction(async (tx) => {
      const up = await this.repo.update(id, {
        status: "rejected",
        rejectionReason: input.reason,
        history,
      }, tx, actor.tenantId);
      if (!up) throw new NotFoundError("Borrow request", id);

      return up;
    });
    await this.auditLogs.log({
      entityType: AUDIT_ENTITY.borrowRequest,
      entityId: updated.id,
      action: AUDIT_ACTION.rejected,
      actorName: actor.displayName,
      actorUserId: actor.userId,
      notes: `Rejected borrow request ${updated.requestCode}.`,
      metadata: {
        requestCode: updated.requestCode,
        reason: input.reason,
      },
    });
    return toDTO(updated);
  }

  async release(
    rawId: string,
    rawInput: unknown,
    actor: ActorContext
  ): Promise<BorrowRequestDTO> {
    const id = borrowRequestIdSchema.parse(rawId);
    const input = releaseBorrowRequestSchema.parse(rawInput ?? {});
    const existing = await this.repo.findById(id, undefined, actor.tenantId);
    if (!existing) throw new NotFoundError("Borrow request", id);
    if (existing.status !== "approved") {
      throw new ConflictError("Only approved requests can be released.");
    }

    const mixedSupply = existing.items.some(
      (item) => item.itemType === "consumable" || Boolean(item.consumableId)
    );
    if (mixedSupply) {
      throw new ConflictError(
        "This request includes supplies. Release it from Supply requests — coded-asset requests cannot mix consumables."
      );
    }

    const requestType = existing.requestType ?? "borrowable";
    const expectedAssignmentType =
      requestType === "assignable" ? "assignable" : "borrowable";

    if (input.lineAllocations.length !== existing.items.length) {
      throw new BadRequestError(
        "Provide asset selections for every requested line before releasing."
      );
    }

    const seenAssetIds = new Set<string>();
    const assetsById = new Map<
      string,
      Awaited<ReturnType<AssetRepository["findById"]>>
    >();

    for (const allocation of input.lineAllocations) {
      const line = existing.items[allocation.lineIndex];
      if (!line) {
        throw new BadRequestError(
          `Invalid line index ${allocation.lineIndex} in release allocation.`
        );
      }
      if (allocation.assetIds.length !== line.quantity) {
        throw new BadRequestError(
          `Line "${line.itemDescription}" requires ${line.quantity} unit(s); ${allocation.assetIds.length} selected.`
        );
      }

      for (const assetId of allocation.assetIds) {
        if (seenAssetIds.has(assetId)) {
          throw new ConflictError("Each asset can only be issued once per release.");
        }
        seenAssetIds.add(assetId);
      }
    }

    const assetIds = [...seenAssetIds];
    const [loadedAssets, openProjectByAssetId, openBorrowByAssetId] =
      await Promise.all([
        this.assetRepo.findByIds(assetIds, undefined, actor.tenantId),
        this.projectAssignments.findOpenHolderLabelsByAssetIds(
          assetIds,
          undefined,
          actor.tenantId
        ),
        this.borrowLogRepo.findActiveHolderLabelsByAssetIds(
          assetIds,
          undefined,
          actor.tenantId
        ),
      ]);

    for (const asset of loadedAssets) {
      assetsById.set(asset.id, asset);
    }

    for (const allocation of input.lineAllocations) {
      const line = existing.items[allocation.lineIndex]!;

      for (const assetId of allocation.assetIds) {
        const asset = assetsById.get(assetId);
        if (!asset) throw new NotFoundError("Asset", assetId);
        this.assertAssetFreeForRequest(
          asset,
          openProjectByAssetId,
          openBorrowByAssetId
        );
        if (asset.assignmentType !== expectedAssignmentType) {
          throw new ConflictError(
            `Asset ${asset.assetCode} is not ${expectedAssignmentType}.`
          );
        }
        if (asset.category !== line.category) {
          throw new ConflictError(
            `Asset ${asset.assetCode} is in category "${asset.category}", expected "${line.category}".`
          );
        }
      }
    }

    const noteWithPicker = input.note
      ? `Released to: ${input.pickedUpBy}. ${input.note}`
      : `Released to: ${input.pickedUpBy}`;

    const custodyKind = requestType === "assignable" ? "assignment" : "borrow";

    let departmentId = existing.departmentId ?? null;
    if (!departmentId && existing.department.trim()) {
      const dept = await this.departments.findByNameLower(
        existing.department.trim(),
        undefined,
        actor.tenantId
      );
      departmentId = dept?.id ?? null;
    }
    if (!departmentId) {
      throw new BadRequestError(
        "This request is not linked to a department. Update the department record before releasing."
      );
    }

    const issuedItems = expandItemsWithIssuedAssets(
      existing.items,
      input.lineAllocations,
      new Map(
        [...assetsById.entries()].map(([assetId, asset]) => [
          assetId,
          { assetCode: asset!.assetCode, name: asset!.name },
        ])
      )
    );

    const history = [
      ...(Array.isArray(existing.history) ? existing.history : []),
      historyEntry("released", actor.displayName, noteWithPicker),
    ];

    const updated = await withTransaction(async (tx: DbSession) => {
      for (const allocation of input.lineAllocations) {
        for (const assetId of allocation.assetIds) {
          await this.borrowLogs.release(
            {
              assetId,
              requestId: existing.id,
              custodyKind,
              source: "portal",
              departmentId,
              borrowerName: input.pickedUpBy,
              borrowerEmail: existing.requesterEmail,
              borrowerPhone: existing.requesterPhone || "",
              dueDate:
                custodyKind === "borrow"
                  ? (existing.expectedReturnDate ?? this.borrowLogs.defaultDueDate())
                  : null,
              requestedByName: existing.requestedByName ?? input.pickedUpBy,
              notes: noteWithPicker,
              borrowerUserId: existing.requesterUserId ?? undefined,
            },
            actor,
            tx
          );
        }
      }

      const up = await this.repo.update(
        id,
        {
          status: "released",
          pickedUpBy: input.pickedUpBy,
          items: issuedItems,
          history,
        },
        tx,
        actor.tenantId
      );
      if (!up) throw new NotFoundError("Borrow request", id);

      return up;
    });
    await this.auditLogs.log({
      entityType: AUDIT_ENTITY.borrowRequest,
      entityId: updated.id,
      action: AUDIT_ACTION.released,
      actorName: actor.displayName,
      actorUserId: actor.userId,
      notes: `Released assets for request ${updated.requestCode}.`,
      metadata: {
        requestCode: updated.requestCode,
        pickedUpBy: input.pickedUpBy,
        releasedAssetCount: input.lineAllocations.reduce(
          (sum, line) => sum + line.assetIds.length,
          0
        ),
      },
    });
    return toDTO(updated);
  }

  async cancel(
    rawId: string,
    rawInput: unknown,
    actor: ActorContext
  ): Promise<BorrowRequestDTO> {
    const id = borrowRequestIdSchema.parse(rawId);
    const input = cancelBorrowRequestSchema.parse(rawInput ?? {});
    const existing = await this.repo.findById(id, undefined, actor.tenantId);
    if (!existing) throw new NotFoundError("Borrow request", id);
    if (existing.status !== "pending" && existing.status !== "approved") {
      throw new ConflictError("Only pending or approved requests can be cancelled.");
    }

    if (
      !isAssetOperatorRole(actor.role) &&
      existing.requesterUserId !== actor.userId
    ) {
      throw new ForbiddenError("You can only cancel your own requests.");
    }

    const reason = (input.reason ?? input.note ?? "").trim();
    const historyNote = reason ? `Reason: ${reason}` : "Cancelled by requester";

    const history = [
      ...(Array.isArray(existing.history) ? existing.history : []),
      historyEntry("cancelled", actor.displayName, historyNote),
    ];

    const updated = await withTransaction(async (tx) => {
      const up = await this.repo.update(
        id,
        {
          status: "cancelled",
          cancellationReason: reason || null,
          history,
        },
        tx,
        actor.tenantId
      );
      if (!up) throw new NotFoundError("Borrow request", id);

      return up;
    });

    await this.auditLogs.log({
      entityType: AUDIT_ENTITY.borrowRequest,
      entityId: updated.id,
      action: AUDIT_ACTION.cancelled,
      actorName: actor.displayName,
      actorUserId: actor.userId,
      notes: `Cancelled borrow request ${updated.requestCode}.`,
      metadata: {
        requestCode: updated.requestCode,
        reason: reason || null,
      },
    });
    return toDTO(updated);
  }

  async undoApproval(
    rawId: string,
    rawInput: unknown,
    actor: ActorContext
  ): Promise<BorrowRequestDTO> {
    const id = borrowRequestIdSchema.parse(rawId);
    const input = undoBorrowRequestApprovalSchema.parse(rawInput ?? {});
    const existing = await this.repo.findById(id, undefined, actor.tenantId);
    if (!existing) throw new NotFoundError("Borrow request", id);
    if (existing.status !== "approved") {
      throw new ConflictError("Only approved requests can have their approval undone.");
    }

    const noteText = input.note?.trim()
      ? `Approval undone: ${input.note.trim()}`
      : "Approval undone and returned to Pending Review";

    const history = [
      ...(Array.isArray(existing.history) ? existing.history : []),
      historyEntry("approval_undone", actor.displayName, noteText),
    ];

    const updated = await withTransaction(async (tx) => {
      const up = await this.repo.update(
        id,
        {
          status: "pending",
          history,
        },
        tx,
        actor.tenantId
      );
      if (!up) throw new NotFoundError("Borrow request", id);

      return up;
    });
    await this.auditLogs.log({
      entityType: AUDIT_ENTITY.borrowRequest,
      entityId: updated.id,
      action: AUDIT_ACTION.updated,
      actorName: actor.displayName,
      actorUserId: actor.userId,
      notes: `Undid approval for borrow request ${updated.requestCode}.`,
      metadata: {
        requestCode: updated.requestCode,
        nextStatus: updated.status,
        note: noteText,
      },
    });
    return toDTO(updated);
  }

  async markUnreleased(
    rawId: string,
    rawInput: unknown,
    actor: ActorContext
  ): Promise<BorrowRequestDTO> {
    const id = borrowRequestIdSchema.parse(rawId);
    const input = markUnreleasedBorrowRequestSchema.parse(rawInput ?? {});
    const existing = await this.repo.findById(id, undefined, actor.tenantId);
    if (!existing) throw new NotFoundError("Borrow request", id);
    if (existing.status !== "approved") {
      throw new ConflictError("Only approved requests can be marked as unreleased.");
    }

    const history = [
      ...(Array.isArray(existing.history) ? existing.history : []),
      historyEntry("unreleased", actor.displayName, input.note),
    ];

    const updated = await withTransaction(async (tx) => {
      const up = await this.repo.update(id, {
        status: "unreleased",
        history,
      }, tx, actor.tenantId);
      if (!up) throw new NotFoundError("Borrow request", id);

      return up;
    });
    await this.auditLogs.log({
      entityType: AUDIT_ENTITY.borrowRequest,
      entityId: updated.id,
      action: AUDIT_ACTION.returned,
      actorName: actor.displayName,
      actorUserId: actor.userId,
      notes: `Marked borrow request ${updated.requestCode} as returned.`,
      metadata: {
        requestCode: updated.requestCode,
        returnedBy: actor.displayName,
        note: input.note ?? null,
      },
    });
    return toDTO(updated);
  }

  async markReturned(rawId: string, rawInput: unknown, actor: ActorContext): Promise<BorrowRequestDTO> {
    const id = borrowRequestIdSchema.parse(rawId);
    const input = returnBorrowRequestSchema.parse(rawInput ?? {});
    const existing = await this.repo.findById(id, undefined, actor.tenantId);
    if (!existing) throw new NotFoundError("Borrow request", id);
    if (existing.status !== "released") {
      throw new ConflictError("Only released requests can be marked returned.");
    }

    const hasReturnableAssets = existing.items.some(
      (item) => item.itemType === "asset" || Boolean(item.assetId)
    );
    if (!hasReturnableAssets) {
      throw new ConflictError(
        "Consumable supply requests cannot be marked as returned because consumable items are consumed upon issuance."
      );
    }

    const noteWithReturner = input.note
      ? `Returned by: ${input.returnedBy}. ${input.note}`
      : `Returned by: ${input.returnedBy}`;

    const history = [
      ...(Array.isArray(existing.history) ? existing.history : []),
      historyEntry("returned", actor.displayName, noteWithReturner),
    ];

    const updated = await withTransaction(async (tx) => {
      // Close every active custody log (or legacy holder) before marking the request returned.
      for (const item of existing.items) {
        if (!item.assetId) continue;

        const open = await this.borrowLogRepo.findActiveByAssetId(item.assetId, tx, actor.tenantId);
        if (open) {
          await this.borrowLogs.returnLog(
            open.id,
            {
              condition: input.condition ?? "good",
              conditionNotes: noteWithReturner,
              flagMaintenance: Boolean(input.flagMaintenance),
            },
            actor,
            tx,
            { skipRequestClosure: true }
          );
        } else {
          // Legacy release without log — clear holder + any orphan project row.
          const asset = await this.assetRepo.findByIdForUpdate(item.assetId, tx, actor.tenantId);
          if (asset?.currentHolder) {
            await this.assetRepo.update(
              item.assetId,
              {
                currentHolder: null,
                reservedForRequestId: null,
                lastUpdated: new Date(),
              },
              tx,
              actor.tenantId
            );
          }
          const openProject = await this.projectAssignments.findOpenByAssetId(
            item.assetId,
            tx,
            actor.tenantId
          );
          if (openProject) {
            await this.projectAssignments.update(
              openProject.id,
              {
                status: "returned",
                returnedAt: new Date(),
                returnedByUserId: actor.userId,
                returnedByName: actor.displayName,
                returnNotes: noteWithReturner,
              },
              tx,
              actor.tenantId
            );
          }
        }
      }

      const up = await this.repo.update(
        id,
        {
          status: "returned",
          history,
        },
        tx,
        actor.tenantId
      );
      if (!up) throw new NotFoundError("Borrow request", id);

      return up;
    });
    return toDTO(updated);
  }

  async update(
    rawId: string,
    rawInput: unknown,
    actor: ActorContext
  ): Promise<BorrowRequestDTO> {
    const id = borrowRequestIdSchema.parse(rawId);
    const input = updateBorrowRequestSchema.parse(rawInput);
    const existing = await this.repo.findById(id, undefined, actor.tenantId);
    if (!existing) throw new NotFoundError("Borrow request", id);
    if (existing.status !== "pending") {
      throw new ConflictError("Only pending requests can be edited.");
    }

    let departmentName = existing.department;
    let departmentId = existing.departmentId;
    if (input.departmentId !== undefined || input.department !== undefined) {
      if (input.departmentId || input.department?.trim()) {
        const dest = await resolveDepartmentSnapshot({
          actor,
          submittedDepartmentId: input.departmentId ?? null,
          submittedDepartmentName: input.department ?? null,
          requireDepartment: true,
        });
        departmentName = dest.departmentName ?? existing.department;
        departmentId = dest.departmentId;
      } else if (input.departmentId === null || input.departmentId === undefined) {
        if (input.departmentId === null) departmentId = null;
      }
    }

    const nextRequestType = input.requestType ?? existing.requestType ?? "borrowable";
    const nextItems = input.items
      ? normalizeCategoryOnlyItems(input.items)
      : existing.items;
    const derivedPurpose = input.items
      ? summarizePurposes(nextItems.map((i) => i.purpose ?? existing.purpose))
      : undefined;

    const history = [
      ...(Array.isArray(existing.history) ? existing.history : []),
      historyEntry("edited", actor.displayName, input.editReason),
    ];

    const updated = await withTransaction(async (tx) => {

      const up = await this.repo.update(
        id,
        {
          ...(input.requesterName !== undefined ? { requesterName: input.requesterName } : {}),
          ...(input.requesterEmail !== undefined ? { requesterEmail: input.requesterEmail.toLowerCase() } : {}),
          ...(input.requesterPhone !== undefined ? { requesterPhone: input.requesterPhone } : {}),
          ...(input.requestedByName !== undefined ? { requestedByName: input.requestedByName } : {}),
          department: departmentName,
          departmentId,
          requestType: nextRequestType,
          items: nextItems,
          purpose:
            input.purpose !== undefined
              ? input.purpose
              : (derivedPurpose ?? existing.purpose),
          expectedReturnDate:
            nextRequestType === "borrowable"
              ? (input.expectedReturnDate !== undefined ? input.expectedReturnDate : existing.expectedReturnDate)
              : null,
          ...(input.notes !== undefined ? { notes: input.notes } : {}),
          history,
          updatedAt: new Date(),
        },
        tx,
        actor.tenantId
      );
      if (!up) throw new NotFoundError("Borrow request", id);

      return up;
    });

    return toDTO(updated);
  }
}
