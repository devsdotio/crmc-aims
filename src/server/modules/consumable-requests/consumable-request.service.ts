import type {
  ConsumableRequestHistoryEntry,
  ConsumableRequestLineRow,
  ConsumableRequestReleaseAllocationRow,
  ConsumableRequestRow,
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
  ForbiddenError,
  NotFoundError,
} from "@/server/shared/errors";
import { withTransaction } from "@/server/db/transaction";
import { ConsumableRepository } from "@/server/modules/consumables/consumable.repository";
import {
  PurchaseLotService,
  type LotCostAllocation,
} from "@/server/modules/purchase-lots/purchase-lot.service";

import { ConsumableRequestRepository } from "./consumable-request.repository";
import {
  StockMovementService,
  allocationsToMovementLines,
} from "@/server/modules/stock-movements";
import type {
  ConsumableRequestDTO,
  ConsumableRequestLineDTO,
  ConsumableRequestReleaseAllocationDTO,
} from "./consumable-request.types";
import {
  approveConsumableRequestSchema,
  cancelConsumableRequestSchema,
  consumableRequestIdSchema,
  createConsumableRequestSchema,
  listConsumableRequestsQuerySchema,
  rejectConsumableRequestSchema,
  releaseConsumableRequestSchema,
  undoConsumableRequestApprovalSchema,
  updateConsumableRequestSchema,
} from "./consumable-request.validation";
import { summarizePurposes } from "@/lib/request-purpose";
import {
  loadLinkedRequestSummaries,
  relatedForRow,
  type LinkedRequestSummary,
} from "@/server/shared/linked-requests";
import { invalidateDashboardCache } from "@/server/modules/dashboard/dashboard.service";

function money(value: string | number): string {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return "0.00";
  return n.toFixed(2);
}

function toLineDTO(row: ConsumableRequestLineRow): ConsumableRequestLineDTO {
  return {
    id: row.id,
    lineNo: row.lineNo,
    consumableId: row.consumableId,
    itemCode: row.itemCode,
    itemName: row.itemName,
    category: row.category,
    unit: row.unit,
    quantityRequested: row.quantityRequested,
    purpose: row.purpose || "General",
    notes: row.notes ?? undefined,
  };
}

function toAllocationDTO(
  row: ConsumableRequestReleaseAllocationRow
): ConsumableRequestReleaseAllocationDTO {
  return {
    id: row.id,
    requestLineId: row.requestLineId,
    consumableId: row.consumableId,
    purchaseLotId: row.purchaseLotId ?? null,
    lotCode: row.lotCode ?? null,
    supplierId: row.supplierId ?? null,
    supplierName: row.supplierName ?? null,
    quantity: row.quantity,
    unitCost: money(row.unitCost),
    lineTotal: money(row.lineTotal),
    releasedAt:
      row.releasedAt instanceof Date
        ? row.releasedAt.toISOString()
        : String(row.releasedAt),
    releasedByName: row.releasedByName,
  };
}

function toDTO(
  row: ConsumableRequestRow,
  lines: ConsumableRequestLineRow[],
  allocations: ConsumableRequestReleaseAllocationRow[] = [],
  relatedRequests: LinkedRequestSummary[] = []
): ConsumableRequestDTO {
  const history = Array.isArray(row.history) ? row.history : [];
  const allocDtos = allocations.map(toAllocationDTO);
  const totalCost = allocDtos.reduce((sum, a) => sum + Number(a.lineTotal), 0);
  return {
    id: row.id,
    requestCode: row.requestCode,
    requesterUserId: row.requesterUserId ?? undefined,
    requesterName: row.requesterName,
    requesterEmail: row.requesterEmail,
    requesterPhone: row.requesterPhone,
    department: row.department,
    departmentId: row.departmentId,
    projectId: row.projectId,
    source: row.source ?? "portal",
    requestedByName: row.requestedByName ?? undefined,
    submissionGroupId: row.submissionGroupId ?? undefined,
    relatedRequests,
    purpose: row.purpose,
    status: row.status,
    notes: row.notes ?? undefined,
    rejectionReason: row.rejectionReason ?? undefined,
    cancellationReason: row.cancellationReason ?? undefined,
    receivedBy: row.receivedBy ?? undefined,
    history,
    lines: lines.map(toLineDTO),
    allocations: allocDtos,
    totalCost: money(totalCost),
    approvedAt: row.approvedAt
      ? row.approvedAt instanceof Date
        ? row.approvedAt.toISOString()
        : String(row.approvedAt)
      : undefined,
    approvedByName: row.approvedByName ?? undefined,
    releasedAt: row.releasedAt
      ? row.releasedAt instanceof Date
        ? row.releasedAt.toISOString()
        : String(row.releasedAt)
      : undefined,
    releasedByName: row.releasedByName ?? undefined,
    requestedAt:
      row.requestedAt instanceof Date
        ? row.requestedAt.toISOString()
        : String(row.requestedAt),
    relativeTime: formatRelativeTime(row.requestedAt),
  };
}

