import type { PettyCashRow } from "@/server/db/schema";
import type { ActorContext } from "@/server/shared/auth";
import { ConflictError, NotFoundError } from "@/server/shared/errors";
import { serverCache } from "@/server/shared/cache";

import { assertPoAvailableForDisbursement } from "@/server/modules/purchase-lots/po-disbursement";
import { PettyCashRepository } from "./petty-cash.repository";
import { AuditLogService } from "@/server/modules/audit-logs/audit-logs.service";
import type { PettyCashDTO, ListPettyCashFilters } from "./petty-cash.types";
import {
  createPettyCashSchema,
  listPettyCashQuerySchema,
  updatePettyCashSchema,
  updatePettyCashStatusSchema,
  pettyCashIdSchema,
} from "./petty-cash.validation";

function emptyToNull(value: string | null | undefined): string | null {
  if (value === undefined || value === null || value === "") return null;
  return value;
}

function toDTO(row: PettyCashRow): PettyCashDTO {
  return {
    id: row.id,
    pcvNumber: row.pcvNumber,
    status: row.status,
    voucherDate: row.voucherDate,
    payeeName: row.payeeName,
    amount: row.amount,
    category: row.category,
    purpose: row.purpose ?? "",
    particulars: row.particulars,
    receiptNumber: row.receiptNumber ?? null,
    supplierId: row.supplierId ?? null,
    supplierName: row.supplierName ?? null,
    purchaseOrderNumber: row.purchaseOrderNumber ?? null,
    departmentId: row.departmentId ?? null,
    departmentName: row.departmentName ?? null,
    isLegacy: row.isLegacy,
    createdByUserId: row.createdByUserId,
    createdByName: row.createdByName,
    approvedByUserId: row.approvedByUserId ?? null,
    approvedByName: row.approvedByName ?? null,
    approvedAt: row.approvedAt ? row.approvedAt.toISOString() : null,
    completedByUserId: row.completedByUserId ?? null,
    completedByName: row.completedByName ?? null,
    completedAt: row.completedAt ? row.completedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export class PettyCashService {
  constructor(
    private readonly repo: PettyCashRepository = new PettyCashRepository(),
    private readonly auditLogs: AuditLogService = new AuditLogService()
  ) {}

  async generateNextPcvCode(now = new Date(), actorTenantId?: string): Promise<string> {
    const year = now.getFullYear();
    const prefix = `PCV${year}-`;

    const latestCode = await this.repo.findLatestPcvCode(prefix, undefined, actorTenantId);
    if (!latestCode) {
      return `${prefix}000001`;
    }

    const suffix = latestCode.replace(prefix, "");
    const parsed = parseInt(suffix, 10);
    if (isNaN(parsed)) {
      return `${prefix}000001`;
    }

    return `${prefix}${String(parsed + 1).padStart(6, "0")}`;
  }

  async list(rawFilters: unknown, actorTenantId?: string): Promise<{ vouchers: PettyCashDTO[]; total: number }> {
    const filters = listPettyCashQuerySchema.parse(rawFilters);
    const tenantId =
      actorTenantId ??
      (await import("@/server/shared/tenant-context")).getTenantContext()?.tenantId ??
      "global";
    const cacheKey = `tenant:${tenantId}:petty-cash:list:${JSON.stringify(filters)}`;

    return serverCache.wrap(
      cacheKey,
      30 * 1000,
      async () => {
        const { vouchers, total } = await this.repo.list(filters as ListPettyCashFilters, undefined, tenantId);
        return {
          vouchers: vouchers.map(toDTO),
          total,
        };
      },
      ["petty-cash", `tenant:${tenantId}:petty-cash`]
    );
  }

  async getById(rawId: unknown, actorTenantId?: string): Promise<PettyCashDTO> {
    const id = pettyCashIdSchema.parse(rawId);
    const voucher = await this.repo.findById(id, undefined, actorTenantId);
    if (!voucher) {
      throw new NotFoundError("Petty cash voucher not found");
    }
    return toDTO(voucher);
  }

  async create(rawInput: unknown, actor: ActorContext): Promise<PettyCashDTO> {
    const input = createPettyCashSchema.parse(rawInput);

    let pcvNumber = input.pcvNumber;
    if (!pcvNumber) {
      pcvNumber = await this.generateNextPcvCode(undefined, actor.tenantId);
    } else {
      const existing = await this.repo.findByCode(pcvNumber, undefined, actor.tenantId);
      if (existing) {
        throw new ConflictError(`Petty cash voucher with code "${pcvNumber}" already exists.`);
      }
    }

    await assertPoAvailableForDisbursement(
      input.purchaseOrderNumber,
      actor.tenantId
    );

    const row = await this.repo.create({
      tenantId: actor.tenantId,
      pcvNumber,
      status: input.status ?? "draft",
      voucherDate: input.voucherDate,
      payeeName: input.payeeName,
      amount: input.amount,
      category: input.category ?? "supplies",
      purpose: input.purpose ?? "",
      particulars: input.particulars ?? "",
      receiptNumber: emptyToNull(input.receiptNumber),
      purchaseOrderNumber: emptyToNull(input.purchaseOrderNumber),
      supplierId: input.supplierId ?? null,
      supplierName: emptyToNull(input.supplierName),
      departmentId: input.departmentId ?? null,
      departmentName: emptyToNull(input.departmentName),
      isLegacy: input.isLegacy ?? false,
      createdByUserId: actor.userId,
      createdByName: actor.displayName,
    });

    await this.auditLogs.log({
      entityType: "petty_cash",
      entityId: row.id,
      action: "created",
      actorName: actor.displayName,
      actorUserId: actor.userId,
      notes: `Created petty cash voucher ${row.pcvNumber} for ${row.payeeName} (₱${row.amount}) - ${row.category}`,
      metadata: {
        pcvNumber: row.pcvNumber,
        payeeName: row.payeeName,
        amount: row.amount,
        category: row.category,
        receiptNumber: row.receiptNumber,
        purchaseOrderNumber: row.purchaseOrderNumber,
        supplierName: row.supplierName,
      },
    });

    await serverCache.invalidateTag("petty-cash");
    if (actor.tenantId) {
      await serverCache.invalidateTag(`tenant:${actor.tenantId}:petty-cash`);
    }
    return toDTO(row);
  }

  async update(
    rawId: unknown,
    rawInput: unknown,
    actor?: ActorContext
  ): Promise<PettyCashDTO> {
    const id = pettyCashIdSchema.parse(rawId);
    const input = updatePettyCashSchema.parse(rawInput);

    const existing = await this.repo.findById(id, undefined, actor?.tenantId);
    if (!existing) {
      throw new NotFoundError("Petty cash voucher not found");
    }

    if (input.pcvNumber && input.pcvNumber !== existing.pcvNumber) {
      const conflict = await this.repo.findByCode(input.pcvNumber, undefined, actor?.tenantId);
      if (conflict) {
        throw new ConflictError(`Petty cash voucher with code "${input.pcvNumber}" already exists.`);
      }
    }

    if (input.purchaseOrderNumber !== undefined) {
      await assertPoAvailableForDisbursement(
        input.purchaseOrderNumber,
        actor?.tenantId,
        { excludePettyCashId: id }
      );
    }

    const updated = await this.repo.update(id, {
      ...(input.pcvNumber !== undefined && { pcvNumber: input.pcvNumber }),
      ...(input.payeeName !== undefined && { payeeName: input.payeeName }),
      ...(input.voucherDate !== undefined && { voucherDate: input.voucherDate }),
      ...(input.amount !== undefined && { amount: input.amount }),
      ...(input.category !== undefined && { category: input.category }),
      ...(input.purpose !== undefined && { purpose: input.purpose }),
      ...(input.particulars !== undefined && { particulars: input.particulars }),
      ...(input.receiptNumber !== undefined && { receiptNumber: emptyToNull(input.receiptNumber) }),
      ...(input.purchaseOrderNumber !== undefined && { purchaseOrderNumber: emptyToNull(input.purchaseOrderNumber) }),
      ...(input.supplierId !== undefined && { supplierId: input.supplierId }),
      ...(input.supplierName !== undefined && { supplierName: emptyToNull(input.supplierName) }),
      ...(input.departmentId !== undefined && { departmentId: input.departmentId }),
      ...(input.departmentName !== undefined && { departmentName: emptyToNull(input.departmentName) }),
      ...(input.isLegacy !== undefined && { isLegacy: input.isLegacy }),
    }, undefined, actor?.tenantId);

    if (!updated) {
      throw new NotFoundError("Petty cash voucher not found");
    }

    await this.auditLogs.log({
      entityType: "petty_cash",
      entityId: id,
      action: "updated",
      actorName: actor?.displayName || "System",
      actorUserId: actor?.userId,
      notes: `Updated petty cash voucher ${updated.pcvNumber} details`,
      metadata: {
        updatedFields: Object.keys(input),
        changes: input,
      },
    });

    await serverCache.invalidateTag("petty-cash");
    if (actor?.tenantId) {
      await serverCache.invalidateTag(`tenant:${actor.tenantId}:petty-cash`);
    }
    return toDTO(updated);
  }

  async updateStatus(
    rawId: unknown,
    rawInput: unknown,
    actor: ActorContext
  ): Promise<PettyCashDTO> {
    const id = pettyCashIdSchema.parse(rawId);
    const { status } = updatePettyCashStatusSchema.parse(rawInput);

    const existing = await this.repo.findById(id, undefined, actor.tenantId);
    if (!existing) {
      throw new NotFoundError("Petty cash voucher not found");
    }

    const updates: Partial<Parameters<PettyCashRepository["update"]>[1]> = {
      status,
    };

    if (status === "approved" && existing.status !== "approved") {
      updates.approvedByUserId = actor.userId;
      updates.approvedByName = actor.displayName;
      updates.approvedAt = new Date();
    } else if (status === "completed" && existing.status !== "completed") {
      updates.completedByUserId = actor.userId;
      updates.completedByName = actor.displayName;
      updates.completedAt = new Date();
    }

    const updated = await this.repo.update(id, updates, undefined, actor.tenantId);
    if (!updated) {
      throw new NotFoundError("Petty cash voucher not found");
    }

    await this.auditLogs.log({
      entityType: "petty_cash",
      entityId: id,
      action: status,
      actorName: actor.displayName,
      actorUserId: actor.userId,
      notes: `Status changed from ${existing.status.replace("_", " ")} to ${status.replace("_", " ")}`,
      metadata: {
        previousStatus: existing.status,
        newStatus: status,
      },
    });

    await serverCache.invalidateTag("petty-cash");
    if (actor.tenantId) {
      await serverCache.invalidateTag(`tenant:${actor.tenantId}:petty-cash`);
    }
    return toDTO(updated);
  }

  async delete(rawId: unknown, actor?: ActorContext): Promise<{ success: boolean }> {
    const id = pettyCashIdSchema.parse(rawId);
    const existing = await this.repo.findById(id, undefined, actor?.tenantId);
    if (!existing) {
      throw new NotFoundError("Petty cash voucher not found");
    }

    const deleted = await this.repo.delete(id, undefined, actor?.tenantId);

    await this.auditLogs.log({
      entityType: "petty_cash",
      entityId: id,
      action: "deleted",
      actorName: actor?.displayName || "System",
      actorUserId: actor?.userId,
      notes: `Deleted petty cash voucher ${existing.pcvNumber}`,
    });

    await serverCache.invalidateTag("petty-cash");
    if (actor?.tenantId) {
      await serverCache.invalidateTag(`tenant:${actor.tenantId}:petty-cash`);
    }
    return { success: deleted };
  }
}
