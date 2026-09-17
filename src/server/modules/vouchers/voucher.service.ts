import type { VoucherRow } from "@/server/db/schema";
import type { ActorContext } from "@/server/shared/auth";
import { ConflictError, NotFoundError } from "@/server/shared/errors";
import { serverCache } from "@/server/shared/cache";
import type { VoucherType } from "@/types/vouchers";

import { VoucherRepository } from "./voucher.repository";
import { AuditLogService } from "@/server/modules/audit-logs/audit-logs.service";
import type { VoucherDTO, ListVoucherFilters } from "./voucher.types";
import {
  createVoucherSchema,
  listVouchersQuerySchema,
  updateVoucherSchema,
  updateVoucherStatusSchema,
  voucherIdSchema,
} from "./voucher.validation";

function emptyToNull(value: string | null | undefined): string | null {
  if (value === undefined || value === null || value === "") return null;
  return value;
}

function toDTO(row: VoucherRow): VoucherDTO {
  return {
    id: row.id,
    voucherCode: row.voucherCode,
    type: row.type,
    status: row.status,
    voucherDate: row.voucherDate,
    payeeName: row.payeeName,
    amount: row.amount,
    supplierId: row.supplierId ?? null,
    supplierName: row.supplierName ?? null,
    purchaseOrderNumber: row.purchaseOrderNumber ?? null,
    assetId: row.assetId ?? null,
    assetCode: row.assetCode ?? null,
    assetName: row.assetName ?? null,
    particulars: row.particulars,
    checkNumber: row.checkNumber ?? null,
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

export class VoucherService {
  constructor(
    private readonly repo: VoucherRepository = new VoucherRepository(),
    private readonly auditLogs: AuditLogService = new AuditLogService()
  ) {}

  async generateNextVoucherCode(
    type: VoucherType = "disbursement",
    now = new Date(),
    actorTenantId?: string
  ): Promise<string> {
    const year = now.getFullYear();
    const prefix =
      type === "disbursement"
        ? `DDR${year}-`
        : type === "property_transfer"
          ? `PTR${year}-`
          : `LQD${year}-`;

    const latestCode = await this.repo.findLatestVoucherCode(prefix, undefined, actorTenantId);
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

  async list(rawFilters: unknown, actorTenantId?: string): Promise<{ vouchers: VoucherDTO[]; total: number }> {
    const filters = listVouchersQuerySchema.parse(rawFilters);
    const tenantId =
      actorTenantId ??
      (await import("@/server/shared/tenant-context")).getTenantContext()?.tenantId ??
      "global";
    const cacheKey = `tenant:${tenantId}:vouchers:list:${JSON.stringify(filters)}`;

    return serverCache.wrap(
      cacheKey,
      30 * 1000,
      async () => {
        const { vouchers, total } = await this.repo.list(filters as ListVoucherFilters, undefined, tenantId);
        return {
          vouchers: vouchers.map(toDTO),
          total,
        };
      },
      ["vouchers", `tenant:${tenantId}:vouchers`]
    );
  }

  async getById(rawId: string, actorTenantId?: string): Promise<VoucherDTO> {
    const id = voucherIdSchema.parse(rawId);
    const row = await this.repo.findById(id, undefined, actorTenantId);
    if (!row) throw new NotFoundError("Voucher", id);
    return toDTO(row);
  }

  async create(rawInput: unknown, actor: ActorContext): Promise<VoucherDTO> {
    const input = createVoucherSchema.parse(rawInput);

    let voucherCode = input.voucherCode?.trim();
    if (!voucherCode) {
      voucherCode = await this.generateNextVoucherCode(input.type, undefined, actor.tenantId);
    }

    const existing = await this.repo.findByCode(voucherCode, undefined, actor.tenantId);
    if (existing) {
      if (!input.voucherCode?.trim()) {
        const token = crypto.randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase();
        voucherCode = `${voucherCode.split("-")[0]}-${new Date().getFullYear()}-${token}`;
      } else {
        throw new ConflictError(
          `Voucher with code "${voucherCode}" already exists.`
        );
      }
    }

    const row = await this.repo.create({
      tenantId: actor.tenantId,
      voucherCode,
      type: input.type,
      status: input.status,
      voucherDate: input.voucherDate,
      payeeName: input.payeeName,
      amount: input.amount,
      supplierId: emptyToNull(input.supplierId),
      supplierName: emptyToNull(input.supplierName),
      purchaseOrderNumber: emptyToNull(input.purchaseOrderNumber),
      assetId: emptyToNull(input.assetId),
      assetCode: emptyToNull(input.assetCode),
      assetName: emptyToNull(input.assetName),
      particulars: input.particulars ?? "",
      checkNumber: emptyToNull(input.checkNumber),
      isLegacy: input.isLegacy ?? false,
      createdByUserId: actor.userId,
      createdByName: actor.displayName,
      approvedByUserId: null,
      approvedByName: null,
      approvedAt: null,
      completedByUserId: null,
      completedByName: null,
      completedAt: null,
    });

    void this.auditLogs.log({
      entityType: "voucher",
      entityId: row.id,
      action: "created",
      actorName: actor.displayName,
      actorUserId: actor.userId,
      notes: `Created disbursement voucher ${row.voucherCode} for ${row.payeeName} (₱${row.amount})`,
      metadata: {
        voucherCode: row.voucherCode,
        payeeName: row.payeeName,
        amount: row.amount,
        status: row.status,
        purchaseOrderNumber: row.purchaseOrderNumber,
      },
    });

    serverCache.invalidateTag("vouchers");
    if (actor.tenantId) {
      serverCache.invalidateTag(`tenant:${actor.tenantId}:vouchers`);
    }
    return toDTO(row);
  }

  async update(
    rawId: string,
    rawInput: unknown,
    actor?: ActorContext
  ): Promise<VoucherDTO> {
    const id = voucherIdSchema.parse(rawId);
    const input = updateVoucherSchema.parse(rawInput);

    const existing = await this.repo.findById(id, undefined, actor?.tenantId);
    if (!existing) throw new NotFoundError("Voucher", id);

    if (input.voucherCode && input.voucherCode !== existing.voucherCode) {
      const codeConflict = await this.repo.findByCode(input.voucherCode, undefined, actor?.tenantId);
      if (codeConflict) {
        throw new ConflictError(
          `Voucher with code "${input.voucherCode}" already exists.`
        );
      }
    }

    const updated = await this.repo.update(id, {
      ...(input.voucherCode !== undefined ? { voucherCode: input.voucherCode } : {}),
      ...(input.payeeName !== undefined ? { payeeName: input.payeeName } : {}),
      ...(input.voucherDate !== undefined ? { voucherDate: input.voucherDate } : {}),
      ...(input.amount !== undefined ? { amount: input.amount } : {}),
      ...(input.supplierId !== undefined ? { supplierId: emptyToNull(input.supplierId) } : {}),
      ...(input.supplierName !== undefined ? { supplierName: emptyToNull(input.supplierName) } : {}),
      ...(input.purchaseOrderNumber !== undefined
        ? { purchaseOrderNumber: emptyToNull(input.purchaseOrderNumber) }
        : {}),
      ...(input.assetId !== undefined ? { assetId: emptyToNull(input.assetId) } : {}),
      ...(input.assetCode !== undefined ? { assetCode: emptyToNull(input.assetCode) } : {}),
      ...(input.assetName !== undefined ? { assetName: emptyToNull(input.assetName) } : {}),
      ...(input.particulars !== undefined ? { particulars: input.particulars } : {}),
      ...(input.checkNumber !== undefined ? { checkNumber: emptyToNull(input.checkNumber) } : {}),
    }, undefined, actor?.tenantId);

    if (!updated) throw new NotFoundError("Voucher", id);

    void this.auditLogs.log({
      entityType: "voucher",
      entityId: id,
      action: "updated",
      actorName: actor?.displayName || "System",
      actorUserId: actor?.userId,
      notes: `Updated voucher ${updated.voucherCode} details`,
      metadata: {
        updatedFields: Object.keys(input),
        changes: input,
      },
    });

    serverCache.invalidateTag("vouchers");
    if (actor?.tenantId) {
      serverCache.invalidateTag(`tenant:${actor.tenantId}:vouchers`);
    }
    return toDTO(updated);
  }

  async updateStatus(
    rawId: string,
    rawInput: unknown,
    actor: ActorContext
  ): Promise<VoucherDTO> {
    const id = voucherIdSchema.parse(rawId);
    const input = updateVoucherStatusSchema.parse(rawInput);

    const existing = await this.repo.findById(id, undefined, actor.tenantId);
    if (!existing) throw new NotFoundError("Voucher", id);

    const updatePayload: Partial<VoucherRow> = {
      status: input.status,
    };

    if (input.status === "approved") {
      updatePayload.approvedByUserId = actor.userId;
      updatePayload.approvedByName = actor.displayName;
      updatePayload.approvedAt = new Date();
    } else if (input.status === "completed") {
      updatePayload.completedByUserId = actor.userId;
      updatePayload.completedByName = actor.displayName;
      updatePayload.completedAt = new Date();
    }

    const updated = await this.repo.update(id, updatePayload, undefined, actor.tenantId);
    if (!updated) throw new NotFoundError("Voucher", id);

    void this.auditLogs.log({
      entityType: "voucher",
      entityId: id,
      action: input.status,
      actorName: actor.displayName,
      actorUserId: actor.userId,
      notes: `Status changed from ${existing.status.replace("_", " ")} to ${input.status.replace("_", " ")}`,
      metadata: {
        previousStatus: existing.status,
        newStatus: input.status,
      },
    });

    serverCache.invalidateTag("vouchers");
    if (actor.tenantId) {
      serverCache.invalidateTag(`tenant:${actor.tenantId}:vouchers`);
    }
    return toDTO(updated);
  }

  async delete(rawId: string, actor?: ActorContext): Promise<{ success: boolean }> {
    const id = voucherIdSchema.parse(rawId);
    const existing = await this.repo.findById(id, undefined, actor?.tenantId);
    if (!existing) throw new NotFoundError("Voucher", id);

    const success = await this.repo.delete(id, undefined, actor?.tenantId);

    void this.auditLogs.log({
      entityType: "voucher",
      entityId: id,
      action: "deleted",
      actorName: actor?.displayName || "System",
      actorUserId: actor?.userId,
      notes: `Deleted voucher ${existing.voucherCode}`,
    });

    serverCache.invalidateTag("vouchers");
    if (actor?.tenantId) {
      serverCache.invalidateTag(`tenant:${actor.tenantId}:vouchers`);
    }
    return { success };
  }
}