function historyEntry(
  action: ConsumableRequestHistoryEntry["action"],
  actor: string,
  note?: string
): ConsumableRequestHistoryEntry {
  return {
    id: crypto.randomUUID(),
    action,
    actor,
    timestamp: isoNow(),
    ...(note ? { note } : {}),
  };
}

export interface PaginatedMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  counts: Record<string, number>;
}

export class ConsumableRequestService {
  constructor(
    private readonly repo = new ConsumableRequestRepository(),
    private readonly consumables = new ConsumableRepository(),
    private readonly purchaseLots = new PurchaseLotService(),
    private readonly movements = new StockMovementService()
  ) {}

  private async hydrate(
    row: ConsumableRequestRow,
    tenantId?: string
  ): Promise<ConsumableRequestDTO> {
    const [lines, allocations, linked] = await Promise.all([
      this.repo.listLinesByRequestId(row.id),
      row.status === "released"
        ? this.repo.listAllocationsByRequestId(row.id)
        : Promise.resolve([]),
      loadLinkedRequestSummaries([row.submissionGroupId], tenantId),
    ]);
    return toDTO(
      row,
      lines,
      allocations,
      relatedForRow(row.id, row.submissionGroupId, linked)
    );
  }

  async list(
    rawQuery: unknown,
    actor?: ActorContext
  ): Promise<{ data: ConsumableRequestDTO[]; meta: PaginatedMeta }> {
    const filters = listConsumableRequestsQuerySchema.parse(rawQuery ?? {});
    if (actor && !isAssetOperatorRole(actor.role)) {
      filters.requesterUserId = actor.userId;
    }

    const { page, limit, ...countFilters } = filters;
    const [rows, total, counts] = await Promise.all([
      this.repo.list(filters, undefined, actor?.tenantId),
      this.repo.count(filters, undefined, actor?.tenantId),
      this.repo.countByStatus(countFilters, undefined, actor?.tenantId),
    ]);

    const allLines = await this.repo.listLinesByRequestIds(rows.map((r) => r.id));
    const linesByRequest = new Map<string, ConsumableRequestLineRow[]>();
    for (const line of allLines) {
      const list = linesByRequest.get(line.requestId) ?? [];
      list.push(line);
      linesByRequest.set(line.requestId, list);
    }
    const linked = await loadLinkedRequestSummaries(
      rows.map((row) => row.submissionGroupId),
      actor?.tenantId
    );

    return {
      data: rows.map((row) =>
        toDTO(
          row,
          linesByRequest.get(row.id) ?? [],
          [],
          relatedForRow(row.id, row.submissionGroupId, linked)
        )
      ),
      meta: {
        total,
        page: page || 1,
        limit: limit || 20,
        totalPages: Math.ceil(total / (limit || 20)),
        counts,
      },
    };
  }

  async getById(
    rawId: string,
    actor?: ActorContext
  ): Promise<ConsumableRequestDTO> {
    const id = consumableRequestIdSchema.parse(rawId);
    const row = await this.repo.findById(id, undefined, actor?.tenantId);
    if (!row) throw new NotFoundError("Consumable request", id);
    if (
      actor &&
      !isAssetOperatorRole(actor.role) &&
      row.requesterUserId !== actor.userId
    ) {
      throw new ForbiddenError("You are not allowed to view this request.");
    }
    return this.hydrate(row, actor?.tenantId);
  }

  async create(
    rawInput: unknown,
    actor: ActorContext
  ): Promise<ConsumableRequestDTO> {
    const input = createConsumableRequestSchema.parse(rawInput);

    // Same SKU may appear under different purposes; block only exact duplicates.
    const lineKeys = input.lines.map(
      (l) => `${l.consumableId}::${l.purpose.trim().toLowerCase()}`
    );
    if (new Set(lineKeys).size !== lineKeys.length) {
      throw new BadRequestError(
        "Duplicate product under the same purpose is not allowed. Combine quantities into a single line."
      );
    }

    const items = await Promise.all(
      input.lines.map(async (line) => {
        const item = await this.consumables.findById(line.consumableId);
        if (!item) {
          throw new NotFoundError("Consumable", line.consumableId);
        }
        return { line, item };
      })
    );

    const requesterUserId = isAssetOperatorRole(actor.role)
      ? (input.requesterUserId ?? actor.userId)
      : actor.userId;

    const requestCode = generateOperationalCode("CRQ");
    const submitted = historyEntry(
      "submitted",
      actor.displayName,
      "Consumable request recorded"
    );

    if (input.projectId && !isAssetOperatorRole(actor.role)) {
      throw new ForbiddenError(
        "Department accounts cannot request supplies for a project."
      );
    }

    if (
      isAssetOperatorRole(actor.role) &&
      !input.departmentId &&
      !input.department?.trim() &&
      !input.projectId
    ) {
      throw new BadRequestError(
        "Specify a department or project destination."
      );
    }

    const dest = await resolveDepartmentSnapshot({
      actor,
      submittedDepartmentId: input.projectId ? null : input.departmentId,
      submittedDepartmentName: input.projectId
        ? null
        : (input.department ?? null),
      requireDepartment: !input.projectId,
    });

    const headerPurpose =
      input.purpose?.trim() ||
      summarizePurposes(input.lines.map((l) => l.purpose));

    const dto = await withTransaction(async (tx) => {
      const created = await this.repo.create(
        {
          // Explicit actor tenant — do not rely on ALS inside withTransaction
          // (lost context falls back to schema default and hides rows on list).
          tenantId: actor.tenantId,
          requestCode,
          requesterUserId,
          requesterName: input.requesterName,
          requesterEmail: input.requesterEmail.toLowerCase(),
          requesterPhone: input.requesterPhone ?? "",
          department: dest.departmentName ?? "",
          departmentId: dest.departmentId,
          projectId: isAssetOperatorRole(actor.role)
            ? (input.projectId ?? null)
            : null,
          source: isAssetOperatorRole(actor.role) ? "admin_manual" : "portal",
          requestedByName: input.requestedByName ?? null,
          submissionGroupId: input.submissionGroupId ?? null,
          purpose: headerPurpose,
          status: "pending",
          notes: input.notes ?? null,
          rejectionReason: null,
          history: [submitted],
          requestedAt: new Date(),
        },
        tx
      );

      const lines = await this.repo.createLines(
        items.map(({ line, item }, index) => ({
          requestId: created.id,
          lineNo: index + 1,
          consumableId: item.id,
          itemCode: item.itemCode,
          itemName: item.name,
          category: item.category,
          unit: item.unit,
          quantityRequested: line.quantity,
          purpose: line.purpose.trim(),
          notes: line.notes ?? null,
        })),
        tx
      );

      return toDTO(created, lines, []);
    });

    invalidateDashboardCache(actor.tenantId);
    return dto;
  }

  async approve(
    rawId: string,
    rawInput: unknown,
    actor: ActorContext
  ): Promise<ConsumableRequestDTO> {
    const id = consumableRequestIdSchema.parse(rawId);
    const input = approveConsumableRequestSchema.parse(rawInput ?? {});
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError("Consumable request", id);
    if (existing.status !== "pending") {
      throw new ConflictError("Only pending requests can be approved.");
    }

    const updated = await withTransaction(async (tx) => {
      const existingLines = await this.repo.listLinesByRequestId(id, tx);
      if (existingLines.length === 0) {
        throw new BadRequestError("Request has no product lines.");
      }

      let quantityChanged = false;
      const linesToProcess = existingLines.map((line) => {
        const matchingInputLine = input.lines?.find(
          (il) =>
            (il.lineId && il.lineId === line.id) ||
            il.consumableId === line.consumableId
        );
        if (
          matchingInputLine &&
          matchingInputLine.quantity !== line.quantityRequested
        ) {
          quantityChanged = true;
          return {
            ...line,
            quantityRequested: matchingInputLine.quantity,
            isModified: true,
          };
        }
        return {
          ...line,
          isModified: false,
        };
      });

      if (quantityChanged) {
        for (const line of linesToProcess) {
          if (line.isModified) {
            await this.repo.updateLine(
              line.id,
              { quantityRequested: line.quantityRequested },
              tx
            );
          }
        }
      }

      for (const line of linesToProcess) {
        const item = await this.consumables.findByIdForUpdate(
          line.consumableId,
          tx
        );
        if (!item) throw new NotFoundError("Consumable", line.consumableId);
        const freeQty = Math.max(0, item.currentQty - (item.reservedQty ?? 0));
        if (line.quantityRequested > freeQty) {
          throw new BadRequestError(
            `Not enough unreserved stock for ${item.itemCode}. Available: ${freeQty} ${item.unit}, requested/approved: ${line.quantityRequested}.`
          );
        }
        await this.consumables.update(
          item.id,
          { reservedQty: (item.reservedQty ?? 0) + line.quantityRequested },
          tx
        );
      }

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

      const up = await this.repo.update(
        id,
        {
          status: "approved",
          approvedAt: new Date(),
          approvedByUserId: actor.userId,
          approvedByName: actor.displayName,
          history,
        },
        tx
      );
      if (!up) throw new NotFoundError("Consumable request", id);

      return up;
    });

    return this.hydrate(updated);
  }

  async reject(
    rawId: string,
    rawInput: unknown,
    actor: ActorContext
  ): Promise<ConsumableRequestDTO> {
    const id = consumableRequestIdSchema.parse(rawId);
    const input = rejectConsumableRequestSchema.parse(rawInput);
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError("Consumable request", id);
    if (existing.status !== "pending") {
      throw new ConflictError("Only pending requests can be rejected.");
    }

    const history = [
      ...(Array.isArray(existing.history) ? existing.history : []),
      historyEntry("rejected", actor.displayName, input.reason),
    ];

    const updated = await withTransaction(async (tx) => {
      const up = await this.repo.update(
        id,
        {
          status: "rejected",
          rejectionReason: input.reason,
          history,
        },
        tx
      );
      if (!up) throw new NotFoundError("Consumable request", id);

      return up;
    });

    return this.hydrate(updated);
  }

  async cancel(
    rawId: string,
    rawInput: unknown,
    actor: ActorContext
  ): Promise<ConsumableRequestDTO> {
    const id = consumableRequestIdSchema.parse(rawId);
    const input = cancelConsumableRequestSchema.parse(rawInput ?? {});
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError("Consumable request", id);
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
      if (existing.status === "approved") {
        const lines = await this.repo.listLinesByRequestId(id, tx);
        for (const line of lines) {
          const item = await this.consumables.findByIdForUpdate(
            line.consumableId,
            tx
          );
          if (!item) continue;
          await this.consumables.update(
            item.id,
            {
              reservedQty: Math.max(
                0,
                (item.reservedQty ?? 0) - line.quantityRequested
              ),
            },
            tx
          );
        }
      }

      const up = await this.repo.update(
        id,
        {
          status: "cancelled",
          cancellationReason: reason || null,
          history,
        },
        tx
      );
      if (!up) throw new NotFoundError("Consumable request", id);

      return up;
    });

    return this.hydrate(updated);
  }

  async undoApproval(
    rawId: string,
    rawInput: unknown,
    actor: ActorContext
  ): Promise<ConsumableRequestDTO> {
    const id = consumableRequestIdSchema.parse(rawId);
    const input = undoConsumableRequestApprovalSchema.parse(rawInput ?? {});
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError("Consumable request", id);
    if (existing.status !== "approved") {
      throw new ConflictError("Only approved requests can have their approval undone.");
    }
    if (!isAssetOperatorRole(actor.role)) {
      throw new ForbiddenError("Only an operator can undo request approval.");
    }

    const noteText = input.note?.trim()
      ? `Approval undone: ${input.note.trim()}`
      : "Approval undone and returned to Pending Review";

    const history = [
      ...(Array.isArray(existing.history) ? existing.history : []),
      historyEntry("approval_undone", actor.displayName, noteText),
    ];

    const updated = await withTransaction(async (tx) => {
      const lines = await this.repo.listLinesByRequestId(id, tx);
      for (const line of lines) {
        const item = await this.consumables.findByIdForUpdate(
          line.consumableId,
          tx
        );
        if (!item) continue;
        await this.consumables.update(
          item.id,
          {
            reservedQty: Math.max(
              0,
              (item.reservedQty ?? 0) - line.quantityRequested
            ),
          },
          tx
        );
      }

      const up = await this.repo.update(
        id,
        {
          status: "pending",
          approvedAt: null,
          approvedByUserId: null,
          approvedByName: null,
          history,
        },
        tx
      );
      if (!up) throw new NotFoundError("Consumable request", id);

      return up;
    });

    return this.hydrate(updated);
  }

  /**
   * Full issue: every request line must be covered exactly once.
   * Admin picks lots (no FIFO). Deducts lot remainders + item qty.
   */
  async release(
    rawId: string,
    rawInput: unknown,
    actor: ActorContext
  ): Promise<ConsumableRequestDTO> {
    const id = consumableRequestIdSchema.parse(rawId);
    const input = releaseConsumableRequestSchema.parse(rawInput);
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError("Consumable request", id);
    if (existing.status !== "approved") {
      throw new ConflictError("Only approved requests can be released.");
    }

    const dbLines = await this.repo.listLinesByRequestId(id);
    if (dbLines.length === 0) {
      throw new BadRequestError("Request has no product lines.");
    }

    const releaseByLineId = new Map(
      input.lines.map((l) => [l.lineId, l] as const)
    );
    if (releaseByLineId.size !== input.lines.length) {
      throw new BadRequestError("Duplicate lineId in release payload.");
    }
    if (releaseByLineId.size !== dbLines.length) {
      throw new BadRequestError(
        `Release must include every request line exactly once (${dbLines.length} expected).`
      );
    }
    for (const line of dbLines) {
      if (!releaseByLineId.has(line.id)) {
        throw new BadRequestError(
          `Missing release allocations for line ${line.lineNo} (${line.itemCode}).`
        );
      }
    }

    const noteWithReceiver = input.note
      ? `Released to: ${input.receivedBy}. ${input.note}`
      : `Released to: ${input.receivedBy}`;

    const dto = await withTransaction(async (tx) => {
      const allocationRows: Array<{
        requestId: string;
        requestLineId: string;
        consumableId: string;
        purchaseLotId: string | null;
        lotCode: string | null;
        supplierId: string | null;
        supplierName: string | null;
        quantity: number;
        unitCost: string;
        lineTotal: string;
        releasedAt: Date;
        releasedByUserId: string;
        releasedByName: string;
      }> = [];

      for (const line of dbLines) {
        const releaseLine = releaseByLineId.get(line.id)!;
        const item = await this.consumables.findByIdForUpdate(
          line.consumableId,
          tx
        );
        if (!item) {
          throw new NotFoundError("Consumable", line.consumableId);
        }

        if (item.currentQty < line.quantityRequested) {
          throw new BadRequestError(
            `Not on hand for ${item.itemCode}. Available: ${item.currentQty} ${item.unit}, requested: ${line.quantityRequested}. Restock or file a purchase order first.`
          );
        }

        const lotAllocations: LotCostAllocation[] = [];
        const allocations = releaseLine.allocations ?? [];
        const allocatedQty = allocations.reduce(
          (sum, a) => sum + a.quantity,
          0
        );
        if (allocatedQty !== line.quantityRequested) {
          throw new BadRequestError(
            `Line ${line.lineNo} (${item.itemCode}): allocations must total ${line.quantityRequested} (got ${allocatedQty}).`
          );
        }

        for (const alloc of allocations) {
          const result = alloc.lotId
            ? await this.purchaseLots.consumeFromLotId(
                alloc.lotId,
                alloc.quantity,
                tx,
                item.id
              )
            : await this.purchaseLots.consumeFromLot(
                alloc.lotCode!,
                alloc.quantity,
                tx,
                item.id
              );

          lotAllocations.push(result.allocation);
        }

        await this.consumables.update(
          item.id,
          {
            currentQty: item.currentQty - line.quantityRequested,
            reservedQty: Math.max(
              0,
              (item.reservedQty ?? 0) - line.quantityRequested
            ),
          },
          tx
        );

        await this.movements.record(
          {
            consumableId: item.id,
            direction: "out",
            reason: "issue",
            actor,
            departmentId: existing.departmentId,
            projectId: existing.projectId,
            requestId: existing.id,
            notes: noteWithReceiver,
            lines: allocationsToMovementLines(lotAllocations),
          },
          tx
        );

        for (const a of lotAllocations) {
          allocationRows.push({
            requestId: existing.id,
            requestLineId: line.id,
            consumableId: item.id,
            purchaseLotId: a.lotId,
            lotCode: a.lotCode,
            supplierId: a.supplierId ?? null,
            supplierName: a.supplierName ?? null,
            quantity: a.quantity,
            unitCost: a.unitCost,
            lineTotal: a.total,
            releasedAt: new Date(),
            releasedByUserId: actor.userId,
            releasedByName: actor.displayName,
          });
        }
      }

      const savedAllocations = await this.repo.createAllocations(
        allocationRows,
        tx
      );

      const history = [
        ...(Array.isArray(existing.history) ? existing.history : []),
        historyEntry("released", actor.displayName, noteWithReceiver),
      ];

      const up = await this.repo.update(
        id,
        {
          status: "released",
          receivedBy: input.receivedBy,
          releasedAt: new Date(),
          releasedByUserId: actor.userId,
          releasedByName: actor.displayName,
          history,
        },
        tx
      );
      if (!up) throw new NotFoundError("Consumable request", id);

      const lines = await this.repo.listLinesByRequestId(id, tx);
      return toDTO(up, lines, savedAllocations);
    });

    return dto;
  }

  async update(
    rawId: string,
    rawInput: unknown,
    actor: ActorContext
  ): Promise<ConsumableRequestDTO> {
    const id = consumableRequestIdSchema.parse(rawId);
    const input = updateConsumableRequestSchema.parse(rawInput);
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError("Consumable request", id);
    if (existing.status !== "pending") {
      throw new ConflictError("Only pending requests can be edited.");
    }

    let departmentName = existing.department;
    let departmentId = existing.departmentId;
    let projectId = existing.projectId;

    if (
      input.departmentId !== undefined ||
      input.projectId !== undefined ||
      input.department !== undefined
    ) {
      if (input.projectId) {
        departmentId = null;
        projectId = input.projectId;
      } else if (input.departmentId || input.department?.trim()) {
        const dest = await resolveDepartmentSnapshot({
          actor,
          submittedDepartmentId: input.departmentId ?? null,
          submittedDepartmentName: input.department ?? null,
          requireDepartment: true,
        });
        departmentName = dest.departmentName ?? existing.department;
        departmentId = dest.departmentId;
        projectId = null;
      } else if (input.departmentId === null && !input.department) {
        // explicit clear only when operators allow — keep existing for safety
      }
    }

    let lineRowsToInsert: Array<
      Omit<ConsumableRequestLineRow, "id" | "createdAt" | "updatedAt">
    > | null = null;
    let derivedPurpose: string | undefined;
    if (input.lines && input.lines.length > 0) {
      const lineKeys = input.lines.map(
        (l) => `${l.consumableId}::${l.purpose.trim().toLowerCase()}`
      );
      if (new Set(lineKeys).size !== lineKeys.length) {
        throw new BadRequestError(
          "Duplicate product under the same purpose is not allowed. Combine quantities into a single line."
        );
      }

      lineRowsToInsert = await Promise.all(
        input.lines.map(async (line, index) => {
          const item = await this.consumables.findById(line.consumableId);
          if (!item) {
            throw new NotFoundError("Consumable", line.consumableId);
          }
          return {
            requestId: id,
            lineNo: index + 1,
            consumableId: item.id,
            itemCode: item.itemCode,
            itemName: item.name,
            category: item.category,
            unit: item.unit,
            quantityRequested: line.quantity,
            purpose: line.purpose.trim(),
            notes: line.notes ?? null,
          };
        })
      );
      derivedPurpose = summarizePurposes(input.lines.map((l) => l.purpose));
    }

    const history = [
      ...(Array.isArray(existing.history) ? existing.history : []),
      historyEntry("edited", actor.displayName, input.editReason),
    ];

    const dto = await withTransaction(async (tx) => {
      if (lineRowsToInsert) {
        await this.repo.deleteLinesByRequestId(id, tx);
        await this.repo.createLines(lineRowsToInsert, tx);
      }

      const up = await this.repo.update(
        id,
        {
          ...(input.requesterName !== undefined ? { requesterName: input.requesterName } : {}),
          ...(input.requesterEmail !== undefined ? { requesterEmail: input.requesterEmail.toLowerCase() } : {}),
          ...(input.requesterPhone !== undefined ? { requesterPhone: input.requesterPhone } : {}),
          ...(input.requestedByName !== undefined ? { requestedByName: input.requestedByName } : {}),
          department: departmentName,
          departmentId,
          projectId,
          purpose:
            input.purpose !== undefined
              ? input.purpose
              : (derivedPurpose ?? existing.purpose),
          ...(input.notes !== undefined ? { notes: input.notes } : {}),
          history,
        },
        tx
      );
      if (!up) throw new NotFoundError("Consumable request", id);

      const lines = await this.repo.listLinesByRequestId(id, tx);
      return toDTO(up, lines, []);
    });

    return dto;
  }
}
